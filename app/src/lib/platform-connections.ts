import "server-only";
import { cache } from "react";
import { getSupabaseAdmin } from "./supabase-admin";
import { decryptToken, encryptToken } from "./crypto";
import { needsRefresh, refreshTokens } from "./token-refresh";
import { logActivity } from "./activity";
import type { Platform } from "./posts";

export type PlatformConnection = {
  id: string;
  platform: Platform;
  account_name: string;
  account_id: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectionHealthStatus = "ok" | "expiring" | "expired";

export type PlatformConnectionWithHealth = PlatformConnection & {
  health: ConnectionHealthStatus;
  /** null when the token has no known expiry (e.g. long-lived Facebook Page tokens) */
  expires_in_days: number | null;
};

/** Decrypted, for use by the publisher/replier only — never sent to a Client Component. */
export type DecryptedConnection = PlatformConnection & {
  access_token: string;
  refresh_token: string | null;
};

/** Tokens within this window are flagged so the owner can reconnect before a publish fails. */
export const EXPIRY_WARNING_DAYS = 7;

function healthOf(expiresAt: string | null): { health: ConnectionHealthStatus; days: number | null } {
  if (!expiresAt) return { health: "ok", days: null };
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.floor(ms / 86_400_000);
  if (ms <= 0) return { health: "expired", days };
  if (days <= EXPIRY_WARNING_DAYS) return { health: "expiring", days };
  return { health: "ok", days };
}

/**
 * For the /connections UI and the header switcher — token ciphertext is never
 * selected. `cache()`d per request: the header, the page, and `publishBlocker`
 * all call this on a single render, and it's the same small table each time.
 */
export const listConnections = cache(async (): Promise<PlatformConnection[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from("platform_connections")
    .select("id, platform, account_name, account_id, expires_at, created_at, updated_at")
    .order("platform", { ascending: true })
    .order("account_name", { ascending: true });

  if (error) throw error;
  return data as PlatformConnection[];
});

export async function listConnectionsWithHealth(): Promise<PlatformConnectionWithHealth[]> {
  const connections = await listConnections();
  return connections.map((c) => {
    const { health, days } = healthOf(c.expires_at);
    return { ...c, health, expires_in_days: days };
  });
}

export async function upsertConnection(input: {
  platform: Platform;
  accountName: string;
  accountId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
}): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("platform_connections")
    .upsert(
      {
        platform: input.platform,
        account_name: input.accountName,
        account_id: input.accountId,
        access_token_encrypted: encryptToken(input.accessToken),
        refresh_token_encrypted: input.refreshToken ? encryptToken(input.refreshToken) : null,
        expires_at: input.expiresAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "platform,account_id" }
    );

  if (error) throw error;
}

export type AccountScope = { id: string; platform: Platform; account_name: string };

/** Resolves the `?account=<id>` filter param used by the header's account switcher. */
export async function getAccountScope(
  connectionId: string | null | undefined
): Promise<AccountScope | null> {
  if (!connectionId) return null;
  const c = await getConnection(connectionId);
  return c ? { id: c.id, platform: c.platform, account_name: c.account_name } : null;
}

export async function getConnection(id: string): Promise<PlatformConnection | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("platform_connections")
    .select("id, platform, account_name, account_id, expires_at, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as PlatformConnection | null;
}

export async function deleteConnection(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("platform_connections").delete().eq("id", id);
  if (error) throw error;
}

function toDecrypted(data: Record<string, string | null>): DecryptedConnection {
  return {
    id: data.id as string,
    platform: data.platform as Platform,
    account_name: data.account_name as string,
    account_id: data.account_id as string,
    expires_at: data.expires_at,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    access_token: decryptToken(data.access_token_encrypted as string),
    refresh_token: data.refresh_token_encrypted
      ? decryptToken(data.refresh_token_encrypted)
      : null,
  };
}

/**
 * If the token is close to expiring, refresh it (TikTok requires this ~daily),
 * persist the new tokens, and return the updated connection. Best-effort: a
 * refresh failure returns the connection as-is so the publish can still try (and
 * fail loudly with the platform's own message if the token really is dead).
 */
async function withFreshToken(conn: DecryptedConnection): Promise<DecryptedConnection> {
  if (!needsRefresh(conn.platform, conn.expires_at)) return conn;

  const refreshed = await refreshTokens(conn.platform, conn.access_token, conn.refresh_token);
  if (!refreshed) return conn;

  await getSupabaseAdmin()
    .from("platform_connections")
    .update({
      access_token_encrypted: encryptToken(refreshed.accessToken),
      refresh_token_encrypted: refreshed.refreshToken
        ? encryptToken(refreshed.refreshToken)
        : conn.refresh_token
          ? encryptToken(conn.refresh_token)
          : null,
      expires_at: refreshed.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id);

  await logActivity({
    actor: "system:token-refresh",
    eventType: "connection_added",
    entityType: "connection",
    entityId: conn.id,
    platform: conn.platform,
    accountName: conn.account_name,
    status: "info",
    summary: `Refreshed the ${conn.platform} access token for ${conn.account_name}`,
  });

  return {
    ...conn,
    access_token: refreshed.accessToken,
    refresh_token: refreshed.refreshToken ?? conn.refresh_token,
    expires_at: refreshed.expiresAt,
  };
}

/** The account a post explicitly targets. Preferred over {@link getDecryptedConnection}. */
export async function getDecryptedConnectionById(
  id: string
): Promise<DecryptedConnection | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("platform_connections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return withFreshToken(toDecrypted(data));
}

/**
 * Fallback for posts created before per-post target accounts existed, or where the
 * targeted connection was later disconnected. Deterministic (oldest connection for
 * the platform) rather than whatever Postgres returned first — but callers should
 * log that a fallback was used, since with several Pages of one platform connected
 * this is a guess.
 */
export async function getDecryptedConnection(
  platform: Platform
): Promise<DecryptedConnection | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("platform_connections")
    .select("*")
    .eq("platform", platform)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return withFreshToken(toDecrypted(data));
}

/**
 * Resolves the connection a post should publish through. Returns the resolution
 * outcome so the caller can record it in the activity log and fail loudly rather
 * than silently posting to the wrong account.
 */
export async function resolvePostConnection(post: {
  platform: Platform;
  connection_id: string | null;
}): Promise<
  | { kind: "targeted"; connection: DecryptedConnection }
  | { kind: "fallback"; connection: DecryptedConnection }
  | { kind: "target_missing" }
  | { kind: "none_connected" }
> {
  if (post.connection_id) {
    const targeted = await getDecryptedConnectionById(post.connection_id);
    if (targeted) return { kind: "targeted", connection: targeted };
    const fallback = await getDecryptedConnection(post.platform);
    return fallback ? { kind: "fallback", connection: fallback } : { kind: "target_missing" };
  }
  const fallback = await getDecryptedConnection(post.platform);
  return fallback ? { kind: "fallback", connection: fallback } : { kind: "none_connected" };
}

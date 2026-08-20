import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { decryptToken, encryptToken } from "./crypto";
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

/** Decrypted, for use by the publisher only — never sent to a Client Component. */
export type DecryptedConnection = PlatformConnection & {
  access_token: string;
  refresh_token: string | null;
};

/** For the /connections UI — token ciphertext is never selected. */
export async function listConnections(): Promise<PlatformConnection[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("platform_connections")
    .select("id, platform, account_name, account_id, expires_at, created_at, updated_at")
    .order("platform", { ascending: true });

  if (error) throw error;
  return data as PlatformConnection[];
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

export async function deleteConnection(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("platform_connections").delete().eq("id", id);
  if (error) throw error;
}

/**
 * For the cron publisher — decrypts the token needed to call the platform's API.
 * Assumes one connected account per platform (picks the first if several Pages/
 * accounts were connected); posts don't carry a target account, so multi-account
 * support would need that added first.
 */
export async function getDecryptedConnection(
  platform: Platform
): Promise<DecryptedConnection | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("platform_connections")
    .select("*")
    .eq("platform", platform)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    platform: data.platform,
    account_name: data.account_name,
    account_id: data.account_id,
    expires_at: data.expires_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    access_token: decryptToken(data.access_token_encrypted),
    refresh_token: data.refresh_token_encrypted ? decryptToken(data.refresh_token_encrypted) : null,
  };
}

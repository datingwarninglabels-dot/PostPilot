import "server-only";
import type { Platform } from "./posts";

/**
 * OAuth token refresh. Kept separate from platform-connections.ts (which persists
 * the result) to avoid an import cycle. TikTok access tokens live ~24h and MUST be
 * refreshed with the stored refresh token; Instagram long-lived tokens last 60 days
 * and can be extended; Facebook Page tokens don't expire.
 */

export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
};

const REFRESH_MARGIN_MS = 60 * 60 * 1000; // refresh when under an hour remains

export function needsRefresh(platform: Platform, expiresAt: string | null): boolean {
  if (platform === "facebook" || !expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() < REFRESH_MARGIN_MS;
}

function inFuture(seconds: number | undefined): string | null {
  return typeof seconds === "number" ? new Date(Date.now() + seconds * 1000).toISOString() : null;
}

export async function refreshTokens(
  platform: Platform,
  accessToken: string,
  refreshToken: string | null
): Promise<RefreshedTokens | null> {
  try {
    if (platform === "tiktok") return await refreshTikTok(refreshToken);
    if (platform === "instagram") return await refreshInstagram(accessToken);
    return null;
  } catch (err) {
    console.error(`Token refresh failed for ${platform}:`, err);
    return null;
  }
}

async function refreshTikTok(refreshToken: string | null): Promise<RefreshedTokens | null> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!refreshToken || !clientKey || !clientSecret) return null;

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error || !data.access_token) return null;

  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string) ?? refreshToken,
    expiresAt: inFuture(data.expires_in as number | undefined),
  };
}

async function refreshInstagram(accessToken: string): Promise<RefreshedTokens | null> {
  // Only works once the current token is >24h old; a failure here is non-fatal.
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.access_token) return null;

  return {
    accessToken: data.access_token as string,
    refreshToken: null,
    expiresAt: inFuture(data.expires_in as number | undefined),
  };
}

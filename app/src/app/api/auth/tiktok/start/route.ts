import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";

const TIKTOK_OAUTH_SCOPES = ["user.info.basic", "video.publish"].join(",");

/**
 * TikTok requires PKCE for its authorize step. Its code_challenge is a
 * hex-encoded SHA-256 digest of code_verifier — not the base64url encoding
 * RFC 7636 normally uses — per TikTok's own docs (Login Kit for Desktop).
 */
function generateCodeVerifier(length = 64): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

export async function GET() {
  await requireAdmin();

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const baseUrl = process.env.APP_BASE_URL;
  if (!clientKey || !baseUrl) {
    return NextResponse.json(
      { error: "Missing TIKTOK_CLIENT_KEY or APP_BASE_URL." },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("hex");

  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  cookieStore.set("tiktok_oauth_state", state, cookieOpts);
  cookieStore.set("tiktok_oauth_code_verifier", codeVerifier, cookieOpts);

  const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;
  const authorizeUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authorizeUrl.searchParams.set("client_key", clientKey);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", TIKTOK_OAUTH_SCOPES);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authorizeUrl);
}

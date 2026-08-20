import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * "Instagram API with Instagram Login" — a separate product from Facebook
 * Login, with its own App ID/Secret and OAuth host (www.instagram.com, not
 * graph.facebook.com). Doesn't require a linked Facebook Page.
 */
const INSTAGRAM_OAUTH_SCOPES = ["instagram_business_basic", "instagram_business_content_publish"].join(
  ","
);

export async function GET() {
  await requireAdmin();

  const clientId = process.env.INSTAGRAM_APP_ID;
  const baseUrl = process.env.APP_BASE_URL;
  if (!clientId || !baseUrl) {
    return NextResponse.json(
      { error: "Missing INSTAGRAM_APP_ID or APP_BASE_URL." },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("instagram_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", INSTAGRAM_OAUTH_SCOPES);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  return NextResponse.redirect(authorizeUrl);
}

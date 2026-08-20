import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Instagram is handled by a completely separate Meta app + OAuth flow
 * (/api/auth/instagram) — "Instagram API with Instagram Login" — since
 * instagram_basic/instagram_content_publish aren't valid scopes on a plain
 * Facebook Login call without the special "Business Login for Instagram"
 * onboarding flow, which this app doesn't implement.
 */
const META_OAUTH_SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"].join(
  ","
);

export async function GET() {
  await requireAdmin();

  const appId = process.env.META_APP_ID;
  const baseUrl = process.env.APP_BASE_URL;
  if (!appId || !baseUrl) {
    return NextResponse.json(
      { error: "Missing META_APP_ID or APP_BASE_URL." },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${baseUrl}/api/auth/meta/callback`;
  const authorizeUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", META_OAUTH_SCOPES);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authorizeUrl);
}

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { upsertConnection } from "@/lib/platform-connections";

function connectionsRedirect(request: NextRequest, error?: string): NextResponse {
  const url = new URL("/connections", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("tiktok_oauth_state")?.value;
  const codeVerifier = cookieStore.get("tiktok_oauth_code_verifier")?.value;
  cookieStore.delete("tiktok_oauth_state");
  cookieStore.delete("tiktok_oauth_code_verifier");

  if (oauthError) return connectionsRedirect(request, `tiktok: ${oauthError}`);
  if (!code || !state || !expectedState || state !== expectedState) {
    console.error("TikTok OAuth state mismatch:", {
      hasCode: !!code,
      receivedState: state,
      cookieState: expectedState,
      cookieHeaderPresent: request.headers.get("cookie")?.includes("tiktok_oauth_state") ?? false,
    });
    return connectionsRedirect(request, "tiktok: invalid or expired OAuth state");
  }
  if (!codeVerifier) {
    return connectionsRedirect(request, "tiktok: missing PKCE code_verifier (cookie expired?)");
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const baseUrl = process.env.APP_BASE_URL;
  if (!clientKey || !clientSecret || !baseUrl) {
    return connectionsRedirect(
      request,
      "tiktok: server is missing TIKTOK_CLIENT_KEY/SECRET/APP_BASE_URL"
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/tiktok/callback`;

    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error_description ?? tokenData.error ?? "token exchange failed");
    }

    const accessToken = tokenData.access_token as string;
    const refreshToken = (tokenData.refresh_token as string) ?? null;
    const expiresIn = tokenData.expires_in as number | undefined;
    const openId = tokenData.open_id as string;

    const userInfoUrl = new URL("https://open.tiktokapis.com/v2/user/info/");
    userInfoUrl.searchParams.set("fields", "open_id,display_name");
    const userInfoRes = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfoData = await userInfoRes.json();
    const displayName: string | undefined = userInfoRes.ok
      ? userInfoData?.data?.user?.display_name
      : undefined;

    await upsertConnection({
      platform: "tiktok",
      accountName: displayName ?? openId,
      accountId: openId,
      accessToken,
      refreshToken,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    });

    return connectionsRedirect(request);
  } catch (err) {
    console.error("TikTok OAuth callback failed:", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return connectionsRedirect(request, `tiktok: ${message}`);
  }
}

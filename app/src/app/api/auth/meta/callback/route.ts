import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { upsertConnection } from "@/lib/platform-connections";

const GRAPH_VERSION = "v21.0";

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
  const expectedState = cookieStore.get("meta_oauth_state")?.value;
  cookieStore.delete("meta_oauth_state");

  if (oauthError) return connectionsRedirect(request, `meta: ${oauthError}`);
  if (!code || !state || !expectedState || state !== expectedState) {
    console.error("Meta OAuth state mismatch:", {
      hasCode: !!code,
      receivedState: state,
      cookieState: expectedState,
      cookieHeaderPresent: request.headers.get("cookie")?.includes("meta_oauth_state") ?? false,
    });
    return connectionsRedirect(request, "meta: invalid or expired OAuth state");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const baseUrl = process.env.APP_BASE_URL;
  if (!appId || !appSecret || !baseUrl) {
    return connectionsRedirect(request, "meta: server is missing META_APP_ID/SECRET/APP_BASE_URL");
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/meta/callback`;

    const shortLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    shortLivedUrl.searchParams.set("client_id", appId);
    shortLivedUrl.searchParams.set("client_secret", appSecret);
    shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
    shortLivedUrl.searchParams.set("code", code);
    const shortLivedRes = await fetch(shortLivedUrl);
    const shortLivedData = await shortLivedRes.json();
    if (!shortLivedRes.ok) {
      throw new Error(shortLivedData?.error?.message ?? "token exchange failed");
    }

    const longLivedUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedData.access_token);
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();
    if (!longLivedRes.ok) {
      throw new Error(longLivedData?.error?.message ?? "long-lived token exchange failed");
    }
    const userAccessToken = longLivedData.access_token as string;

    const accountsUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`);
    accountsUrl.searchParams.set("access_token", userAccessToken);
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();
    if (!accountsRes.ok) {
      throw new Error(accountsData?.error?.message ?? "failed to list Facebook Pages");
    }

    const pages = (accountsData.data ?? []) as Array<{
      id: string;
      name: string;
      access_token: string;
    }>;

    if (pages.length === 0) {
      return connectionsRedirect(
        request,
        "meta: no Facebook Pages found for this account (you must manage at least one Page)"
      );
    }

    for (const page of pages) {
      await upsertConnection({
        platform: "facebook",
        accountName: page.name,
        accountId: page.id,
        accessToken: page.access_token,
      });

      // Phase 3: app-level webhook config alone isn't enough — each Page must
      // individually subscribe to start receiving feed/messaging events. Non-fatal:
      // the connection is still useful for publishing even if this call fails.
      try {
        const subscribeUrl = new URL(
          `https://graph.facebook.com/${GRAPH_VERSION}/${page.id}/subscribed_apps`
        );
        subscribeUrl.searchParams.set("subscribed_fields", "feed,messages");
        subscribeUrl.searchParams.set("access_token", page.access_token);
        const subscribeRes = await fetch(subscribeUrl, { method: "POST" });
        if (!subscribeRes.ok) {
          console.error("Facebook Page webhook subscription failed:", await subscribeRes.text());
        }
      } catch (err) {
        console.error("Facebook Page webhook subscription failed:", err);
      }
    }

    return connectionsRedirect(request);
  } catch (err) {
    console.error("Meta OAuth callback failed:", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return connectionsRedirect(request, `meta: ${message}`);
  }
}

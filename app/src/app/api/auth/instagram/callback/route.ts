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

/** Instagram's docs show both endpoints wrapping their payload in `{data:[...]}` — handle either shape. */
function unwrap(json: unknown): Record<string, unknown> {
  if (json && typeof json === "object" && Array.isArray((json as { data?: unknown }).data)) {
    return ((json as { data: Record<string, unknown>[] }).data[0]) ?? {};
  }
  return json as Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("instagram_oauth_state")?.value;
  cookieStore.delete("instagram_oauth_state");

  if (oauthError) return connectionsRedirect(request, `instagram: ${oauthError}`);
  if (!code || !state || !expectedState || state !== expectedState) {
    console.error("Instagram OAuth state mismatch:", {
      hasCode: !!code,
      receivedState: state,
      cookieState: expectedState,
      cookieHeaderPresent: request.headers.get("cookie")?.includes("instagram_oauth_state") ?? false,
    });
    return connectionsRedirect(request, "instagram: invalid or expired OAuth state");
  }

  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  const baseUrl = process.env.APP_BASE_URL;
  if (!clientId || !clientSecret || !baseUrl) {
    return connectionsRedirect(
      request,
      "instagram: server is missing INSTAGRAM_APP_ID/SECRET/APP_BASE_URL"
    );
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

    const shortLivedRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    const shortLivedJson = await shortLivedRes.json();
    if (!shortLivedRes.ok) {
      throw new Error(
        (shortLivedJson?.error_message as string) ?? "short-lived token exchange failed"
      );
    }
    const shortLived = unwrap(shortLivedJson);
    const shortLivedToken = shortLived.access_token as string;

    const longLivedUrl = new URL("https://graph.instagram.com/access_token");
    longLivedUrl.searchParams.set("grant_type", "ig_exchange_token");
    longLivedUrl.searchParams.set("client_secret", clientSecret);
    longLivedUrl.searchParams.set("access_token", shortLivedToken);
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedJson = await longLivedRes.json();
    if (!longLivedRes.ok) {
      throw new Error(longLivedJson?.error?.message ?? "long-lived token exchange failed");
    }
    const accessToken = longLivedJson.access_token as string;
    const expiresIn = longLivedJson.expires_in as number | undefined;

    const meUrl = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/me`);
    meUrl.searchParams.set("fields", "user_id,username");
    meUrl.searchParams.set("access_token", accessToken);
    const meRes = await fetch(meUrl);
    const meJson = await meRes.json();
    const me = meRes.ok ? unwrap(meJson) : {};
    const userId = (me.user_id as string) ?? (shortLived.user_id as string);
    const username = me.username as string | undefined;

    if (!userId) {
      throw new Error("could not determine Instagram user ID");
    }

    await upsertConnection({
      platform: "instagram",
      accountName: username ?? userId,
      accountId: userId,
      accessToken,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    });

    // Phase 3: subscribe this IG account so Meta starts sending comment/DM events —
    // non-fatal, the connection is still useful for publishing even if this fails.
    try {
      const subscribeUrl = new URL(
        `https://graph.instagram.com/${GRAPH_VERSION}/${userId}/subscribed_apps`
      );
      subscribeUrl.searchParams.set("subscribed_fields", "comments,messages");
      subscribeUrl.searchParams.set("access_token", accessToken);
      const subscribeRes = await fetch(subscribeUrl, { method: "POST" });
      if (!subscribeRes.ok) {
        console.error("Instagram webhook subscription failed:", await subscribeRes.text());
      }
    } catch (err) {
      console.error("Instagram webhook subscription failed:", err);
    }

    return connectionsRedirect(request);
  } catch (err) {
    console.error("Instagram OAuth callback failed:", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return connectionsRedirect(request, `instagram: ${message}`);
  }
}

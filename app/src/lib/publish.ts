import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { resolvePostConnection } from "./platform-connections";
import { publishToFacebook } from "./publishers/facebook";
import { publishToInstagram } from "./publishers/instagram";
import { publishToTikTok } from "./publishers/tiktok";
import { logActivity } from "./activity";
import type { Post, Platform } from "./posts";

const PUBLISHERS: Record<Platform, typeof publishToFacebook> = {
  facebook: publishToFacebook,
  instagram: publishToInstagram,
  tiktok: publishToTikTok,
};

export type PublishOutcome =
  | { ok: true; status: "published" | "submitted"; platformPostId: string; accountName: string }
  | { ok: false; error: string };

/**
 * Publishes one post: resolves the target account, calls the platform API, writes
 * the result back to `posts`, and records a `post_publish_attempt` in the activity
 * log either way. Shared by the cron publisher and the "Publish now" action so both
 * paths behave — and log — identically. Never throws; a failure comes back as
 * `{ ok: false }` and the post is left in `failed` with `error_message` set.
 */
export async function publishPost(post: Post, actor: string): Promise<PublishOutcome> {
  const supabase = getSupabaseAdmin();

  try {
    const resolved = await resolvePostConnection(post);
    if (resolved.kind === "none_connected") {
      throw new Error(
        `No ${post.platform} account is connected. Connect one on the Connections page.`
      );
    }
    if (resolved.kind === "target_missing") {
      throw new Error(
        `The ${post.platform} account this post was set to publish to has been disconnected, and no other ${post.platform} account is connected to fall back to.`
      );
    }

    const connection = resolved.connection;
    const newStatus: "published" | "submitted" =
      post.platform === "tiktok" ? "submitted" : "published";

    const platformPostId = await PUBLISHERS[post.platform](connection, post);

    await supabase
      .from("posts")
      .update({
        status: newStatus,
        published_at: new Date().toISOString(),
        platform_post_id: platformPostId,
        connection_id: connection.id,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    await logActivity({
      actor,
      eventType: "post_publish_attempt",
      entityType: "post",
      entityId: post.id,
      platform: post.platform,
      accountName: connection.account_name,
      status: "success",
      summary:
        newStatus === "submitted"
          ? `Submitted to TikTok (${connection.account_name}) — accepted for processing, not yet confirmed live`
          : `Published to ${connection.platform} · ${connection.account_name}`,
      detail: {
        platform_post_id: platformPostId,
        used_fallback_account: resolved.kind === "fallback",
      },
      targetPlatformId: platformPostId,
    });

    return { ok: true, status: newStatus, platformPostId, accountName: connection.account_name };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown publish error";
    console.error(`Failed to publish post ${post.id}:`, err);

    await supabase
      .from("posts")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    await logActivity({
      actor,
      eventType: "post_publish_attempt",
      entityType: "post",
      entityId: post.id,
      platform: post.platform,
      status: "failure",
      summary: `Publish to ${post.platform} failed`,
      detail: { error: message },
    });

    return { ok: false, error: message };
  }
}

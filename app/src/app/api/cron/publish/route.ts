import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { publishPost, reconcileSubmittedPost } from "@/lib/publish";
import { logActivity } from "@/lib/activity";
import type { Post } from "@/lib/posts";

/**
 * The scheduled worker. Meant to be hit by Vercel Cron with
 * `Authorization: Bearer $CRON_SECRET` (once daily, 13:00 UTC — Hobby plan limit).
 * Two jobs, both idempotent:
 *
 *  1. Publish every due scheduled post via `publishPost` (shared with the
 *     "Publish now" action, so both behave and log identically).
 *  2. Reconcile every `submitted` post (TikTok) against the platform — moving it
 *     to `published` / `failed` once processing finishes. Stale submissions
 *     (>3 days) are given up on and marked failed so they don't poll forever.
 *
 * Neither helper throws; failures land in `failed` with `error_message` set and
 * stay visible in the dashboard.
 */
const STALE_SUBMISSION_MS = 3 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // 1. Publish due scheduled posts.
  const { data: duePosts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());
  if (error) {
    console.error("Cron publisher: failed to load due posts:", error);
    return NextResponse.json({ error: "Failed to load due posts" }, { status: 500 });
  }

  const posts = (duePosts ?? []) as Post[];
  const published: { id: string; status: string; detail: string }[] = [];

  for (const post of posts) {
    const outcome = await publishPost(post, "system:cron");
    published.push(
      outcome.ok
        ? { id: post.id, status: outcome.status, detail: outcome.platformPostId }
        : { id: post.id, status: "failed", detail: outcome.error }
    );
  }

  if (posts.length > 0) {
    const failed = published.filter((r) => r.status === "failed").length;
    await logActivity({
      actor: "system:cron",
      eventType: "post_publish_attempt",
      entityType: "post",
      status: failed > 0 ? "failure" : "info",
      summary: `Cron run: ${posts.length} due, ${posts.length - failed} out, ${failed} failed`,
      detail: { results: published },
    });
  }

  // 2. Reconcile submitted (TikTok) posts.
  const { data: submitted } = await supabase.from("posts").select("*").eq("status", "submitted");
  const reconciled: { id: string; state: string }[] = [];

  for (const post of (submitted ?? []) as Post[]) {
    const age = Date.now() - new Date(post.updated_at).getTime();
    if (age > STALE_SUBMISSION_MS) {
      await supabase
        .from("posts")
        .update({
          status: "failed",
          error_message:
            "TikTok never confirmed this post as live within 3 days — check the account directly.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
      await logActivity({
        actor: "system:cron",
        eventType: "post_publish_attempt",
        entityType: "post",
        entityId: post.id,
        platform: "tiktok",
        status: "failure",
        summary: "Gave up waiting for TikTok to confirm this post (>3 days)",
      });
      reconciled.push({ id: post.id, state: "gave_up" });
      continue;
    }
    const outcome = await reconcileSubmittedPost(post, "system:cron");
    reconciled.push({ id: post.id, state: outcome.ok ? outcome.state : "check_failed" });
  }

  return NextResponse.json({
    published: published.length,
    reconciled: reconciled.length,
    results: { published, reconciled },
  });
}

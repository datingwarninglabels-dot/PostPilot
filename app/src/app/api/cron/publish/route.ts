import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { publishPost } from "@/lib/publish";
import { logActivity } from "@/lib/activity";
import type { Post } from "@/lib/posts";

/**
 * Publishes every due scheduled post. Meant to be hit by Vercel Cron with
 * `Authorization: Bearer $CRON_SECRET` (once daily, 13:00 UTC — Hobby plan limit).
 *
 * The per-post work — resolving the target account, calling the platform API,
 * writing status back, and recording a `post_publish_attempt` in the activity log —
 * lives in `publishPost`, shared with the "Publish now" action so both behave
 * identically. `publishPost` never throws; a failed post is left in `failed` with
 * `error_message` set and stays visible in the dashboard.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
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
  const results: { id: string; status: "published" | "submitted" | "failed"; detail: string }[] = [];

  for (const post of posts) {
    const outcome = await publishPost(post, "system:cron");
    results.push(
      outcome.ok
        ? { id: post.id, status: outcome.status, detail: outcome.platformPostId }
        : { id: post.id, status: "failed", detail: outcome.error }
    );
  }

  if (posts.length > 0) {
    const failed = results.filter((r) => r.status === "failed").length;
    await logActivity({
      actor: "system:cron",
      eventType: "post_publish_attempt",
      entityType: "post",
      status: failed > 0 ? "failure" : "info",
      summary: `Cron run: ${posts.length} due, ${posts.length - failed} out, ${failed} failed`,
      detail: { results },
    });
  }

  return NextResponse.json({ processed: results.length, results });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getDecryptedConnection } from "@/lib/platform-connections";
import { publishToFacebook } from "@/lib/publishers/facebook";
import { publishToInstagram } from "@/lib/publishers/instagram";
import { publishToTikTok } from "@/lib/publishers/tiktok";
import type { Platform, Post } from "@/lib/posts";

const PUBLISHERS: Record<Platform, (typeof publishToFacebook)> = {
  facebook: publishToFacebook,
  instagram: publishToInstagram,
  tiktok: publishToTikTok,
};

/**
 * Publishes every due scheduled post. Meant to be hit by Vercel Cron (or,
 * until this is deployed, manually) with `Authorization: Bearer CRON_SECRET`.
 * Each post is isolated in its own try/catch so one failure doesn't stop the
 * rest of the batch.
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
  if (error) throw error;

  const results: { id: string; status: "published" | "failed"; detail: string }[] = [];

  for (const post of (duePosts ?? []) as Post[]) {
    try {
      const connection = await getDecryptedConnection(post.platform);
      if (!connection) {
        throw new Error(`No connected ${post.platform} account.`);
      }

      const platformPostId = await PUBLISHERS[post.platform](connection, post);

      await supabase
        .from("posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          platform_post_id: platformPostId,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      results.push({ id: post.id, status: "published", detail: platformPostId });
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

      results.push({ id: post.id, status: "failed", detail: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

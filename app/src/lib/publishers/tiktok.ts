import "server-only";
import type { DecryptedConnection } from "@/lib/platform-connections";
import type { Post } from "@/lib/posts";

/**
 * Submits a video to TikTok's Content Posting API by URL (TikTok fetches it
 * server-side, so nothing is uploaded through our server). This only
 * *submits* the post — TikTok processes it asynchronously, and this app
 * doesn't poll `/v2/post/publish/status/fetch/` for the final result, so the
 * returned publish_id means "accepted for processing," not "confirmed live."
 * Unaudited apps are restricted to privacy_level SELF_ONLY regardless of what
 * is requested here — published videos are only visible to the connected
 * account until the app passes TikTok's audit.
 */
export async function publishToTikTok(
  connection: DecryptedConnection,
  post: Post
): Promise<string> {
  const videoUrl = post.media_urls[0];
  if (!videoUrl) {
    throw new Error("TikTok requires a media URL — none set on this post.");
  }

  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: post.content,
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(data.error?.message ?? "TikTok publish failed");
  }
  return data.data.publish_id as string;
}

import "server-only";
import { GRAPH_VERSION } from "@/lib/meta";
import type { DecryptedConnection } from "@/lib/platform-connections";
import type { Post } from "@/lib/posts";

/** Posts to a Facebook Page — with a photo if media_urls[0] is set, text-only otherwise. */
export async function publishToFacebook(
  connection: DecryptedConnection,
  post: Post
): Promise<string> {
  const imageUrl = post.media_urls[0];
  const endpoint = imageUrl
    ? `https://graph.facebook.com/${GRAPH_VERSION}/${connection.account_id}/photos`
    : `https://graph.facebook.com/${GRAPH_VERSION}/${connection.account_id}/feed`;

  const body = new URLSearchParams({ access_token: connection.access_token });
  if (imageUrl) {
    body.set("url", imageUrl);
    body.set("caption", post.content);
  } else {
    body.set("message", post.content);
  }

  const res = await fetch(endpoint, { method: "POST", body });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Facebook publish failed");
  }
  return (data.post_id as string) ?? (data.id as string);
}

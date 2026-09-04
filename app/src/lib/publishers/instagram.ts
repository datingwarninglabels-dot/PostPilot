import "server-only";
import { GRAPH_VERSION } from "@/lib/meta";
import type { DecryptedConnection } from "@/lib/platform-connections";
import type { Post } from "@/lib/posts";

/**
 * Posts a single image to an Instagram professional account via the
 * "Instagram API with Instagram Login" product (two-step: create a media
 * container, then publish it) — host is graph.instagram.com and auth is the
 * IG account's own access token, not a Facebook Page token.
 * Instagram has no text-only post type, so media_urls[0] is required.
 * Only image posts are handled — video/Reels would need a different
 * media_type and a status-polling step, not implemented here.
 */
export async function publishToInstagram(
  connection: DecryptedConnection,
  post: Post
): Promise<string> {
  const imageUrl = post.media_urls[0];
  if (!imageUrl) {
    throw new Error("Instagram requires a media URL — none set on this post.");
  }

  const createRes = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/${connection.account_id}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connection.access_token}`,
      },
      body: JSON.stringify({ image_url: imageUrl, caption: post.content }),
    }
  );
  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(createData?.error?.message ?? "Instagram media container creation failed");
  }

  const publishRes = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/${connection.account_id}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connection.access_token}`,
      },
      body: JSON.stringify({ creation_id: createData.id }),
    }
  );
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(publishData?.error?.message ?? "Instagram publish failed");
  }
  return publishData.id as string;
}

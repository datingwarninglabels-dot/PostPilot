import "server-only";
import { GRAPH_VERSION } from "@/lib/meta";
import type { DecryptedConnection } from "@/lib/platform-connections";
import type { Comment } from "@/lib/comments";

/**
 * Sends an approved reply back to Facebook — a public comment reply (matches the
 * publisher's body-param access_token convention) or a Messenger DM via the Send API
 * (query-param access_token — Messenger's own convention, distinct from the feed/photos
 * endpoints).
 */
export async function sendReply(
  connection: DecryptedConnection,
  comment: Comment,
  text: string
): Promise<string> {
  if (comment.message_type === "dm") {
    if (!comment.author_platform_id) {
      throw new Error("Cannot send a Facebook DM reply — comment has no author_platform_id.");
    }
    const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`);
    url.searchParams.set("access_token", connection.access_token);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: comment.author_platform_id },
        message: { text },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message ?? "Facebook DM reply failed");
    }
    return data.message_id as string;
  }

  const body = new URLSearchParams({ message: text, access_token: connection.access_token });
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${comment.platform_comment_id}/comments`,
    { method: "POST", body }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Facebook comment reply failed");
  }
  return data.id as string;
}

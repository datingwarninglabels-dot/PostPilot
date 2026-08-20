import "server-only";
import type { DecryptedConnection } from "@/lib/platform-connections";
import type { Comment } from "@/lib/comments";

const GRAPH_VERSION = "v21.0";

/**
 * Sends an approved reply back to Instagram — a public comment reply or a DM via
 * graph.instagram.com's messages endpoint. Both use Bearer-header auth, matching the
 * Instagram publisher's convention (unlike Facebook, which mixes body/query-param auth).
 */
export async function sendReply(
  connection: DecryptedConnection,
  comment: Comment,
  text: string
): Promise<string> {
  if (comment.message_type === "dm") {
    if (!comment.author_platform_id) {
      throw new Error("Cannot send an Instagram DM reply — comment has no author_platform_id.");
    }
    const res = await fetch(
      `https://graph.instagram.com/${GRAPH_VERSION}/${connection.account_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${connection.access_token}`,
        },
        body: JSON.stringify({
          recipient: { id: comment.author_platform_id },
          message: { text },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message ?? "Instagram DM reply failed");
    }
    return (data.message_id as string) ?? (data.id as string);
  }

  const res = await fetch(
    `https://graph.instagram.com/${GRAPH_VERSION}/${comment.platform_comment_id}/replies`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connection.access_token}`,
      },
      body: JSON.stringify({ message: text }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Instagram comment reply failed");
  }
  return data.id as string;
}

import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import type { Platform } from "./posts";

export type MessageType = "comment" | "dm";
export type CommentStatus = "new" | "reply_drafted" | "reply_approved" | "replied" | "ignored";
export type ReplyStatus = "draft" | "approved" | "sent" | "rejected";

export type Comment = {
  id: string;
  platform: Platform;
  platform_comment_id: string;
  post_platform_id: string | null;
  message_type: MessageType;
  author_name: string | null;
  author_platform_id: string | null;
  body: string;
  status: CommentStatus;
  received_at: string;
};

export type Reply = {
  id: string;
  comment_id: string;
  draft_text: string;
  status: ReplyStatus;
  sent_at: string | null;
  platform_reply_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CommentWithReply = Comment & { reply: Reply | null };

/** Inbox view — everything not yet terminal (replied/ignored), newest first. */
export async function listActiveComments(): Promise<CommentWithReply[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("comments")
    .select("*, replies(*)")
    .not("status", "in", "(replied,ignored)")
    .order("received_at", { ascending: false });

  if (error) throw error;
  return (data as (Comment & { replies: Reply[] })[]).map(({ replies, ...comment }) => ({
    ...comment,
    reply: replies?.[0] ?? null,
  }));
}

export async function getCommentById(id: string): Promise<Comment | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("comments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Comment | null;
}

/**
 * Called from the webhook handlers. Upserts on (platform, platform_comment_id) with
 * ignoreDuplicates so a Meta webhook redelivery (retries on any non-200/slow response)
 * never clobbers status/received_at on a comment we've already started processing.
 */
export async function upsertIncomingComment(input: {
  platform: Platform;
  platformCommentId: string;
  postPlatformId?: string | null;
  messageType: MessageType;
  authorName?: string | null;
  authorPlatformId?: string | null;
  body: string;
  receivedAt?: string;
}): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("comments")
    .upsert(
      {
        platform: input.platform,
        platform_comment_id: input.platformCommentId,
        post_platform_id: input.postPlatformId ?? null,
        message_type: input.messageType,
        author_name: input.authorName ?? null,
        author_platform_id: input.authorPlatformId ?? null,
        body: input.body,
        received_at: input.receivedAt ?? new Date().toISOString(),
      },
      { onConflict: "platform,platform_comment_id", ignoreDuplicates: true }
    );

  if (error) throw error;
}

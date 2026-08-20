"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { draftPostContent, draftReplyContent } from "@/lib/generate";
import { deleteConnection, getDecryptedConnection } from "@/lib/platform-connections";
import { getCommentById } from "@/lib/comments";
import { sendReply as sendFacebookReply } from "@/lib/repliers/facebook";
import { sendReply as sendInstagramReply } from "@/lib/repliers/instagram";
import type { Platform } from "@/lib/posts";

export async function generateDraftAction(input: {
  platform: Platform;
  productDescription: string;
}) {
  await requireAdmin();

  const content = await draftPostContent(input.platform, input.productDescription);

  const { error } = await getSupabaseAdmin().from("posts").insert({
    platform: input.platform,
    post_type: "product_announcement",
    source_product_description: input.productDescription,
    content,
    status: "draft",
  });
  if (error) throw error;

  revalidatePath("/");
}

export async function updatePostContentAction(id: string, content: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function approvePostAction(id: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function rejectPostAction(id: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

/** Scheduling implicitly approves — only approved content should ever carry a schedule time. */
export async function schedulePostAction(id: string, scheduledAtIso: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ status: "scheduled", scheduled_at: scheduledAtIso, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function unschedulePostAction(id: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ status: "approved", scheduled_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

/** Instagram/TikTok publishing requires media; Facebook posts as text if left blank. */
export async function updatePostMediaAction(id: string, mediaUrl: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({
      media_urls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function disconnectConnectionAction(id: string) {
  await requireAdmin();
  await deleteConnection(id);
  revalidatePath("/connections");
}

export async function generateReplyDraftAction(commentId: string) {
  await requireAdmin();
  const comment = await getCommentById(commentId);
  if (!comment) throw new Error("Comment not found");

  const draft_text = await draftReplyContent(comment.platform, comment.body);

  const { error } = await getSupabaseAdmin()
    .from("replies")
    .insert({ comment_id: commentId, draft_text });
  if (error) throw error;

  const { error: statusError } = await getSupabaseAdmin()
    .from("comments")
    .update({ status: "reply_drafted" })
    .eq("id", commentId);
  if (statusError) throw statusError;

  revalidatePath("/comments");
}

export async function updateReplyDraftAction(replyId: string, text: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("replies")
    .update({ draft_text: text, updated_at: new Date().toISOString() })
    .eq("id", replyId);
  if (error) throw error;
  revalidatePath("/comments");
}

export async function approveReplyAction(replyId: string, commentId: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("replies")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", replyId);
  if (error) throw error;

  const { error: statusError } = await getSupabaseAdmin()
    .from("comments")
    .update({ status: "reply_approved" })
    .eq("id", commentId);
  if (statusError) throw statusError;

  revalidatePath("/comments");
}

/** Terminal — mirrors rejectPostAction. The comment stays visible; the admin can generate a fresh draft. */
export async function rejectReplyAction(replyId: string) {
  await requireAdmin();
  const { error } = await getSupabaseAdmin()
    .from("replies")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", replyId);
  if (error) throw error;
  revalidatePath("/comments");
}

export async function sendReplyAction(replyId: string) {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: reply, error: replyError } = await supabase
    .from("replies")
    .select("*")
    .eq("id", replyId)
    .single();
  if (replyError) throw replyError;

  const comment = await getCommentById(reply.comment_id);
  if (!comment) throw new Error("Comment not found");

  const connection = await getDecryptedConnection(comment.platform);
  if (!connection) throw new Error(`No connected ${comment.platform} account.`);

  const sender =
    comment.platform === "facebook"
      ? sendFacebookReply
      : comment.platform === "instagram"
        ? sendInstagramReply
        : null;
  if (!sender) throw new Error(`Replying isn't supported for ${comment.platform}.`);

  const platform_reply_id = await sender(connection, comment, reply.draft_text);

  const { error: sentError } = await supabase
    .from("replies")
    .update({ status: "sent", sent_at: new Date().toISOString(), platform_reply_id })
    .eq("id", replyId);
  if (sentError) throw sentError;

  const { error: commentError } = await supabase
    .from("comments")
    .update({ status: "replied" })
    .eq("id", comment.id);
  if (commentError) throw commentError;

  revalidatePath("/comments");
}

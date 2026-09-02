"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { draftPostContent, draftReplyContent } from "@/lib/generate";
import {
  deleteConnection,
  getConnection,
  getDecryptedConnection,
  listConnections,
} from "@/lib/platform-connections";
import { getCommentById } from "@/lib/comments";
import { getPostById } from "@/lib/posts";
import { publishPost } from "@/lib/publish";
import { logActivity } from "@/lib/activity";
import { type ActionResult, ok, fail, toUserMessage } from "@/lib/action-result";
import { sendReply as sendFacebookReply } from "@/lib/repliers/facebook";
import { sendReply as sendInstagramReply } from "@/lib/repliers/instagram";
import type { Platform } from "@/lib/posts";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/comments");
  revalidatePath("/connections");
  revalidatePath("/activity");
}

/** Blocks approve/schedule/publish when the post could never actually go out. */
async function publishBlocker(post: {
  platform: Platform;
  connection_id: string | null;
  media_urls: string[];
}): Promise<string | null> {
  const forPlatform = (await listConnections()).filter((c) => c.platform === post.platform);
  if (forPlatform.length === 0) {
    return `No ${post.platform} account is connected. Connect one on the Connections page first.`;
  }
  if (forPlatform.length > 1 && !post.connection_id) {
    return `You have ${forPlatform.length} ${post.platform} accounts connected — choose which one this posts to first.`;
  }
  if (post.connection_id && !forPlatform.some((c) => c.id === post.connection_id)) {
    return "The account this post targets is no longer connected. Pick a connected account.";
  }
  if ((post.platform === "instagram" || post.platform === "tiktok") && !post.media_urls[0]) {
    return `${post.platform} can't publish without a media URL — add one first.`;
  }
  return null;
}

export async function generateDraftAction(input: {
  platform: Platform;
  productDescription: string;
  connectionId?: string | null;
}): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const description = input.productDescription.trim();
    if (!description) return fail("Add a product description first.");

    const content = await draftPostContent(input.platform, description);

    const { data, error } = await getSupabaseAdmin()
      .from("posts")
      .insert({
        platform: input.platform,
        post_type: "product_announcement",
        source_product_description: description,
        content,
        connection_id: input.connectionId ?? null,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;

    await logActivity({
      actor: user.email,
      eventType: "draft_generated",
      entityType: "post",
      entityId: data.id,
      platform: input.platform,
      status: "success",
      summary: `Drafted a ${input.platform} post`,
      detail: { source: description.slice(0, 500) },
    });

    revalidateAll();
    return ok("Draft created.");
  } catch (err) {
    const message = toUserMessage(err);
    await logActivity({
      actor: user.email,
      eventType: "draft_generated",
      entityType: "post",
      platform: input.platform,
      status: "failure",
      summary: "Draft generation failed",
      detail: { error: message },
    });
    return fail(message);
  }
}

export async function updatePostContentAction(id: string, content: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const { error } = await getSupabaseAdmin()
      .from("posts")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await logActivity({
      actor: user.email,
      eventType: "post_edited",
      entityType: "post",
      entityId: id,
      status: "success",
      summary: "Edited post copy",
    });
    revalidateAll();
    return ok("Saved.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function updatePostMediaAction(id: string, mediaUrl: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const trimmed = mediaUrl.trim();
    const { error } = await getSupabaseAdmin()
      .from("posts")
      .update({
        media_urls: trimmed ? [trimmed] : [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    await logActivity({
      actor: user.email,
      eventType: "post_media_set",
      entityType: "post",
      entityId: id,
      status: "success",
      summary: trimmed ? "Set post media URL" : "Cleared post media URL",
    });
    revalidateAll();
    return ok("Media URL saved.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function setPostConnectionAction(
  id: string,
  connectionId: string | null
): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const connection = connectionId ? await getConnection(connectionId) : null;
    if (connectionId && !connection) return fail("That account is no longer connected.");

    const { error } = await getSupabaseAdmin()
      .from("posts")
      .update({ connection_id: connectionId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    await logActivity({
      actor: user.email,
      eventType: "post_target_set",
      entityType: "post",
      entityId: id,
      platform: connection?.platform ?? null,
      accountName: connection?.account_name ?? null,
      status: "success",
      summary: connection
        ? `Set target account to ${connection.account_name}`
        : "Cleared target account",
    });
    revalidateAll();
    return ok(connection ? `Will post to ${connection.account_name}.` : "Target account cleared.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function approvePostAction(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const post = await getPostById(id);
    if (!post) return fail("That post no longer exists.");

    const blocker = await publishBlocker(post);
    if (blocker) return fail(blocker);

    const { error } = await getSupabaseAdmin()
      .from("posts")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    await logActivity({
      actor: user.email,
      eventType: "post_approved",
      entityType: "post",
      entityId: id,
      platform: post.platform,
      status: "success",
      summary: `Approved ${post.platform} post`,
    });
    revalidateAll();
    return ok("Approved. Schedule it or publish it now.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function rejectPostAction(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const post = await getPostById(id);
    const { error } = await getSupabaseAdmin()
      .from("posts")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await logActivity({
      actor: user.email,
      eventType: "post_rejected",
      entityType: "post",
      entityId: id,
      platform: post?.platform ?? null,
      status: "success",
      summary: `Rejected ${post?.platform ?? ""} post`.trim(),
    });
    revalidateAll();
    return ok("Rejected.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

/** Scheduling implicitly approves — only approved content should ever carry a schedule time. */
export async function schedulePostAction(
  id: string,
  scheduledAtIso: string
): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const when = new Date(scheduledAtIso);
    if (Number.isNaN(when.getTime())) return fail("That's not a valid date and time.");

    const post = await getPostById(id);
    if (!post) return fail("That post no longer exists.");
    const blocker = await publishBlocker(post);
    if (blocker) return fail(blocker);

    const { error } = await getSupabaseAdmin()
      .from("posts")
      .update({
        status: "scheduled",
        scheduled_at: when.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;

    await logActivity({
      actor: user.email,
      eventType: "post_scheduled",
      entityType: "post",
      entityId: id,
      platform: post.platform,
      status: "success",
      summary: `Scheduled ${post.platform} post for ${when.toISOString()}`,
      detail: { scheduled_at: when.toISOString() },
    });
    revalidateAll();
    return ok(
      `Scheduled for ${when.toLocaleString()}. The publisher runs once daily (13:00 UTC), so it may go out after that time.`
    );
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function unschedulePostAction(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const { error } = await getSupabaseAdmin()
      .from("posts")
      .update({ status: "approved", scheduled_at: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await logActivity({
      actor: user.email,
      eventType: "post_unscheduled",
      entityType: "post",
      entityId: id,
      status: "success",
      summary: "Removed schedule",
    });
    revalidateAll();
    return ok("Back to approved (not scheduled).");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

/** Immediate publish — same code path (and logging) as the cron publisher. */
export async function publishPostNowAction(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const post = await getPostById(id);
    if (!post) return fail("That post no longer exists.");
    if (post.status === "published" || post.status === "submitted") {
      return fail("That post has already gone out.");
    }
    const blocker = await publishBlocker(post);
    if (blocker) return fail(blocker);

    const outcome = await publishPost(post, user.email ?? "admin");
    revalidateAll();

    if (!outcome.ok) return fail(outcome.error);
    return outcome.status === "submitted"
      ? ok(
          `Submitted to TikTok (${outcome.accountName}). TikTok is still processing it — not confirmed live yet.`
        )
      : ok(`Published to ${post.platform} · ${outcome.accountName}.`);
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function disconnectConnectionAction(id: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const connection = await getConnection(id);
    await deleteConnection(id);
    await logActivity({
      actor: user.email,
      eventType: "connection_removed",
      entityType: "connection",
      entityId: id,
      platform: connection?.platform ?? null,
      accountName: connection?.account_name ?? null,
      status: "success",
      summary: `Disconnected ${connection?.platform ?? ""} · ${
        connection?.account_name ?? id
      }`.trim(),
    });
    revalidateAll();
    return ok("Disconnected.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function generateReplyDraftAction(commentId: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const comment = await getCommentById(commentId);
    if (!comment) return fail("That comment no longer exists.");

    // Guard against a double-submit creating two draft replies for one comment.
    const { data: existing } = await getSupabaseAdmin()
      .from("replies")
      .select("id, status")
      .eq("comment_id", commentId)
      .limit(1)
      .maybeSingle();
    if (existing && existing.status !== "rejected") {
      return fail("A reply draft already exists for this comment.");
    }

    const draft_text = await draftReplyContent(comment.platform, comment.body);

    const { data, error } = await getSupabaseAdmin()
      .from("replies")
      .insert({ comment_id: commentId, draft_text })
      .select("id")
      .single();
    if (error) throw error;

    const { error: statusError } = await getSupabaseAdmin()
      .from("comments")
      .update({ status: "reply_drafted" })
      .eq("id", commentId);
    if (statusError) throw statusError;

    await logActivity({
      actor: user.email,
      eventType: "reply_generated",
      entityType: "reply",
      entityId: data.id,
      platform: comment.platform,
      status: "success",
      summary: `Drafted a reply to a ${comment.platform} ${comment.message_type}`,
    });
    revalidateAll();
    return ok("Reply drafted — review it before approving.");
  } catch (err) {
    const message = toUserMessage(err);
    await logActivity({
      actor: user.email,
      eventType: "reply_generated",
      entityType: "comment",
      entityId: commentId,
      status: "failure",
      summary: "Reply draft failed",
      detail: { error: message },
    });
    return fail(message);
  }
}

export async function updateReplyDraftAction(replyId: string, text: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const { error } = await getSupabaseAdmin()
      .from("replies")
      .update({ draft_text: text, updated_at: new Date().toISOString() })
      .eq("id", replyId);
    if (error) throw error;
    await logActivity({
      actor: user.email,
      eventType: "reply_edited",
      entityType: "reply",
      entityId: replyId,
      status: "success",
      summary: "Edited reply draft",
    });
    revalidateAll();
    return ok("Saved.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function approveReplyAction(
  replyId: string,
  commentId: string
): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
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

    await logActivity({
      actor: user.email,
      eventType: "reply_approved",
      entityType: "reply",
      entityId: replyId,
      status: "success",
      summary: "Approved a reply — ready to send",
    });
    revalidateAll();
    return ok("Approved. Send it when ready.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function rejectReplyAction(replyId: string): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    const { error } = await getSupabaseAdmin()
      .from("replies")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", replyId);
    if (error) throw error;
    await logActivity({
      actor: user.email,
      eventType: "reply_rejected",
      entityType: "reply",
      entityId: replyId,
      status: "success",
      summary: "Rejected a reply draft",
    });
    revalidateAll();
    return ok("Rejected. You can generate a fresh draft.");
  } catch (err) {
    return fail(toUserMessage(err));
  }
}

export async function sendReplyAction(replyId: string): Promise<ActionResult> {
  const user = await requireAdmin();
  const supabase = getSupabaseAdmin();
  try {
    const { data: reply, error: replyError } = await supabase
      .from("replies")
      .select("*")
      .eq("id", replyId)
      .single();
    if (replyError) throw replyError;
    if (reply.status === "sent") return fail("That reply has already been sent.");
    if (reply.status !== "approved") return fail("Approve the reply before sending it.");

    const comment = await getCommentById(reply.comment_id);
    if (!comment) return fail("The comment this reply belongs to no longer exists.");

    const connection = await getDecryptedConnection(comment.platform);
    if (!connection) return fail(`No connected ${comment.platform} account to send from.`);

    const sender =
      comment.platform === "facebook"
        ? sendFacebookReply
        : comment.platform === "instagram"
          ? sendInstagramReply
          : null;
    if (!sender) return fail(`Replying isn't supported for ${comment.platform}.`);

    const platform_reply_id = await sender(connection, comment, reply.draft_text);

    await supabase
      .from("replies")
      .update({ status: "sent", sent_at: new Date().toISOString(), platform_reply_id })
      .eq("id", replyId);
    await supabase.from("comments").update({ status: "replied" }).eq("id", comment.id);

    await logActivity({
      actor: user.email,
      eventType: "reply_send_attempt",
      entityType: "reply",
      entityId: replyId,
      platform: comment.platform,
      accountName: connection.account_name,
      status: "success",
      summary: `Sent a reply to a ${comment.platform} ${comment.message_type}`,
      detail: { platform_reply_id },
      targetPlatformId: platform_reply_id,
    });
    revalidateAll();
    return ok(`Reply sent on ${comment.platform}.`);
  } catch (err) {
    const message = toUserMessage(err);
    await logActivity({
      actor: user.email,
      eventType: "reply_send_attempt",
      entityType: "reply",
      entityId: replyId,
      status: "failure",
      summary: "Reply send failed",
      detail: { error: message },
    });
    return fail(message);
  }
}

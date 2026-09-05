import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { getSettings } from "./settings";
import { draftReplyContent } from "./generate";
import { logActivity } from "./activity";
import type { Platform } from "./posts";
import type { MessageType } from "./comments";

/**
 * Opt-in auto-DRAFTING of replies (never auto-sending). When enabled, a newly
 * received comment/DM that matches the rules below gets an AI reply draft
 * generated automatically — but it still sits at `status: "draft"` and the owner
 * must Approve and Send it on /comments, exactly like a hand-generated draft.
 * The human-approval gate is untouched.
 *
 * Rules (from the product decision):
 *  - Draft for: any DM; or a comment containing "?" or one of KEYWORDS.
 *  - Skip: emoji-only text, comments under 3 words, anything that looks like spam.
 *  - No more than {@link HOURLY_CAP} auto-drafts per rolling hour.
 */

export const HOURLY_CAP = 20;

const KEYWORDS = ["price", "link", "where", "how do i", "still available"];

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function isEmojiOnly(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return true;
  const stripped = trimmed.replace(
    /[\p{Emoji}\p{Emoji_Component}\p{Extended_Pictographic}️‍\s]/gu,
    ""
  );
  return stripped.length === 0;
}

function looksLikeSpam(body: string): boolean {
  const b = body.toLowerCase();
  const hasLink = /https?:\/\/|www\.|\b\S+\.(com|net|io|xyz|ru|link|shop)\b/.test(b);
  const spammy =
    /(free\s|click here|congratulat|you('?| ha)ve won|gift ?card|crypto|investment|forex|whatsapp\s*\+?\d|t\.me\/|bit\.ly)/.test(
      b
    );
  return hasLink && spammy;
}

export function shouldAutoDraft(input: { messageType: MessageType; body: string }): boolean {
  const body = input.body ?? "";
  if (isEmojiOnly(body) || looksLikeSpam(body)) return false;
  if (input.messageType === "dm") return true;
  if (wordCount(body) < 3) return false;
  if (body.includes("?")) return true;
  const lower = body.toLowerCase();
  return KEYWORDS.some((k) => lower.includes(k));
}

async function autoDraftsInLastHour(): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await getSupabaseAdmin()
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("actor", "system:auto-draft")
    .eq("event_type", "reply_generated")
    .eq("status", "success")
    .gte("created_at", since);
  if (error) {
    console.error("auto-draft cap check failed:", error);
    return HOURLY_CAP; // fail closed — don't draft if we can't count
  }
  return count ?? 0;
}

/**
 * Called from the webhook handlers for each genuinely-new comment/DM. Silent and
 * best-effort: any problem is logged and swallowed so it never breaks the webhook
 * response (Meta disables subscriptions that error).
 */
export async function maybeAutoDraftReply(input: {
  commentId: string;
  platform: Platform;
  messageType: MessageType;
  body: string;
}): Promise<void> {
  try {
    const { auto_draft_replies } = await getSettings();
    if (!auto_draft_replies) return;
    if (!shouldAutoDraft(input)) return;

    const supabase = getSupabaseAdmin();

    // Don't stack a second draft on a comment that already has a reply.
    const { data: existing } = await supabase
      .from("replies")
      .select("id")
      .eq("comment_id", input.commentId)
      .limit(1)
      .maybeSingle();
    if (existing) return;

    if ((await autoDraftsInLastHour()) >= HOURLY_CAP) {
      await logActivity({
        actor: "system:auto-draft",
        eventType: "reply_generated",
        entityType: "comment",
        entityId: input.commentId,
        platform: input.platform,
        status: "info",
        summary: `Auto-draft skipped — hourly cap of ${HOURLY_CAP} reached`,
      });
      return;
    }

    const draft_text = await draftReplyContent(input.platform, input.body);

    const { data: reply, error } = await supabase
      .from("replies")
      .insert({ comment_id: input.commentId, draft_text })
      .select("id")
      .single();
    if (error) throw error;

    await supabase
      .from("comments")
      .update({ status: "reply_drafted" })
      .eq("id", input.commentId);

    await logActivity({
      actor: "system:auto-draft",
      eventType: "reply_generated",
      entityType: "reply",
      entityId: reply.id,
      platform: input.platform,
      status: "success",
      summary: `Auto-drafted a reply to a ${input.platform} ${input.messageType} — awaiting approval`,
    });
  } catch (err) {
    console.error("auto-draft failed:", err);
  }
}

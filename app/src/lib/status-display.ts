import type { PostStatus } from "./posts";
import type { CommentStatus } from "./comments";
import type { ConnectionHealthStatus } from "./platform-connections";

type Tone = "neutral" | "info" | "warn" | "success" | "danger" | "accent";

/** One place for status → { label, badge tone }. Was duplicated across
 *  dashboard.tsx, comments-list.tsx, connections-list.tsx and activity/page.tsx. */

export const POST_STATUS: Record<PostStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  approved: { label: "Approved", tone: "info" },
  scheduled: { label: "Scheduled", tone: "warn" },
  submitted: { label: "Submitted", tone: "accent" },
  published: { label: "Published", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
};

export const COMMENT_STATUS: Record<CommentStatus, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "neutral" },
  reply_drafted: { label: "Reply drafted", tone: "info" },
  reply_approved: { label: "Reply approved", tone: "warn" },
  replied: { label: "Replied", tone: "success" },
  ignored: { label: "Ignored", tone: "danger" },
};

export const CONNECTION_HEALTH: Record<ConnectionHealthStatus, { tone: Tone }> = {
  ok: { tone: "success" },
  expiring: { tone: "warn" },
  expired: { tone: "danger" },
};

export const ACTIVITY_STATUS: Record<"success" | "failure" | "info", Tone> = {
  success: "success",
  failure: "danger",
  info: "neutral",
};

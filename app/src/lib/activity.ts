import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import type { Platform } from "./posts";

/**
 * The activity/audit log — an append-only record of everything the system did:
 * every draft, edit, approval, publish attempt, and reply, with success/fail
 * status, across every connected account. Written from Server Actions, the cron
 * publisher, and the webhook handlers. Never updated or deleted.
 *
 * `logActivity` is best-effort: if the write fails it logs to the server console
 * and returns — a logging hiccup must never break the action the user asked for.
 */

export type ActivityEventType =
  | "draft_generated"
  | "post_edited"
  | "post_media_set"
  | "post_target_set"
  | "post_approved"
  | "post_rejected"
  | "post_scheduled"
  | "post_unscheduled"
  | "post_publish_attempt"
  | "reply_generated"
  | "reply_edited"
  | "reply_approved"
  | "reply_rejected"
  | "reply_send_attempt"
  | "comment_received"
  | "connection_added"
  | "connection_removed";

export type ActivityEntityType = "post" | "reply" | "comment" | "connection";
export type ActivityStatus = "success" | "failure" | "info";

export type ActivityLogEntry = {
  id: string;
  created_at: string;
  actor: string | null;
  event_type: ActivityEventType;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  platform: Platform | null;
  account_name: string | null;
  status: ActivityStatus;
  summary: string | null;
  detail: Record<string, unknown> | null;
  target_platform_id: string | null;
};

export type LogActivityInput = {
  actor?: string | null;
  eventType: ActivityEventType;
  entityType: ActivityEntityType;
  entityId?: string | null;
  platform?: Platform | null;
  accountName?: string | null;
  status: ActivityStatus;
  summary?: string | null;
  detail?: Record<string, unknown> | null;
  targetPlatformId?: string | null;
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("activity_log")
      .insert({
        actor: input.actor ?? null,
        event_type: input.eventType,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        platform: input.platform ?? null,
        account_name: input.accountName ?? null,
        status: input.status,
        summary: input.summary ?? null,
        detail: input.detail ?? null,
        target_platform_id: input.targetPlatformId ?? null,
      });
    if (error) throw error;
  } catch (err) {
    console.error("activity_log write failed:", err, "for event", input.eventType);
  }
}

export type ActivityFilters = {
  platform?: Platform;
  eventType?: ActivityEventType;
  status?: ActivityStatus;
  entityType?: ActivityEntityType;
  q?: string;
};

const EXPORT_CAP = 5000;

// Supabase's filtered/range builders are all thenable and share the eq/or surface we
// use; this alias keeps the filter helper readable without fighting the generics.
type FilterableQuery = {
  eq(column: string, value: string): FilterableQuery;
  or(filters: string): FilterableQuery;
};

function applyFilters(query: FilterableQuery, filters: ActivityFilters): FilterableQuery {
  let q = query;
  if (filters.platform) q = q.eq("platform", filters.platform);
  if (filters.eventType) q = q.eq("event_type", filters.eventType);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.entityType) q = q.eq("entity_type", filters.entityType);
  if (filters.q) {
    const safe = filters.q.replace(/[%,()*]/g, " ").trim();
    if (safe) q = q.or(`summary.ilike.%${safe}%,account_name.ilike.%${safe}%`);
  }
  return q;
}

export async function listActivity(
  filters: ActivityFilters = {},
  page = { limit: 50, offset: 0 }
): Promise<{ entries: ActivityLogEntry[]; total: number }> {
  const base = getSupabaseAdmin()
    .from("activity_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const filtered = applyFilters(base as unknown as FilterableQuery, filters) as unknown as typeof base;
  const { data, error, count } = await filtered.range(
    page.offset,
    page.offset + page.limit - 1
  );

  if (error) throw error;
  return { entries: (data ?? []) as ActivityLogEntry[], total: count ?? 0 };
}

export async function listActivityForExport(
  filters: ActivityFilters = {}
): Promise<ActivityLogEntry[]> {
  const base = getSupabaseAdmin()
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(EXPORT_CAP);

  const filtered = applyFilters(base as unknown as FilterableQuery, filters) as unknown as typeof base;
  const { data, error } = await filtered;
  if (error) throw error;
  return (data ?? []) as ActivityLogEntry[];
}

export function activityToCsv(entries: ActivityLogEntry[]): string {
  const headers = [
    "created_at",
    "actor",
    "event_type",
    "entity_type",
    "entity_id",
    "platform",
    "account_name",
    "status",
    "summary",
    "target_platform_id",
    "detail",
  ];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = entries.map((e) =>
    [
      e.created_at,
      e.actor,
      e.event_type,
      e.entity_type,
      e.entity_id,
      e.platform,
      e.account_name,
      e.status,
      e.summary,
      e.target_platform_id,
      e.detail,
    ]
      .map(escape)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

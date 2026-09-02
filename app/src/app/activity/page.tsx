import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listActivity, type ActivityFilters } from "@/lib/activity";
import { getAccountScope } from "@/lib/platform-connections";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui";
import { ACTIVITY_STATUS } from "@/lib/status-display";

export const metadata = { title: "Activity" };

const PAGE_SIZE = 50;

const EVENT_LABELS: Record<string, string> = {
  draft_generated: "Draft generated",
  post_edited: "Post edited",
  post_media_set: "Media URL set",
  post_target_set: "Target account set",
  post_approved: "Post approved",
  post_rejected: "Post rejected",
  post_scheduled: "Post scheduled",
  post_unscheduled: "Post unscheduled",
  post_publish_attempt: "Publish attempt",
  reply_generated: "Reply drafted",
  reply_edited: "Reply edited",
  reply_approved: "Reply approved",
  reply_rejected: "Reply rejected",
  reply_send_attempt: "Reply send",
  comment_received: "Comment received",
  connection_added: "Account connected",
  connection_removed: "Account disconnected",
};

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseFilters(sp: Record<string, string | string[] | undefined>): ActivityFilters {
  const platform = firstParam(sp.platform);
  const status = firstParam(sp.status);
  const entityType = firstParam(sp.entity);
  const eventType = firstParam(sp.event);
  const q = firstParam(sp.q);
  return {
    platform:
      platform === "facebook" || platform === "instagram" || platform === "tiktok"
        ? platform
        : undefined,
    status:
      status === "success" || status === "failure" || status === "info" ? status : undefined,
    entityType:
      entityType === "post" ||
      entityType === "reply" ||
      entityType === "comment" ||
      entityType === "connection"
        ? entityType
        : undefined,
    eventType: eventType && EVENT_LABELS[eventType] ? (eventType as ActivityFilters["eventType"]) : undefined,
    q: q?.trim() || undefined,
  };
}

function qs(params: Record<string, string | number | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const account = firstParam(sp.account);
  const scope = await getAccountScope(account);
  const filters = parseFilters(sp);
  if (scope) {
    filters.accountName = scope.account_name;
    filters.platform = filters.platform ?? scope.platform;
  }
  const page = Math.max(0, Number.parseInt(firstParam(sp.page) ?? "0", 10) || 0);

  const { entries, total } = await listActivity(filters, {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseParams = {
    platform: scope ? undefined : filters.platform,
    status: filters.status,
    entity: filters.entityType,
    event: filters.eventType,
    q: filters.q,
    account: scope?.id,
  };

  const select =
    "min-h-9 rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15";

  return (
    <>
      <AppHeader active="/activity" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Activity log</h1>
          <a
            href={`/api/activity/export${qs(baseParams)}`}
            className="inline-flex min-h-9 items-center rounded-md border border-black/15 px-3 py-1.5 text-sm transition-colors hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.05]"
          >
            Export CSV
          </a>
        </div>
        <p className="mb-5 text-sm text-muted">
          Every draft, edit, approval, publish attempt, and reply — across all connected accounts.
          Append-only; {total.toLocaleString()} event{total === 1 ? "" : "s"} recorded.
        </p>

        <form
          method="GET"
          className="mb-5 flex flex-wrap items-end gap-2 rounded-card border border-border p-3"
        >
          {scope && <input type="hidden" name="account" value={scope.id} />}
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Platform
            <select name="platform" defaultValue={filters.platform ?? ""} className={select}>
              <option value="">Any</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Type
            <select name="entity" defaultValue={filters.entityType ?? ""} className={select}>
              <option value="">Any</option>
              <option value="post">Posts</option>
              <option value="reply">Replies</option>
              <option value="comment">Comments</option>
              <option value="connection">Connections</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Result
            <select name="status" defaultValue={filters.status ?? ""} className={select}>
              <option value="">Any</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="info">Info</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted">
            Search
            <input
              type="search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="summary or account name"
              className="min-h-9 w-full rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-9 items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
          <Link
            href="/activity"
            className="inline-flex min-h-9 items-center rounded-md px-2 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Clear
          </Link>
        </form>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/15 p-8 text-center dark:border-white/15">
            <p className="text-sm text-muted">
              No activity matches these filters yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-muted dark:border-white/10">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-black/5 align-top last:border-0 dark:border-white/5"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-muted">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">
                        {EVENT_LABELS[e.event_type] ?? e.event_type}
                      </span>
                      <span className="block text-xs text-muted">
                        {e.actor ?? "—"}
                        {e.platform ? ` · ${e.platform}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2">{e.account_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge tone={ACTIVITY_STATUS[e.status]}>{e.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <span>{e.summary ?? "—"}</span>
                      {e.target_platform_id && (
                        <span className="block text-xs text-muted">
                          id: {e.target_platform_id}
                        </span>
                      )}
                      {e.detail && Object.keys(e.detail).length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-muted">
                            more
                          </summary>
                          <pre className="mt-1 max-w-md overflow-x-auto rounded bg-black/5 p-2 text-xs dark:bg-white/5">
                            {JSON.stringify(e.detail, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 0 && (
                <Link
                  href={`/activity${qs({ ...baseParams, page: page - 1 })}`}
                  className="rounded-md border border-black/15 px-3 py-1.5 dark:border-white/15"
                >
                  Newer
                </Link>
              )}
              {page + 1 < totalPages && (
                <Link
                  href={`/activity${qs({ ...baseParams, page: page + 1 })}`}
                  className="rounded-md border border-black/15 px-3 py-1.5 dark:border-white/15"
                >
                  Older
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

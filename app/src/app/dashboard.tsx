"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/posts";
import type { PlatformConnectionWithHealth } from "@/lib/platform-connections";
import { useActionRunner } from "@/components/toast";
import {
  approvePostAction,
  publishPostNowAction,
  rejectPostAction,
  schedulePostAction,
  setPostConnectionAction,
  unschedulePostAction,
  updatePostContentAction,
  updatePostMediaAction,
} from "./actions";

const MEDIA_REQUIRED: Record<Post["platform"], boolean> = {
  facebook: false,
  instagram: true,
  tiktok: true,
};

const STATUS_LABEL: Record<Post["status"], string> = {
  draft: "Draft",
  approved: "Approved",
  scheduled: "Scheduled",
  submitted: "Submitted",
  published: "Published",
  rejected: "Rejected",
  failed: "Failed",
};

const STATUS_COLORS: Record<Post["status"], string> = {
  draft: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  scheduled: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  submitted: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const btnPrimary =
  "inline-flex min-h-9 items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-black/15 px-3 py-1.5 text-sm transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.05]";
const btnDanger =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-red-600/40 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950";
const inputBase =
  "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/15";

function PostCard({
  post,
  connections,
}: {
  post: Post;
  connections: PlatformConnectionWithHealth[];
}) {
  const router = useRouter();
  const { pending, run } = useActionRunner();
  const refresh = () => router.refresh();

  const [content, setContent] = useState(post.content);
  const [mediaUrl, setMediaUrl] = useState(post.media_urls[0] ?? "");
  const [connectionId, setConnectionId] = useState(post.connection_id ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    post.scheduled_at ? post.scheduled_at.slice(0, 16) : ""
  );

  const platformConnections = connections.filter((c) => c.platform === post.platform);
  const targetConnection = platformConnections.find((c) => c.id === connectionId) ?? null;

  const contentDirty = content !== post.content;
  const mediaDirty = mediaUrl !== (post.media_urls[0] ?? "");
  const missingRequiredMedia = MEDIA_REQUIRED[post.platform] && !mediaUrl.trim();
  const needsAccountChoice = platformConnections.length > 1 && !connectionId;
  const noAccountConnected = platformConnections.length === 0;
  const editable = post.status !== "published" && post.status !== "submitted";
  const canApprove =
    !pending && !contentDirty && !mediaDirty && !missingRequiredMedia && !needsAccountChoice && !noAccountConnected;

  const approveBlockedReason = noAccountConnected
    ? `Connect a ${post.platform} account first`
    : needsAccountChoice
      ? "Choose which account this posts to"
      : missingRequiredMedia
        ? `${post.platform} needs a media URL`
        : contentDirty || mediaDirty
          ? "Save your edits first"
          : undefined;

  return (
    <article className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-black/5 px-2 py-0.5 font-medium capitalize dark:bg-white/10">
          {post.platform}
        </span>
        <span className={`rounded px-2 py-0.5 font-medium ${STATUS_COLORS[post.status]}`}>
          {STATUS_LABEL[post.status]}
        </span>
        {targetConnection ? (
          <span className="text-neutral-500">→ {targetConnection.account_name}</span>
        ) : platformConnections.length > 0 ? (
          <span className="text-amber-700 dark:text-amber-400">→ no account chosen</span>
        ) : null}
        <span className="ml-auto text-neutral-500">
          {new Date(post.created_at).toLocaleString()}
        </span>
      </div>

      {post.status === "failed" && post.error_message && (
        <p className="mb-3 rounded-md border border-red-600/30 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <strong className="font-semibold">Last publish attempt failed:</strong>{" "}
          {post.error_message}
        </p>
      )}
      {post.status === "submitted" && (
        <p className="mb-3 rounded-md border border-violet-600/30 bg-violet-50 px-3 py-2 text-sm text-violet-800 dark:bg-violet-950 dark:text-violet-200">
          Sent to TikTok and accepted for processing. TikTok publishes asynchronously — this isn&apos;t
          confirmed live yet. Check the account, or the Activity log for the publish id.
        </p>
      )}

      <label className="sr-only" htmlFor={`content-${post.id}`}>
        Post copy
      </label>
      <textarea
        id={`content-${post.id}`}
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={pending || !editable}
        className={inputBase}
      />

      {editable && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-xs font-medium text-neutral-500"
              htmlFor={`media-${post.id}`}
            >
              Media URL{MEDIA_REQUIRED[post.platform] ? " (required)" : " (optional)"}
            </label>
            <input
              id={`media-${post.id}`}
              type="url"
              inputMode="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              disabled={pending}
              placeholder="https://…/image-or-video.jpg"
              className={inputBase}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-neutral-500"
              htmlFor={`account-${post.id}`}
            >
              Publish to
            </label>
            {platformConnections.length === 0 ? (
              <p className="pt-2 text-sm text-neutral-500">
                No {post.platform} account connected.{" "}
                <Link href="/connections" className="underline">
                  Connect one
                </Link>
                .
              </p>
            ) : (
              <select
                id={`account-${post.id}`}
                value={connectionId}
                disabled={pending}
                onChange={(e) => {
                  const next = e.target.value;
                  setConnectionId(next);
                  run(() => setPostConnectionAction(post.id, next || null), {
                    onSuccess: refresh,
                  });
                }}
                className={inputBase}
              >
                <option value="">Choose an account…</option>
                {platformConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.account_name}
                    {c.health === "expired" ? " (token expired)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {contentDirty && (
          <button
            className={btnSecondary}
            disabled={pending}
            onClick={() =>
              run(() => updatePostContentAction(post.id, content), { onSuccess: refresh })
            }
          >
            Save edit
          </button>
        )}
        {mediaDirty && (
          <button
            className={btnSecondary}
            disabled={pending}
            onClick={() =>
              run(() => updatePostMediaAction(post.id, mediaUrl), { onSuccess: refresh })
            }
          >
            Save media URL
          </button>
        )}

        {(post.status === "draft" || post.status === "rejected") && (
          <>
            <button
              className={btnPrimary}
              disabled={!canApprove}
              title={approveBlockedReason}
              onClick={() => run(() => approvePostAction(post.id), { onSuccess: refresh })}
            >
              Approve
            </button>
            {post.status === "draft" && (
              <button
                className={btnDanger}
                disabled={pending}
                onClick={() => run(() => rejectPostAction(post.id), { onSuccess: refresh })}
              >
                Reject
              </button>
            )}
          </>
        )}

        {(post.status === "approved" || post.status === "scheduled") && (
          <>
            <label className="sr-only" htmlFor={`sched-${post.id}`}>
              Schedule date and time
            </label>
            <input
              id={`sched-${post.id}`}
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={pending}
              className="min-h-9 rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/15"
            />
            <button
              className={btnSecondary}
              disabled={pending || !scheduledAt}
              onClick={() =>
                run(
                  () => schedulePostAction(post.id, new Date(scheduledAt).toISOString()),
                  { onSuccess: refresh }
                )
              }
            >
              {post.status === "scheduled" ? "Update schedule" : "Schedule"}
            </button>
            {post.status === "scheduled" && (
              <button
                className={btnSecondary}
                disabled={pending}
                onClick={() => run(() => unschedulePostAction(post.id), { onSuccess: refresh })}
              >
                Unschedule
              </button>
            )}
            <button
              className={btnPrimary}
              disabled={pending}
              onClick={() => run(() => publishPostNowAction(post.id), { onSuccess: refresh })}
            >
              Publish now
            </button>
          </>
        )}

        {post.status === "failed" && (
          <>
            <button
              className={btnPrimary}
              disabled={pending || needsAccountChoice || noAccountConnected}
              title={approveBlockedReason}
              onClick={() => run(() => publishPostNowAction(post.id), { onSuccess: refresh })}
            >
              Retry publish
            </button>
            <button
              className={btnDanger}
              disabled={pending}
              onClick={() => run(() => rejectPostAction(post.id), { onSuccess: refresh })}
            >
              Reject
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function Dashboard({
  posts,
  connections,
}: {
  posts: Post[];
  connections: PlatformConnectionWithHealth[];
}) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/15 p-8 text-center dark:border-white/15">
        <p className="text-sm text-neutral-500">
          No drafts in progress.{" "}
          <Link href="/new" className="font-medium underline">
            Draft a post
          </Link>{" "}
          to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={`${post.id}:${post.updated_at}`} post={post} connections={connections} />
      ))}
    </div>
  );
}

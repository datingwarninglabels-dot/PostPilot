"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/posts";
import type { PlatformConnectionWithHealth } from "@/lib/platform-connections";
import { POST_STATUS } from "@/lib/status-display";
import { useActionRunner } from "@/components/toast";
import { Badge, Button, Card, EmptyState, inputClass } from "@/components/ui";
import { PostPreview } from "@/components/post-preview";
import {
  approvePostAction,
  publishPostNowAction,
  reconcilePostStatusAction,
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
  const [showPreview, setShowPreview] = useState(false);

  const platformConnections = connections.filter((c) => c.platform === post.platform);
  const targetConnection = platformConnections.find((c) => c.id === connectionId) ?? null;

  const contentDirty = content !== post.content;
  const mediaDirty = mediaUrl !== (post.media_urls[0] ?? "");
  const missingRequiredMedia = MEDIA_REQUIRED[post.platform] && !mediaUrl.trim();
  const needsAccountChoice = platformConnections.length > 1 && !connectionId;
  const noAccountConnected = platformConnections.length === 0;
  const editable = post.status !== "published" && post.status !== "submitted";
  const canApprove =
    !pending &&
    !contentDirty &&
    !mediaDirty &&
    !missingRequiredMedia &&
    !needsAccountChoice &&
    !noAccountConnected;

  const approveBlockedReason = noAccountConnected
    ? `Connect a ${post.platform} account first`
    : needsAccountChoice
      ? "Choose which account this posts to"
      : missingRequiredMedia
        ? `${post.platform} needs a media URL`
        : contentDirty || mediaDirty
          ? "Save your edits first"
          : undefined;

  const status = POST_STATUS[post.status];

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="neutral" className="capitalize">
          {post.platform}
        </Badge>
        <Badge tone={status.tone}>{status.label}</Badge>
        {targetConnection ? (
          <span className="text-muted">→ {targetConnection.account_name}</span>
        ) : platformConnections.length > 0 ? (
          <span className="text-amber-700 dark:text-amber-400">→ no account chosen</span>
        ) : null}
        <span className="ml-auto text-muted">{new Date(post.created_at).toLocaleString()}</span>
      </div>

      {post.status === "failed" && post.error_message && (
        <p className="mb-3 rounded-control border border-danger/30 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <strong className="font-semibold">Last publish attempt failed:</strong>{" "}
          {post.error_message}
        </p>
      )}
      {post.status === "submitted" && (
        <div className="mb-3 rounded-control border border-violet-600/30 bg-violet-50 px-3 py-2 text-sm text-violet-800 dark:bg-violet-950 dark:text-violet-200">
          <p>
            Sent to TikTok and accepted for processing — not confirmed live yet. The daily cron
            re-checks automatically; check now if you want an answer sooner.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={pending}
            onClick={() => run(() => reconcilePostStatusAction(post.id), { onSuccess: refresh })}
          >
            Check status
          </Button>
        </div>
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
        className={inputClass}
      />

      {editable && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-xs font-medium text-muted"
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
              className={inputClass}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-muted"
              htmlFor={`account-${post.id}`}
            >
              Publish to
            </label>
            {platformConnections.length === 0 ? (
              <p className="pt-2 text-sm text-muted">
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
                  run(() => setPostConnectionAction(post.id, next || null), { onSuccess: refresh });
                }}
                className={inputClass}
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

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          aria-expanded={showPreview}
          className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          {showPreview ? "Hide preview" : `Preview as ${post.platform}`}
        </button>
        {showPreview && (
          <div className="mt-2">
            <PostPreview
              platform={post.platform}
              content={content}
              mediaUrl={mediaUrl}
              accountName={targetConnection?.account_name}
            />
            <p className="mt-1 text-center text-[11px] text-muted">
              Approximate — real rendering varies by device.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {contentDirty && (
          <Button
            disabled={pending}
            onClick={() =>
              run(() => updatePostContentAction(post.id, content), { onSuccess: refresh })
            }
          >
            Save edit
          </Button>
        )}
        {mediaDirty && (
          <Button
            disabled={pending}
            onClick={() =>
              run(() => updatePostMediaAction(post.id, mediaUrl), { onSuccess: refresh })
            }
          >
            Save media URL
          </Button>
        )}

        {(post.status === "draft" || post.status === "rejected") && (
          <>
            <Button
              variant="primary"
              disabled={!canApprove}
              title={approveBlockedReason}
              onClick={() => run(() => approvePostAction(post.id), { onSuccess: refresh })}
            >
              Approve
            </Button>
            {post.status === "draft" && (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => run(() => rejectPostAction(post.id), { onSuccess: refresh })}
              >
                Reject
              </Button>
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
              className="min-h-9 rounded-control border border-border-strong bg-transparent px-2 py-1.5 text-sm"
            />
            <Button
              disabled={pending || !scheduledAt}
              onClick={() =>
                run(() => schedulePostAction(post.id, new Date(scheduledAt).toISOString()), {
                  onSuccess: refresh,
                })
              }
            >
              {post.status === "scheduled" ? "Update schedule" : "Schedule"}
            </Button>
            {post.status === "scheduled" && (
              <Button
                disabled={pending}
                onClick={() => run(() => unschedulePostAction(post.id), { onSuccess: refresh })}
              >
                Unschedule
              </Button>
            )}
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => run(() => publishPostNowAction(post.id), { onSuccess: refresh })}
            >
              Publish now
            </Button>
          </>
        )}

        {post.status === "failed" && (
          <>
            <Button
              variant="primary"
              disabled={pending || needsAccountChoice || noAccountConnected}
              title={approveBlockedReason}
              onClick={() => run(() => publishPostNowAction(post.id), { onSuccess: refresh })}
            >
              Retry publish
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => run(() => rejectPostAction(post.id), { onSuccess: refresh })}
            >
              Reject
            </Button>
          </>
        )}
      </div>
    </Card>
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
      <EmptyState title="No drafts in progress">
        <Link href="/new" className="font-medium underline">
          Draft a post
        </Link>{" "}
        to get started.
      </EmptyState>
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

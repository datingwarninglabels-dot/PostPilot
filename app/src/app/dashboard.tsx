"use client";

import { useState } from "react";
import type { Post } from "@/lib/posts";
import {
  approvePostAction,
  rejectPostAction,
  schedulePostAction,
  unschedulePostAction,
  updatePostContentAction,
} from "./actions";

const STATUS_COLORS: Record<Post["status"], string> = {
  draft: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

function PostCard({ post }: { post: Post }) {
  const [content, setContent] = useState(post.content);
  const [scheduledAt, setScheduledAt] = useState(
    post.scheduled_at ? post.scheduled_at.slice(0, 16) : ""
  );
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const dirty = content !== post.content;

  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-black/5 px-2 py-0.5 capitalize dark:bg-white/10">
            {post.platform}
          </span>
          <span className={`rounded px-2 py-0.5 capitalize ${STATUS_COLORS[post.status]}`}>
            {post.status}
          </span>
        </div>
        <span className="text-xs text-neutral-500">
          {new Date(post.created_at).toLocaleString()}
        </span>
      </div>

      <textarea
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={busy || post.status === "published"}
        className="w-full rounded border border-black/15 px-3 py-2 text-sm dark:border-white/15"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {dirty && (
          <button
            disabled={busy}
            onClick={() => run(() => updatePostContentAction(post.id, content))}
            className="rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
          >
            Save edit
          </button>
        )}

        {(post.status === "draft" || post.status === "rejected") && (
          <>
            <button
              disabled={busy}
              onClick={() => run(() => approvePostAction(post.id))}
              className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
            >
              Approve
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => rejectPostAction(post.id))}
              className="rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
            >
              Reject
            </button>
          </>
        )}

        {(post.status === "approved" || post.status === "scheduled") && (
          <>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={busy}
              className="rounded border border-black/15 px-2 py-1.5 text-sm dark:border-white/15"
            />
            <button
              disabled={busy || !scheduledAt}
              onClick={() =>
                run(() =>
                  schedulePostAction(post.id, new Date(scheduledAt).toISOString())
                )
              }
              className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
            >
              {post.status === "scheduled" ? "Update schedule" : "Schedule"}
            </button>
            {post.status === "scheduled" && (
              <button
                disabled={busy}
                onClick={() => run(() => unschedulePostAction(post.id))}
                className="rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
              >
                Unschedule
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function Dashboard({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No drafts yet. <a href="/new" className="underline">Generate one</a>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

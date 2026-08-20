"use client";

import { useState } from "react";
import type { CommentWithReply, CommentStatus } from "@/lib/comments";
import {
  generateReplyDraftAction,
  updateReplyDraftAction,
  approveReplyAction,
  rejectReplyAction,
  sendReplyAction,
} from "../actions";

const STATUS_COLORS: Record<CommentStatus, string> = {
  new: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  reply_drafted: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  reply_approved: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  replied: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  ignored: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

function CommentCard({ item }: { item: CommentWithReply }) {
  const [draftText, setDraftText] = useState(item.reply?.draft_text ?? "");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const dirty = item.reply != null && draftText !== item.reply.draft_text;

  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-black/5 px-2 py-0.5 capitalize dark:bg-white/10">
            {item.platform}
          </span>
          <span className="rounded bg-black/5 px-2 py-0.5 uppercase dark:bg-white/10">
            {item.message_type}
          </span>
          <span className={`rounded px-2 py-0.5 capitalize ${STATUS_COLORS[item.status]}`}>
            {item.status.replace("_", " ")}
          </span>
        </div>
        <span className="text-xs text-neutral-500">
          {new Date(item.received_at).toLocaleString()}
        </span>
      </div>

      <p className="mb-1 text-xs text-neutral-500">
        {item.author_name ?? item.author_platform_id ?? "Unknown author"}
      </p>
      <p className="mb-3 whitespace-pre-wrap rounded bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
        {item.body}
      </p>

      {item.reply == null ? (
        <button
          disabled={busy}
          onClick={() => run(() => generateReplyDraftAction(item.id))}
          className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Generate reply
        </button>
      ) : (
        <>
          <textarea
            rows={3}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            disabled={busy || item.reply.status !== "draft"}
            className="w-full rounded border border-black/15 px-3 py-2 text-sm dark:border-white/15"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {dirty && (
              <button
                disabled={busy}
                onClick={() => run(() => updateReplyDraftAction(item.reply!.id, draftText))}
                className="rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
              >
                Save edit
              </button>
            )}

            {item.reply.status === "draft" && (
              <>
                <button
                  disabled={busy || dirty}
                  title={dirty ? "Save your edit first" : undefined}
                  onClick={() => run(() => approveReplyAction(item.reply!.id, item.id))}
                  className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  Approve
                </button>
                <button
                  disabled={busy}
                  onClick={() => run(() => rejectReplyAction(item.reply!.id))}
                  className="rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
                >
                  Reject
                </button>
              </>
            )}

            {item.reply.status === "approved" && (
              <button
                disabled={busy}
                onClick={() => run(() => sendReplyAction(item.reply!.id))}
                className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                Send
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function CommentsList({ comments }: { comments: CommentWithReply[] }) {
  if (comments.length === 0) {
    return <p className="text-sm text-neutral-500">No new comments or DMs.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((item) => (
        <CommentCard key={item.id} item={item} />
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommentWithReply, CommentStatus } from "@/lib/comments";
import { useActionRunner } from "@/components/toast";
import {
  generateReplyDraftAction,
  updateReplyDraftAction,
  approveReplyAction,
  rejectReplyAction,
  sendReplyAction,
} from "../actions";

const STATUS_LABEL: Record<CommentStatus, string> = {
  new: "New",
  reply_drafted: "Reply drafted",
  reply_approved: "Reply approved",
  replied: "Replied",
  ignored: "Ignored",
};

const STATUS_COLORS: Record<CommentStatus, string> = {
  new: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  reply_drafted: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  reply_approved: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  replied: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  ignored: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const btnPrimary =
  "inline-flex min-h-9 items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-black/15 px-3 py-1.5 text-sm transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.05]";
const btnDanger =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-red-600/40 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950";

function CommentCard({ item }: { item: CommentWithReply }) {
  const router = useRouter();
  const { pending, run } = useActionRunner();
  const refresh = () => router.refresh();
  const [draftText, setDraftText] = useState(item.reply?.draft_text ?? "");

  const replyDirty = item.reply != null && draftText !== item.reply.draft_text;

  return (
    <article className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded bg-black/5 px-2 py-0.5 font-medium capitalize dark:bg-white/10">
          {item.platform}
        </span>
        <span className="rounded bg-black/5 px-2 py-0.5 font-medium uppercase dark:bg-white/10">
          {item.message_type}
        </span>
        <span className={`rounded px-2 py-0.5 font-medium ${STATUS_COLORS[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
        <span className="ml-auto text-neutral-500">
          {new Date(item.received_at).toLocaleString()}
        </span>
      </div>

      <p className="mb-1 text-xs font-medium text-neutral-500">
        {item.author_name ?? item.author_platform_id ?? "Unknown author"}
      </p>
      <p className="mb-3 whitespace-pre-wrap rounded-md bg-black/5 px-3 py-2 text-sm dark:bg-white/5">
        {item.body || <span className="text-neutral-500">(no text)</span>}
      </p>

      {item.reply == null ? (
        <button
          className={btnPrimary}
          disabled={pending}
          onClick={() => run(() => generateReplyDraftAction(item.id), { onSuccess: refresh })}
        >
          {pending ? "Drafting…" : "Generate reply"}
        </button>
      ) : (
        <>
          <label className="sr-only" htmlFor={`reply-${item.id}`}>
            Reply draft
          </label>
          <textarea
            id={`reply-${item.id}`}
            rows={3}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            disabled={pending || item.reply.status !== "draft"}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/15"
          />
          {item.reply.status === "sent" && (
            <p className="mt-2 text-xs text-green-700 dark:text-green-400">
              Sent{item.reply.sent_at ? ` ${new Date(item.reply.sent_at).toLocaleString()}` : ""}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {replyDirty && (
              <button
                className={btnSecondary}
                disabled={pending}
                onClick={() =>
                  run(() => updateReplyDraftAction(item.reply!.id, draftText), {
                    onSuccess: refresh,
                  })
                }
              >
                Save edit
              </button>
            )}

            {item.reply.status === "draft" && (
              <>
                <button
                  className={btnPrimary}
                  disabled={pending || replyDirty}
                  title={replyDirty ? "Save your edit first" : undefined}
                  onClick={() =>
                    run(() => approveReplyAction(item.reply!.id, item.id), { onSuccess: refresh })
                  }
                >
                  Approve
                </button>
                <button
                  className={btnDanger}
                  disabled={pending}
                  onClick={() =>
                    run(() => rejectReplyAction(item.reply!.id), { onSuccess: refresh })
                  }
                >
                  Reject
                </button>
              </>
            )}

            {item.reply.status === "approved" && (
              <button
                className={btnPrimary}
                disabled={pending}
                onClick={() => run(() => sendReplyAction(item.reply!.id), { onSuccess: refresh })}
              >
                {pending ? "Sending…" : `Approve & send on ${item.platform}`}
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

export function CommentsList({ comments }: { comments: CommentWithReply[] }) {
  if (comments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/15 p-8 text-center dark:border-white/15">
        <p className="text-sm text-neutral-500">
          No open comments or DMs. New ones from connected Facebook Pages and Instagram accounts
          show up here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((item) => (
        <CommentCard key={`${item.id}:${item.reply?.updated_at ?? "none"}`} item={item} />
      ))}
    </div>
  );
}

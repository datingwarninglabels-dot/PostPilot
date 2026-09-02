"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CommentWithReply } from "@/lib/comments";
import { COMMENT_STATUS } from "@/lib/status-display";
import { useActionRunner } from "@/components/toast";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import {
  generateReplyDraftAction,
  updateReplyDraftAction,
  approveReplyAction,
  rejectReplyAction,
  sendReplyAction,
} from "../actions";

function CommentCard({ item }: { item: CommentWithReply }) {
  const router = useRouter();
  const { pending, run } = useActionRunner();
  const refresh = () => router.refresh();
  const [draftText, setDraftText] = useState(item.reply?.draft_text ?? "");

  const replyDirty = item.reply != null && draftText !== item.reply.draft_text;
  const status = COMMENT_STATUS[item.status];

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="neutral" className="capitalize">
          {item.platform}
        </Badge>
        <Badge tone="neutral" className="uppercase">
          {item.message_type}
        </Badge>
        <Badge tone={status.tone}>{status.label}</Badge>
        <span className="ml-auto text-muted">
          {new Date(item.received_at).toLocaleString()}
        </span>
      </div>

      <p className="mb-1 text-xs font-medium text-muted">
        {item.author_name ?? item.author_platform_id ?? "Unknown author"}
      </p>
      <p className="mb-3 whitespace-pre-wrap rounded-control bg-black/[0.04] px-3 py-2 text-sm dark:bg-white/[0.06]">
        {item.body || <span className="text-muted">(no text)</span>}
      </p>

      {item.reply == null ? (
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => run(() => generateReplyDraftAction(item.id), { onSuccess: refresh })}
        >
          {pending ? "Drafting…" : "Generate reply"}
        </Button>
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
            className="w-full rounded-control border border-border-strong bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
          />
          {item.reply.status === "sent" && (
            <p className="mt-2 text-xs text-green-700 dark:text-green-400">
              Sent{item.reply.sent_at ? ` ${new Date(item.reply.sent_at).toLocaleString()}` : ""}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {replyDirty && (
              <Button
                disabled={pending}
                onClick={() =>
                  run(() => updateReplyDraftAction(item.reply!.id, draftText), {
                    onSuccess: refresh,
                  })
                }
              >
                Save edit
              </Button>
            )}

            {item.reply.status === "draft" && (
              <>
                <Button
                  variant="primary"
                  disabled={pending || replyDirty}
                  title={replyDirty ? "Save your edit first" : undefined}
                  onClick={() =>
                    run(() => approveReplyAction(item.reply!.id, item.id), { onSuccess: refresh })
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() =>
                    run(() => rejectReplyAction(item.reply!.id), { onSuccess: refresh })
                  }
                >
                  Reject
                </Button>
              </>
            )}

            {item.reply.status === "approved" && (
              <Button
                variant="primary"
                disabled={pending}
                onClick={() => run(() => sendReplyAction(item.reply!.id), { onSuccess: refresh })}
              >
                {pending ? "Sending…" : `Approve & send on ${item.platform}`}
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

export function CommentsList({ comments }: { comments: CommentWithReply[] }) {
  if (comments.length === 0) {
    return (
      <EmptyState title="No open comments or DMs">
        New ones from connected Facebook Pages and Instagram accounts show up here automatically.
      </EmptyState>
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

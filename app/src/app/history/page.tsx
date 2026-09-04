import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listSentPosts, platformPostUrl, type SentPost } from "@/lib/posts";
import { listSentReplies, type SentReply } from "@/lib/comments";
import { getAccountScope } from "@/lib/platform-connections";
import { AppHeader } from "@/components/app-header";
import { Badge, Card, EmptyState } from "@/components/ui";

export const metadata = { title: "History" };

function dayKey(iso: string | null): string {
  if (!iso) return "Unknown date";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function time(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
}

type Entry =
  | { kind: "post"; at: string | null; data: SentPost }
  | { kind: "reply"; at: string | null; data: SentReply };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  await requireAdmin();
  const { account } = await searchParams;
  const scope = await getAccountScope(account);
  const [posts, replies] = await Promise.all([
    listSentPosts(60, scope ? { connectionId: scope.id } : undefined),
    listSentReplies(60, scope ? { platform: scope.platform } : undefined),
  ]);

  const entries: Entry[] = [
    ...posts.map((p) => ({ kind: "post" as const, at: p.published_at, data: p })),
    ...replies.map((r) => ({ kind: "reply" as const, at: r.sent_at, data: r })),
  ].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

  const byDay = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = dayKey(e.at);
    const bucket = byDay.get(k);
    if (bucket) bucket.push(e);
    else byDay.set(k, [e]);
  }

  return (
    <>
      <AppHeader active="/history" />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold">What went out</h1>
        <p className="mb-6 text-sm text-muted">
          Posts published and replies sent, newest first. Open a Facebook post to check how it&apos;s
          doing; full timestamps and publish ids are in the{" "}
          <Link href="/activity" className="underline">
            activity log
          </Link>
          .
        </p>

        {entries.length === 0 ? (
          <EmptyState title="Nothing has gone out yet">
            Approved posts you publish or schedule, and replies you send, will show up here.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-6">
            {[...byDay.entries()].map(([day, items]) => (
              <section key={day}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {day}
                </h2>
                <div className="flex flex-col gap-2">
                  {items.map((e) =>
                    e.kind === "post" ? (
                      <PostRow key={`p-${e.data.id}`} post={e.data} />
                    ) : (
                      <ReplyRow key={`r-${e.data.id}`} reply={e.data} />
                    )
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function PostRow({ post }: { post: SentPost }) {
  const url = platformPostUrl(post);
  return (
    <Card className="p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="neutral" className="capitalize">
          {post.platform}
        </Badge>
        <Badge tone={post.status === "submitted" ? "accent" : "success"}>
          {post.status === "submitted" ? "Submitted" : "Published"}
        </Badge>
        {post.account_name && <span className="text-muted">{post.account_name}</span>}
        <span className="ml-auto text-muted">{time(post.published_at)}</span>
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap text-sm">{post.content}</p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
        >
          View on Facebook ↗
        </a>
      )}
      {!url && post.platform_post_id && (
        <span className="mt-1 block text-xs text-muted">id: {post.platform_post_id}</span>
      )}
    </Card>
  );
}

function ReplyRow({ reply }: { reply: SentReply }) {
  return (
    <Card className="p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="neutral" className="capitalize">
          {reply.comment?.platform ?? "—"}
        </Badge>
        <Badge tone="info">Reply sent</Badge>
        {reply.comment?.message_type && (
          <span className="text-muted uppercase">{reply.comment.message_type}</span>
        )}
        <span className="ml-auto text-muted">{time(reply.sent_at)}</span>
      </div>
      {reply.comment?.body && (
        <p className="mb-1 line-clamp-2 border-l-2 border-border-strong pl-2 text-xs text-muted">
          {reply.comment.body}
        </p>
      )}
      <p className="line-clamp-3 whitespace-pre-wrap text-sm">{reply.draft_text}</p>
    </Card>
  );
}

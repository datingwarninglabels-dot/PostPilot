import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listActivePosts } from "@/lib/posts";
import { listConnectionsWithHealth, getAccountScope } from "@/lib/platform-connections";
import { listActiveComments } from "@/lib/comments";
import { AppHeader } from "@/components/app-header";
import { Dashboard } from "./dashboard";

export const metadata = { title: "Drafts" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  await requireAdmin();
  const { account } = await searchParams;
  const scope = await getAccountScope(account);

  const [posts, connections, comments] = await Promise.all([
    listActivePosts(scope ? { connectionId: scope.id } : undefined),
    listConnectionsWithHealth(),
    listActiveComments(scope ? { platform: scope.platform } : undefined),
  ]);

  const pendingApproval = posts.filter((p) => p.status === "draft").length;
  const failed = posts.filter((p) => p.status === "failed").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const awaitingReply = comments.filter(
    (c) => c.status === "new" || c.status === "reply_drafted" || c.status === "reply_approved"
  ).length;
  const unhealthy = connections.filter((c) => c.health !== "ok");

  const nothingNeedsYou =
    pendingApproval === 0 && failed === 0 && awaitingReply === 0 && unhealthy.length === 0;

  const firstRun = connections.length === 0;

  return (
    <>
      <AppHeader active="/" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {firstRun && (
          <section className="mb-8 rounded-card border border-border bg-surface p-5">
            <h1 className="text-lg font-semibold">Get set up</h1>
            <p className="mt-1 text-sm text-muted">
              Three steps to your first published post. Every post still needs your explicit
              approval — nothing goes out on its own.
            </p>
            <ol className="mt-4 flex flex-col gap-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span>
                  <Link href="/connections" className="font-medium underline">
                    Connect an account
                  </Link>{" "}
                  — a Facebook Page, Instagram account, or TikTok profile.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold dark:bg-white/15">
                  2
                </span>
                <span>
                  <Link href="/new" className="font-medium underline">
                    Draft a post
                  </Link>{" "}
                  from a product description — pick the platform and target account.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold dark:bg-white/15">
                  3
                </span>
                <span>
                  Review the draft here, then <strong>Approve &amp; publish now</strong> or schedule
                  it. Track what went out under <Link href="/history" className="underline">History</Link>.
                </span>
              </li>
            </ol>
          </section>
        )}

        <section aria-labelledby="attention-heading" className="mb-8">
          <h1 id="attention-heading" className="text-lg font-semibold">
            This morning
            {scope && (
              <span className="ml-2 text-sm font-normal text-muted">· {scope.account_name}</span>
            )}
          </h1>
          {nothingNeedsYou ? (
            <p className="mt-2 text-sm text-muted">
              Nothing needs you right now.{" "}
              {scheduled > 0
                ? `${scheduled} post${scheduled === 1 ? "" : "s"} scheduled to go out.`
                : "No posts scheduled."}
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {pendingApproval > 0 && (
                <li className="rounded-control border border-border bg-black/[0.03] px-3 py-1.5 dark:bg-white/[0.04]">
                  <strong className="font-semibold">{pendingApproval}</strong> waiting for your
                  approval
                </li>
              )}
              {failed > 0 && (
                <li className="rounded-control border border-danger/30 bg-red-50 px-3 py-1.5 text-red-800 dark:bg-red-950 dark:text-red-200">
                  <strong className="font-semibold">{failed}</strong> failed to publish — needs a
                  retry
                </li>
              )}
              {awaitingReply > 0 && (
                <li className="rounded-control border border-border bg-black/[0.03] px-3 py-1.5 dark:bg-white/[0.04]">
                  <Link href="/comments" className="underline-offset-2 hover:underline">
                    <strong className="font-semibold">{awaitingReply}</strong> comment
                    {awaitingReply === 1 ? "" : "s"} / DM{awaitingReply === 1 ? "" : "s"} to handle
                  </Link>
                </li>
              )}
              {unhealthy.map((c) => (
                <li
                  key={c.id}
                  className="rounded-control border border-amber-600/30 bg-amber-50 px-3 py-1.5 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                >
                  <Link href="/connections" className="underline-offset-2 hover:underline">
                    {c.account_name} ({c.platform}){" "}
                    {c.health === "expired"
                      ? "— token expired, reconnect"
                      : `— token expires in ${c.expires_in_days}d, reconnect soon`}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <h2 className="mb-3 text-sm font-medium text-muted">Drafts &amp; in progress</h2>
        <Dashboard posts={posts} connections={connections} />
      </main>
    </>
  );
}

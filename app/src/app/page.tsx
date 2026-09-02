import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listActivePosts } from "@/lib/posts";
import { listConnectionsWithHealth } from "@/lib/platform-connections";
import { listActiveComments } from "@/lib/comments";
import { AppHeader } from "@/components/app-header";
import { Dashboard } from "./dashboard";

export const metadata = { title: "Drafts" };

export default async function HomePage() {
  await requireAdmin();
  const [posts, connections, comments] = await Promise.all([
    listActivePosts(),
    listConnectionsWithHealth(),
    listActiveComments(),
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

  return (
    <>
      <AppHeader active="/" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <section aria-labelledby="attention-heading" className="mb-8">
          <h1 id="attention-heading" className="text-lg font-semibold">
            This morning
          </h1>
          {nothingNeedsYou ? (
            <p className="mt-2 text-sm text-neutral-500">
              Nothing needs you right now.{" "}
              {scheduled > 0
                ? `${scheduled} post${scheduled === 1 ? "" : "s"} scheduled to go out.`
                : "No posts scheduled."}
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {pendingApproval > 0 && (
                <li className="rounded-md border border-black/10 bg-black/[0.03] px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <strong className="font-semibold">{pendingApproval}</strong> waiting for your
                  approval
                </li>
              )}
              {failed > 0 && (
                <li className="rounded-md border border-red-600/30 bg-red-50 px-3 py-1.5 text-red-800 dark:bg-red-950 dark:text-red-200">
                  <strong className="font-semibold">{failed}</strong> failed to publish — needs a
                  retry
                </li>
              )}
              {awaitingReply > 0 && (
                <li className="rounded-md border border-black/10 bg-black/[0.03] px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
                  <Link href="/comments" className="underline-offset-2 hover:underline">
                    <strong className="font-semibold">{awaitingReply}</strong> comment
                    {awaitingReply === 1 ? "" : "s"} / DM{awaitingReply === 1 ? "" : "s"} to handle
                  </Link>
                </li>
              )}
              {unhealthy.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-amber-600/30 bg-amber-50 px-3 py-1.5 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
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

        <h2 className="mb-3 text-sm font-medium text-neutral-500">Drafts &amp; in progress</h2>
        <Dashboard posts={posts} connections={connections} />
      </main>
    </>
  );
}

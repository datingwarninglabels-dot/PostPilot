import { requireAdmin } from "@/lib/auth/require-admin";
import { listConnectionsWithHealth } from "@/lib/platform-connections";
import { AppHeader } from "@/components/app-header";
import { ConnectionsList } from "./connections-list";

export const metadata = { title: "Connections" };

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [connections, { error }] = await Promise.all([
    listConnectionsWithHealth(),
    searchParams,
  ]);

  return (
    <>
      <AppHeader active="/connections" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold">Connected accounts</h1>
        <p className="mb-6 text-sm text-neutral-500">
          The Facebook Pages, Instagram accounts, and TikTok profiles PostPilot can publish to and
          read comments from. Reconnect an account to refresh an expiring token or add new
          permissions.
        </p>
        {error && (
          <div className="mb-4 rounded-md border border-red-600/30 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            Connection failed: {error}
          </div>
        )}
        <ConnectionsList connections={connections} />
      </main>
    </>
  );
}

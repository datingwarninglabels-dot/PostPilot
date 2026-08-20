import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listConnections } from "@/lib/platform-connections";
import { ConnectionsList } from "./connections-list";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const [connections, { error }] = await Promise.all([listConnections(), searchParams]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Connections</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Connection failed: {error}
        </div>
      )}
      <ConnectionsList connections={connections} />
    </div>
  );
}

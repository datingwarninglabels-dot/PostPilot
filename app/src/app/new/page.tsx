import { requireAdmin } from "@/lib/auth/require-admin";
import { listConnections } from "@/lib/platform-connections";
import { AppHeader } from "@/components/app-header";
import { NewDraftForm } from "./new-draft-form";

export const metadata = { title: "New draft" };

export default async function NewDraftPage() {
  await requireAdmin();
  const connections = await listConnections();

  return (
    <>
      <AppHeader active="/new" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold">Draft a post</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Describe the product. The AI writes a first draft for the platform and tone you pick —
          you review and approve it before anything publishes.
        </p>
        <NewDraftForm
          connections={connections.map((c) => ({
            id: c.id,
            platform: c.platform,
            account_name: c.account_name,
          }))}
        />
      </main>
    </>
  );
}

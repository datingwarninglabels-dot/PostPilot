import { requireAdmin } from "@/lib/auth/require-admin";
import { listActiveComments } from "@/lib/comments";
import { getAccountScope } from "@/lib/platform-connections";
import { AppHeader } from "@/components/app-header";
import { CommentsList } from "./comments-list";

export const metadata = { title: "Comments" };

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  await requireAdmin();
  const { account } = await searchParams;
  const scope = await getAccountScope(account);
  const comments = await listActiveComments(scope ? { platform: scope.platform } : undefined);

  return (
    <>
      <AppHeader active="/comments" />
      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold">
          Comments &amp; DMs
          {scope && (
            <span className="ml-2 text-sm font-normal text-muted">· {scope.platform}</span>
          )}
        </h1>
        <p className="mb-6 text-sm text-muted">
          Incoming comments and messages from Facebook and Instagram. Draft a reply, edit it,
          approve it — then send. Nothing is sent automatically.
        </p>
        <CommentsList comments={comments} />
      </main>
    </>
  );
}

import { requireAdmin } from "@/lib/auth/require-admin";
import { listActiveComments } from "@/lib/comments";
import { AppHeader } from "@/components/app-header";
import { CommentsList } from "./comments-list";

export const metadata = { title: "Comments" };

export default async function CommentsPage() {
  await requireAdmin();
  const comments = await listActiveComments();

  return (
    <>
      <AppHeader active="/comments" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold">Comments &amp; DMs</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Incoming comments and messages from Facebook and Instagram. Draft a reply, edit it,
          approve it — then send. Nothing is sent automatically.
        </p>
        <CommentsList comments={comments} />
      </main>
    </>
  );
}

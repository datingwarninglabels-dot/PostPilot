import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listActiveComments } from "@/lib/comments";
import { CommentsList } from "./comments-list";

export default async function CommentsPage() {
  await requireAdmin();
  const comments = await listActiveComments();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Comments</h1>
        <Link href="/" className="text-sm text-neutral-500 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
      <CommentsList comments={comments} />
    </div>
  );
}

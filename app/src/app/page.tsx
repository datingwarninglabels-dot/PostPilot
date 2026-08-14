import { requireAdmin } from "@/lib/auth/require-admin";
import { listActivePosts } from "@/lib/posts";
import { Dashboard } from "./dashboard";
import { SignOutButton } from "./sign-out-button";

export default async function HomePage() {
  await requireAdmin();
  const posts = await listActivePosts();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Drafts</h1>
        <div className="flex items-center gap-4">
          <a href="/new" className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">
            + New draft
          </a>
          <SignOutButton />
        </div>
      </div>
      <Dashboard posts={posts} />
    </div>
  );
}

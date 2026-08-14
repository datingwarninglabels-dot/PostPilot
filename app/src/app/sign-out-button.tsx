"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/auth/browser";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleSignOut} className="text-sm text-neutral-500 hover:underline">
      Sign out
    </button>
  );
}

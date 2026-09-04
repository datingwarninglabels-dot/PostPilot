"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/auth/browser";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {
      // Network hiccup — still send them to /login; the server gate re-checks.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm text-muted transition-colors hover:text-foreground"
    >
      Sign out
    </button>
  );
}

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase Auth client — only for the login form. Must only be
 * imported from a Client Component.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.local.example to .env.local."
    );
  }
  return createBrowserClient(url, anonKey);
}

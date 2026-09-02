import Link from "next/link";
import { SignOutButton } from "@/app/sign-out-button";

const NAV = [
  { href: "/", label: "Drafts" },
  { href: "/comments", label: "Comments" },
  { href: "/activity", label: "Activity" },
  { href: "/connections", label: "Connections" },
] as const;

/** One header for every screen — the app previously hand-rolled a different link
 *  set, in a different order, on each page. `active` is the current pathname. */
export function AppHeader({ active }: { active: string }) {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          PostPilot
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {NAV.map((n) => {
            const isActive = active === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "font-medium text-foreground"
                    : "text-neutral-500 transition-colors hover:text-foreground"
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/new"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            New draft
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

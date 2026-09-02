import { Suspense } from "react";
import Link from "next/link";
import { listConnections } from "@/lib/platform-connections";
import { SignOutButton } from "@/app/sign-out-button";
import { AccountSwitcher } from "./account-switcher";

const NAV = [
  { href: "/", label: "Drafts" },
  { href: "/comments", label: "Comments" },
  { href: "/history", label: "History" },
  { href: "/activity", label: "Activity" },
  { href: "/connections", label: "Connections" },
] as const;

/** One header for every screen — the app previously hand-rolled a different link
 *  set, in a different order, on each page. `active` is the current pathname. */
export async function AppHeader({ active }: { active: string }) {
  const connections = await listConnections();
  const showSwitcher = connections.length > 1 && active !== "/connections";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
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
                    : "text-muted transition-colors hover:text-foreground"
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {showSwitcher && (
            <Suspense fallback={null}>
              <AccountSwitcher
                connections={connections.map((c) => ({
                  id: c.id,
                  platform: c.platform,
                  account_name: c.account_name,
                }))}
              />
            </Suspense>
          )}
          <Link
            href="/new"
            className="rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            New draft
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

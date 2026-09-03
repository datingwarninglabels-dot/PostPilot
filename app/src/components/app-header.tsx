import { Suspense } from "react";
import Link from "next/link";
import { listConnections } from "@/lib/platform-connections";
import { HeaderNav } from "./header-nav";

/** One header for every screen. `active` is the current pathname. Collapses to a
 *  hamburger menu below the `sm` breakpoint (see HeaderNav). */
export async function AppHeader({ active }: { active: string }) {
  const connections = await listConnections();
  const showSwitcher = connections.length > 1 && active !== "/connections";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-[15px] font-semibold tracking-tight">
          PostPilot
        </Link>
        <Suspense fallback={null}>
          <HeaderNav
            active={active}
            showSwitcher={showSwitcher}
            connections={connections.map((c) => ({
              id: c.id,
              platform: c.platform,
              account_name: c.account_name,
            }))}
          />
        </Suspense>
      </div>
    </header>
  );
}

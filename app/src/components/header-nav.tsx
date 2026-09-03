"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/app/sign-out-button";
import { AccountSwitcher } from "./account-switcher";

const NAV = [
  { href: "/", label: "Drafts" },
  { href: "/comments", label: "Comments" },
  { href: "/history", label: "History" },
  { href: "/activity", label: "Activity" },
  { href: "/connections", label: "Connections" },
] as const;

type Option = { id: string; platform: string; account_name: string };

function navLinkClass(isActive: boolean) {
  return isActive
    ? "font-medium text-foreground"
    : "text-muted transition-colors hover:text-foreground";
}

export function HeaderNav({
  active,
  connections,
  showSwitcher,
}: {
  active: string;
  connections: Option[];
  showSwitcher: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:flex">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active === n.href ? "page" : undefined}
            className={navLinkClass(active === n.href)}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto hidden items-center gap-3 sm:flex">
        {showSwitcher && <AccountSwitcher connections={connections} />}
        <Link
          href="/new"
          className="rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          New draft
        </Link>
        <SignOutButton />
      </div>

      {/* Mobile */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-control border border-border-strong sm:hidden"
      >
        <span aria-hidden className="text-lg leading-none">
          {open ? "✕" : "☰"}
        </span>
      </button>
      {open && (
        <div className="w-full sm:hidden">
          <nav className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={active === n.href ? "page" : undefined}
                className={`rounded-control px-2 py-2 ${navLinkClass(active === n.href)}`}
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3">
              {showSwitcher && <AccountSwitcher connections={connections} />}
              <Link
                href="/new"
                onClick={() => setOpen(false)}
                className="inline-flex w-fit rounded-control bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                New draft
              </Link>
              <SignOutButton />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Option = { id: string; platform: string; account_name: string };

/**
 * Scopes Drafts / Comments / History / Activity to one connected account via a
 * `?account=<id>` query param. Only rendered when more than one account is
 * connected (see AppHeader).
 */
export function AccountSwitcher({ connections }: { connections: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("account") ?? "";

  function change(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("account", value);
    else params.delete("account");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="flex items-center gap-1.5 text-sm">
      <span className="sr-only">Filter by account</span>
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        className="min-h-8 max-w-[11rem] truncate rounded-control border border-border-strong bg-transparent px-2 py-1 text-sm"
      >
        <option value="">All accounts</option>
        {connections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.account_name} · {c.platform}
          </option>
        ))}
      </select>
    </label>
  );
}

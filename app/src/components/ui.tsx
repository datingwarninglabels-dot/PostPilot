import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/* Presentational primitives — no hooks, no "use client", so they work in both
   Server and Client Components. One definition each for the button / card / badge
   shapes that were copy-pasted across every screen. */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary:
    "border border-border-strong text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
  danger:
    "border border-danger/40 text-danger hover:bg-danger/10 dark:hover:bg-danger/15",
  ghost: "text-muted hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "min-h-8 px-2.5 py-1 text-xs",
  md: "min-h-9 px-3 py-1.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cx(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-card border border-border bg-card shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    />
  );
}

type BadgeTone = "neutral" | "info" | "warn" | "success" | "danger" | "accent";

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: "bg-black/[0.06] text-muted dark:bg-white/10",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  success: "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-200",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200",
  accent: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        BADGE_TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-border-strong p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-control border border-border-strong bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary";

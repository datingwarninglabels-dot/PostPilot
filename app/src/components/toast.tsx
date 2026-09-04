"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ActionResult } from "@/lib/action-result";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const STYLE: Record<ToastKind, string> = {
  success:
    "border-green-600/30 bg-green-50 text-green-900 dark:border-green-400/20 dark:bg-green-950 dark:text-green-100",
  error:
    "border-red-600/30 bg-red-50 text-red-900 dark:border-red-400/20 dark:bg-red-950 dark:text-red-100",
  info: "border-border-strong bg-card text-foreground",
};

const ICON: Record<ToastKind, string> = { success: "✓", error: "!", info: "i" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++idRef.current;
      setToasts((current) => [...current, { id, kind, message }]);
      window.setTimeout(() => remove(id), kind === "error" ? 9000 : 4500);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show("success", m),
      error: (m) => show("error", m),
      info: (m) => show("info", m),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border px-4 py-3 text-sm shadow-[var(--shadow-pop)] ${STYLE[t.kind]}`}
          >
            <span
              aria-hidden
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold"
            >
              {ICON[t.kind]}
            </span>
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 text-current/60 hover:text-current"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Wraps a Server Action call: tracks a pending flag, then turns its
 * {@link ActionResult} into a toast — a success message or the real error, never
 * silence. Optional `onSuccess` runs only when the action reported `ok`.
 */
export function useActionRunner() {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (
      fn: () => Promise<ActionResult>,
      opts?: { onSuccess?: () => void; silentSuccess?: boolean }
    ): Promise<ActionResult> => {
      setPending(true);
      try {
        const result = await fn();
        if (result.ok) {
          if (!opts?.silentSuccess) toast.success(result.message ?? "Done.");
          opts?.onSuccess?.();
        } else {
          toast.error(result.error);
        }
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong — please try again.";
        toast.error(message);
        return { ok: false, error: message };
      } finally {
        setPending(false);
      }
    },
    [toast]
  );

  return { pending, run };
}

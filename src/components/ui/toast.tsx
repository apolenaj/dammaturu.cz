"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "danger" | "info" | "neutral";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = ToastInput & { id: string };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClass: Record<ToastTone, string> = {
  success: "border-success/35 bg-surface text-fg",
  danger: "border-danger/35 bg-surface text-fg",
  info: "border-info/35 bg-surface text-fg",
  neutral: "border-border bg-surface text-fg",
};

const toneAccent: Record<ToastTone, string> = {
  success: "bg-success",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-fg-muted",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}`;
      const item: ToastItem = {
        id,
        tone: "neutral",
        durationMs: 4200,
        ...input,
      };
      setItems((prev) => [...prev, item]);
      window.setTimeout(() => dismiss(id), item.durationMs ?? 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-6 sm:items-end sm:pr-6"
              aria-live="polite"
              aria-relevant="additions"
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "pointer-events-auto flex w-full max-w-sm animate-toast-in overflow-hidden rounded-lg border shadow-md",
                    toneClass[item.tone ?? "neutral"],
                  )}
                  role="status"
                >
                  <span
                    className={cn("w-1 shrink-0", toneAccent[item.tone ?? "neutral"])}
                    aria-hidden
                  />
                  <div className="flex flex-1 items-start gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-semibold">{item.title}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-body-sm text-fg-muted">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-caption font-semibold text-fg-muted transition hover:bg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      onClick={() => dismiss(item.id)}
                    >
                      Zavřít
                    </button>
                  </div>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast musí být uvnitř ToastProvider");
  }
  return ctx;
}

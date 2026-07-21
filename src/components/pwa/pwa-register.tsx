"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Registers service worker + optional install prompt (Android/Chrome).
 */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Never register a SW in development — it caches RSC shells and can leave
    // the app stuck on app/loading.tsx after navigations (launch-gate blocker).
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) void r.unregister();
      });
      return;
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (standalone) setInstalled(true);

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore — private mode / unsupported */
    });

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      setDeferred({
        prompt: async () => {
          await ev.prompt();
          const choice = await ev.userChoice;
          if (choice.outcome === "accepted") setInstalled(true);
          setDeferred(null);
        },
      });
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (installed || !deferred) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg rounded-xl border border-border bg-surface p-3 shadow-lg lg:bottom-6">
      <p className="text-body-sm font-semibold text-fg">
        Dej si DámMaturu na plochu
      </p>
      <p className="mt-0.5 text-caption text-fg-muted">
        Otevřeš za vteřinu — ideální do autobusu.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-11 flex-1"
          onClick={() => void deferred.prompt()}
        >
          Nainstalovat
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11"
          onClick={() => setDeferred(null)}
        >
          Teď ne
        </Button>
      </div>
    </div>
  );
}

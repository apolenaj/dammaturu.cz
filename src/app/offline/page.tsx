import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="font-display text-display-sm text-fg">Jsi offline</h1>
      <p className="text-body-md text-fg-secondary">
        Tahle stránka teď nejde načíst. Až bude síť, pokračuj v misi.
      </p>
      <Link
        href="/app/dashboard"
        className="inline-flex min-h-12 items-center justify-center rounded-lg bg-action px-4 text-body-sm font-semibold text-fg-on-brand"
      >
        Zkusit Dnes
      </Link>
    </main>
  );
}

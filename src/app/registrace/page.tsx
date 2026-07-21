import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Registrace · Beta" };

/**
 * Beta 1.0: žádný email/heslo — vstup je onboarding + signed cookie.
 * Plný účet přijde se Supabase Auth.
 */
export default function RegistracePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-4 py-12">
      <Badge tone="brand">Private Beta 1.0</Badge>
      <h1 className="mt-3 font-display text-display-md text-fg">
        Začni přípravu
      </h1>
      <p className="mt-3 text-body-md text-fg-secondary">
        V této betě není klasická registrace e-mailem. Vytvoříš studijní profil
        (jméno, deadline{" "}
        <strong className="font-semibold text-fg">31. srpna 2026</strong>, čas
        na den) a progress se uloží do prohlížeče přes zabezpečenou session
        cookie.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-body-sm text-fg-secondary">
        <li>Onboarding → diagnostika → automatický plán → denní mise</li>
        <li>Stejný prohlížeč = stejný progress (nesdílej zařízení)</li>
        <li>Přihlášení účtem přijde až po Auth</li>
      </ul>
      <Link
        href="/onboarding"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand"
      >
        Pokračovat na onboarding
      </Link>
      <p className="mt-4 text-center text-caption text-fg-muted">
        Už máš profil?{" "}
        <Link href="/app/dashboard" className="font-semibold text-action">
          Otevři Dnes
        </Link>
      </p>
    </div>
  );
}

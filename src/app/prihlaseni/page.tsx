import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { Badge } from "@/components/ui/badge";
import { getSessionResumeAction } from "@/server/actions/learner-session";

export const metadata: Metadata = {
  title: "Přihlášení",
};

/**
 * Soft session resume — no email/password Auth.
 * If signed cookie exists → continue; else → onboarding.
 */
export default async function PrihlaseniPage() {
  const session = await getSessionResumeAction();
  const hasSession = session?.hasSession === true;

  return (
    <MarketingShell>
      <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <Badge tone="brand">Private Beta</Badge>
        <h1 className="mt-3 font-display text-display-md text-fg">
          {hasSession ? "Pokračovat ve studiu" : "Přihlášení"}
        </h1>
        {hasSession ? (
          <>
            <p className="mt-3 text-body-md text-fg-secondary">
              Ahoj{session.displayName ? `, ${session.displayName}` : ""}. Máš
              aktivní session v tomto prohlížeči — progress je uložený.
            </p>
            <p className="mt-2 text-body-sm text-fg-muted">
              Klasické přihlášení e-mailem ještě není. Session = tento prohlížeč
              + zabezpečená cookie.
            </p>
            <Link
              href="/app/dashboard"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand"
            >
              Otevřít Dnes
            </Link>
            <p className="mt-4 text-center text-caption text-fg-muted">
              Jiný profil?{" "}
              <Link href="/registrace" className="font-semibold text-action">
                Nový onboarding
              </Link>{" "}
              (přepíše cookie)
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-body-md text-fg-secondary">
              V této betě není e-mail/heslo. Studijní profil vzniká v
              onboardingu a drží se přes session cookie v prohlížeči.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-body-sm text-fg-secondary">
              <li>Stejný prohlížeč = stejný progress</li>
              <li>Odhlášení smaže cookie (data na serveru zůstanou)</li>
              <li>Auth účtem přijde později (Supabase)</li>
            </ul>
            <Link
              href="/onboarding"
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-action px-5 text-body-sm font-semibold uppercase tracking-wide text-fg-on-brand"
            >
              Začít onboarding
            </Link>
            <p className="mt-4 text-center text-caption text-fg-muted">
              Už máš cookie?{" "}
              <Link href="/app/dashboard" className="font-semibold text-action">
                Zkus otevřít Dnes
              </Link>
            </p>
          </>
        )}
      </div>
    </MarketingShell>
  );
}

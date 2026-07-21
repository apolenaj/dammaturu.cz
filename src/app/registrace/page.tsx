import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { Badge } from "@/components/ui/badge";
import { RegisterForm } from "@/components/auth/register-form";
import { getAuthCapabilitiesAction } from "@/server/actions/auth";
import { safeInternalPath } from "@/lib/security/hardening";

export const metadata: Metadata = { title: "Registrace" };

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function RegistracePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const caps = await getAuthCapabilitiesAction();
  const nextPath = safeInternalPath(params.next, "/onboarding");

  return (
    <MarketingShell>
      <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <Badge tone="brand">Účet</Badge>
        <h1 className="mt-3 font-display text-display-md text-fg">Registrace</h1>
        <p className="mt-3 text-body-md text-fg-secondary">
          Vytvoř si účet e-mailem a heslem. Po registraci nastavíš studijní plán
          v onboardingu. Progress zůstane u tvého účtu.
        </p>
        <RegisterForm caps={caps} nextPath={nextPath} />
      </div>
    </MarketingShell>
  );
}

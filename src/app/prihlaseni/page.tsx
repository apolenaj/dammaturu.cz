import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { Badge } from "@/components/ui/badge";
import { LoginForm } from "@/components/auth/login-form";
import { safeInternalPath } from "@/lib/security/hardening";
import {
  getAuthCapabilitiesAction,
} from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Přihlášení",
};

type PageProps = {
  searchParams: Promise<{ next?: string; reason?: string }>;
};

export default async function PrihlaseniPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const caps = await getAuthCapabilitiesAction();
  // Do NOT use pre-login session to choose fallback — after logout
  // hasOnboarding is always false and would trap returning users on /onboarding.
  // /app layout redirects to onboarding when the learner profile is missing.
  const nextPath = safeInternalPath(params.next, "/app/dashboard");

  return (
    <MarketingShell>
      <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <Badge tone="brand">Účet</Badge>
        <h1 className="mt-3 font-display text-display-md text-fg">Přihlášení</h1>
        <p className="mt-3 text-body-md text-fg-secondary">
          Přihlas se e-mailem a heslem. Progress je vázaný na účet — funguje po
          restartu prohlížeče i na jiném zařízení.
        </p>
        <LoginForm
          caps={caps}
          nextPath={nextPath}
          initialReason={params.reason}
        />
      </div>
    </MarketingShell>
  );
}

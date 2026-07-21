import type { Metadata } from "next";
import { MarketingShell } from "@/components/shell/MarketingShell";
import { Badge } from "@/components/ui/badge";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = {
  title: "Nové heslo",
  robots: { index: false, follow: false },
};

export default function NoveHesloPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <Badge tone="brand">Účet</Badge>
        <h1 className="mt-3 font-display text-display-md text-fg">Nové heslo</h1>
        <p className="mt-3 text-body-md text-fg-secondary">
          Nastav nové heslo k účtu. Pak můžeš pokračovat ve studiu.
        </p>
        <NewPasswordForm />
      </div>
    </MarketingShell>
  );
}

import type { Metadata } from "next";
import { GlassLoginForm } from "@/components/auth/glass-auth-form";
import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "Přihlášení",
    description: "Přihlášení do DámMaturu — studijní prostor k maturitě.",
    path: "/login",
  }),
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <GlassAuthShell
      title="Přihlášení"
      description="Přihlas se e-mailem a heslem. Tvůj pokrok zůstane u účtu — funguje po restartu prohlížeče i na jiném zařízení."
    >
      <GlassLoginForm />
    </GlassAuthShell>
  );
}

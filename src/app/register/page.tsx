import type { Metadata } from "next";
import { GlassRegisterForm } from "@/components/auth/glass-auth-form";
import { GlassAuthShell } from "@/components/auth/glass-auth-shell";
import { buildPublicMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildPublicMetadata({
    title: "Registrace",
    description: "Vytvoř účet DámMaturu a začni se připravovat na maturitu.",
    path: "/register",
  }),
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <GlassAuthShell
      title="Registrace"
      description="Vytvoř si účet e-mailem a heslem. Po registraci tě přesměrujeme do přehledu a můžeš rovnou začít."
    >
      <GlassRegisterForm />
    </GlassAuthShell>
  );
}

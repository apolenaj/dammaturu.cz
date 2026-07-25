import { redirect } from "next/navigation";

/**
 * Veřejný alias po úspěšném přihlášení / registraci.
 * Směruje do aplikačního dashboardu.
 */
export default function PrehledPage() {
  redirect("/app/dashboard");
}

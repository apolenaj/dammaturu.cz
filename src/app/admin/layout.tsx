import { AdminShell } from "@/components/shell/AdminShell";
import { isAdminAuthenticated } from "@/server/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return <>{children}</>;
  }
  return <AdminShell>{children}</AdminShell>;
}

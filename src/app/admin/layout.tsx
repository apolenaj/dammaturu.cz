import type { Metadata } from "next";
import { AdminShell } from "@/components/shell/AdminShell";
import { isAdminAuthenticated } from "@/server/admin-auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

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

import type { Metadata } from "next";
import { RouteFeaturePage } from "@/components/ui/RouteFeaturePage";

export const metadata: Metadata = { title: "Admin · Uživatelé" };

export default function AdminUsersPage() {
  return (
    <RouteFeaturePage
      href="/admin/users"
      primaryHref="/admin/content"
      primaryLabel="Obsah"
      secondaryHref="/app/dashboard"
      secondaryLabel="Studijní appka"
    />
  );
}

import type { Metadata } from "next";
import { RouteFeaturePage } from "@/components/ui/RouteFeaturePage";

export const metadata: Metadata = { title: "Admin · Otázky" };

export default function AdminQuestionsPage() {
  return (
    <RouteFeaturePage
      href="/admin/questions"
      primaryHref="/admin/content"
      primaryLabel="Obsah"
      secondaryHref="/admin/reviews"
      secondaryLabel="Review"
    />
  );
}

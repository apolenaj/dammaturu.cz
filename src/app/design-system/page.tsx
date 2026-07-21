import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

/** Interní showcase — v produkci 404 (middleware + guard). */
export default async function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { DesignSystemShowcase } = await import("./design-system-showcase");
  return <DesignSystemShowcase />;
}

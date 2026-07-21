import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import Link from "next/link";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DámMaturu.cz",
    template: "%s · DámMaturu.cz",
  },
  description:
    "Kompletní systém přípravy k maturitě. Víš přesně, co se naučit. A víš, kdy jsi připraven.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-action focus:px-3 focus:py-2 focus:text-body-sm focus:font-semibold focus:text-fg-on-brand"
        >
          Přeskočit na obsah
        </a>
        <AppProviders>{children}</AppProviders>
        <noscript>
          <p className="p-4 text-center text-body-sm">
            DámMaturu.cz vyžaduje JavaScript.{" "}
            <Link href="/jak-to-funguje">Jak to funguje</Link>
          </p>
        </noscript>
      </body>
    </html>
  );
}

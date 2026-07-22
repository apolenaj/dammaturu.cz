import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import Link from "next/link";
import { AppProviders } from "@/components/providers/app-providers";
import { PwaRegister } from "@/components/pwa/pwa-register";
import {
  getSiteUrl,
  shouldNoIndexDeployment,
} from "@/lib/seo";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const sans = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const siteUrl = getSiteUrl();
const previewNoIndex = shouldNoIndexDeployment();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DámMaturu.cz",
    template: "%s · DámMaturu.cz",
  },
  description:
    "Víš, co se naučit. Víš, co už umíš. Denní mise, cvičení z materiálů a jasný pokrok k maturitě z češtiny.",
  applicationName: "DámMaturu",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: siteUrl,
    siteName: "DámMaturu.cz",
    title: "DámMaturu.cz",
    description:
      "Víš, co se naučit. Víš, co už umíš. Příprava na maturitu z češtiny.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DámMaturu.cz",
    description:
      "Víš, co se naučit. Víš, co už umíš. Příprava na maturitu z češtiny.",
  },
  robots: previewNoIndex
    ? { index: false, follow: false, nocache: true }
    : { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DámMaturu",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d7a6a" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`${display.variable} ${sans.variable}`}>
      <body className="overflow-x-clip">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-action focus:px-4 focus:py-3 focus:text-body-sm focus:font-semibold focus:text-fg-on-brand focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
        >
          Přeskočit na obsah
        </a>
        <AppProviders>{children}</AppProviders>
        <PwaRegister />
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

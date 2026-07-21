import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import Link from "next/link";
import { AppProviders } from "@/components/providers/app-providers";
import { PwaRegister } from "@/components/pwa/pwa-register";
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
    "Nahraj materiály a připrav se k maturitě — denní mise, testy, ústní. Ideální i na mobil.",
  applicationName: "DámMaturu",
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
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-action focus:px-3 focus:py-2 focus:text-body-sm focus:font-semibold focus:text-fg-on-brand"
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

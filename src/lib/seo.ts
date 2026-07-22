/**
 * Public SEO helpers — production canonicals, preview noindex, metadata builders.
 */

import type { Metadata } from "next";

export const PRODUCTION_SITE_URL = "https://dammaturu.cz";

/** Prefer explicit production URL; never use a Vercel preview host as canonical. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (fromEnv && !isPreviewHost(fromEnv)) return fromEnv;
  return PRODUCTION_SITE_URL;
}

export function isPreviewHost(urlOrHost: string): boolean {
  try {
    const host = urlOrHost.includes("://")
      ? new URL(urlOrHost).host
      : urlOrHost;
    return (
      host.endsWith(".vercel.app") ||
      host.includes("---") || // typical preview slug pattern
      Boolean(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
    );
  } catch {
    return false;
  }
}

/**
 * True when this deployment should not be indexed (preview / non-production).
 * Canonical still points at production so previews don't compete in SERP.
 */
export function shouldNoIndexDeployment(): boolean {
  if (process.env.SEO_FORCE_INDEX === "1") return false;
  if (process.env.SEO_FORCE_NOINDEX === "1") return true;
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return true;
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && isPreviewHost(vercelUrl)) return true;
  return false;
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type PublicPageSeoInput = {
  title: string;
  description: string;
  path: string;
  /** Override OG title */
  ogTitle?: string;
  noIndex?: boolean;
  type?: "website" | "article";
};

export function buildPublicMetadata(input: PublicPageSeoInput): Metadata {
  const canonical = absoluteUrl(input.path);
  const noIndex = input.noIndex || shouldNoIndexDeployment();
  const title = input.title;
  const description = input.description.slice(0, 160);
  const ogTitle = input.ogTitle ?? `${title} · DámMaturu.cz`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: input.type ?? "website",
      locale: "cs_CZ",
      url: canonical,
      siteName: "DámMaturu.cz",
      title: ogTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}

/** Private / app surfaces — never in sitemap, always noindex via robots + meta. */
export const PRIVATE_PATH_PREFIXES = [
  "/app",
  "/admin",
  "/onboarding",
  "/auth",
  "/design-system",
  "/offline",
] as const;

/**
 * Real public URLs eligible for sitemap (marketing + curated learning).
 * Keep in sync with `src/domain/seo/public-learning-pages.ts` slugs.
 */
export function listPublicSitemapPaths(): string[] {
  return [
    "/",
    "/jak-to-funguje",
    "/maturitni-priprava",
    "/predmety",
    "/cenik",
    "/o-projektu",
    "/priprava",
    // Learning cluster — only curated, non-thin pages
    "/priprava/maturita-z-cestiny",
    "/priprava/didakticky-test-z-cestiny",
    "/priprava/pravopis",
    "/priprava/vetne-cleny",
    "/priprava/souveti",
    "/priprava/porozumeni-textu",
    "/priprava/literarni-smery",
    "/priprava/romantismus",
    "/priprava/realismus",
    "/priprava/narodni-obrozeni",
    "/priprava/maturitni-cetba",
    "/priprava/maj",
    "/priprava/babicka",
    "/priprava/kytice",
    // Auth landing is public but low SEO value — include with lower priority only via sitemap config
    "/registrace",
  ];
}

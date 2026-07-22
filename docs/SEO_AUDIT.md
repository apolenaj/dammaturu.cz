# SEO Audit Report — DámMaturu.cz

**Date:** 2026-07-22  
**Scope:** Public marketing + curated learning layer  
**Target:** Technical + content SEO; **no indexing** of private/student app

## Implemented

| Item | Status | Notes |
|------|--------|-------|
| Unique page titles | Done | Template `%s · DámMaturu.cz`; hub/topics use distinct `seoTitle` |
| Meta descriptions | Done | Public pages via `buildPublicMetadata` (≤160 chars on learning pages) |
| Canonical URLs | Done | Always `https://dammaturu.cz` (or `NEXT_PUBLIC_SITE_URL` if non-preview) |
| robots.txt | Done | `src/app/robots.ts` — disallows `/app/`, `/admin/`, `/onboarding`, `/auth/`, `/api/`, … |
| Sitemap | Done | `src/app/sitemap.ts` — **real public paths only** from `listPublicSitemapPaths()` |
| Open Graph / Twitter | Done | Per-page via `buildPublicMetadata` |
| Preview noindex | Done | `shouldNoIndexDeployment()` when `VERCEL_ENV !== production` or `*.vercel.app`; robots disallow `/`; sitemap empty |
| Private noindex | Done | `/app/*` + `/admin/*` layouts set `robots: noindex`; onboarding/offline/auth already |
| Structured data | Done | Home: WebSite + SoftwareApplication + FAQPage + ItemList; `/priprava`: CollectionPage; topics: Article + BreadcrumbList |
| Semantic headings | Done | Single H1 per learning article; H2 per section; hub uses H1 + cluster H2 |
| Internal linking | Done | Nav + footer + related topics + hub CTAs |
| Crawlable public content | Done | `/priprava` + 14 curated topic pages (SSR/static params) |
| Verified-backed content | Done | Literary pages flagged `verifiedBacked` (NO, romantismus, realismus, Máj, Babička, Kytice) |
| No thin mass pages | Done | Cap ~14 learning URLs; quality tests enforce body length |

## Public URL inventory (sitemap)

- `/`
- `/jak-to-funguje`, `/maturitni-priprava`, `/predmety`, `/cenik`, `/o-projektu`
- `/priprava`
- `/priprava/maturita-z-cestiny`
- `/priprava/didakticky-test-z-cestiny`
- `/priprava/pravopis`, `/vetne-cleny`, `/souveti`, `/porozumeni-textu`
- `/priprava/literarni-smery`, `/romantismus`, `/realismus`, `/narodni-obrozeni`
- `/priprava/maturitni-cetba`, `/maj`, `/babicka`, `/kytice`
- `/registrace` (public entry; `/prihlaseni` is **noindex**)

**Not in sitemap:** `/app/**`, `/admin/**`, `/onboarding`, `/auth/**`, `/design-system`, `/offline`

## Structured data validation (manual checklist)

Run after deploy:

1. [Google Rich Results Test](https://search.google.com/test/rich-results) on `/`, `/priprava`, `/priprava/narodni-obrozeni`
2. Confirm FAQPage only on homepage (FAQ content present)
3. Confirm Article + BreadcrumbList on topic pages
4. Confirm **no** JSON-LD on `/app/**`

Automated smoke: `npm test -- src/lib/seo.test.ts` (canonical, uniqueness, quality bar, FAQ shape).

## Preview / production dual-deploy

| Env | Indexing | Canonical | Sitemap |
|-----|----------|-----------|---------|
| Production (`VERCEL_ENV=production`) | allow public | production host | full public list |
| Preview / development | **noindex** + robots `Disallow: /` | still production host | **empty** |

Overrides: `SEO_FORCE_NOINDEX=1` / `SEO_FORCE_INDEX=1` (emergency only).

## Remaining / follow-ups

| ID | Severity | Issue |
|----|----------|-------|
| SEO-01 | Low | No dedicated OG image asset yet — browsers fall back to default; add `opengraph-image` when brand art is ready |
| SEO-02 | Medium | Curriculum overview pages (pravopis, souvětí…) are editorial, not Content-QA verbatim — clearly labeled; deepen only when verified extracts exist |
| SEO-03 | Low | `/predmety` is scaffolded — keep thin until more subjects launch (honest empty > fake catalog) |
| SEO-04 | Medium | Submit sitemap in Search Console after first production deploy |
| SEO-05 | Low | Consider `hreflang` only if multi-language launches (currently `cs` only — correct) |

## Do not regress

- Never add `/app/**` to sitemap
- Never mass-generate thin topic pages
- Never set preview host as `metadataBase` / canonical
- Never claim „Ověřeno ze zdroje“ on public pages without Content Trust / QA backing

# INFORMATION_ARCHITECTURE — DámMaturu.cz

> Stav k: 2026-07-21. Implementováno ve `src/app` + `src/lib/navigation.ts` (D-057).

## Princip

Navigace kolem **student jobs-to-be-done**. Chrome je krátký; hlubší nástroje žijí uvnitř hubů (Učit se / Testy / Profil / Plán). Nikdy neukazuj `scaffolded` / `blocked` v navigaci.

## APP chrome

### Primární (5) — sidebar „Hlavní“ + mobile bottom nav
| Route | Label |
|-------|-------|
| `/app/dashboard` | Dnes |
| `/app/learn` | Učit se |
| `/app/materials` | Moje materiály |
| `/app/tests` | Testy |
| `/app/progress` | Pokrok |

### Sekundární (5) — sidebar „Další“ + mobile „Víc“
| Route | Label |
|-------|-------|
| `/app/review` | Opakování |
| `/app/mistakes` | Moje chyby |
| `/app/plan` | Plán |
| `/app/simulation` | Zkouška nanečisto |
| `/app/profile` | Profil |

### Hub-only (ne v chrome)
| Route | Vstup |
|-------|-------|
| `/app/minute` | Dnes → „1 minuta učení“ (bus-friendly, D-059) |
| `/app/literature`, `/app/topics`, `/app/cermat`, `/app/zachran-me` | Učit se → Maturitní nástroje |
| `/app/exam-profile` | Profil → Profil maturity |
| `/app/progress/experiment` | Pokrok |

## Shell

- Desktop (≥ lg): sidebar — Hlavní (5) + Další (5)
- Mobile: sticky header (safe-area top) + „Víc“ + fixed bottom nav ≥44px (safe-area bottom)
- Overflow-x clip; sticky study CTAs above bottom nav
- PWA: installable standalone (`manifest` + `sw.js`)
- Admin: jen `ready` položky (`getVisibleAdminNav`)

## Screen contract

Každý learner hub: **účel** + **jedna primární akce** (`AppPageHeader`) + užitečný empty / loading / error (`EmptyState`, `AppLoadingState`, `AppErrorState`).

## Feature states

`ready` | `scaffolded` | `blocked` — žádný fake obsah, žádná mrtvá CTA. Chrome filtruje přes `filterReadyNav`.

## PUBLIC / ADMIN

Viz `routeCatalog` v `src/lib/navigation.ts` (auth ready; admin questions scaffolded, users blocked).

# INFORMATION_ARCHITECTURE — DámMaturu.cz

> Stav k: 2026-07-20. Implementováno ve `src/app` + `src/lib/navigation.ts`.

## Mapa

### PUBLIC
| Route | Stav |
|-------|------|
| `/` | ready — brand hero |
| `/jak-to-funguje` | ready |
| `/predmety` | scaffolded (FeatureState) |
| `/maturitni-priprava` | ready |
| `/cenik` | scaffolded |
| `/o-projektu` | ready |
| `/prihlaseni` | blocked (auth chybí) |
| `/registrace` | blocked (auth chybí) |

### APP (`/app/*`, LearnerAppShell)
| Route | Nav | Stav |
|-------|-----|------|
| `/app` | → redirect `/app/dashboard` | |
| `/app/dashboard` | Primární: Dnes | ready (daily plan CTA) |
| `/app/learn` | Primární: Učit se | ready |
| `/app/learn/dilo` | (hub) | ready (literární díla D-042) |
| `/app/learn/dilo/[slug]` | (detail) | ready (generický rozbor) |
| `/app/learn/kytice` | (speciál) | ready (13 balad D-043) |
| `/app/learn/maj` | (speciál) | ready (exam prep D-044) |
| `/app/learn/babicka` | (speciál) | ready (experience D-045) |
| `/app/review` | Primární: Opakovat | scaffolded |
| `/app/tests` | Primární: Testy | scaffolded |
| `/app/progress` | Primární: Pokrok / Připravenost | ready |
| `/app/plan` | Sekundární | ready (beta path D-040 + deadline D-038) |
| `/app/zachran-me` | Sekundární | ready (Priority Plan D-041) |
| `/app/topics` | Sekundární | scaffolded |
| `/app/mistakes` | Sekundární | ready (ErrorMemory) |
| `/app/simulation` | Sekundární | ready (Zkouška nanečisto D-046) |
| `/app/profile` | Sekundární | scaffolded |

### ADMIN (`/admin/*`, AdminShell)
| Route | Stav |
|-------|------|
| `/admin` | → redirect `/admin/content` |
| `/admin/content` | ready (Content Studio D-048) |
| `/admin/sources` | scaffolded |
| `/admin/questions` | scaffolded |
| `/admin/reviews` | scaffolded |
| `/admin/users` | blocked |
| `/admin/analytics` | ready (learning analytics D-049 + beta PO D-039) |

## Shell

- Desktop (≥ lg): sidebar — Hlavní (5) + Další (5)
- Mobile: sticky header + „Víc“ (sekundární) + fixed bottom nav (5)
- Admin: sidebar desktop / horizontal scroll nav mobile

## Feature states

`ready` | `scaffolded` | `blocked` — žádný fake obsah, žádná mrtvá CTA na neexistující funkci.

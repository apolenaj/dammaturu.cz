# ARCHITECTURE — DámMaturu.cz

## 1. Současný stav

Greenfield. Žádný runtime stack v repo. Cílová architektura níže je **návrh pro implementaci**, ne popis existujícího kódu.

## 2. Cílový stack (doporučení)

| Vrstva | Volba | Proč |
|--------|-------|------|
| App | **Next.js 15 (App Router)** | SSR/RSC, server actions, produkční standard |
| Language | **TypeScript strict** | požadavek produktu |
| UI | **Tailwind CSS + vlastní UI primitives** | rychlost, kontrola a11y; bez těžkého design systému na start |
| DB | **PostgreSQL přes Supabase** | auth + RLS + migrations v jednom; blízké zkušenosti z lokálního English Quest |
| Auth | **Supabase Auth (server-side session)** | cookie session, SSR |
| Validation | **Zod** | schema na hranicích (API, forms, content import) |
| ORM / SQL | **Drizzle ORM** *(preferováno)* nebo supabase-js + SQL migrations | type-safe queries; rozhodnutí finálně ve fázi scaffold |
| Tests | **Vitest** + **Playwright** | unit/integration + E2E |
| Analytics | **Abstrakce** (`track(event)`) — provider později | žádný vendor lock v core |
| Hosting | Vercel (app) + Supabase (db/auth/storage) | typický pair |

### Co záměrně nebereme z okolních projektů

- **English Quest**: anime gamifikace, local mock progress, Stripe-first — jiný produkt.
- **TheStrongest**: Prisma+NextAuth je validní alternativa; pro DámMaturu preferujeme Supabase kvůli RLS + rychlému auth pro beta.

Rozhodnutí a alternativy: `DECISIONS.md`.

## 3. High-level systém

```
┌─────────────────────────────────────────────────────────┐
│                     Client (mobile-first)                │
│  Dnes (mise) │ Učení │ Opakování │ Test │ Připravenost  │
└───────────────────────────┬─────────────────────────────┘
                            │ RSC / Server Actions / Route Handlers
┌───────────────────────────▼─────────────────────────────┐
│                   Application services                   │
│  MissionPlanner │ LearningEngine │ Mastery │ Scheduler   │
│  Assessment │ ContentQuery │ Progress │ AnalyticsPort    │
└───────────┬─────────────────────────────┬───────────────┘
            │                             │
┌───────────▼──────────┐      ┌───────────▼───────────────┐
│   Content domain     │      │   Learner domain           │
│ sources, topics, KU, │      │ users, enrollments,        │
│ items, provenance,   │      │ attempts, mastery,         │
│ review flags         │      │ schedule, readiness        │
└───────────┬──────────┘      └───────────┬───────────────┘
            │                             │
            └──────────────┬──────────────┘
                           ▼
                    PostgreSQL + RLS
                           ▲
            ┌──────────────┴──────────────┐
            │ Content ops (admin / CLI)    │
            │ ingest DOCX → review → publish│
            └─────────────────────────────┘
```

## 4. Navrhovaná struktura repo

```
maturuj/
  content/
    source-materials/          # raw DOCX (provenance inputs)
    canonical/                 # normalizovaný text (git-tracked)
    manifests/                 # source manifests + checksums
  docs/                        # produktová dokumentace
  apps/web/                    # NEBO root Next app (rozhodnout ve scaffold)
  src/                         # pokud monorepo-less (preferováno pro beta)
    app/                       # Next App Router
    components/
    server/                    # services, use-cases
    domain/                    # pure learning/content types + rules
    db/                        # schema, migrations, repositories
    lib/                       # env, analytics port, utils
  tests/
  scripts/                     # ingest, seed, content lint
```

**Rozhodnutí pro start:** single Next app v rootu (`src/`), ne turborepo — méně overhead pro 1 produkt do beta.

## 5. Domény a bounded contexts

### Content

- `SourceDocument` — soubor + hash + licence/vlastnictví
- `CanonicalDocument` — normalizovaný text
- `Subject` / `Topic` / `KnowledgeUnit`
- `LearningItem` — kartička, cloze, otázka (navázané na KU)
- `ProvenanceLink` — item/KU → source span
- `ReviewFlag` — `needs_review`, důvod, stav

### Learner

- `Profile`, `Enrollment` (subject pack + deadline)
- `DiagnosticResult`
- `MasteryState` (per KU)
- `Attempt` (immutable event)
- `ScheduleEntry` (SM-2-like / FSRS-like)
- `Mission` / `MissionItem` (denní plán)
- `ReadinessSnapshot`

### Ops

- Content review queue
- Audit log (kdo publikoval co)

## 6. Auth & security

- Server-side session (Supabase SSR)
- RLS: uživatel vidí jen svá learner data
- Content read: published only pro studenty; draft/review jen ops role
- Žádné secrets v client bundle (`NEXT_PUBLIC_` jen veřejné)
- Minimální PII: email + display name; žádné zbytečné údaje
- Consent + privacy policy před sběrem analytiky
- Rate limit na auth a assessment endpoints (později edge middleware)

## 7. API povrch (koncept)

Preferovat **Server Actions** pro mutace v UI + pár **Route Handlers** pro webhooks/CLI.

Příklady use-cases:

- `getTodaysMission(userId)`
- `startMissionItem(itemId)`
- `submitAttempt(payload)` → update mastery + schedule
- `getReadiness(enrollmentId)`
- `listDueReviews(userId)`
- `flagNeedsReview(entityId, reason)` (ops)

## 8. Content pipeline

```
DOCX (source-materials)
  → scripts/ingest (extract + normalize + checksum)
  → canonical/*.md or *.jsonl
  → human/AI-assisted structuring → draft KU + items
  → review (needs_review gate)
  → publish to DB
```

**Pravidlo:** student-facing obsah = pouze `published` + bez otevřeného `needs_review` (nebo s explicitním UI označením, pokud beta povolí „draft trust“ — default: **blokovat**).

## 9. Learning engine placement

Čistá doménová logika v `src/domain/learning/*` (bez DB, bez React):

- mastery transition rules
- scheduler
- mission planner
- readiness aggregation

DB/repos jen persistují stavy. To umožňuje unit testy bez Next.

## 10. Frontend informační architektura (routes)

Zdroj pravdy: `docs/INFORMATION_ARCHITECTURE.md` + `src/lib/navigation.ts`.

| Oblast | Routes |
|--------|--------|
| Public | `/`, `/jak-to-funguje`, `/predmety`, `/maturitni-priprava`, `/cenik`, `/o-projektu`, `/prihlaseni`, `/registrace` |
| App | `/app/dashboard` (Dnes), `/app/learn`, `/app/review`, `/app/tests`, `/app/progress`, + sekundární `plan|topics|mistakes|simulation|profile` |
| Admin | `/admin/content|sources|questions|reviews|users|analytics` |

Shell: desktop sidebar + mobile bottom nav (5 primárních). Nedokončené funkce = FeatureState, ne fake data.

## 11. Observability

- Structured server logs
- Analytics port: `mission_started`, `attempt_submitted`, `mission_completed`, `review_due_cleared`
- Error tracking později (Sentry) — až po stabilním MVP

## 12. Implementation roadmap (přesný)

### Fáze 0 — Foundation (1–2 dny)

1. `git init`, `.gitignore`, LICENSE/private note
2. `create-next-app` (TS, App Router, ESLint, Tailwind)
3. `tsconfig` strict (`strict`, `noUncheckedIndexedAccess`)
4. Scripts: `typecheck`, `lint`, `test`, `build`
5. Základní layout mobile-first + a11y skeleton
6. Env schema (Zod) — fail fast
7. CI lokálně: typecheck + lint + build musí projít na prázdné appce

**Exit:** zelený build, dokumentace stacku v DECISIONS.

### Fáze 1 — Identity & data spine (2–4 dny)

1. Supabase projekt + migrations (users/profiles, subjects, enrollments)
2. Auth UI (email magic link nebo password — rozhodnout)
3. RLS policies
4. Seed: 1 subject pack „ČJL — beta corpus“
5. Enrollment s `target_date = 2026-08-31` (konfigurovatelné, ne hardcoded jméno)

**Exit:** přihlášený uživatel vidí prázdný `/dnes` s reálným enrollmentem (ne mock).

### Fáze 2 — Content ingestion & model (3–5 dní)

1. Ingest script DOCX → canonical text + manifest (hash, filename, imported_at)
2. Manuální/assisted rozklad na Topics + KnowledgeUnits (beta corpus ~7.5k slov)
3. Provenance odkazy
4. `needs_review` workflow
5. Learning items v1 (flashcard, cloze, short answer) jen z published KU

**Exit:** DB obsahuje celý beta corpus jako KU; 0 student-facing facts bez source.

### Fáze 3 — Learning engine core (3–5 dní)

1. Attempt model + mastery states
2. Scheduler (start: SM-2 variant; upgrade path na FSRS)
3. Mission planner (diagnostika → mezery → due → new)
4. Submit attempt transaction (mastery + schedule + mission progress)
5. Unit testy doménových pravidel

**Exit:** CLI nebo UI dokáže projít 1 misi end-to-end na reálných datech.

### Fáze 4 — Student UX P0 (4–6 dní)

1. `/dnes` mise UI
2. Learning session UI (mobile)
3. Review session
4. Feedback po pokusu (správně/špatně + krátké vysvětlení ze source)
5. `/pripravenost` (mastery map + readiness)
6. Empty/error states (žádné fake)

**Exit:** beta testerka zvládne denní loop bez vysvětlování od vývojáře.

### Fáze 5 — Diagnostika & readiness (2–3 dny)

1. Vstupní diagnostika (vzorek KU napříč tématy)
2. Readiness formula + snapshot history
3. Deadline-aware planning (intenzita do 31. 8.)

**Exit:** „Jsi na X % připravenosti“ je vysvětlitelné z dat.

### Fáze 6 — Hardening (průběžně + 2–3 dny)

1. Playwright smoke (login → mise → attempt)
2. QA dle `QA_CHECKLIST.md`
3. Privacy text, consent
4. Performance pass (LCP mobile)
5. Content fact review (všechny `needs_review` uzavřeny nebo skryty)

**Exit:** beta go-live checklist zelený.

### Fáze 7 — Post-beta (mimo aktuální prompt)

Simulace maturity, multi-subject, billing, rodičovský pohled, LLM-assisted authoring s human gate.

## 13. Rizika architektury

| Riziko | Mitigace |
|--------|----------|
| Halucinovaný obsah | žádný LLM ve student path bez published source |
| Scope creep UI | P0 = mise loop only |
| Scheduler complexity | začít SM-2, oddělené API |
| DOCX kvalita | canonical layer + review |
| Single-user thinking | enrollment model od dne 1 |

## 14. Co zatím NENÍ implementováno

Vše výše. Tento dokument je cíl, ne inventář kódu.

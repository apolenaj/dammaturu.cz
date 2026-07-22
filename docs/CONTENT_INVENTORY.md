# CONTENT_INVENTORY — DámMaturu.cz repository & runtime audit

**Audit date:** 2026-07-22  
**Workspace:** `/Users/josefapolenar/Desktop/maturuj`  
**Scope:** factual inventory only — no content deleted or rewritten  
**Installed Next.js:** `15.5.20` (package range `^15.1.0`)

---

## A. APPLICATION

### A.1 Framework and tooling

| Item | Value |
|------|--------|
| Package name | `dammaturu` `0.1.0` |
| Framework | Next.js App Router **15.5.20**, React **19**, TypeScript **5.7** |
| Styling | Tailwind CSS 3.4 |
| Validation | Zod 4 |
| ORM (optional) | Drizzle + `pg` |
| Auth libs | `@supabase/ssr`, `@supabase/supabase-js` |
| Payments | Stripe |
| Lint | `next lint` (`.eslintrc.json` → `next/core-web-vitals` + `next/typescript`) |
| Unit tests | Vitest (`vitest.config.ts`, `src/**/*.{test,spec}.{ts,tsx}`) |
| E2E | Playwright (`e2e/*.spec.ts`) |

**Scripts (selected):** `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `ingest`, `content-qa`, many `seed:*`.

### A.2 Routing structure

#### Public / marketing
| Path | File |
|------|------|
| `/` | `src/app/page.tsx` |
| `/jak-to-funguje` | `src/app/jak-to-funguje/page.tsx` |
| `/predmety` | `src/app/predmety/page.tsx` |
| `/maturitni-priprava` | `src/app/maturitni-priprava/page.tsx` |
| `/cenik` | `src/app/cenik/page.tsx` |
| `/o-projektu` | `src/app/o-projektu/page.tsx` |
| `/offline` | `src/app/offline/page.tsx` |
| `/design-system` | `src/app/design-system/page.tsx` (404 in production via middleware) |

#### Auth
| Path | File |
|------|------|
| `/prihlaseni` | `src/app/prihlaseni/page.tsx` |
| `/registrace` | `src/app/registrace/page.tsx` |
| `/onboarding` | `src/app/onboarding/page.tsx` |
| `/auth/callback` | `src/app/auth/callback/route.ts` |
| `/auth/nove-heslo` | `src/app/auth/nove-heslo/page.tsx` |

#### Learner `/app/*` (all behind auth + learner profile)
`/app` → redirect dashboard; `dashboard`, `learn` (+ modes), `topics`, `materials` (+ study/play), `literature`, `tests`, `review`/`mixed`, `mistakes`, `plan`, `progress`, `simulation`, `cermat`, `minute`, `zachran-me`, `exam-profile`, `profile`.

#### Admin
`/admin`, `/admin/login`, `content`, `sources`, `questions`, `reviews`, `users`, `analytics`.

Nav catalog: `src/lib/navigation.ts`.

### A.3 Middleware

**File:** `src/middleware.ts`

| Matcher | Behavior |
|---------|----------|
| `/app/:path*`, `/onboarding` | No learner auth → `/prihlaseni?next=…&reason=session` (or `unavailable`) |
| `/prihlaseni`, `/registrace` | If authenticated → `/app/dashboard` (or `next`) |
| `/auth/nove-heslo` | Requires session |
| `/admin/*` (except login) | Admin cookie `dm_admin_session` |
| `/design-system` | 404 in production |

**Marketing `/` is not gated.**

### A.4 Authentication / session

| Mode | When | Mechanism |
|------|------|-----------|
| Supabase | Real `NEXT_PUBLIC_SUPABASE_URL` + anon key | `@supabase/ssr` cookies |
| Local-dev | No Supabase / placeholders; **not in production** unless `AUTH_DEV_ENABLED` | Cookie `dm_local_auth`, FS `data/auth-local/` |

**Defense in depth:** `src/app/app/layout.tsx` — no identity → `/prihlaseni`; no learner profile → `/onboarding`.

Key files: `src/lib/supabase/*`, `src/server/auth/*`, `src/server/actions/auth.ts`, `src/server/learner-session.ts`.

### A.5 Database / storage

| Layer | Role |
|-------|------|
| **FS `data/`** | Primary runtime store for learners, packs, materials, billing, analytics |
| **Postgres** | Optional via `DATABASE_URL`; schemas in `src/db/schema/*`; migrations `0001`–`0004` |
| **Source DOCX** | `content/source-materials/` (git-tracked) |
| **No S3/R2** | Blobs stay under `process.cwd()/data/…` |

### A.6 API routes

| Route | Auth |
|-------|------|
| `POST /api/materials/upload` | Session |
| `POST /api/materials/study/start` | Session |
| `POST /api/materials/study/topics` | Session |
| `POST /api/school-exam/upload` | Session |
| `POST /api/analytics/product` | Anonymous OK |
| `POST /api/stripe/webhook` | Stripe signature |

Most learning is **Server Actions**, not REST.

### A.7 State management

- Server Components + Server Actions
- FS JSON stores per feature (`data/<feature>/`)
- Client: React state; materials study session in `sessionStorage` after API start
- No Redux/Zustand global store

### A.8 Analytics

| Piece | Path |
|-------|------|
| Domain funnel | `src/domain/product-analytics/` |
| FS store | `src/server/product-analytics/store.ts` → `data/product-analytics/` |
| Homepage beacon | `src/components/analytics/homepage-analytics-beacon.tsx` |
| Admin UI | `/admin/analytics` |
| Docs | `docs/PRODUCT_ANALYTICS.md` |

Privacy-conscious product events (no student essay content in analytics).

### A.9 Tests

| Kind | Location |
|------|----------|
| Vitest | ~65+ under `src/domain`, `src/server`, `src/components` |
| Playwright | `e2e/critical-journeys.spec.ts`, `golden-path.spec.ts`, `launch-gate-ui.spec.ts`, `mobile-first.spec.ts` |
| Launch script | `scripts/launch-gate-golden-path.ts` |

### A.10 Deployment

| Item | Finding |
|------|---------|
| Config | `next.config.ts` only — **no `vercel.json`** |
| Hosting | Multiple Vercel projects linked to repo (e.g. `dammaturuuu`, `dammaturu`, `dammaturu-cz`) |
| Env template | `.env.example`: `ADMIN_SECRET`, `LEARNER_SESSION_SECRET`, Supabase, `DATABASE_URL`, Stripe price keys, billing launch flags |
| Also used in code | `AUTH_DEV_ENABLED`, `NEXT_PUBLIC_ENABLE_DEMO_DATA`, `ANALYTICS_EXPORT_SALT`, `VERCEL_URL` |

---

## B. STUDY CONTENT

### B.1 File-type census (excl. `node_modules`, `.next`, `.git`)

| Extension | Approx. count | Role |
|-----------|---------------|------|
| `.json` | ~767 | Seeded packs + runtime learner state |
| `.md` | 44 | **Docs only** (not learner study corpus) |
| `.docx` | 12 | Canonical Czech source materials |
| `.txt` | 6 | Runtime **learner uploads** under `data/learner-materials/` (gitignored) |
| `.pdf` | **0** in repo | Uploads supported at runtime only |
| `.csv` / `.mdx` | **0** | — |

### B.2 Source DOCX (`content/source-materials/`) — exhaustive

| Path | Type | Title | Topic | Usable content | UI exposed? | Parsed/indexed? | Questions? | Provenance survives? | Parsing errors | Duplicates/conflicts |
|------|------|-------|-------|----------------|-------------|-----------------|------------|----------------------|----------------|----------------------|
| `content/source-materials/Co jsou to homonyma x slova mnohoznačná.docx` | docx | Homonyma × slova mnohoznačná | ČJL / jazyk | Lexikologie source (~4 chunks / 24 draft KU after ingest) | Lesson `/app/learn/homonyma-uvod`; topics; admin sources | Allowlist + mammoth → `data/ingestion/` | Via lesson / packs | **Yes** (SHA, chunks, filename) | Status stays `needs_review` | Overlaps curriculum module A |
| `content/source-materials/1. Realismus.docx` | docx | 1. Realismus | ČJL / realismus | ~2 ch / 15 KU | Topics + packs | Same | Seed packs | Yes | `needs_review` | Shared theme across packs |
| `content/source-materials/2. Realismus ve Francii.docx` | docx | Realismus ve Francii | ČJL / svět | ~5 ch / 40 KU | Topics + games | Same | Seed packs | Yes | `needs_review` | — |
| `content/source-materials/3. Realismus v Rusku.docx` | docx | Realismus v Rusku | ČJL / svět | ~7 ch / 40 KU | Same | Same | Seed packs | Yes | `needs_review` | — |
| `content/source-materials/4. Realismus v Anglii a další autoři.docx` | docx | Realismus v Anglii… | ČJL / svět | ~2 ch / 11 KU | Same | Same | Seed packs | Yes | `needs_review` | — |
| `content/source-materials/Národní obrození v Čechách.docx` | docx | Národní obrození | ČJL / NO | ~13 ch / 40 KU | Story Mode, timeline | Same | Seed packs | Yes | `needs_review` | — |
| `content/source-materials/Romantismus - hl. znaky.docx` | docx | Romantismus — hl. znaky | ČJL / romantismus | ~2 ch / 9 KU | Timeline, QE source strings | Same | Seed packs | Yes | `needs_review` | — |
| `content/source-materials/Máj.docx` | docx | Máj | ČJL / Mácha | ~4 ch / 21 KU | `/app/learn/maj`, `/app/learn/dilo/maj` | Same + experience | Experience + packs | Yes / **partial** in hand packs | `needs_review` | Parallel: literary-work + maj-exam-prep + reconstruction |
| `content/source-materials/Kytice.docx` | docx | Kytice | ČJL / Erben | ~9 ch / 40 KU | `/app/learn/kytice`, dilo | Same | Experience games | Yes / partial | `needs_review` | Parallel experiences |
| `content/source-materials/Babička.docx` | docx | Babička | ČJL / Němcová | ~3 ch / 24 KU | `/app/learn/babicka`, dilo | Same | Experience | Yes / partial | `needs_review` | Parallel experiences |
| `content/source-materials/11. A. Jirásek.docx` | docx | A. Jirásek | ČJL / autor | ~4 ch / 24 KU | Topics, kdo-jsem | Same | Seed packs | Yes | `needs_review` | — |
| `content/source-materials/12. České drama 2. pol 19. stol.docx` | docx | České drama 2. pol. 19. stol. | ČJL / drama | ~2 ch / 16 KU | Topics, reconstruction | Same | Seed packs | Yes | **QA flag:** Stroupežnický years → `death_before_birth` | Fact error in source |

**Allowlist:** `src/server/ingestion/allowlist.ts` — exactly these 12 filenames.  
**Ingest:** `npm run ingest` → `data/ingestion/documents/*.json` (12 docs, 57 chunks, 304 draft KU; all `needs_review`).  
**Last run:** 12 discovered / 0 rejected / 12 unchanged (`data/ingestion/last-run.json`).

### B.3 Curriculum & lessons

| Path | Type | Title | Topic | Usable | UI | Indexed | Questions | Provenance | Notes |
|------|------|-------|-------|--------|----|---------|-----------|------------|-------|
| `src/server/curriculum/definitions/cjl-beta.ts` | embedded SoT | Český jazyk a literatura – BETA | ČJL | 6 modules, **31 topics**, DOCX filename refs | `/app/topics` | → `data/curriculum/cjl-beta.json` | Outline only | Yes (`sourceFilenames`) | SoT |
| `data/curriculum/cjl-beta.json` | json-pack | same | ČJL | Seeded artifact | `/app/topics` | Seed | No | Partial | gitignored |
| `src/server/lesson-engine/lessons/homonyma-uvod.ts` | embedded | Homonyma — úvod | Jazyk | 13 blocks | `/app/learn/homonyma-uvod` | Seed | Lesson interactions | Partial | Only lesson |

### B.4 Question / drill / flashcard / literature packs (SoT → runtime)

| SoT path | Type | Title (slug) | Topic | Usable | UI | Questions | Provenance |
|----------|------|--------------|-------|--------|----|-----------|------------|
| `src/server/question-engine/packs/cjl-otazky.ts` | seed pack | `cjl-otazky` | ČJL lit. historie | **14** QE items (all kinds) | `/app/tests/otazky/cjl-otazky` | Yes | Partial (`source` strings) |
| `src/server/flashcards/packs/cjl-literarni.ts` | seed pack | `cjl-literarni` | ČJL | **22** cards | `/app/review` | Flashcards | Weak (tags) |
| `src/server/spaced-repetition/packs/cjl-spaced.ts` | seed pack | `cjl-spaced` | ČJL | **20** items | `/app/review`, `/mixed` | Review | Partial |
| `src/server/speed-round/packs/cjl-speed.ts` | seed pack | `cjl-speed` | ČJL | **36** timed Q | `/app/learn/speed-round/…` | Yes | Weak |
| `src/server/najdi-nesmysl/packs/cjl-nesmysl.ts` | seed pack | `cjl-nesmysl` | ČJL | **17** rounds | `/app/learn/najdi-nesmysl/…` | Error-spot | Weak |
| `src/server/match-arena/packs/literarni-pary.ts` | seed pack | `literarni-pary` | ČJL | **24** pairs | `/app/learn/match-arena/…` | Matching | Weak |
| `src/server/timeline/packs/literarni-historie.ts` | seed pack | `literarni-historie` | ČJL | **23** events | `/app/learn/casova-osa/…` | No formal bank | Partial (`sourceHint`) |
| `src/server/connection-map/packs/literarni-souvislosti.ts` | seed pack | `literarni-souvislosti` | ČJL | 20 nodes / 19 edges | `/app/learn/mapa-souvislosti/…` | No | Partial |
| `src/server/story-mode/packs/narodni-obrozeni.ts` | seed pack | `narodni-obrozeni` | NO | **12** beats | `/app/learn/pribeh/…` | Checkpoints | Partial |
| `src/server/quick-grasp/packs/realismus.ts` | seed pack | `realismus` | Realismus | **8** steps | `/app/learn/rychle/…` | Retrieval | Partial |
| `src/server/active-recall/packs/literarni-vybavovani.ts` | seed pack | `literarni-vybavovani` | ČJL | **5** prompts | `/app/learn/vybavovani/…` | Open recall | Partial |
| `src/server/teach-it-back/packs/cjl-teach-back.ts` | seed pack | `cjl-teach-back` | ČJL | **4** prompts | `/app/learn/nauc-zpatky/…` | Open explain | Partial |
| `src/server/kdo-jsem/packs/literarni-osobnosti.ts` | seed pack | `literarni-osobnosti` | ČJL | **14** mysteries | `/app/learn/kdo-jsem/…` | Clues | Partial |
| `src/server/story-reconstruction/packs/literarni-dej.ts` | seed pack | `literarni-dej` | Máj/Kytice/… | **10** stories | `/app/learn/rekonstrukce-pribehu/…` | Ordering | Partial |
| `src/server/literary-work/packs/cjl-rozbory.ts` | seed pack | maj/kytice/babicka | Díla | 3×14 sections | `/app/learn/dilo/*` | Study sections | Partial |
| `src/server/maj-exam-prep/build.ts` | experience | Máj exam prep | Máj | 21 KU + activities | `/app/learn/maj` | Yes | Partial (`Máj.docx`) |
| `src/server/kytice-experience/build.ts` | experience | Kytice 13 balad | Kytice | **13 ballads** + games | `/app/learn/kytice` | Games | Partial |
| `src/server/babicka-experience/build.ts` | experience | Babička | Babička | KU + TF traps | `/app/learn/babicka` | Yes | Partial |
| `src/server/mock-exam/build.ts` | mock oral | Zkouška nanečisto | 3 works | **3** oral topics | `/app/simulation` | Oral checklist | Editorial |

**Seed scripts:** `scripts/seed-*.ts` + `scripts/ingest.ts` + `scripts/content-qa.ts` (full list in §B.7).

### B.5 Learner / school runtime content (not canonical corpus)

| Path pattern | Type | Title | Topic | Usable | UI | Indexed | Questions | Provenance | Notes |
|--------------|------|-------|-------|--------|----|---------|-----------|------------|-------|
| `data/learner-materials/<id>/{meta,files}/` | upload FS | User files | varies | PDF/DOCX/TXT → KU | `/app/materials*` | Local pipeline | Generated study Qs | **Yes** (materialId, chunkId, sourceText) | gitignored; 6 sample TXT present |
| `data/literature-maturity/*.json` | learner list | Book sheets | Oral lit. | 12 fields/book | `/app/literature*` | Aggregates | Practice | Partial | No canonical book bank in repo |
| `data/school-exam-profiles/` | school docs | Profile uploads | Oral/exam | Docs | `/app/exam-profile` | Local | — | Partial | May be empty |
| `data/materials-study/` | session FS | Study sessions | — | Session state | materials play | — | Generated | Yes | gitignored |
| `data/cermat-prep/` | prep state | CERMAT | Didactic | Built on access | `/app/cermat` | Lazy | Practice | Partial | gitignored |
| `data/content-qa/items/*` | QA store | ~496 items | ČJL | Fact-check flags | `/admin/reviews` | `content-qa` | No | Links statements | Known chronology flag |

### B.6 Absent content types

| Sought | Result |
|--------|--------|
| PDF study corpus in repo | **None** |
| CSV datasets | **None** |
| MD/MDX learner materials | **None** (docs only) |
| Top-level `assets/`, `seeds/` | **Do not exist** |
| External blob URLs for study | **None** (local `data/`) |

### B.7 Seed / ingest script index

`ingest`, `content-qa`, `seed-curriculum`, `seed-lessons`, `seed-question-engine`, `seed-flashcards`, `seed-spaced-repetition`, `seed-timeline`, `seed-connection-map`, `seed-story-mode`, `seed-quick-grasp`, `seed-active-recall`, `seed-teach-it-back`, `seed-kdo-jsem`, `seed-match-arena`, `seed-najdi-nesmysl`, `seed-speed-round`, `seed-story-reconstruction`, `seed-literary-works`, `seed-kytice`, `seed-maj`, `seed-babicka`, `seed-mock-exam`, `seed-error-memory`, `seed-readiness`, `seed-beta-telemetry`, `seed-learning-analytics`.

### B.8 Cross-cutting content findings

| Concern | Finding |
|---------|---------|
| Provenance strength | **Strong** ingest + learner materials; **partial** hand seed packs; **weak** flashcards/match/speed |
| Duplicate/conflict | (1) spaced pack may have two JSON same slug; (2) Máj/Kytice/Babička in literary-work **and** experiences **and** reconstruction/mock; (3) fact reuse without shared KU ids |
| Fresh deploy risk | Many packs gitignored — cold Vercel env without `seed:*` → empty Topics / Learn sections |
| Czech | Entire beta corpus is ČJL Czech |

---

## C. REAL USER JOURNEY MAP

### C.1 Intended path (authenticated)

```
/  →  /registrace  →  /onboarding  →  /app/dashboard
  →  /app/learn | /app/topics | /app/tests | /app/review | /app/mistakes
  →  /app/simulation | /app/profile
(+ materials, literature, cermat, minute, zachran-me, exam-profile)
```

### C.2 Homepage CTAs (exact)

| Control | Href |
|---------|------|
| Hero primary (default) | `/registrace` |
| Hero secondary | `#jak-to-funguje` |
| Final CTA primary | `/registrace` |
| Final CTA secondary | `/prihlaseni` |
| Pricing CTA | `/registrace` |
| Header | `/prihlaseni`, `/registrace` |

**No CTA deep-links into `/app/learn/*` or any real study session.**

### C.3 Anonymous / no-session blockers

| Step | Route | Anonymous outcome |
|------|-------|-------------------|
| Homepage | `/` | Marketing + static „Ukázka“ only |
| Onboarding | `/onboarding` | Middleware → `/prihlaseni` (page also sends guests to `/registrace`) |
| Dashboard | `/app/dashboard` | Middleware → `/prihlaseni?next=/app/dashboard&reason=session` |
| Learn / topics / tests / review / mistakes / simulation / profile / materials / literature / cermat / minute / zachran-me / exam-profile | `/app/*` | **Same login redirect** — page never renders |
| Marketing `/predmety` → `/app/dashboard` | — | 2nd click is login, not a lesson |

**Why `/app/dashboard` (and study pages) do not expose Czech learning to a fresh anonymous visitor:**

1. Middleware hard-requires auth for all `/app/*` (`src/middleware.ts` L81–86).
2. Even with auth, `src/app/app/layout.tsx` requires a completed learner profile (`/onboarding`).
3. Homepage never offers a guest study entry — only registration/login/marketing.
4. Product previews on `/` are non-interactive (`aria-hidden` / „Ukázka“), not learning sessions.

### C.4 After FREE signup (still incomplete vs homepage promise)

FREE features (`src/domain/billing/plans.ts`): materials read/upload, daily mission, flashcards, spaced review.  
**Paywalled on FREE:** `cermat_prep`, `oral_simulation` / mock exam, `zachran_me` → `EntitlementGate` / SMART.

Cold env without seeds: Topics empty Card; Learn sections „Tento obsah zatím není…“; mixed review can surface developer-facing seed errors.

---

## D. PRIORITIZED BUG LIST

### P0 — blocks studying tomorrow

| ID | Bug | Evidence |
|----|-----|----------|
| **P0-1** | **No guest study path** — cannot reach Czech materials / first learning interaction in ≤2 clicks without account | Middleware + homepage CTAs → `/registrace` only |
| **P0-2** | **All core study surfaces auth-gated** — anonymous never sees dashboard/learn/topics/tests content | `middleware.ts`, `app/layout.tsx` |
| **P0-3** | **Homepage markets CERMAT / oral / Zachraň mě** that FREE cannot use | `plans.ts` FREE features vs `EntitlementGate` on those routes |
| **P0-4** | **Production may ship without seeded packs** (gitignored `data/*`) → empty study after login | `.gitignore` + seed scripts required |

### P1 — damages learning / product trust

| ID | Bug | Evidence |
|----|-----|----------|
| **P1-1** | Student-visible leftover `ingest …docx` strings on empty Máj/Kytice/Babička | `learn/maj|kytice|babicka/page.tsx` |
| **P1-2** | Mixed review can show `spusť seed` | `spaced-repetition` action → player error |
| **P1-3** | Marketing/ceník exposes „entitlements v kódu“ / Stripe key name | `home-sections.tsx`, `cenik`, `pricing-table.tsx` |
| **P1-4** | Learn hub jargon (`SOURCE`, `verified KU`, `Session engine`) | `learn/page.tsx` |
| **P1-5** | Ingest corpus all `needs_review`; known chronology error in drama DOCX | Content QA flags |
| **P1-6** | Duplicate/parallel content for same works without unified mastery | literary-work vs experiences vs mock |
| **P1-7** | Messaging mismatch: full Czech prep sold; FREE is mission+materials+flashcards | Homepage vs entitlements |

### P2 — optimization

| ID | Bug | Evidence |
|----|-----|----------|
| **P2-1** | Dead „přihlas se“ EmptyStates under routes that already require layout auth | Various `/app` pages |
| **P2-2** | Learn hub is a long mode catalog — high first-day friction | `learn/page.tsx` |
| **P2-3** | `/app/minute` not in primary nav | `navigation.ts` |
| **P2-4** | Stale duplicate spaced JSON same slug | `data/spaced-repetition/packs/` |
| **P2-5** | Multiple Vercel project aliases for one repo | Deploy status contexts |

---

## E. AUDIT VERDICT (architecture, not implementation)

| Principle check | Status |
|-----------------|--------|
| Guest ≤2 clicks to Czech study | **FAIL** — no guest learning surface |
| Guest same core learning as authenticated | **FAIL** — study is auth-only |
| Core learning without AI | **PASS** — deterministic packs / materials grading |
| Provenance on uploaded materials | **PASS** when pipeline runs |
| No invented corpus in this audit | **PASS** — inventory from disk + code only |
| Content not deleted/rewritten | **PASS** — report only |

**Next product work (out of scope for this prompt):** design a guest-accessible Czech learning entry that reuses existing packs (extend architecture, do not duplicate), then unlock dashboard/learn for anonymous or offer a public study route reachable from homepage CTAs.

---

*End of CONTENT_INVENTORY.md*

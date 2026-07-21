# DECISIONS — DámMaturu.cz

Záznam rozhodnutí (ADR-lite). Nová rozhodnutí přidávej nahoru pod „Index“.

## D-063 — Production hardening (2026-07-21)

**Rozhodnutí:** Production-hardening pass: admin middleware ověřuje HMAC session (ne jen přítomnost cookie), safe internal redirects (blok `//`), magic-byte upload validace + same-origin + rate limits (auth/upload/analytics/admin), sanitizace material ID, client-safe errors, prompt-injection wrapping pro untrusted dokumenty, odstranění všech `npm run seed:*` a developer stringů z learner UI. Golden-path Playwright E2E. Kód: `src/lib/security`, `src/server/security`, `e2e/golden-path.spec.ts`.

---

## D-062 — Privacy-conscious product analytics + feature flags (2026-07-21)

**Rozhodnutí:** Interní product analytics sleduje funnel (homepage → registrace → onboarding → první dokument → první session → 10 otázek → day 2/7 return → mock exam → upgrade) a learning outcomes (otázky, mastery Δ, weak topic slugy, studijní minuty, retence). **Žádný student content / PII** v analytics store ani admin UI — allowlist eventů, hashované learner klíče v exportu. Feature flags + lightweight experimenty jsou **oddělené od billing entitlements**. Kód: `src/domain/product-analytics`, `src/domain/feature-flags`, admin `/admin/analytics`.

---

## D-061 — Pricing architecture + Stripe (2026-07-21)

**Rozhodnutí:** Plány **FREE / SMART / AI PRO / MATURITA MAX** s entitlements v kódu (`src/domain/billing`). SMART standard 149 Kč/měsíc, launch 99 Kč (konfigurovatelné). AI PRO 249 Kč/měsíc. MATURITA MAX 499 Kč / 90 dní. Billing přes **Stripe** (Checkout, Customer Portal, webhooks). Stavy: upgrade, downgrade, cancel, expired, past_due, trial. **Osobní nahrané materiály zůstávají vždy čitelné** (`personal_materials_read` durable) — po expiraci se omezí jen upload a placené funkce. Runtime store: FS `data/billing/` + Postgres migrace `0004_billing.sql`.

---

## D-060 — Meaningful celebrations (2026-07-21)

**Rozhodnutí:** Gamifikace oslavuje **reálné studijní výsledky** (mise, streak, zvládnutá témata, readiness Δ, maturita nanečisto, milníky). Event pipeline vrací `LearningCelebration[]`. XP zůstává sekundární stopka. **`XP_AFFECTS_READINESS = false`** — XP ledger nikdy nezapisuje do readiness/mastery.

---

## D-059 — Mobile-first + PWA + 1 minuta (2026-07-21)

**Rozhodnutí:** Learner app je mobile-first: overflow-x clip, safe-area shell, touch targets ≥44px, inputs ≥16px (iOS), sticky study CTAs. PWA: `manifest.ts`, `public/sw.js`, install prompt, `/offline`. Rychlá cesta `/app/minute` — jeden CTA bez rozhodování (flashcards → mixed review → CERMAT → speed → learn hub).

---

## D-051 — Production data model (2026-07-21)

**Rozhodnutí:** Postgres schema rozšířen o identity (`users`, `student_profiles`, `school_profiles`, `exams`, `subject_enrollments`), `study_materials`, a learner runtime (`question_attempts`, `study_sessions`, `mistakes`, `review_schedules`, `study_plans`, `daily_missions`, `mock_exams`, `mock_exam_attempts`, `readiness_snapshots`). Content spine (`source_documents` / `source_chunks` / KU / topics / questions) **zůstává** — žádné paralelní Document tabulky. `mastery_states` rozšířen o score+band (D-031). Dokumentace: `docs/DATA_MODEL.md`. Migrace: `0003_production_core.sql`.

---

## Index

| ID | Datum | Rozhodnutí | Stav |
|----|-------|------------|------|
| D-063 | 2026-07-21 | Production hardening: auth, uploads, rate limits, no seed UI leaks, E2E golden path | accepted |
| D-062 | 2026-07-21 | Privacy-conscious product analytics + feature flags/experiments | accepted |
| D-061 | 2026-07-21 | Pricing plans + Stripe entitlements; durable personal data | accepted |
| D-060 | 2026-07-21 | Meaningful celebrations; XP never inflates readiness | accepted |
| D-059 | 2026-07-21 | Mobile-first shell, PWA, `/app/minute` one-minute study | accepted |
| D-051 | 2026-07-21 | Production data model: identity + materials + learner runtime on Postgres | accepted |
| D-001 | 2026-07-20 | Greenfield repo — žádný existující app kód | accepted |
| D-002 | 2026-07-20 | Stack: Next.js 15 + TS strict + Tailwind + Supabase | accepted |
| D-003 | 2026-07-20 | Neforkovat English Quest / TheStrongest | accepted |
| D-004 | 2026-07-20 | Single Next app v rootu (ne turborepo) pro beta | accepted |
| D-005 | 2026-07-20 | AI/LLM není student-facing positioning ani grading P0 | accepted |
| D-006 | 2026-07-20 | Scheduler v1 = SM-2-like; API připravené na FSRS | accepted |
| D-007 | 2026-07-20 | ORM: Drizzle + Postgres content schema | accepted |
| D-008 | 2026-07-21 | Auth: Supabase email/password (+ magic link, Google optional); local-dev fallback | accepted |
| D-009 | 2026-07-20 | IA JTBD chrome (D-057): 5+5 nav, ready-only, screen contract | accepted |
| D-010 | 2026-07-20 | FeatureState místo mrtvých/fake stránek | accepted |
| D-011 | 2026-07-20 | Design system premium (D-058): tokens, motion, celebrate | accepted |
| D-012 | 2026-07-20 | `/design-system` showcase jen v development | accepted |
| D-013 | 2026-07-21 | Learner id = auth.uid (normalized); progress FS keyed by auth user | accepted |
| D-014 | 2026-07-20 | Content model: atomic KU + chunks, not markdown blobs | accepted |
| D-015 | 2026-07-20 | Ingestion: allowlist DOCX → needs_review, never auto-publish | accepted |
| D-016 | 2026-07-20 | Content QA: flag-only auto; FINAL jen s reviewer note | accepted |
| D-017 | 2026-07-20 | Curriculum DB-driven (Module + topic graph); UI čte store | accepted |
| D-018 | 2026-07-20 | Lesson Engine: schema-driven blocks; interactions → mastery | accepted |
| D-019 | 2026-07-20 | Rychle pochopit: mikrobloky + checkpoint + success rate | accepted |
| D-020 | 2026-07-20 | Story Mode: narrative beats only from verified FINALs | accepted |
| D-021 | 2026-07-20 | Interactive timeline: zoom, filter, learn/reorder, quiz | accepted |
| D-022 | 2026-07-20 | Connection Map: teachable paths + fill-blank learning | accepted |
| D-023 | 2026-07-20 | Flashcard engine: typed cards + SM-2 + session UX | accepted |
| D-024 | 2026-07-20 | Active recall: free production + partial KU grading | accepted |
| D-025 | 2026-07-20 | Unified Question Engine: 14 kinds + explanation-first | accepted |
| D-026 | 2026-07-20 | Kdo jsem?: progressive hints from verified SOURCE only | accepted |
| D-027 | 2026-07-20 | Match Arena: 6 pair kinds, DnD + tap, review queue | accepted |
| D-028 | 2026-07-20 | Story Reconstruction: source-backed plot reorder | accepted |
| D-029 | 2026-07-20 | Najdi nesmysl: 3 true + 1 false + student reason + corrective explanation | accepted |
| D-030 | 2026-07-20 | Speed Round: 60s basic-fact recall + score/accuracy/streak/RT | accepted |
| D-031 | 2026-07-20 | Mastery Engine: KU score 0–100, bands incl. At risk, no page-view gain, no P(pass) claim | accepted |
| D-032 | 2026-07-20 | Spaced repetition: stability/difficulty + mixed review formats + daily due CTA | accepted |
| D-033 | 2026-07-20 | Mixed practice / interleaving: cluster phases + distinguish + beginner gate | accepted |
| D-034 | 2026-07-20 | Moje chyby: ErrorMemory + Procvičit + resolved s historií | accepted |
| D-035 | 2026-07-20 | Teach It Back: checklist KU grading, text/hlas, ne odměna za délku | accepted |
| D-036 | 2026-07-20 | Připravenost: mastery coverage aggregate, ne P(pass); slabiny → session | accepted |
| D-037 | 2026-07-20 | Dashboard Dnes: jeden plán, jedna CTA, student nerozhoduje | accepted |
| D-038 | 2026-07-20 | Deadline-aware planner: fáze, buffer, přepočet po miss, cap backlogu | accepted |
| D-039 | 2026-07-20 | Private BETA profile: student pulse + PO dashboard, privacy-safe telemetry | accepted |
| D-040 | 2026-07-20 | Beta learning path: 6 fází z cjl-beta kurikula, pořadí dle diagnostiky | accepted |
| D-041 | 2026-07-20 | Zachraň mě: nouzový plánovač (D-056: 5 bucketů + session) | accepted |
| D-042 | 2026-07-20 | Literární dílo: generické schema + 14 tabů; Máj/Kytice/Babička | accepted |
| D-043 | 2026-07-20 | Kytice experience: 13 balad + hry ze SOURCE / verified KU | accepted |
| D-044 | 2026-07-20 | Máj exam prep: 7 aktivit + chybějící KU po oral simulaci | accepted |
| D-045 | 2026-07-20 | Babička experience: karty/mapy/T/F/struktura/realismus/oral | accepted |
| D-046 | 2026-07-20 | Zkouška nanečisto: flow + explicitní rubrika, bez falešné známky | accepted |
| D-047 | 2026-07-20 | Elegantní gamifikace: postup k cíli primární, XP sekundární | accepted |
| D-048 | 2026-07-20 | Admin Content Studio: typed CRUD, provenance, preview, bulk, versions | accepted |
| D-049 | 2026-07-21 | Learning analytics: real learning questions, privacy-first, anonymized export | accepted |
| D-050 | 2026-07-21 | N=1 beta experiment: baseline/daily/retention/methods/weekly/final | accepted |

---

## D-001 — Greenfield

**Kontext:** Audit `maturuj` našel jen `/content/source-materials/*.docx`.

**Rozhodnutí:** Stavět aplikaci od nuly v tomto repo. Neexistuje legacy kód k „nepřepisování“.

**Důsledky:** První PR = scaffold + docs (docs už vznikají).

## D-002 — Stack

**Kontext:** Požadavek na moderní production-ready stack; lokálně existují Next+Supabase a Next+Prisma projekty.

**Rozhodnutí:** Next.js App Router, TypeScript strict, Tailwind, PostgreSQL/Supabase Auth+RLS, Zod, Vitest, Playwright.

**Alternativy zamítnuté pro start:**
- Remix/SvelteKit — zbytečná změna bez benefitu
- Firebase — slabší relační model pro mastery/schedule
- Prisma+NextAuth — validní, ale Supabase zrychlí auth+RLS pro beta

## D-003 — Žádný fork okolních app

**Kontext:** `Desktop/Projekt` (English Quest) a `Desktop/TheStrongest` mají podobný stack.

**Rozhodnutí:** Nekopírovat UI, gamifikaci, mock data vrstvy ani business logiku. Max. inspirovat se patternem Supabase SSR.

**Proč:** Jiný produkt, jiný positioning, riziko technického dluhu a fake flows.

## D-004 — Repo shape

**Rozhodnutí:** Pro beta monolit Next app (`src/`), `content/` a `docs/` v rootu.

**Revisit:** Pokud přibude mobile native nebo zvlášť workers — split later.

## D-005 — AI policy

**Rozhodnutí:**
- Marketing: ne AI-first.
- Runtime learning engine: bez LLM.
- Content authoring: AI assist povolen jen s human review + provenance.
- Grading P0: bez LLM.

## D-006 — Scheduler

**Rozhodnutí:** SM-2-inspired v1, oddělený modul, Attempt jako jediný vstup.

**Proč:** Rychlá implementace, dost dobré pro ~100–150 KU do 31. 8.

## D-007 — Drizzle

**Rozhodnutí:** Drizzle ORM + PostgreSQL. Schema v `src/db/schema`, SQL migrace `0001_content_model.sql`.

## D-008 — Auth method

**Rozhodnutí:** Supabase Auth — e-mail/heslo (P0), magic link (zapnuto defaultně při Supabase), Google OAuth (opt-in `NEXT_PUBLIC_AUTH_GOOGLE=true`). Session přes `@supabase/ssr` cookies. Learner id = `auth.uid` bez pomlček.

**Local-dev:** Pokud chybí Supabase env a `NODE_ENV !== production`, běží file-backed local Auth (`data/auth-local/`) se stejným learner-id mapováním — jen pro vývoj. V production bez Supabase je Auth nedostupný.

**Confirm:** 2026-07-21.

---

## D-009 — Route IA

**Rozhodnutí:** Veřejné české slugs (`/jak-to-funguje`, …). Learner pod `/app/*` (dashboard = Dnes). Admin pod `/admin/*`.

**Aktualizace D-057 (2026-07-21):** Chrome kolem JTBD. Primární: Dnes · Učit se · Moje materiály · Testy · Pokrok. Sekundární: Opakování · Moje chyby · Plán · Zkouška nanečisto · Profil. Hlubší nástroje (CERMAT, literatura, témata, Zachraň mě, profil maturity) jen z hubů. Navigace filtruje `ready` only. Screen contract: účel + 1 CTA + empty/loading/error (`AppPageHeader`, `EmptyState`, `AppLoadingState`, `AppErrorState`).

**Důvod:** Oddělení marketing / learner / ops; snížení kognitivní zátěže.

## D-010 — FeatureState

**Rozhodnutí:** Stránky bez backendu ukazují `ready` | `scaffolded` | `blocked` + „Co chybí“, ne placeholder data ani mrtvá tlačítka na neexistující funkce.

## D-011 — Design system

**Rozhodnutí:** Semantic CSS tokens + Tailwind mapování. Light primary. Dark přes `.dark`. Komponenty v `src/components/ui/*`. Bez AI neon / infantilní estetiky.

**Aktualizace D-058 (2026-07-21):** Premium redesign — Duolingo friendliness + Linear polish. Teal action + ember accent, Fraunces/Manrope hierarchy, card variants, progress shine/celebrate, CelebrateMoment / StreakPill / ProgressSteps, soft elevation + micro-interactions, `prefers-reduced-motion` preserved. Docs: `docs/DESIGN_SYSTEM.md`.

## D-012 — Design showcase

**Rozhodnutí:** `/design-system` showcase jen v development; jinak `notFound()`.

## D-013 — Onboarding / progress identity

**Rozhodnutí:** Learner record + veškerý progress ve `data/**` je klíčovaný stabilním `learnerId = auth.uid` (UUID bez pomlček). Soft cookie `dm_learner_id` je odstraněná. Cross-device = stejný Auth účet na stejném serveru s persistentním diskem (nebo budoucí DB).

**Důsledky:** Logout nesmaže progress. Login na jiném zařízení obnoví stejný learnerId. Serverless bez disku vyžaduje migraci progress store na Postgres/Supabase Storage.

## D-014 — Atomic content model

**Rozhodnutí:** Adaptive learning stojí na `KnowledgeUnit` + `SourceChunk`. Curriculum hierarchy je navigace. Otázky musí mít KU. Žádné „jeden MD blob = jedna znalost“.

## D-015 — Ingestion safety

**Rozhodnutí:** Import jen allowlistovaných maturitních DOCX. Zápis pouze do `data/ingestion/`. Pipeline status končí na `needs_review`. Idempotence přes content SHA-256.

## D-016 — Content QA (flag-only)

**Rozhodnutí:** Po ingestu běží Content QA: SOURCE → NORMALIZED → status → note → FINAL. Automatika pouze detekuje anomálie (chronologie, duplicity, konflikty). Historické fakty se nikdy neopravují automaticky. `verified_from_source` / `corrected` / `rejected` jen s auditovatelnou reviewer note. Admin UI vždy ukazuje SOURCE / NORMALIZED / FINAL / REASON.

## D-017 — Curriculum is data, not UI

**Rozhodnutí:** Sylabus ČJL BETA žije jako Subject → Curriculum → Module → Topic + `topic_prerequisites`. Definice se seeduje do curriculum store (a Postgres při `DATABASE_URL`). Stránky `/app/topics` a `/admin/content` čtou jen repository — žádný hardcoded seznam modulů v komponentách.

## D-018 — Lesson Engine (blocks, not blobs)

**Rozhodnutí:** Lekce je pole typovaných bloků (Zod discriminated union). Renderer je schema-driven. Téma se nikdy nerenderuje jako jeden dlouhý text. Student akce (continue / rozumím / nevím / uložit / zpět / vysvětlení) se logují a aktualizují mastery snapshoty.

## D-019 — Rychle pochopit

**Rozhodnutí:** Velké téma = mikrobloky (1 myšlenka + 1 příklad + 1 otázka, 2–5 min) a retrieval checkpoint po 3–5 blocích. Progress ukazuje `dokončeno/celkem` a odhad zbývajícího času. Persistuje completion i skutečnou úspěšnost odpovědí.

## D-020 — Story Mode (verified narrative)

**Rozhodnutí:** Literární historie se učí jako příběh (timeline, příčina→následek, person cards, what-next, decision moments, checkpoint). Každý fakt musí mít provenance na Content QA `verified_from_source` / `corrected` FINAL. Seed nesmí vymýšlet fakta — jen ověřuje exact SOURCE.

## D-021 — Interactive timeline

**Rozhodnutí:** Samostatný timeline systém s zoomem období, filtrem druhu (autor/dílo/událost/směr), tap detailem, chronological quiz a reorder challenge. Student přepíná Učit se / Seřadit sám. Mobile-first (snap scroll, bottom sheet, šipky místo drag).

## D-022 — Connection Map (teachable paths)

**Rozhodnutí:** Mapa souvislostí není force-directed dekorace. Data = named paths (směr→oblast→autor→dílo) + edges. Režimy Prohlížet / Doplnit (skryté uzly + výběr). Detail sheet ukazuje sousedy — student vidí souvislosti.

## D-023 — Flashcard engine

**Rozhodnutí:** `/app/review` běží na flashcard engine (8 typů karet), ne na statickém seznamu. Self-grade Nevěděl/Téměř/Věděl → SM-2 module (`scheduler.ts`) mění `dueAt`. Session = due + new queue, keyboard + swipe, summary. Scheduler izolovaný (FSRS swap později).

## D-024 — Active recall (partial KU grading)

**Rozhodnutí:** Režim aktivního vybavování bez nabídek (text nebo Web Speech). Grading = coverage key points mapovaných na knowledge units: matched / missing / extra + model answer. Výsledek `correct | partial | incorrect` — částečná znalost není binární fail. Bez LLM graderu v P0.

## D-025 — Unified Question Engine

**Rozhodnutí:** Jeden Question Engine pro 14 typů položek. Schema vždy obsahuje difficulty, knowledgeUnits, correctAnswer, distractors, explanation, source, examRelevance. Po odpovědi vždy kvalitní explanation + rozbor (ne jen zelená/červená). Partial skóre 0–1. Route `/app/tests/otazky/[slug]`.

## D-026 — Kdo jsem? (verified-only game)

**Rozhodnutí:** Herní tipovačka s postupnými nápovědami. Každý hint = verbatim SOURCE extract → Content QA `verified_from_source`. Display text jen rediguje jméno, nevymýšlí fakta. Body klesají s počtem odhalených nápověd. Route `/app/learn/kdo-jsem/[slug]`.

## D-027 — Match Arena

**Rozhodnutí:** Samostatný pairing drill (ne jen Question Engine select). Šest druhů párů (autor↔dílo, dílo↔postava, autor↔země, směr↔znak, pojem↔definice, událost↔období). Desktop HTML5 drag/drop, mobil tap-to-match. Po chybě vždy explanation (správný partner + kontext). Session summary: accuracy, speed, weak pairs. Chybné páry automaticky do review queue. Route `/app/learn/match-arena/[slug]`.

## D-028 — Story Reconstruction

**Rozhodnutí:** Challenge na seřazení dějových událostí (Máj, Maryša, Otec Goriot, Zločin a trest, Anna Karenina, balady Kytice). Obtížnost easy/medium/hard = 4 / 6 / 8+ kroků. Po úspěchu vizuální dějová osa. Každý krok = verbatim SOURCE → Content QA `verified_from_source` (stejný bootstrap pattern jako Kdo jsem?). Route `/app/learn/rekonstrukce-pribehu/[slug]`.

## D-029 — Najdi nesmysl

**Rozhodnutí:** Herní mód se 4 tvrzeními (3 pravda, 1 nesmysl) napříč kategoriemi autor / dílo / období / směr / postava / žánr. Student musí označit nesmysl a napsat vlastní zdůvodnění; poté vždy kvalitní korektivní explanation (≥80 znaků), aby realistické distraktory nevytvářely falešné znalosti. Route `/app/learn/najdi-nesmysl/[slug]`. Oddělené od Question Engine `error_spotting` — vlastní game UX + reason step.

## D-030 — Speed Round (60 s)

**Rozhodnutí:** Timed recall drill na základní fakta (autor→dílo, pojem→definice, true/false, směr→vlastnost). Žádné otázky vyžadující hlubokou interpretaci. Session 60 s; metriky score, accuracy, best streak, response time (avg/median). Route `/app/learn/speed-round/[slug]`.

## D-031 — Mastery Engine (0–100 + bands)

**Rozhodnutí:** Každé KU má `score` 0–100 a band: Not seen · Introduced · Learning · Familiar · Strong · Mastered · At risk. Score se mění jen graded evidence (diagnostika, správnost, obtížnost, streak, decay od posledního recall, nápovědy, self-confidence, rychlost kde dává smysl, transfer). `page_view` / navigace **nezvedá** score (max. Introduced). Agregát je vážený mastery average — **nesmí** se prezentovat jako pravděpodobnost složení maturity bez validačních dat. Spec: `docs/LEARNING_ENGINE.md`, kód: `src/domain/learning/mastery-engine.ts`.

## D-032 — Spaced repetition scheduler (mixed review)

**Rozhodnutí:** Každá znalost má `lastReviewed`, `nextReview`, `stability`, `difficulty`, `reviewCount`, `lapseCount`. Chyba (`again`) zkrátí interval; jistá odpověď (`easy`) prodlouží. Denní dashboard: „Dnes k zopakování: N položek – cca M minut.“ Review session míchá flashcards / free recall / matching / questions s anti-monotony (žádné 3× stejný formát za sebou). Route `/app/review/mixed`. Flashcard SM-2 zůstává jako samostatný deck mód.

## D-033 — Mixed practice / interleaving

**Rozhodnutí:** Po zvládnutí základů session **nemíchá 20× stejného autora**. Fronta interleavuje clustery (český romantismus · směry · realisté svět · český realismus · poetika) a entity (Balzac · Dickens · Dostojevskij · romantismus · realismus · Máj · Kytice). Fáze: `beginner_focus` → `within_cluster` → `light_mix` → `full_interleave`. Začátečník zůstává v jednom clusteru; plný mix až po odemčení ≥3 clusterů (stable items). Distinguish položky testují záměny podobných pojmů. Kód: `src/domain/learning/interleaving.ts`.

## D-034 — Moje chyby (ErrorMemory)

**Rozhodnutí:** Každá významná chyba vytvoří `ErrorMemory`: question, studentAnswer, correctConcept, whyWrong, knowledgeUnit, errorType, date, resolvedStatus. Typy: zaměnil autor/dílo · neznal fakt · chronologie · nepochopení pojmu · detail děje · literární termín · nejistota. CTA „Procvičit moje chyby“. Po `resolveSuccessStreak` (2× good) → `resolved`; záznam v historii zůstává. Ingest: mixed review `again` (+ demo seed). Route `/app/mistakes`. Kód: `src/domain/learning/error-memory.ts`.

## D-035 — Teach It Back

**Rozhodnutí:** Režim „vysvětli vlastními slovy“ (text nebo Web Speech). Grading = checklist konkrétních knowledge units + detekce nepřesností (záměny). Feedback vždy: Co jsi vysvětlil/a dobře · Co chybí · Co je nepřesné · Jak by vypadala výborná odpověď. **Délka textu sama o sobě neodměňuje** (long empty → `lengthWithoutSubstance`). Route `/app/learn/nauc-zpatky/[slug]`. Kód: `src/domain/learning/teach-it-back.ts`.

## D-036 — Připravenost (mastery coverage)

**Rozhodnutí:** Centrální metriky „CELKOVÁ PŘIPRAVENOST“ = vážený `computeMasteryAggregate` (mastery coverage), **ne** predikce úspěchu / P(pass). UI: overall %, oblasti (Literární směry · Autoři a díla · Rozbory · Jazyk), `+N % tento týden`, 3 silné, 3 slabiny. Klik na slabinu → okamžitá cílená session (`sessionHref`). Disclaimer povinný. Route `/app/progress` (+ CTA na dashboardu). Kód: `src/domain/learning/readiness.ts`.

## D-037 — Dashboard Dnes (žádné rozhodování)

**Rozhodnutí:** Hlavní dashboard `/app/dashboard` řídí den za studenta. Hero: pozdrav + dny do cíle. **DNEŠNÍ PLÁN** = 3 kroky (naučit · zopakovat · mini test) + součet minut. Jedna CTA **ZAČÍT DNEŠNÍ MISI**. Sekundární signály (kompaktně): Připravenost · Slabá místa · Streak · Weekly progress · Upcoming reviews. Po dokončení: „Hotovo. Dnes jsi posílil/a N znalostí.“ Bez profilového clutteru a bez konkurenčních primárních CTA. Kód: `src/domain/learning/daily-dashboard.ts`.

## D-038 — Deadline-aware study planner

**Rozhodnutí:** Planner pro beta (cíl **31. 8. 2026**) počítá: množství obsahu, obtížnost, mastery, dostupný čas, potřebná opakování, rezervní dny. Fáze: **Coverage → Consolidation → Exam readiness → Final review**. Po vynechaném dni (`missedDays`) se plán přepočítá; denní zátěž je **zastropovaná** (`maxDailyLoadFactor`, `maxCatchUpFraction`) — nikdy nereálný backlog. Live `daysRemaining` z `targetDate`. UI `/app/plan`. Kód: `src/domain/learning/deadline-planner.ts`.

## D-039 — Private BETA profile režim

**Rozhodnutí:** Private beta pro ověření learning loopu na jedné studentce (cíl **31. 8.**). Student dashboard (`/app/dashboard`) ukazuje BETA pulse: cílové datum, zbývající dny, coverage, mastery, čas učením, slabiny, dodržení plánu. Admin `/admin/analytics`: sessions, minutes, questions, accuracy, mastery delta, neglected topics, drop-offs, common errors, feature usage + **product insights** (act/watch), ne vanity grafy. Telemetrie jen allowlist (feature, topic slug, minutes, correct bool, error type enum) — bez e-mailu, volných odpovědí, zařízení. Enrollment: `targetDate === 2026-08-31` → `LearnerRecord.beta`. Kód: `src/domain/learning/beta-profile.ts`.

## D-040 — Beta learning path z kurikula

**Rozhodnutí:** Automatický learning path do **31. 8.** se generuje z nahraného `cjl-beta` packu (selektory modulů/topic slugů v doméně). Fáze: **1 Diagnostika → 2 Základy → 3 Světový realismus → 4 Česká literatura → 5 Interleaved review → 6 Simulace + weak spot repair**. UI (`BetaLearningPathView`) jen renderuje view model — žádná hardcoded témata v komponentách. Po diagnostice (readiness area scores) se pořadí clusterů/témat přizpůsobí (slabší dřív; prerequisites uvnitř fáze drží). Kód: `src/domain/learning/beta-learning-path.ts`, UI `/app/plan`.

## D-041 — Zachraň mě (Priority Plan)

**Rozhodnutí (původní):** Režim pro málo času: vstupy deadline + denní minuty + předměty → **Priority Plan**. Skóre = `exam relevance × weakness × forgetting risk × prerequisite importance`. Explicitní bucketty: **Dnes musíš zvládnout toto** · **Toto může počkat** · **Toto už umíš** · **Toto je riziko**. Manifesto: není to „nauč se náhodně všechno rychleji“ — must-today je zastropovaný time budgetem. Beta default deadline **31. 8. 2026**; zatím plně ČJL. Kód: `src/domain/learning/zachran-me.ts`, UI `/app/zachran-me`.

**Aktualizace D-056 (2026-07-21):** Přestavba na **nouzový studijní plánovač**. Vstupy: skutečný termín maturity · dostupné hodiny · vybrané **podporované** složky (`cermat_didactic`, `oral_literature`, `language_topics`) — žádné nepodporované předměty v UI. Analýza: readiness × weakness × importance × time pressure. Bucketty: **MUSÍŠ UMĚT** · **HIGH IMPACT** · **MĚL/A BYS UMĚT** · **POKUD ZBUDE ČAS** · **UŽ UMÍŠ — NEPLÝTVEJ ČASEM**. Výstup zahrnuje **přesnou příští session** (kroky + minuty + CTA). Signály z CERMAT progress, literatury a kurikula.

## D-042 — Literární dílo (generický rozbor)

**Rozhodnutí:** Specializované UI pro literární dílo se **14 taby** (Rychle pochopit → … → Ústní zkouška). **Jedna** dynamická route `/app/learn/dilo/[slug]` + Zod `literaryWorkSchema` — žádné 3 hardcoded stránky. Beta obsah: **Máj**, **Kytice**, **Babička** (seed pack). Vazba na kurikulum `rozbor-*` a source DOCX. Kód: `src/domain/learning/literary-work.ts`.

## D-043 — Kytice experience (13 balad)

**Rozhodnutí:** Speciální hub `/app/learn/kytice`: interaktivní collection **13 balad** (název, příběh, konflikt, vina, trest, motiv, zapamatovatelný bod). Story briefs se **extrahují ze SOURCE** `Kytice.docx` (sekce Shrnutí) a ukládají jako **verified_from_source** QA. Hry: Poznej baladu podle příběhu · Spoj provinění s následkem · Která balada? Story reconstruction pro vybrané balady (Vodník, Svatební košile, Zlatý kolovrat, Polednice, Poklad). Kód: `src/domain/learning/kytice-experience.ts`.

## D-044 — Máj exam preparation flow

**Rozhodnutí:** Speciální hub `/app/learn/maj`: komplexní exam prep z `Máj.docx` (verified KU). Povinné knowledge units: autor, literární kontext, téma, motivy, časoprostor, kompozice, 4 zpěvy + intermezza, postavy, žánr, jazyk, verš, tropy/figury, význam. Aktivity: visual story map · character map · composition puzzle · quote/device matching · 60s summary · 3min oral · full oral simulation. Po každé simulaci UI označí **chybějící KU**. Kód: `src/domain/learning/maj-exam-prep.ts`.

## D-045 — Babička active learning experience

**Rozhodnutí:** Speciální hub `/app/learn/babicka`: aktivní experience z `Babička.docx` (verified KU). Témata: charakter díla, autobiografie, kompozice, Staré bělidlo, postavy, kontrast prostředí, jazyk, realismus×idealizace. Aktivity: **character cards** · **relationship map** · **true/false traps** · **story structure** · **realistické/idealizované?** · **oral answer builder** (chipy). Žádné dlouhé textové odstavce jako hlavní didaktika. Kód: `src/domain/learning/babicka-experience.ts`.

## D-046 — Zkouška nanečisto

**Rozhodnutí:** `/app/simulation` = režim **Zkouška nanečisto**. Flow: výběr/náhodné téma → **Příprava** (časovač) → **Odpověď** (text nebo hlas) → **Doplňující otázky** vybrané podle chybějících checklist bodů → sebehodnocení confidence → **Hodnocení**. Dimenzionální rubrika: Coverage · Accuracy · Structure · Key facts · Terminology · Confidence (self). Výstup: silné stránky · chybějící body · nepřesnosti · co zopakovat · modelová struktura. **Nikdy** neemitovat oficiální školní známku (1–5); jen skóre 0–100 dle explicitních vah + band weak/partial/strong + disclaimer. `isOfficialSchoolGrade: false`. Kód: `src/domain/learning/mock-exam.ts`.

## D-047 — Elegantní gamifikace (postup k cíli)

**Rozhodnutí:** Gamifikace podporuje studium, neodvádí pozornost. **Primární** motivace = reálný postup k deadline (denní mise, týdenní cíl 5 misí, streak, mastery coverage, topic completion, personal bests). **XP je sekundární** footnote. Milestones: první oblast zvládnuta · 50 KU · 7 dní v řadě · první maturita nanečisto · 80 % učiva. **Žádné** infantilní avatary ani náhodné diamanty. UI: kompaktní strip na `/app/dashboard` + plný panel na `/app/progress`.

**Aktualizace D-060 (2026-07-21):** Event celebrations (`LearningCelebration`) pro mise, streak marks, weekly goal, topic „X zvládnut“, readiness „+N % v …“, mock exam. XP **nesmí** inflatovat readiness score (`XP_AFFECTS_READINESS = false`).

## D-048 — Admin Content Studio

**Rozhodnutí:** `/admin/content` = production Content Studio. Entity: subjects, topics, lessons, knowledge units, works, authors, questions, flashcards, exercises. Každý řádek ukazuje **zdroj**, **source excerpt**, **verification status**, **last editor**, **last update**. Editace jen **typed formuláře** (žádný raw JSON pro běžného admina). Student **preview** lekce. **Bulk** status ops. **Version history** pro lesson/topic/KU/work/exercise. Katalog se skládá z curriculum + learning packs + Content QA + studio overrides. Kód: `src/domain/admin/content-studio.ts`, `src/server/content-studio/`.

## D-049 — Learning analytics (ne vanity)

**Rozhodnutí:** Admin `/admin/analytics` odpovídá na: učí se skutečně? která metoda funguje? kde odpadá? co se naučil / zapomíná? lehké/těžké otázky? chyby v obsahu? Eventy: `lesson_started/completed`, `question_answered`, `answer_correct/incorrect`, `hint_used`, `flashcard_rating`, `review_completed`, `mastery_changed`, `study_plan_completed`, `simulation_completed`, `session_drop_off`. Dashboards: learning time, retention proxy, accuracy/mastery trend, completion, weak topics, question quality, method effectiveness. **Privacy-first** (opaque keys, žádné free-text/PII) + **export anonymizovaných beta dat** (hashed learner keys). Kód: `src/domain/learning/learning-analytics.ts`, `src/server/learning-analytics/`.

## D-050 — N=1 beta experiment instrumentation

**Kontext:** Jedna reálná testerka do 31. 8. 2026; potřebujeme měřit zlepšení znalostí, ne vanity.

**Rozhodnutí:** Dedicated experiment book (`data/beta-experiment/{learnerId}.json`) s baseline, daily, retention (LEARNED vs RETAINED, okna immediate/1d/3d/7d/14d), method stats, weekly + final assessments (unseen + transfer otázky). Report `/app/progress/experiment` vždy s framing **N=1 beta validation** a explicitním zákazem falešných statistických závěrů. Pasivní wiring do learning actions; weekly/final se spouští ručně.

**Důsledky:** Doplňuje (nenahrazuje) D-049 LA a Before/After report. Kód: `src/domain/learning/beta-experiment.ts`, `src/server/beta-experiment/`.

## Explicitně odloženo

- Billing / Stripe
- Multi-tenant schools
- Native apps
- Offline-first
- Public content marketplace

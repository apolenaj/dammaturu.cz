# PRODUCT REALITY AUDIT — DámMaturu.cz

**Datum:** 2026-07-21  
**Metoda:** forenzní code audit + evidence z `src/`, `data/`, `package.json`, marketing copy  
**Pravidlo:** WORKING jen pokud funkce existuje a běží; MOCK = UI bez backendu / dekorativní čísla  
**Související:** [`REALITY_AUDIT.md`](./REALITY_AUDIT.md) (journey), [`BETA_EXPERIMENT.md`](./BETA_EXPERIMENT.md)

---

## 1. Golden path (P0 use case)

> *A real student uploads her own Czech maturity study materials, the system reliably understands those materials, creates a structured knowledge base, tests her from them, identifies weaknesses, repeats weak knowledge, simulates the oral exam, and measures readiness.*

| Krok golden path | STATUS | Skutečnost |
|------------------|--------|------------|
| Student nahraje **vlastní** materiály | **NOT IMPLEMENTED** | V learner appce není `input type=file`, žádný upload API |
| Systém materiály „pochopí“ (AI/NLP) | **NOT IMPLEMENTED** | Žádný OpenAI/Anthropic/`@ai-sdk` v dependencies; D-005 zakazuje LLM jako P0 |
| Strukturovaná KB z **jejích** dokumentů | **NOT IMPLEMENTED** | KB = admin allowlist DOCX (`content/source-materials/`) + ruční/seed packs |
| Testy **z jejich** materiálů | **NOT IMPLEMENTED** | Otázky = seeded Question Engine packs (`cjl-otazky` atd.) |
| Identifikace slabin | **WORKING** (na curated obsahu) | Readiness weak areas + ErrorMemory z QE |
| Opakování slabých znalostí | **PARTIAL** | SR + mistakes existují; QE **neřadí** otázky podle slabin |
| Simulace ústní | **WORKING** (seeded pack) | Mock exam + rubrika, keyword matching — ne LLM komise |
| Měření připravenosti | **WORKING** (app) / **MOCK** (marketing) | App readiness z mastery book; landing Score 74/68 hardcoded |

### Verdikt golden path

**NOT IMPLEMENTED as an end-to-end product path.**

To, co existuje, je **jiný produkt**: curated ČJL learning OS (admin ingest + seeds + rule-based loop) s soft session cookie.

---

## 2. Feature classification matrix

Statusy: `WORKING` · `PARTIAL` · `MOCK` · `BROKEN` · `NOT IMPLEMENTED`

| FEATURE | STATUS | Evidence / poznámka |
|---------|--------|---------------------|
| **Authentication (email/heslo)** | NOT IMPLEMENTED | Soft cookie; Supabase jen v DECISIONS (proposed) |
| **Soft session (learner cookie)** | WORKING | `dm_learner_id` signed; logout clear cookie |
| **Admin session** | WORKING | `ADMIN_SECRET` → HMAC cookie |
| **Database (Postgres runtime)** | NOT IMPLEMENTED* | Default = FS `data/**`; Drizzle/SQL optional pokud `DATABASE_URL` |
| **Onboarding** | WORKING | Profil + study plan → `data/learners/` |
| **Student document upload** | NOT IMPLEMENTED | Žádný learner upload |
| **Student file storage** | NOT IMPLEMENTED | — |
| **Admin DOCX ingest / parse** | WORKING | mammoth + allowlist → needs_review |
| **AI integration (LLM)** | NOT IMPLEMENTED | package.json bez LLM SDK |
| **Question generation from uploads** | NOT IMPLEMENTED | Authored/seeded packs |
| **Answer evaluation** | WORKING | Rule-based `gradeQuestion` / checklist / self-grade |
| **Daily study mission** | WORKING | Dashboard mise; honor „Potvrdit hotové“ fallback |
| **Spaced repetition** | WORKING | SM-2 + schedule books |
| **Mistakes / Error Notebook** | WORKING | QE incorrect → ErrorMemory |
| **Readiness score (app)** | WORKING | Mastery aggregate z praxe |
| **Maturita Score (marketing)** | MOCK | `Score value={74}` / `{68}` |
| **Mock / oral exam** | WORKING | Seeded pack + rubric |
| **Diagnostic baseline** | PARTIAL | ≥8 QE attempts; ne „mapa z vlastních PDF“ |
| **Weak → next question order** | NOT IMPLEMENTED | Lineární index packu |
| **Missed day → rewrite mission** | PARTIAL | Deadline note; mission template se nepřepisuje |
| **Pricing** | MOCK | FeatureState „billing později“ |
| **Předměty (multi-subject)** | MOCK | FeatureState scaffolded |
| **Admin Questions CRUD page** | MOCK | RouteFeaturePage scaffolded |
| **Admin Users** | NOT IMPLEMENTED | FeatureState blocked |
| **Mobile bottom nav** | WORKING | 5 položek + overflow |
| **N=1 experiment instrumentation** | WORKING | `data/beta-experiment/` + report |
| **Billing / Stripe** | NOT IMPLEMENTED | — |

\*Postgres schema/migrations existují jako připravenost; **runtime learner path je filesystem**.

---

## 3. UI promises vs reality (overclaims)

| UI / copy promise | Reality | Severity |
|-------------------|---------|----------|
| Landing „Maturita Score“ 74 / 68 | Dekorativní preview, ne live learner data | P2 |
| „Diagnostika → mapa mezer“ | Diagnostika = seeded QE pack (≥8), ne vlastní materiály | P1 (produkt positioning) |
| „Z ověřených materiálů“ | Ano pro curated corpus — **ne** „tvoje PDF“ | OK pokud čtenář chápe curated |
| FAQ „Ne AI chatbot“ | Pravda — žádný LLM | OK |
| Nav „Přihlášení“ | Soft session / onboarding, ne účet | P2 |
| Ceník secondary „Registrace (zatím blokovaná)“ | **Stale** — `/registrace` funguje | P3 |
| Empty states `npm run seed:*` v learner UI | Ops leak studentovi | P1 (UX/security hygiene) |
| Admin login text `ADMIN_SECRET` / `dev-admin-secret` | Env/name leak | P2 |
| Zachraň mě error string se seed příkazem | Leak do student flow | P1 |
| „Potvrdit hotové“ bez session proof | Honor system — vypadá jako dokončení | P2 |
| Content Studio publish bez verify gate | Může publikovat neověřené | P1 (content integrity) |

---

## 4. Area deep-dive (requested list)

### Authentication — PARTIAL / NOT IMPLEMENTED (real Auth)
- Žádný email/password, žádný Supabase client v `src/`.
- `/prihlaseni` = soft resume cookie nebo CTA na onboarding.
- `/registrace` = soft landing → onboarding (funguje).

### Sessions — WORKING (soft)
- Learner: signed httpOnly cookie.
- Admin: password = `ADMIN_SECRET`.
- Middleware `/admin/*`: kontroluje **přítomnost** cookie (plná verifikace v Node actions/layout).

### Database — PARTIAL
- Produktivní stav: JSON pod `data/`.
- Drizzle + `DATABASE_URL` = volitelné; curriculum seed umí DB, ale app loop FS.

### Onboarding — WORKING
- Jméno, deadline (beta 31. 8. 2026), škola, předměty, time budget, režim, diagnostika flag.
- **Žádný** upload krok.

### Document uploads (student) — NOT IMPLEMENTED
- Grep learner `app/app`: žádný file input.

### File storage (student) — NOT IMPLEMENTED

### Parsing — WORKING (admin only)
- `mammoth` DOCX → chunks; admin `/admin/sources`.

### AI integration — NOT IMPLEMENTED
- Explicitně zamítnuto D-005; marketing to přiznává.

### Question generation — NOT IMPLEMENTED (from student docs)
- Seeded packs s provenance stringy na DOCX filenames.

### Answer evaluation — WORKING
- Deterministic grading (options, key terms, coverage checklists).
- **Není** sémantické AI hodnocení.

### Study sessions — WORKING
- Daily mission + learn modes (flashcards, AR, story, …) na seeded obsahu.

### Spaced repetition — WORKING
- SM-2 / spaced books; due queue.

### Mistakes — WORKING
- ErrorMemory z QE / SR `again`.

### Readiness score — WORKING (app) / MOCK (marketing)
- App: `buildReadinessSnapshot` z mastery.
- Marketing: hardcoded Score.

### Mock exams — WORKING
- Seeded oral simulation + rubric; keyword follow-ups.

### Public marketing claims — PARTIAL
- **Nepromise** student upload / AI chat.
- **Overpromise** úplnost diagnostiky/plánu jako by byl personal materials system.

### Pricing — MOCK
- FeatureState, bez Stripe.

### Navigation — PARTIAL
- Dead ends záměrně FeatureState (`/cenik`, `/predmety`, admin users).
- Seed-gated empty states vypadají jako broken product.

### Mobile — WORKING
- Bottom nav + mobile header.

### Error states — PARTIAL (leaky)
- App `error.tsx` relativně safe.
- Student UI často ukazuje `npm run seed:…`, admin env names, raw JSON answers v mistakes, truncated learner IDs v admin experiment glance.

---

## 5. What works today (honest product shape)

**Curated ČJL private beta learning loop:**

1. Soft onboarding + cookie  
2. Seeded curriculum / QE / flashcards / SR / literary experiences  
3. Diagnostic on QE pack → baseline  
4. Daily mission  
5. Practice → mastery + ErrorMemory  
6. Review schedule  
7. Mock oral on pack  
8. Readiness / N=1 experiment report  
9. Admin ingest + Content Studio + analytics  

**Does not work as P0 golden path:** bring-your-own materials → AI understand → generate tests from them.

---

## 6. P0 / P1 gaps relative to stated golden path

### P0 — golden path blocked
1. Student upload of own materials  
2. Understanding / structuring those materials (AI or otherwise)  
3. Question generation from student KB  

### P1 — learning loop on curated content still incomplete / dishonest
1. Student-visible `npm run seed:*` strings  
2. Weak areas do not reorder QE  
3. Marketing Score looks live  
4. Soft Auth ≠ real account (logout loses access)  
5. Content Studio publish without verification gate  
6. Honor „Potvrdit hotové“  

### P2 / P3
- Pricing / multi-subject scaffold  
- Stale cenik copy „registrace blokovaná“  
- Admin secret name in login UI  
- Mistakes raw JSON display  

---

## 7. Recommendation (no redesign in this doc)

1. **Produktová pravda:** buď (A) pivot messaging na curated ČJL OS, nebo (B) implementovat student upload → KB → Q gen jako skutečné P0.  
2. **Nejdřív odstranit leaky empty states** (žádné seed commands studentovi).  
3. **Neoznačovat golden path za hotový**, dokud student upload + generation neexistují.

---

## 8. Verification of this audit

- Code evidence: learner routes bez file upload; `package.json` bez LLM; marketing FAQ „Ne AI“; ingest admin-only.  
- Cross-check: prior `REALITY_AUDIT.md` + live journey (browser/script).  
- Gates po zápisu dokumentu: viz sekce níže / chat report.

---

*Tento dokument je zdroj pravdy pro produktové rozhodování. Build ≠ golden path ready.*

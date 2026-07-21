# REALITY AUDIT — DámMaturu.cz

**Datum:** 2026-07-21  
**Metoda:** čistý learner journey v prohlížeči + `scripts/reality-check-journey.ts` + code evidence  
**Pravidlo:** WORKING jen pokud ověřeno; marketing preview ≠ app reality

---

## Verdikt (stručně)

Core learning loop (onboarding → QE → readiness/errors → daily mission → soft session) **funguje na FS store**.  
**Není** multi-user Auth / cross-device login. Marketing Maturita Score je **hardcoded ukázka**.

**READY FOR REAL BETA TEST: YES** — jedna private testerka, jeden prohlížeč, seeded host + secrets.  
**NO** pro public / e-mail účty / více zařízení.

---

## Evidence této session

| Krok | Výsledek |
|------|----------|
| 1 Landing | OK — brand + CTA; score v hero je **ukázka 68/74** |
| 2 Registrace | OK — soft landing → onboarding (bez e-mailu) |
| 3–4 Onboarding + deadline | OK — profil `RealityAudit`, target `2026-08-31`, study plan 41 dní |
| 5 Diagnostika | PARTIAL — `?diagnostic=1` QE běží; **neprošli jsme ≥8 otázek** k baseline v UI (kód baseline existuje) |
| 6 Study plan | OK — generován z onboardingu; path adaptace z baseline v kódu |
| 7 Dashboard | OK — jméno, dny do cíle, mise learn/review/test |
| 8–10 Mise / lekce / QE | PARTIAL — QE odpověď + vysvětlení ověřeno; auto-mark kroků v kódu |
| 11–12 Chyba → Error Notebook | **WORKING** — 1 otevřená chyba „realismus“ po špatné odpovědi |
| 13–16 Flashcards / AR / SR | BACKEND WORKING (unit + wiring); AR→readiness **doplněno**; UI E2E ne komplet |
| 17–18 Mastery / readiness | WORKING po QE (script + `recordReadinessPractice`) |
| 19 Next lesson | PARTIAL — weak label → learn href; QE pořadí **ne** adaptivní |
| 20–22 Test / mixed / oral | Seeded packs (ne UI-hardcoded); oral UI + rubrika v kódu; E2E ne komplet |
| 23 Progress | Routes existují; beta-report v kódu; E2E ne komplet |
| 24–26 Logout / login / persist | **WORKING soft** — logout smaže cookie; `/prihlaseni` bez session → onboarding; FS záznam zůstává |
| 27–35 Admin | Login OK; Content Studio (topics/lessons/KU); Sources 12 docs + audit; Analytics live events |

Script: `npx tsx scripts/reality-check-journey.ts` → QE grade, readiness persist, error notebook, SR `nextReview`, mastery engine, missed-days logic.

---

## Feature matrix

| FEATURE | STATUS | REAL BACKEND? | PERSISTENT DATA? | REAL LOGIC? | TESTED? | KNOWN ISSUE? | SEVERITY |
|---------|--------|---------------|------------------|-------------|---------|--------------|----------|
| Landing / marketing | WORKING | N/A | N/A | Marketing copy | Browser | Hero Score 68/74 hardcoded | P3 |
| Marketing Maturita Score | UI_ONLY | No | No | Static preview | Code (`Score value={74\|68}`) | Looks like live score | P2 |
| App readiness / Maturita Score | WORKING | Yes FS | Yes | Mastery book → snapshot | Script + dashboard 0% | Needs practice to move | — |
| Registrace | WORKING | Soft | Cookie | Honest no-email | Browser | Not real accounts | P1 (produkt) |
| Onboarding | WORKING | Yes | Learner JSON | Study plan gen | Browser | — | — |
| Target date → plan | WORKING | Yes | Profile + plan | Deadline days | Browser + unit | — | — |
| Diagnostika | PARTIAL | Yes | Baseline on learner | ≥8 attempts lock | Code + 1 Q browser | Full 8Q UI not finished here | P1 |
| Study planner / path | WORKING | Yes | Path store | Curriculum + baseline flag | Code + unit | — | — |
| Deadline planner | WORKING | Yes | Computed | Uses `targetDate` | Unit | — | — |
| Missed day → plán | PARTIAL | Yes | Streak + note | Catch-up cap / note | Unit + code | **Nepřepisuje** daily mission steps | P1 |
| Daily mission dashboard | WORKING | Yes | Day JSON | Steps + links | Browser | Manual „Potvrdit“ fallback | P2 |
| Question Engine | WORKING | Yes | Pack + progress | Grade + explain | Browser + script | Fixed pack index | — |
| Weak → next QE order | MISSING | No | — | Sequential `currentIndex` | Code | Slabiny neřadí otázky | P1 |
| QE → Error Notebook | WORKING | Yes | ErrorMemory FS | incorrect/partial | Browser | Answer shown as JSON blob | P3 |
| QE → readiness/mastery | WORKING | Yes | Readiness book | `applyMasteryEvidence` | Script | — | — |
| Flashcards SM-2 | WORKING | Yes | Schedule FS | Grade + readiness | Code/unit | UI E2E NOT_VERIFIED | P2 |
| Active recall | WORKING | Yes | Progress FS | Coverage grade + readiness | Code (wiring fix) | UI E2E NOT_VERIFIED | P2 |
| Review queue / SR | WORKING | Yes | Schedule book | `nextReview` on grade | Script | UI E2E NOT_VERIFIED | P2 |
| Mixed practice | PARTIAL | Yes | Session | Domain session | Code | Thin product surface | P2 |
| Oral / mock exam | WORKING | Yes | Pack + reports | Rubric score | Code/unit | Random topic pick; ≠ komise | P2 |
| Progress / beta report | WORKING | Yes | Events + baseline | Before/after | Code | Full UI NOT_VERIFIED | P2 |
| Soft login `/prihlaseni` | WORKING | Cookie | Session | Resume if cookie | Browser | No email/password | P1 (Auth) |
| Logout | WORKING | Cookie clear | FS kept | `clearLearnerCookie` | Browser | Cannot resume after logout | expected |
| Persist refresh | PARTIAL | Cookie+FS | Yes if cookie | Signed id | Model | Logout = lose access | P1 |
| Admin login | WORKING | Cookie | Session | `ADMIN_SECRET` | Browser | Dev default secret | P2 ops |
| Admin sources / import | WORKING | Yes | Import + audit | needs_review default | Browser | — | — |
| Admin topics/lessons/KU | WORKING | Yes | Content studio | CRUD + provenance | Browser | Large catalog | — |
| Admin questions | WORKING | Yes | Store | Gated mutations | Code | — | — |
| Verification status | WORKING | Yes | QA + provenance | Import ≠ auto verified | Browser copy + code | — | — |
| Admin analytics | WORKING | Yes | Event store | Real aggregates | Browser | Small sample noise | P3 |
| Předměty / Ceník pages | UI_ONLY | No | — | FeatureState | Catalog | Scaffolded | P3 |
| Demo shortcuts | WORKING (gated) | Demo only if env | — | Hidden unless `NEXT_PUBLIC_ENABLE_DEMO_DATA=1` | Code | — | — |

---

## Speciální ověření (checklist)

| Otázka | Verdikt | Evidence |
|--------|---------|----------|
| Maturita Score z mastery? | **App ANO / Marketing NE** | App: readiness snapshot; marketing: hardcoded 74/68 |
| Mastery reaguje na odpovědi? | **ANO** | `recordReadinessPractice` + script units=1 |
| SR plánuje next review? | **ANO** | `applyPerformance` → `nextReview` future |
| Study planner reaguje na deadline? | **ANO** | `daysRemaining` z `targetDate` |
| Vynechaný den změní plán? | **ČÁSTEČNĚ** | Deadline note/catch-up; mission steps stejný template |
| Error Notebook z chyb? | **ANO** | Browser: 1 otevřená chyba po fail |
| Slabiny ovlivní další otázky? | **NE** | Fixed `currentIndex` v packu |
| Diagnostika ovlivní plán? | **ANO (kód)** | `diagnosticBaseline` → beta path; UI ≥8 neověřeno zde |
| Learning modes = reálný obsah? | **ANO** | Seeded JSON packs, ne hardcoded UI lists |
| Testy hardcoded? | **NE** | `data/question-engine/packs` |
| Data přežijí refresh/login? | **PARTIAL** | Refresh s cookie ANO; soft logout ztratí přístup |
| Import provenance? | **ANO** | Sources: sha, version, audit log |
| Unverified ≠ verified publish? | **ČÁSTEČNĚ** | Import → needs_review; Content QA verify je strict — ale Content Studio `set_published` může publikovat bez verificationStatus gate |

---

## Grep / mock findings (`src/`)

| Pattern | Realita |
|---------|---------|
| `TODO` / `FIXME` | Žádné produktové TODO v `src/` (jen Next internals v `.next`) |
| `MOCK` | `mock-exam` = produktový režim „zkouška nanečisto“, ne fake backend |
| `DEMO` / `NEXT_PUBLIC_ENABLE_DEMO_DATA` | Demo seed tlačítka gated |
| `Math.random` | Shuffle + mock-exam topic pick — OK |
| `setTimeout` | Timers UI (countdown, flash) — ne fake API |
| Hardcoded scores | Marketing previews only |
| Dead auth | `/prihlaseni` dříve blocked → **opraveno** soft resume |

---

## Prioritizace

### P0 — produkt nelze reálně používat (private beta)

| ID | Issue | Stav |
|----|-------|------|
| P0-1 | Learner logout chyběl | **OPRAVENO** — `clearLearnerCookie` + Profil |
| P0-2 | `/prihlaseni` FeatureState blocked | **OPRAVENO** — soft session resume |

*(Žádný zbývající P0 pro single-browser private beta.)*

### P1 — hlavní learning loop

| ID | Issue | Stav |
|----|-------|------|
| P1-1 | Active recall nepsal readiness | **OPRAVENO** — `recordReadinessPractice` + mission step |
| P1-2 | Weak areas neřadí QE otázky | **OPEN** — vyžaduje adaptive order (architektura) |
| P1-3 | Missed days nepřepisují mission steps | **OPEN** — jen deadline note |
| P1-4 | Diagnostika ≥8 → baseline neověřena E2E v této session | **OPEN** (kód ready) |
| P1-5 | Žádný e-mail Auth / recovery po logout | **OPEN** — záměr betě; dokumentovat testerce |

### P2

- Marketing Score vypadá live  
- Manuální „Potvrdit hotové“ stále možné  
- Error notebook zobrazuje raw JSON answer  
- Flashcards / SR / oral UI E2E nekomplet  
- Admin secret default v dev  
- `weeklyHistory` na readiness book se skoro nepíše (spark/week delta duté)  
- Content Studio bulk publish nemusí vyžadovat verified status  
- Admin Otázky / Uživatelé = FeatureState shell  

### P3

- Scaffolded `/predmety`, `/cenik`  
- Polish copy / a11y bottom-nav overlapping CTAs na úzkém viewportu  

---

## Opravy v této session

1. `clearLearnerCookie` + `logoutLearnerAction` + `LogoutButton` na Profil  
2. `/prihlaseni` soft resume (cookie) místo blocked FeatureState  
3. Active recall → readiness + auto-mark learn step  
4. `routeCatalog` `/prihlaseni` → ready  

---

## Gates (spuštěno 2026-07-21 po opravách)

| Gate | Result |
|------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 warnings) |
| `npm test` | PASS (46 files / 202 tests) |
| `npm run build` | PASS |
| `npx tsx scripts/reality-check-journey.ts` | PASS (login/logout WORKING; persist PARTIAL) |

Build ≠ ready — viz verdikt výše.

---

## READY FOR REAL BETA TEST

**YES** — private, 1 testerka, 1 prohlížeč, nasazený seed + `ADMIN_SECRET` + `LEARNER_SESSION_SECRET`.

### Proč ne public YES

- Žádný e-mail/heslo; logout = ztráta přístupu k progressu (data na disku zůstanou orphan).  
- FS store bez RLS — OK jen důvěryhodný host.  
- Adaptive QE z mezer chybí.  
- Plný multi-day missed-day rewrite misí neověřen / neimplementován.

### Stále ne plně ověřené E2E

- Diagnostika 8+ otázek → baseline → změna plánu v UI  
- Flashcards / active recall / SR celá session v UI  
- Oral simulation + mixed practice end-to-end  
- Progress history / beta-report v UI po delším cvičení  
- Persist **refresh** se cookie (logout ověřen; refresh s cookie jen modelově)  
- Playwright CI (spec existuje; browser install často failuje v env)

---

*Audit není marketing. Build ≠ ready. Tento dokument má přednost před optimistic launch copy.*

# GOLDEN PATH TEST REPORT — DámMaturu launch gate

**Date:** 2026-07-21  
**Environment:** local Next.js 15 (`npm run dev`, `:3000`), local-dev Auth (Supabase unset), FS learner stores under `data/`  
**Evidence:** `npx tsx scripts/launch-gate-golden-path.ts` + Cursor browser UI on real account `ui.browser.gate@example.com` with uploaded Czech TXT `cjl-browser-poznamky`  
**Artifact (backend):** `data/launch-gate/run-*.json`

---

## Verdict

# LAUNCH GATE: PASS

All 21 golden-path steps completed with a **real Czech study document** (no demo readiness seed, no mocked materials pipeline). Backend journey re-ran PASS; UI blockers discovered during the gate were fixed and re-verified.

---

## Step results

| # | Step | Result | Evidence / routes |
|---|------|--------|-------------------|
| 1 | New student opens DámMaturu | **PASS** | `/` — brand hero, CTA „Začít zdarma“ (desktop + ~390px mobile) |
| 2 | Creates a real account | **PASS** | `/registrace` → local-dev account; backend also creates fresh `launch.gate.*@example.com` |
| 3 | Completes onboarding | **PASS** | `/onboarding` → learner + study plan on disk |
| 4 | Selects Czech language and literature | **PASS** | subjects=`cjl` |
| 5 | Enters real exam date | **PASS** | UI exam date set; backend `targetDate=2026-05-20` |
| 6 | Uploads maturity documents | **PASS** | `POST /api/materials/upload` with real Czech TXT (not fixture mock) |
| 7 | Documents successfully processed | **PASS** | status `Připraveno` / `ready`, chunks extracted |
| 8 | Knowledge extracted with source provenance | **PASS** | KUs with `documentId` + `chunkId` + `sourceText` |
| 9 | Starts a study session | **PASS** | `/app/materials/study` → **Spustit studijní sesit** → `/app/materials/[id]/study/play` |
| 10 | Grounded questions from her documents | **PASS** | e.g. „Co říká tvůj materiál o díle Máj?“ / Neruda — citation „Ověřeno ze zdroje“ (deterministic templates, **not LLM** — D-005) |
| 11 | Open answers graded intelligently | **PASS** | `evaluateOpenAnswer` key-idea coverage; UI showed Částečně / Správně + ideal answer from source |
| 12 | Mistakes are recorded | **PASS** | `/app/mistakes` — active partial answer for Máj after re-login |
| 13 | Weak topics affect future questions | **PASS** | backend: weak KU mastery 0 → appears in follow-up `smart_mix` session |
| 14 | Reviews are scheduled | **PASS** | SM-2 due dates shown in session feedback; schedule store entries |
| 15 | Daily plan updates | **PASS** | backend: mission steps marked from materials activity; UI dashboard `/app/dashboard` shows live mission |
| 16 | Progress becomes visible | **PASS** | `/app/progress` — mastery %, Maturita Score dimensions, areas |
| 17 | Completes mock oral exam | **PASS** | `/app/simulation` — text oral on *Máj*, score **68/100** (SMART entitlement required) |
| 18 | Readiness recalculated | **PASS** | progress milestone „První maturita nanečisto“ + personal best 68/100; backend readiness snapshot refresh |
| 19 | Logs out | **PASS** | `/app/profile` → Odhlásit → `/` |
| 20 | Logs in on another session | **PASS** | `/prihlaseni` → same account; backend `localSignIn` same `userId` |
| 21 | Data/progress available | **PASS** | `/app/materials` still shows ready Czech file; mistakes + oral milestone retained |

---

## Screens / routes tested

| Surface | Route | Desktop | Mobile (~390px) |
|---------|-------|---------|-----------------|
| Marketing home | `/` | ✓ | ✓ (bottom/menu nav) |
| Register / Login | `/registrace`, `/prihlaseni` | ✓ | ✓ |
| Onboarding | `/onboarding` | ✓ | ✓ |
| Dashboard (Dnes) | `/app/dashboard` | ✓ | ✓ bottom nav |
| Materials hub | `/app/materials` | ✓ | ✓ |
| Study picker | `/app/materials/study` | ✓ | ✓ |
| Study play | `/app/materials/[id]/study/play` | ✓ | ✓ |
| Mistakes | `/app/mistakes` | ✓ | ✓ |
| Progress | `/app/progress` | ✓ | ✓ |
| Oral / mock exam | `/app/simulation` | ✓ | ✓ (start button needs scroll above bottom nav) |
| Profile / logout | `/app/profile` | ✓ | ✓ |

---

## Bugs fixed during this gate

1. **Study start stuck on „Načítám studijní prostor…“**  
   - Cause: App Router `loading.tsx` + Server Actions / `startTransition` left RSC slot `#S:0` `hidden` forever (esp. with 127.0.0.1 ↔ localhost and a caching service worker).  
   - Fix: removed `src/app/app/loading.tsx`; study start/topics via `POST /api/materials/study/start` + `/topics` (no Server Action refresh); hard `location.assign` to play; `allowedDevOrigins` for `127.0.0.1`; SW no longer caches `/app/*` HTML; SW registration disabled in development.

2. **Materials study did not advance daily mission** (earlier in thread)  
   - `finishMaterialsStudySessionAction` → `markTodayMissionStepFromActivity`.

3. **Oral grade did not update progress/readiness** (earlier)  
   - `gradeOralSimulationAction` → `recordMockExamCompletion` + mission exam step + revalidate.

4. **Post-logout login sent returning users to `/onboarding`**  
   - `/prihlaseni` used logged-out `hasOnboarding=false` as redirect fallback.  
   - Fix: default `next` → `/app/dashboard`; missing learner still handled by `/app` layout.

---

## Product honesty (not failures)

- „AI“ study questions / open-answer grading are **deterministic, source-grounded** (`evaluateOpenAnswer`), not student-facing LLM grading (policy **D-005**). Provenance is real.
- Mock oral requires **SMART** (or higher). FREE users correctly see paywall until entitled.
- Session payload for materials play is client `sessionStorage` after API start (survives hard nav; cleared on new browser profile until re-start).

---

## Remaining known risks

| Risk | Severity | Notes |
|------|----------|--------|
| No App Router `loading.tsx` under `/app` | Low | Instant blank wait on slow SSR; prefer page-level skeletons later — do **not** restore segment `loading.tsx` without fixing Suspense reveal. |
| Production SW must stay network-only for `/app/*` | Med | Old `dammaturu-shell-v1` clients may need cache bump / unregister once. |
| Mobile fixed bottom nav covers CTAs | Low | Logout / oral start need scroll; consider `pb-` + sticky CTA. |
| Incomplete materials session may not mark full daily mission | Low | Mission advances on session **finish**; single graded item still records mistakes/reviews. |
| Playwright Chromium install flaky in this env | Low | Gate validated via script + browser MCP; CI E2E still worth hardening. |
| FS JSON stores / rename races (analytics) | Low | Observed transient `ENOENT` on analytics rename under concurrent writes. |

---

## How to re-run

```bash
# Backend golden path (real Czech TXT, no UI)
npx tsx scripts/launch-gate-golden-path.ts

# UI (manual / Playwright when browsers installed)
npm run dev
# then walk docs steps on / → registrace → … → simulation → logout → prihlaseni
```

---

## Final line

**LAUNCH GATE: PASS**

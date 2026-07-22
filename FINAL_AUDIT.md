# FINAL AUDIT — DámMaturu.cz

**Date:** 2026-07-22  
**Scope:** Actual running application (clean production build + `next start`), not assumed prior prompt completion.  
**Auditor method:** typecheck/lint/unit/integration scripts, production HTTP smoke, content/CERMAT reports, SEO unit tests, component axe; Playwright blocked in this environment.

---

## Verdict (read first)

**Not launch-ready.**

A scripted guest learning loop works (`test:guest-path`, `test:tomorrow-ready`). That is **not** the same as proving the student golden path in a real browser. Browser E2E could not run here. Product honesty fails on **beta zdarma vs paid paywalls**, and several acceptance gates fail (unit tests, E2E alignment, secondary feature CTAs).

Do **not** treat a green build as a 10/10 release.

---

## 1. Passed checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | PASS | `tsc --noEmit` clean |
| `npm run lint` | PASS (warnings) | 2 unused-var warnings only |
| `npm run build` (clean `.next`) | PASS | 80 app paths; shared First Load JS **103 kB** |
| Production HTTP smoke (post clean build) | PASS | Public + core guest routes return **200** |
| Homepage CTA present | PASS | „Začít se učit zdarma“ → `/app/learn` |
| Public Czech learning pages | PASS | `/priprava` + **14/14** topic slugs HTTP 200 |
| Catalog materials reachable | PASS | **12/12** `cjl-*` sourceIds listed on `/app/materials` and open at `/app/materials/katalog/[id]` (200) |
| Guest study script path | PASS | `npm run test:guest-path` → `ok: true` |
| Tomorrow-ready script | PASS | `npm run test:tomorrow-ready` → 12 catalog, learning/test/mistakes/progress |
| CERMAT coverage report | PASS | Regenerated `CERMAT_COVERAGE.md`; `claimsCompletePrep: false` |
| SEO unit tests | PASS | `src/lib/seo.test.ts` (9) |
| Component a11y (axe) | PASS | `src/components/ui/a11y.test.tsx` (6); color-contrast disabled by design |
| Dev-command leak scan (sample pages) | PASS | No `npm run` / `ingest` / lorem / TODO in `/`, `/cenik`, `/app/learn`, `/app/materials`, `/predmety` |
| Předměty honesty | PASS | Scaffolded ČJL-only; no fake multi-subject catalog |
| Ceník when checkout off | PASS | Shows „Beta je zdarma“ (no fake Stripe prices) |
| Guest cookie mint on `/app/*` | PASS | `dm_guest_id` Set-Cookie on `/app/learn` |
| AI unavailable path (code) | PASS | Vysvětli engine returns `unavailable` without LLM; offline copy exists |
| Offline page route | PASS | `/offline` exists in build |

### Route smoke (production, clean build)

**Public 200:** `/`, `/jak-to-funguje`, `/predmety`, `/cenik`, `/o-projektu`, `/maturitni-priprava`, `/priprava`, all 14 `/priprava/[slug]`.

**Guest app 200:** `/app`, `/app/dashboard`, `/app/learn`, `/app/materials`, `/app/topics`, `/app/review`, `/app/tests`, `/app/progress`, `/app/plan`, `/app/mistakes`, `/app/profile`, `/app/zachran-me`, `/app/cermat`, `/app/simulation` (paywalled content — see Failed).

---

## 2. Failed checks

| Check | Result | Notes |
| --- | --- | --- |
| `npm test` (full vitest) | **FAIL** | **5 failed** / 405 passed (4 files) |
| Playwright E2E | **FAIL / BLOCKED** | Chromium `spawn Unknown system error -88`; 23/23 attempted specs failed to launch |
| Playwright a11y / mobile | **FAIL / BLOCKED** | Same browser launch failure |
| Browser student golden path | **NOT VERIFIED** | Scripts OK; real UI path not proven in browser |
| E2E ↔ product CTA alignment | **FAIL** | Specs still expect „Začít se učit **bez registrace**“; UI says „**zdarma**“ |
| E2E ↔ learn IA alignment | **FAIL** | Spec expects heading „Učit se“ + Realismus `/app/learn/rychle/…`; current hub is ČJL catalog-first (Homonyma) |
| Beta messaging vs entitlements | **FAIL** | `/cenik` = beta zdarma; `/app/cermat`, `/app/zachran-me`, `/app/simulation` show PaywallGate → „Zobrazit ceník“ |
| Assumed URLs from audit brief | **N/A mismatches** | `/projekt` → use `/o-projektu`; `/app/reviews` → `/app/review`; `/app/preferences` → **404** (prefs live under `/app/profile`) |
| Concurrent `next build` + `next dev` | **OPS FAIL** | Corrupted `.next` → production served pages-router 404 with `buildId: development` until clean rebuild |
| Product-analytics persistence | **FAIL (runtime)** | Repeated `ENOENT` rename under `data/product-analytics/learners/*.json.tmp` in prod logs |
| Full Lighthouse / lab performance | **NOT RUN** | Bundle sizes from Next build only |
| Rich-results / Search Console | **NOT RUN** | Documented checklist in `docs/SEO_AUDIT.md` only |

### Unit test failures (actual)

1. `src/lib/navigation.test.ts` — secondary nav now includes „CERMAT příprava“; test expectation stale.  
2. `src/domain/learning/mastery-engine.test.ts` — disclaimer no longer contains „pravděpodobnost“.  
3. `src/domain/learning/readiness.test.ts` — disclaimer uses „předpověď“; regex still wants predikce/šance/maturity.  
4. `src/server/materials-study/session.e2e.test.ts` — smart-mix distinct kinds `3 < 4`.  
5. *(same suite)* — counted as 5 assertion failures across those files.

---

## 3. P0 / P1 / P2 bugs

### P0 — must fix before public launch

1. **Misleading „beta zdarma“ vs paid gates**  
   Checkout off → `/cenik` says beta is free. Guests still hit PaywallGate on CERMAT / Zachraň mě / Zkouška nanečisto with CTA „Zobrazit ceník“, which then says nothing is for sale. Dead honesty loop.

2. **Browser golden path not proven**  
   Acceptance requires anonymous: homepage → start → Czech → real material → learning → test → mistake → review → saved progress. Scripts pass; Playwright cannot run here; E2E selectors are also stale vs current UI. Launch gate unmet.

3. **E2E suite does not match the product**  
   Wrong primary CTA string; learn hub IA changed. Even after browser install, golden-path E2E would fail until updated — release gate is blind.

### P1 — fix before or immediately after soft launch

4. **„Zkouška nanečisto“ quick action can point at `/app/learn/maj`** for non-entitled guests (`cjl-home.ts`), while nav „Zkouška nanečisto“ goes to paywalled `/app/simulation`. Same label, different products — false/misleading feature signal.

5. **Route catalog marks CERMAT / Zachraň mě / simulation as `availability: "ready"`** while FREE entitlements exclude them → chrome advertises blocked features as ready.

6. **Guest cookie `Secure` whenever `NODE_ENV=production`** (even on `http://`) — breaks cookie persistence on non-HTTPS local/prod-preview; real HTTPS deploy OK, but HTTP probes and some hosts fail silently.

7. **Filesystem rename races** in product-analytics (and earlier study-content progress under concurrent load) — `ENOENT` on atomic rename; analytics/progress durability risk under parallel requests.

8. **Unit / integration suite red** — 5 failures indicate copy/IA/session drift; CI cannot be trusted green.

9. **`.next` corruption when build overlaps dev** — operational footgun; documented incident during this audit.

### P2 — polish / follow-up

10. Lint unused imports (`cermatPackSchema`, `VysvetliSourceKind`).  
11. `/app/preferences` does not exist — docs/tests should say `/app/profile`.  
12. E2E install fragility (Playwright `__dirlock` / incomplete headless_shell).  
13. SEO: no dedicated OG image (`docs/SEO_AUDIT.md` SEO-01).  
14. Learning hub streams with Suspense („Načítám studium…“) + noscript requires JS — acceptable for app, note for crawlers (app already noindex).

---

## 4. Content coverage

| Layer | Count | Status |
| --- | --- | --- |
| Public curated topics (`/priprava/[slug]`) | **14** | All HTTP 200; sitemap inventory matches `docs/SEO_AUDIT.md` |
| ČJL catalog materials (`cjl-*`) | **12** | All listed on materials hub; all katalog deep links 200 |
| Source IDs | `cjl-homonyma`, `cjl-realismus`, `cjl-realismus-francie`, `cjl-realismus-rusko`, `cjl-realismus-anglie`, `cjl-romantismus`, `cjl-narodni-obrozeni`, `cjl-maj`, `cjl-kytice`, `cjl-babicka`, `cjl-jirasek`, `cjl-ceske-drama-19` | Reachable |
| Subjects beyond ČJL | **None** | `/predmety` honestly scaffolded |
| Experience shells (Máj / Babička / Kytice) | Lazy routes in build (~177 B / ~109 kB FL) | Present |

**Reachability verdict:** Every existing valid Czech catalog material checked in this audit is reachable via HTTP. Deeper in-browser lesson completion for each of the 12 was not re-exercised beyond tomorrow-ready script (which uses catalog inventory).

---

## 5. CERMAT coverage

From `CERMAT_COVERAGE.md` (generated 2026-07-22):

| Metric | Value |
| --- | --- |
| Requirements covered / partial / missing | **4 / 5 / 0** |
| Areas covered / partial / missing | **3 / 5 / 0** |
| Knowledge units mapped | **304 / 304** |
| `claimsCompletePrep` | **false** (correct — do not claim „kompletní příprava“) |
| Student-facing CERMAT lane | Paywalled for FREE guests (see P0) |

Honest product stance on completeness is good. Access honesty during free beta is not.

---

## 6. Accessibility results

| Layer | Result |
| --- | --- |
| Shared UI axe (`jest-axe`) | **PASS** (6 tests); contrast rule intentionally off |
| Skip-link present on public/app shells | Observed in HTML (`Přeskočit na obsah`) |
| Playwright a11y + overflow matrix | **NOT RUN** (browser launch failure) |
| Keyboard / screen-reader full journeys | **NOT VERIFIED** |

**A11y launch bar:** component-level OK; full-page and mobile a11y gate **open**.

---

## 7. Performance results

| Signal | Value |
| --- | --- |
| Shared First Load JS | **103 kB** |
| Homepage | **4.75 kB** / **116 kB** FL |
| `/app/learn` shell | **168 B** / **106 kB** FL (streamed body) |
| `/app/dashboard` | **6.72 kB** / **132 kB** FL |
| Heavy experience pages | Lazy ~**177 B** / ~**109 kB** FL |
| Middleware | **92.7 kB** |
| Lighthouse / CWV field | **Not measured** |

Bundle sizes look reasonable for a content-heavy Next 15 app. No lab performance score — do not claim “fast” beyond these figures.

---

## 8. SEO results

Aligned with `docs/SEO_AUDIT.md` + `src/lib/seo.test.ts`:

| Item | Status |
| --- | --- |
| Unique titles / descriptions / canonical | Implemented (unit-tested) |
| robots disallow `/app/`, `/admin/`, … | Implemented |
| Sitemap = real public paths only | Implemented (~22 public paths) |
| Preview noindex | Implemented |
| Structured data (home / priprava / topics) | Implemented; Rich Results not revalidated live |
| Private app noindex | Confirmed on `/app/learn` meta |
| Thin subject pages | Avoided (`/predmety` scaffolded) |
| Remaining | OG image missing; Search Console submit pending first prod deploy |

---

## 9. Remaining risks

1. **Honesty gap** on free beta vs SMART paywalls will burn trust on day one.  
2. **Golden path E2E blind** — regressions in guest persistence / CTA can ship unnoticed.  
3. **Secure cookie on HTTP** + FS rename races → flaky progress/analytics under some hosts.  
4. **Secondary CTAs** (CERMAT, simulation label) teach wrong mental model.  
5. **Content depth vs CERMAT partial areas** — language/syntax/orthography still partial; marketing must stay modest.  
6. **Ops:** never run `next build` while `next dev` shares `.next`.  
7. **Environment:** Playwright Chromium install/launch unstable on this machine — CI must own green E2E.  
8. Network-failure and AI-unavailable UX exist in code paths but were **not** chaos-tested in a browser this audit.

---

## 10. Launch recommendation

### Recommendation: **NO-GO for public launch**

Ship only as a **closed / soft beta** if stakeholders accept:

- Guests can study catalog ČJL materials, tests, mistakes, review **without registration** (script-proven; browser unproven).  
- Messaging must be corrected so „beta zdarma“ either **unlocks** CERMAT / Zachraň mě / simulation for free, **or** those nav entries are hidden / clearly labeled as „brzy / placené“ without a dead ceník loop.  
- E2E golden path updated and green in CI.  
- Unit suite green again.

### Minimum exit criteria before GO

1. Fix P0 honesty (entitlements **or** copy/nav).  
2. Update + pass Playwright guest golden path on CI (CTA + real learn → material → test → mistake → review → reload).  
3. Green `npm test`.  
4. Manual incognito pass on desktop + one mobile viewport for the golden path.  
5. Confirm guest cookie works on the real HTTPS host.  
6. Re-run a11y Playwright suite once browsers work in CI.

### What is already in good shape

Clean public ČJL content layer, honest incomplete CERMAT claim flag, no obvious developer-command leaks on sampled pages, solid typecheck/build, and a working **server-side** guest study script.

---

*Audit artifact only. No release score inflation. Build success ≠ student path success.*

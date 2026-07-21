# QA_CHECKLIST — DámMaturu.cz

Používej před každým významným merge a před beta go-live.

## A. Build & engineering gate (po každém promptu s kódem)

- [ ] `pnpm/npm typecheck` (nebo `tsc --noEmit`) — pass
- [ ] lint — pass
- [ ] relevantní unit testy — pass
- [ ] `next build` — pass
- [ ] žádné nové `any` bez zdůvodnění
- [ ] žádné `console.log` s PII
- [ ] env validace nezvládne boot s chybějícími secrets

**Aktuální stav repo (2026-07-20):** vše výše **N/A / NOT VERIFIED** — aplikace neexistuje.

## B. Produktová pravda

- [ ] Žádné nefunkční buttony v nav/flow
- [ ] Žádná placeholder data v produkčním learner flow
- [ ] Žádný fake progress
- [ ] Prázdné stavy mají smysluplnou CZ copy + CTA
- [ ] Error stavy mají recovery akci

## C. Learning integrity

- [ ] Každá published KU má provenance
- [ ] Každá published KU má ≥1 active-recall item
- [ ] Pasivní read neposouvá mastery nad `exposed`
- [ ] Incorrect attempt zkrátí due / zařadí error loop
- [ ] Mission priority: overdue → lapses → gaps → new
- [ ] Readiness se počítá z mastery×weight, ne z „dokončených lekcí“
- [ ] Student-facing text neobsahuje LLM výmysly

## D. Content QA (beta corpus)

Pro každý ze 12 sources:

- [ ] Canonical text importován
- [ ] Topics přiřazeny
- [ ] KU pokrytí dostatečné (ne 1 KU = celý doc)
- [ ] Sporné fakty označeny / opraveny (např. letopočty)
- [ ] Items mají správné odpovědi
- [ ] Čeština: pravopis, typografie, srozumitelnost

## E. UX / mobile-first

- [ ] Primární flow ovladatelný jednou rukou na šířce ~390px
- [ ] Touch target ≥ 44×44 px
- [ ] `/dnes` okamžitě ukáže misi (ne menu chaos)
- [ ] Typografie čitelná; kontrast OK
- [ ] Žádný horizontal scroll na mobile
- [ ] Klávesnice nepřekrývá submit u short-answer (visual viewport)

## F. Accessibility (WCAG baseline)

- [ ] Semantické headingy
- [ ] Focus visible
- [ ] Form labely
- [ ] Buttons ne div onClick
- [ ] Alt text u smysluplných obrázků (dekorace aria-hidden)
- [ ] Color not sole indicator (správně/špatně)
- [ ] Prefer reduced motion respektován u non-essential animací

## G. Auth & security

- [ ] Odhlášený uživatel nevidí cizí progress
- [ ] RLS ověřeno (minimálně manuální test 2 účty)
- [ ] Session expiry chování předvídatelné
- [ ] CSRF/origin ochrana u mutations dle stacku
- [ ] Uploads (pokud jsou) validované + omezené

## H. Privacy

- [ ] Privacy copy dostupná před registrací
- [ ] Analytics až po consent (pokud non-essential)
- [ ] Postup smazání účtu/progress zdokumentován

## I. E2E smoke (Playwright)

- [ ] `npx playwright install` (jednou na stroji / CI)
- [ ] `npm run test:e2e` — critical journeys green
- [ ] Admin gate: `/admin/*` → login bez session
- [ ] Home + onboarding + `/app/tests` < 500

Critical journeys (manuálně / E2E):

1. Registrace / onboarding  
2. Start dnešní mise  
3. Submit correct + incorrect attempt  
4. Mastery / readiness change visible  
5. Review due item  
6. Admin login + Content Studio  

## J. Pre-launch QA log

Plná tabulka P0–P3: [`docs/PRE_LAUNCH_QA.md`](./PRE_LAUNCH_QA.md).

## K. Release notes povinnosti

Při uzavření fáze aktualizuj `PROJECT_STATE.md`:

- hotovo / rozpracováno / další krok  
- známé problémy  
- migrations  
- test status (co bylo skutečně spuštěno)

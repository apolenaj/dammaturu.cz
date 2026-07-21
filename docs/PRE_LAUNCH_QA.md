# PRE_LAUNCH_QA — DámMaturu.cz

Datum auditu: **2026-07-21**. Gates: typecheck · lint · unit tests · build.

**Nehodnoceno 10/10** — zbývají P2/P3 a hard gate RLS/Supabase Auth pro multi-user public launch.

## Severity table

| ID | Sev | Area | Finding | Stav po opravě |
|----|-----|------|---------|----------------|
| A1 | P0 | Security | Admin routes/actions bez auth | **OPRAVENO** — `/admin/login` + `ADMIN_SECRET` + middleware + `assertAdmin` na mutacích |
| A2 | P0 | Security | Cookie identity IDOR / unsigned | **ZMÍRNĚNO** — signed HMAC cookie + safe-id; plný Auth stále P0 pro public multi-user |
| A3 | P0 | Security | Path traversal v beta helpers | **OPRAVENO** — `assertSafeId` |
| A4 | P0 | Tech | DB RLS chybí | **OTEVŘENO** — hard gate před multi-user cloud; FS+cookie = private beta only |
| A5 | P0 | Test | Žádné E2E | **ZMÍRNĚNO** — Playwright config + `e2e/critical-journeys.spec.ts` + `npm run test:e2e`. Binary download v tomto prostředí selhal — před go-live: `npx playwright install` a CI green |
| B1 | P1 | Functional | Readiness se neupdatuje z practice | **OPRAVENO** — `recordReadinessPractice` z QE/flashcards/SR |
| B2 | P1 | Functional | Fake weekly spark | **OPRAVENO** |
| B3 | P1 | Functional | Due cards floor ≥18 | **OPRAVENO** |
| B4 | P1 | Functional | Diagnostika / demo false complete | **OPRAVENO** — demo gated; wantsDiagnostic respektován; copy upřímná |
| B5 | P1 | Functional | Topics `?focus=` ignorován | **OPRAVENO** |
| B6 | P1 | Functional | Mission complete bez učení | **OPRAVENO** — bez force-complete; den jen po všech krocích |
| B7 | P1 | Content | English lesson badges | **OPRAVENO** — české `typeLabels` |
| B8 | P1 | A11y | Textarea bez labelů | **OPRAVENO** |
| B9 | P1 | A11y | ↑↓ bez aria-label | **OPRAVENO** |
| B10 | P1 | A11y | Modaly bez Escape | **OPRAVENO** |
| B11 | P1 | UX | Chybí loading/error | **OPRAVENO** — `/app` + `/admin` loading; `/app` error |
| B12 | P1 | A11y | Select bez jména | **OPRAVENO** — aria-label |
| C1 | P2 | Functional | FS write races | otevřeno |
| C2 | P2 | Functional | Některé actions bez try/catch | částečně |
| C3 | P2 | Content | English metrics v UI | otevřeno |
| C4 | P2 | A11y | Tabs ARIA incomplete | otevřeno |
| C5 | P2 | UX | Offline handling | otevřeno |
| C6 | P2 | A11y | Accent contrast ~3:1 | otevřeno |
| C7 | P2 | Content | Provenance na dílo view | otevřeno |
| D1 | P3 | Copy | Ceník vs registrace | otevřeno |
| D2 | P3 | Admin | English admin labels | otevřeno |

## Re-audit (po P0/P1 opravách)

| Kontrola | Výsledek |
|----------|----------|
| Admin bez cookie | redirect `/admin/login` |
| Admin actions bez session | `{ ok: false }` / prázdná data |
| Learner id `../` | reject |
| Spark / due floor | žádná fabricace |
| Practice → readiness | QE/FC/SR zapisují |
| Mission force-complete | odstraněno |
| Unit tests | musí pass |
| E2E smoke | `npm run test:e2e` (Playwright) |

## Zbývající hard gates před public launch

1. Supabase Auth + RLS (A4 / A2 zbytek)
2. E2E v CI zelené na staging
3. Content QA průchod celého beta korpusu (checklist D)
4. Kontrast + offline (P2)

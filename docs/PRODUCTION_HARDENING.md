# Production hardening (D-063)

Checklist of controls for production. Keep this lean — prefer existing stack over new vendors.

## Performance

- **Fonts:** `next/font` (Fraunces + Manrope) with `display: "swap"`, `preload`, `adjustFontFallback` to limit CLS
- **Loading:** `/app/loading.tsx` skeleton + `AppLoadingState` min-height
- **Lazy load:** heavy experiences (Máj / Babička / Kytice), CERMAT, oral/mock, Zachraň mě, Beta FAB via `next/dynamic`
- **Study catalog:** `getStudyContentRegistry` request-memoized (`React.cache`) — no repeated catalog walks per request
- **Parsers:** `mammoth` / `pdf-parse` are `serverExternalPackages` — never shipped to the browser; uploads extracted server-side only
- **Static assets:** long-cache headers for `/_next/static` and `/icons`
- **Bundle inspect:** `npm run build` then inspect `.next/analyze` / route sizes; optional `npm run analyze` when analyzer is wired

## Security

### Auth / authorization
- Learner identity from Auth session / signed guest cookie (`assertSafeId`, HMAC)
- Admin cookie HMAC verified in **middleware** (Edge) and `assertAdmin`
- Local-dev Auth hard-disabled when `NODE_ENV=production`
- Open redirects blocked via `safeInternalPath`

### Uploads
- Magic-byte sniff (PDF / DOCX-ZIP / text) — extension alone is insufficient
- Same-origin check on cookie POSTs
- Per-learner + IP rate limits
- Material IDs pass `assertSafeId` before filesystem joins
- Empty / oversized rejected

### Paths / files
- `assertPathInsideRoot` on catalog originals — blocks `../` escapes
- Original DOCX route: allowlisted `sourceId` + rate limit + `nosniff`

### API / rate limits
- Auth signup/signin, admin login, materials/school-exam upload, analytics beacon
- Expensive study endpoints: Vysvětli mi to (20/min), original DOCX download (30/min)

### XSS / CSRF / headers
- React escaping by default; JSON-LD only trusted server object
- Cookie POSTs: SameSite=lax + Origin/Referer check on uploads
- Global: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`

### AI / documents
- No student-facing LLM grading (D-005)
- Vysvětli mi to fails open to source-grounded engine; AI optional
- `wrapUntrustedDocumentForPrompt` + injection signal detection for future LLM / logging
- Client-safe errors via `clientSafeError` (no stacks / secrets / paths)

### Secrets / PII
- No `ADMIN_SECRET` / default passwords on production admin login copy
- Product analytics: allowlisted metadata only (see `docs/PRODUCT_ANALYTICS.md`)
- Required in production: `ADMIN_SECRET`, session secrets

## Fail-safe (student always learns)

If AI / network / analytics / optional service fails:

1. **Never** show raw errors, stacks, or developer commands (`npm run seed:*`, `ingest …docx`)
2. Show recovery: **Zkusit znovu** · **Pokračovat offline** · **Vrátit se k materiálům**
3. Components: `AppErrorState`, `StudyRecoveryState`, `ContentUnavailableState`
4. Analytics beacons are fire-and-forget (failures ignored)
5. Catalog / question packs remain reachable without AI

## UI hygiene
- Empty states: Czech product copy only
- Literary experiences do not surface internal SOURCE filenames

## E2E
- `e2e/golden-path.spec.ts` — register → onboarding → materials → logout/login → mobile → forged admin cookie
- Launch gate asserts no `npm run seed` leaks
- `npm run test:e2e`

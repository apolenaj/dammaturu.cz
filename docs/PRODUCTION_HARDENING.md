# Production hardening (D-063)

Checklist of controls for production.

## Auth / authorization
- Learner identity from Auth session only (`getAuthIdentity`)
- Admin cookie HMAC verified in **middleware** (Edge) and `assertAdmin`
- Local-dev Auth hard-disabled when `NODE_ENV=production`
- Open redirects blocked via `safeInternalPath`

## Uploads
- Magic-byte sniff (PDF / DOCX-ZIP / text) — extension alone is insufficient
- Same-origin check on cookie POSTs
- Per-learner + IP rate limits
- Material IDs pass `assertSafeId` before filesystem joins
- Empty files rejected; oversized rejected

## API / rate limits
- Auth signup/signin, admin login, materials/school-exam upload, analytics beacon

## XSS / CSRF
- React escaping by default; JSON-LD only trusted server object
- Cookie POSTs: SameSite=lax + Origin/Referer check on uploads

## AI / documents
- No student-facing LLM grading (D-005)
- `wrapUntrustedDocumentForPrompt` + injection signal detection for future LLM / logging

## Secrets / errors
- No `ADMIN_SECRET` / default passwords on production admin login copy
- API/actions return client-safe messages (no stacks / env paths)
- Required: `ADMIN_SECRET` in production

## UI hygiene
- **Never** show `npm run seed:*` or CLI paths to learners
- Empty states: Czech product copy only

## E2E
- `e2e/golden-path.spec.ts` — register → onboarding → materials → logout/login → mobile → forged admin cookie
- `npm run test:e2e`

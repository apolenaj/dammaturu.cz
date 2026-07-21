# AUTH.md — DámMaturu authentication

## Production (Supabase)

1. Create a Supabase project.
2. Set in `.env.local` / hosting:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (exact site origin for redirects)
3. Auth → URL config: add `{SITE}/auth/callback`
4. Optional: enable Google provider → set `NEXT_PUBLIC_AUTH_GOOGLE=true`
5. Magic link is on by default when Supabase is configured (`NEXT_PUBLIC_AUTH_MAGIC_LINK=false` to disable)
6. Recommend: disable “Confirm email” for private beta, or handle confirm UX on `/registrace`

## Local development (no Supabase)

When Supabase env is missing and `NODE_ENV !== production`, **local-dev Auth** stores accounts in `data/auth-local/` (scrypt passwords + signed httpOnly cookie). Same learner-id mapping as Supabase (`auth.uid` → 32-char hex).

- Register: `/registrace`
- Login: `/prihlaseni`
- Reset: request reset → open `/auth/nove-heslo`
- Verify script: `npx tsx scripts/verify-auth-flow.ts`

Local-dev Auth is **disabled in production**.

## Identity & progress

`learnerId = uuid without hyphens`. All `data/**` progress files use this id. Logout does not delete progress. Re-login restores the same id.

## Protected routes

Middleware + `/app` layout require Auth. Unauthenticated → `/prihlaseni`. Authenticated without onboarding → `/onboarding`.

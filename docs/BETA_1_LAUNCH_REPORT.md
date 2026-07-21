# BETA 1.0 — Final launch report

Datum: **2026-07-21**. Cílová testerka: private beta do **31. 8. 2026**.

**Verdikt:** Připraveno na **jednu důvěryhodnou testerku** na nasazeném hostu s content seedem a secrets. **Není** public multi-user launch.

---

## Co funguje

- Onboarding → signed learner cookie (bez fake login).
- Deadline 31. 8. + beta enrollment.
- **Reálná diagnostika** (`?diagnostic=1`, ≥8 otázek) → `diagnosticBaseline` + adapted plan.
- Denní mise s odkazy; auto-complete kroků po QE / quick-grasp / review.
- Question Engine → readiness + **Moje chyby**.
- Spaced review → readiness + ErrorMemory (`again`).
- Progress + **Before/After report** (`/app/progress/beta-report`).
- Oral simulation (rubrika, explicitně ne školní známka).
- Feedback widget (5 otázek) v app shell.
- Admin gated (`ADMIN_SECRET`).
- Unit gates: typecheck / lint / ~200 tests (ověřit po merge).

---

## Co je omezené

- Žádný e-mail/heslo — session = prohlížeč (ztráta cookie = ztráta progressu).
- Learner data na filesystem (ne Postgres RLS) — OK jen private host.
- Mise stále má manuální „Potvrdit hotové“ jako fallback (honor).
- Ne všechny learning metody píšou readiness (QE / FC / SR / quick-grasp ano).
- Oral simulation ≠ komise; speech API závisí na prohlížeči.
- E2E Playwright: spec existuje, CI vyžaduje `npx playwright install`.

---

## Co nebylo ověřeno (v této session)

- Plný 15krokový journey v čistém prohlížeči end-to-end na produkčním URL (nutný smoke s testerkou / operátorem).
- Multi-day „nový plán zítra“ na reálném kalendáři.
- Retention proxy na delším horizontu (týdny).
- Content QA 100 % korpusu (fakta / diakritika) — částečně ze seedů.
- Mobile 320px fyzické zařízení.

---

## Doporučený další krok

1. Nasadit s `ADMIN_SECRET` + `LEARNER_SESSION_SECRET`, ověřit content seed (curriculum, QE, quick-grasp, SR, mock-exam).
2. Operátor projde `docs/BETA_TEST_SCRIPT.md` Den 0 sám (čistý profil).
3. Pozvat testerku; denně číst feedback store + before/after.
4. Parallel track: Supabase Auth + RLS před druhým concurrent userem.

---

## Ops checklist před pozvánkou

- [ ] Secrets v env  
- [ ] Content seeds na disku hostu  
- [ ] `/registrace` → onboarding OK  
- [ ] Diagnostika uloží baseline  
- [ ] Demo tlačítka skrytá (bez `NEXT_PUBLIC_ENABLE_DEMO_DATA=1`)  
- [ ] `/app/simulation` má pack  
- [ ] Feedback widget odesílá  

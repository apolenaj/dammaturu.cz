# BETA_TEST_SCRIPT — DámMaturu Beta 1.0

Pro **první reálnou testerku**. Deadline: **31. srpna 2026**.

Vstup: `/registrace` → onboarding (ne developer seed, ne „ukázková připravenost“).

---

## DEN 0 — Onboarding + diagnostika (45–60 min)

1. Otevři `/registrace` → **Pokračovat na onboarding**.
2. Vyplň jméno, **cíl 31. 8. 2026**, denní minuty (20–45), předmět ČJL, diagnostiku **zapni**.
3. Po uložení jdi na `/app/tests?intent=diagnostic`.
4. Klepni **Spustit diagnostiku** (min. **8 otázek**).
5. Po baseline: otevři `/app/plan` (má se přizpůsobit) a `/app/dashboard` (první mise).
6. Otevři feedback widget (pravý dolní roh) — krátce: co bylo matoucí při startu.

**Hotovo, když:** baseline je na `/app/progress/beta-report`, plán není prázdný, mise má 3 kroky s odkazy.

---

## KAŽDÝ DEN — 20–45 min podle plánu

1. `/app/dashboard` → **Dnes**.
2. Projdi kroky v pořadí (odkazy v misi):
   - **Naučit** (typicky Rychle pochopit),
   - **Zopakovat** (mixed review / flashcards),
   - **Mini test** (Question Engine).
3. Kroky se mají označit **automaticky** po dokončení session; manuální „Potvrdit hotové“ jen když session doběhla mimo app.
4. Když mise hotová → „Potvrdit dokončení dne“ (jen když jsou všechny kroky done).
5. Podívej se na `/app/progress` — připravenost se má hýbat s cvičením.
6. 1× denně (nebo když něco bolí) → feedback widget.

**Nespouštěj:** ukázková data, `npm run seed:*`, admin bez pokynu.

---

## KAŽDÝ 3.–4. DEN — Mini assessment (15–20 min)

1. `/app/tests` → jeden question pack (ne diagnostický režim, pokud už baseline máš).
2. Po chybách otevři `/app/mistakes` — mají se objevit nové položky.
3. Procvič 1 krátkou mistake practice session, pokud jsou otevřené chyby.
4. Feedback: „Co nefungovalo?“ pokud něco selhalo.

---

## KAŽDÝ TÝDEN — Weekly test + feedback (30–40 min)

1. Delší test session (více otázek / celý pack).
2. Mixed review do due = 0 nebo do time budgetu.
3. `/app/progress/beta-report` — zapiš si mastery %, accuracy Δ, slabiny.
4. Feedback widget: všech 5 otázek (stručně).
5. Volitelně `/app/zachran-me`, pokud zbývá málo dní.

---

## POSLEDNÍ TÝDEN (≈ 24.–30. 8.) — Mixed + oral

1. Mixed review + chyby + slabá témata z reportu.
2. `/app/simulation` — **Zkouška nanečisto** (ústní flow + rubrika; **není** školní známka).
3. Opakuj simulaci u slabého díla (Máj / Kytice / Babička huby, pokud je používáš).
4. Feedback: „Co bys změnil/a?“ před finálem.

---

## 31. SRPNA — Final assessment

1. Dokonči `/app/progress/beta-report` (screenshot / export poznámek).
2. Jedna plná oral simulation.
3. Krátký written self-check: 3 silná témata, 3 slabá (srovnej se systémem).
4. Finální feedback (5 otázek).
5. Pošli PO: report + co bylo nejvíc matoucí.

---

## Critical journey checklist (smoke)

| # | Krok | Route |
|---|------|--------|
| 1 | Registrace | `/registrace` |
| 2 | Onboarding | `/onboarding` |
| 3 | Deadline 31. 8. | onboarding date |
| 4 | Diagnostika | `/app/tests?intent=diagnostic` |
| 5 | Automatický plán | `/app/plan` |
| 6 | Dnešní mise | `/app/dashboard` |
| 7 | Lekce / rychlé učení | `/app/learn/...` |
| 8 | Metody | learn hub / flashcards / teach-back |
| 9 | Test | `/app/tests/otazky/...` |
| 10 | Chyba → notebook | `/app/mistakes` |
| 11 | Spaced review | `/app/review/mixed` |
| 12 | Mastery update | `/app/progress` |
| 13 | Progress dashboard | `/app/progress` |
| 14 | Další den nový plán | nový `dateKey` na dashboardu |
| 15 | Oral simulation | `/app/simulation` |

---

## Feedback otázky (widget)

1. Co bylo matoucí?  
2. Co bylo nudné?  
3. Co ti nejvíc pomohlo?  
4. Co nefungovalo?  
5. Co bys změnil/a?

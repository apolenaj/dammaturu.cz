# BETA_PLAN — DámMaturu.cz

## 1. Cíl bety

Jedna beta testerka se do **31. srpna 2026** naučí obsah `/content/source-materials/` tak, aby měla **měřitelnou připravenost** (mastery/readiness), ne jen „prošla materiály“.

Platforma zůstává obecná: testerka = `User` + `Enrollment(pack=beta, target_date=2026-08-31)`.

## 2. Scope bety

### In scope

- ČJL pack z 12 DOCX
- Denní mise + reviews + mastery + readiness
- Mobile-first web
- Account + progress persistence
- Content provenance + review flags

### Out of scope

- Ostatní předměty
- Plná maturitní komise simulace
- AI chat
- Sociální features
- Platby
- Import libovolných PDF od uživatele (ops-only ingest)

## 3. Timeline (orientační od 2026-07-20)

| Období | Focus | Exit kritérium |
|--------|-------|----------------|
| Týden 0 (20–27.7.) | Foundation + auth + ingest | zelený build; canonical text hotový |
| Týden 1 (28.7.–3.8.) | KU + items + engine | 1 mise E2E na reálných datech |
| Týden 2 (4.–10.8.) | Student UX P0 | denní loop použitelný solo |
| Týden 3 (11.–17.8.) | Diagnostika + readiness + content QA | readiness důvěryhodné; needs_review uzavřené |
| Týden 4 (18.–24.8.) | Hardening + beta provoz | smoke E2E; denní používání |
| 25.–31.8. | Intenzivní učení testerky | maximalizace mastery; bugfix only |

> Termíny jsou plán; pokud scaffold sklouzne, **řeže se scope UI**, ne learning loop.

## 4. Role

| Role | Odpovědnost |
|------|-------------|
| Product/Eng (tyto session) | architektura, implementace, docs |
| Content reviewer | faktická kontrola KU (může být stejná osoba + později expert) |
| Beta testerka | denní mise, feedback UX, report bugů |

## 5. Onboarding testerky

1. Účet
2. Enrollment na beta pack + deadline 31.8. + time budget
3. Krátký tutoriál (1 obrazovka): „Každý den otevři Dnes a splň misi“
4. Vstupní diagnostika (10–15 min)
5. První mise hned po diagnostice

## 6. Týdenní cadence během učení

- Denně: mise (15–30 min)
- 2× týdně: delší review block
- 1× týdně: readiness check-in + úprava time budget
- Průběžně: hlášení „tohle je špatně / nejasné“ → `needs_review`

## 7. Success criteria (go / no-go)

### Product go-live (start intenzivního učení)

- [ ] Login funguje
- [ ] Mise generuje reálné items (0 placeholder)
- [ ] Attempt ukládá mastery
- [ ] Due reviews se objevují
- [ ] Readiness se mění s učením
- [ ] Mobile použitelnost OK
- [ ] Published content bez otevřených critical `needs_review`

### Learning success (31.8.)

- [ ] ≥ 80 % KU v `recall_stable` nebo výš **nebo** explicitní zúžený scope dohodnutý dřív
- [ ] Readiness ≥ dohodnutý práh (nastavit po diagnostice)
- [ ] Testerka umí říct slabá témata (shoda se systémem)

## 8. Rizika bety

| Riziko | Mitigace |
|--------|----------|
| Málo času na content structuring | prioritizovat vysoký `exam_weight`; zbytek later |
| DOCX chyby | needs_review; nelhat |
| Přetížení mise | time budget + warning |
| Single-user bias v kódu | zákaz hardcoded user; seed script OK |
| Scope creep „ještě AI“ | D-005 |

## 9. Feedback protokol

Testerka hlásí:

1. Co chtěla udělat
2. Co se stalo
3. Screenshot / URL
4. Jak vážné (blocker / annoying / idea)

Eng odpovídá do 24–48 h u blockerů.

## 10. Data & privacy (beta)

- **Allowlist telemetrie (D-039):** opaque learner id, feature/route, topic slug, minutes, correct bool, error type enum, drop-off step, dateKey.
- **Denylist:** email v telemetrii, volné odpovědi, IP/device fingerprint, platby, GPS, škola/adresa.
- Žádné sdílení dat třetím stranám bez nutnosti.
- Student pulse + PO dashboard (`/admin/analytics`) slouží k vylepšení produktu, ne ke vanity grafům.
- Možnost export/delete progress (minimálně manuální ops postup v P0, self-serve později).

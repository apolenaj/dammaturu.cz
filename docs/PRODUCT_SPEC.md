# PRODUCT_SPEC — DámMaturu.cz

## 1. Co produkt je

**DámMaturu.cz** je kompletní systém přípravy k maturitě:

> Studentovi řekne, co se má naučit, naučí ho to různými metodami, průběžně ověří znalosti, objeví slabiny, naplánuje opakování a ukáže skutečnou připravenost k maturitě.

### Hlavní promise

**Víš přesně, co se naučit. A víš, kdy jsi připraven.**

### Čím produkt NENÍ

- Není „AI chatbot na maturitu“.
- AI/LLM **nesmí** být hlavní marketingový positioning.
- Není pasivní čtečka PDF/DOCX.
- Není generátor „náhodných otázek bez mastery“.

AI smí být **interní nástroj** (asistence při strukturování obsahu, nápověda při tvorbě cvičení) — vždy s provenance, review a bez halucinací ve student-facing flow.

## 2. Primární uživatel (beta)

| | |
|--|--|
| Persona | Středoškolačka připravující se k maturitě z ČJL |
| Deadline | **31. srpna 2026** |
| Corpus | Dokumenty v `/content/source-materials/` |
| Kontext | Mobil + občas desktop; málo času; potřebuje jasnou denní misi |

Architektura **nesmí** být hardcoded na jednu osobu. Beta = 1 cohort / 1 subject pack, platforma zůstává multi-user, multi-subject.

## 3. Job-to-be-done

1. „Nevím, kde začít“ → dostanu dnešní misi.
2. „Učím se, ale nic si nepamatuju“ → active recall + spaced repetition.
3. „Nevím, jestli umím dost“ → readiness score založený na datech, ne na dojmu.
4. „Pořád dělám stejné chyby“ → error loop vrací slabiny do plánu.

## 4. Learning loop (produktový princip)

```
DIAGNOSTIKA → PLÁN → UČENÍ → ACTIVE RECALL → TEST
    → OPRAVA CHYB → SPACED REPETITION → SIMULACE → MASTERY
```

Každé spuštění appky musí studenta postavit na **konkrétní další krok** v tomto loopu — ne na menu „vyber si“.

## 5. Core value pillars

1. **Diagnostika** — co už umíš / neumíš (ne tipování).
2. **Plán** — denní mise odvozená z mezer a deadline.
3. **Učení** — více metod (vysvětlení, kartičky, cloze, porovnání, timeline…).
4. **Ověření** — active recall dřív než pasivní čtení.
5. **Mastery** — měřitelná úroveň na knowledge unit.
6. **Připravenost** — agregovaný readiness k maturitnímu cíli.

## 6. Funkční rozsah — MVP beta (do 31. 8.)

### Musí být (P0)

- Onboarding + účet (ne anonymní fake progress v produkčním flow)
- Import / canonicalizace source materials + provenance
- Knowledge graph: předmět → témata → knowledge units (KU)
- Placement / vstupní diagnostika nad beta corporem
- Denní mise (1–3 úkoly, max ~20–30 min)
- Learning modes: výklad (stručný), flashcards, cloze, short-answer recall
- Quiz / check s okamžitou zpětnou vazbou
- Error queue + spaced repetition scheduler
- Mastery per KU + readiness overview
- Progress historie (co bylo dnes hotové)
- Mobile-first UI, kvalitní čeština, WCAG základní úroveň
- Admin/ops cesta pro označení `needs_review`

### Nesmí být ve fake podobě

- Nefunkční tlačítka
- Placeholder data v produkčním flow
- „AI mentor“ chat jako hlavní feature bez ověřeného obsahu
- Leaderboard / sociální gamifikace, pokud nepřidává mastery hodnotu

### Až po P0 (P1+)

- Plná maturitní simulace (ústní + písemná struktura)
- Multi-subject (MAT, AJ, …)
- Rodičovský / učitelský dashboard
- Placené plány
- Offline mode
- Komunitní obsah

## 7. UX principy

1. Mobile-first.
2. Extrémně jednoduché používání.
3. Student **nikdy** nepřemýšlí „co teď?“.
4. Dashboard = **dnešní mise** (ne dashboard statistik).
5. Active recall > pasivní čtení.
6. Více metod učení.
7. Každá znalost má mastery.
8. Chyby se vracejí do opakování.
9. Progress je viditelný a důvěryhodný.
10. Gamifikace dospělá (streak, mastery %, milestone) — ne infantilní.
11–13. Žádné fake / broken / placeholder v produkčním flow.
14–16. Žádné halucinované facts; provenance; `needs_review`.
17–20. Čeština, responzivita, a11y, TS strict, security/GDPR.

### Dashboard (první viewport)

Jedna kompozice:

- Brand / produkt (jasně)
- Jedna dnešní mise (headline)
- Jedna krátká věta „proč právě tohle“
- Primární CTA: **Začít misi**
- Sekundárně: readiness (malý, ne přehlušující)

Bez karetových „feature wall“, bez fake stats, bez AI chat widgetu.

## 8. Success metrics (beta)

| Metrika | Cíl (orientační) |
|---------|------------------|
| Denní dokončení mise | ≥ 5 dní/týden |
| Recall accuracy na due items | rostoucí trend |
| % KU ve stavu `mastered` / `proficient` | ≥ 80 % do 31. 8. |
| Readiness score | ≥ threshold definovaný v learning engine |
| Trust | 0 student-facing halucinací; sporné facts jen s review |

## 9. Anti-goals

- Nepozicovat produkt jako ChatGPT wrap.
- Negenerovat maturitní fakta „za běhu“ bez schváleného zdroje.
- Nestavět content pipeline jen pro jednu testerku (hardcode jména, jednorázové skripty bez modelu).
- Nekopírovat English Quest UI/tematiku (jiný produkt).

## 10. Positioning (veřejná komunikace)

**Ano:** „Systém, který tě připraví na maturitu — víš co, víš kdy.“  
**Ne:** „AI ti vysvětlí maturitu.“ / „Chatbot na oral.“

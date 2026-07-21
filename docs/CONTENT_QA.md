# CONTENT_QA — DámMaturu.cz

Pipeline: **SOURCE → NORMALIZED → validation status → reviewer note → FINAL (published)**.

Zdrojové dokumenty mohou obsahovat překlepy, chybná data, zastaralé informace a faktické chyby. **Nesmíme je slepě publikovat.**

## Pravidla

1. **SOURCE** je immutable (text z ingestu / chunku).
2. **NORMALIZED** = jen kosmetika (whitespace, pomlčky) — **ne** oprava faktů.
3. Automatika **jen flaguje**; nikdy neopraví historický fakt bez auditovatelné poznámky.
4. **FINAL** (`publishedStatement`) vzniká jen lidskou akcí `verify` nebo `correct`.
5. Každá lidská akce vyžaduje **reviewer note** (≥ 8 znaků).

## Statusy

| Status | Význam |
|--------|--------|
| `needs_fact_check` | Výchozí po scanu; čeká na kontrolu |
| `verified_from_source` | SOURCE/NORMALIZED potvrzeny → FINAL |
| `corrected` | Lidská oprava + note → FINAL |
| `rejected` | Nepublikovat; FINAL = null |

## Auto-flagy

- `death_before_birth` / `impossible_chronology`
- `duplicate_statement`
- `conflicting_data` / `similar_entity_conflict`
- `unclear_formulation`
- `awaiting_expert_review` (bez anomálie — připraveno na odbornou kontrolu)

## Spuštění

```bash
npm run content-qa
```

Admin: `/admin/reviews` — zobrazuje **SOURCE / NORMALIZED / FINAL / REASON**.

## Artefakty

`data/content-qa/items/*.json` · `index.json` · `last-run.json`  
Audit: `data/ingestion/audit-log.jsonl` (akce `content_qa_*`)

Scan bere KU proposals **a** krátké bio řádky z chunků (např. `Jméno (1850 – 1820)`), které KU heuristika často přeskočí.

## Odborná kontrola (příprava)

Položky bez auto-anomálií dostanou `awaiting_expert_review` a zůstávají ve `needs_fact_check` až do lidského verify/correct/reject. Pozdější expert workflow může filtrovat podle flagů a statusu bez změny datového modelu.

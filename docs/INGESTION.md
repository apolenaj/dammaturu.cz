# INGESTION — DámMaturu.cz

Bezpečný DOCX import z `content/source-materials/`.

## Pravidla

1. Původní DOCX se **nikdy nepřepisují** (read-only).
2. Do vzdělávacího store jdou jen soubory na **matura allowlistu**.
3. Výstup končí ve stavu **`needs_review`** — ne `verified` / `published`.
4. Re-import je **idempotentní** (stejná cesta + stejný SHA-256 → skip).
5. Audit log: `data/ingestion/audit-log.jsonl`

## Stavy pipeline

`imported` → `parsed` → **`needs_review`** → `verified` → `published`  
Automaticky se zastaví na `needs_review`.

## Spuštění

```bash
npm run ingest:discover   # náhled allow/reject
npm run ingest            # plný import
npm run ingest -- --file "Máj.docx"
```

Admin UI: `/admin/sources` (spustit + audit), `/admin/content`, `/admin/reviews` (Content QA).

Další krok po ingestu: `npm run content-qa` — viz `CONTENT_QA.md`.

## Artefakty

`data/ingestion/documents/*.json` — SourceDocument + chunks + topic/KU návrhy

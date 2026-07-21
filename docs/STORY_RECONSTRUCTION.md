# Story Reconstruction

> Plot-order challenge. Decision: **D-028**.

## Co to je

Student dostane zamíchané dějové události a seřadí je chronologicky.

**Díla v packu `literarni-dej`:**
- Máj
- Maryša
- Otec Goriot
- Zločin a trest
- Anna Karenina
- Kytice — Vodník, Svatební košile, Zlatý kolovrat

## Obtížnost

| Level | Kroky |
|-------|-------|
| easy | 4 (prefix) |
| medium | 6 |
| hard | všechny (8+) |

## Po dokončení

Vizuální **dějová osa** se SOURCE excerptem u každého kroku.

## Source-backed

Každý krok = Content QA `verified_from_source` (verbatim extract z ingestovaného DOCX). Label musí být substring `publishedStatement`. Seed selže, pokud extract není v SOURCE.

## Stack

| Vrstva | Cesta |
|--------|-------|
| Domain | `src/domain/learning/story-reconstruction.ts` |
| Bootstrap | `src/server/story-reconstruction/bootstrap.ts` |
| Pack | `src/server/story-reconstruction/packs/literarni-dej.ts` |
| Route | `/app/learn/rekonstrukce-pribehu/[slug]` |

## Seed

```bash
npm run seed:story-reconstruction
```

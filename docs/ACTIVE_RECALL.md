# ACTIVE RECALL — DámMaturu.cz

Aktivní vybavování bez nabídek.

## Flow

1. Výzva (např. „Vyjmenuj 5 hlavních znaků realismu.“)
2. Student píše **nebo** mluví (Web Speech `cs-CZ`, pokud zařízení umí)
3. Feedback:
   - co uvedl správně
   - co chybělo
   - co bylo navíc
   - modelová stručná odpověď
4. Každý key point → **knowledge unit** (hit/miss)

## Grading (ne binární)

| Výsledek | Kdy |
|----------|-----|
| `correct` | ≥85 % key points **nebo** ≥ `minExpected` zásahů |
| `partial` | ≥1 zásah, pod prahem correct |
| `incorrect` | 0 zásahů |

Matching: normalizace češtiny (diakritika) + synonyma. Bez LLM.

## Spuštění

```bash
npm run seed:active-recall
```

UI: `/app/learn/vybavovani/literarni-vybavovani`

## Kód

- Domain: `src/domain/learning/active-recall.ts`
- Pack: `src/server/active-recall/packs/literarni-vybavovani.ts`
- UI: `src/components/active-recall/active-recall-player.tsx`

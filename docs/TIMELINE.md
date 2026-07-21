# TIMELINE — DámMaturu.cz

Interaktivní časová osa literární historie.

## Použití

Národní obrození · romantismus · realismus · životy autorů · historické souvislosti

## Funkce

| Funkce | Popis |
|--------|--------|
| Zoom | Presety období (NO, romantismus, realismus, 1848, celé) |
| Filtr | autor / dílo / událost / směr |
| Detail | hover/tap → bottom sheet (mobile-first) |
| Chrono quiz | „co bylo dřív?“ |
| Reorder | seřadit šipkami ↑↓ (touch-friendly) |
| Režimy | **Učit se** ↔ **Seřadit sám** |

## Spuštění

```bash
npm run seed:timeline
```

UI: `/app/learn/casova-osa/literarni-historie`

## Mobile UX

- horizontální snap scroll kartiček
- min. touch 44px
- safe-area padding
- bottom sheet detail
- řazení bez drag&drop (šipky)

## Kód

- Schema: `src/domain/learning/timeline.ts`
- Pack: `src/server/timeline/packs/literarni-historie.ts`
- UI: `src/components/timeline/timeline-explorer.tsx`

# CONNECTION MAP — DámMaturu.cz

Vizuální mapa literárních souvislostí (ne dekorace).

## Příklady cest

```
REALISMUS → Francie → Balzac → Lidská komedie → Otec Goriot
REALISMUS → Rusko → Dostojevskij → Zločin a trest
NÁRODNÍ OBROZENÍ → romantismus → Mácha → Máj
```

## Režimy

| Režim | Co dělá |
|-------|---------|
| **Prohlížet** | Cesty jako řetězce; tap na uzel → detail + sousedi |
| **Doplnit** | Systém skryje mezilehlé uzly; student je vybere a ověří |

## Spuštění

```bash
npm run seed:connection-map
```

UI: `/app/learn/mapa-souvislosti/literarni-souvislosti`

## Proč cesty, ne force-graph

- Každá cesta = jedna učitelná souvislost
- Mobile: vertikální řetězec + bottom sheet (bez drag canvasu)
- Learning mode má co skrývat a hodnotit

## Kód

- Schema: `src/domain/learning/connection-map.ts`
- Pack: `src/server/connection-map/packs/literarni-souvislosti.ts`
- UI: `src/components/connection-map/connection-map-explorer.tsx`

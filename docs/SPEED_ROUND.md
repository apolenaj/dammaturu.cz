# Speed Round

> 60s automatic recall of basic facts. Decision: **D-030**.

## Co to je

Rychlé otázky bez hluboké interpretace:

| Kind | Příklad |
|------|---------|
| `author_work` | Neruda → ? |
| `term_definition` | Metafora = ? |
| `true_false` | Mácha patří k romantismu. |
| `movement_trait` | Romantismus → ? |

## Metriky

Po běhu (a živě během):

- **score** — počet správných
- **accuracy** — %
- **best streak** — nejdelší série správných
- **response time** — průměr / medián

## Stack

| Vrstva | Cesta |
|--------|-------|
| Domain | `src/domain/learning/speed-round.ts` |
| Pack | `src/server/speed-round/packs/cjl-speed.ts` |
| Route | `/app/learn/speed-round/[slug]` |

## Seed

```bash
npm run seed:speed-round
```

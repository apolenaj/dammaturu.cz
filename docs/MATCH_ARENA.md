# Match Arena

> Pair-connecting drill for ČJL. Decision: **D-027**.

## Co to je

Student spojuje páry:

| Kind | Vlevo | Vpravo |
|------|-------|--------|
| `author_work` | autor | dílo |
| `work_character` | dílo | postava |
| `author_country` | autor | země |
| `movement_trait` | směr | znak |
| `term_definition` | pojem | definice |
| `event_period` | událost | období |

## Interakce

- **Desktop:** HTML5 drag/drop (vlevo → vpravo).
- **Mobile:** tap-to-match (klepni vlevo, pak vpravo).
- Po **chybě** okamžité vysvětlení (správný partner + proč + kam patří zvolená pravá strana).
- Chybné páry → **review queue** (automaticky).
- Po **session:** accuracy %, průměrná/mediánová rychlost, seznam weak pairs.

## Stack

| Vrstva | Cesta |
|--------|-------|
| Domain | `src/domain/learning/match-arena.ts` |
| Pack | `src/server/match-arena/packs/literarni-pary.ts` |
| Store | `src/server/match-arena/store.ts` → `data/match-arena/` |
| Actions | `src/server/actions/match-arena.ts` |
| UI | `src/components/match-arena/match-arena-player.tsx` |
| Route | `/app/learn/match-arena/[slug]` |

## Seed

```bash
npm run seed:match-arena
```

UI: `/app/learn/match-arena/literarni-pary`

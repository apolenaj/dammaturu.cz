# CURRICULUM — DámMaturu.cz

Curriculum je **databázově modelovaný** (Subject → Curriculum → Module → Topic + `topic_prerequisites`).  
UI **nehardcoduje** sylabus — čte přes `getActiveCurriculum()` / curriculum store.

## Beta pack

**Český jazyk a literatura – BETA** (`cjl-beta`)

| Modul | Témata |
|-------|--------|
| A. Jazyk | Homonyma, Slova mnohoznačná, Synonyma, Antonyma, Rozdíly a rozpoznávání |
| B. Literární směry | Romantismus → Realismus → Kritický realismus → Naturalismus |
| C. Národní obrození | kontext, periodizace, osobnosti, jazykověda, novinářství, divadlo, rukopisy, historie, poezie |
| D. Světový realismus | Francie, Anglie, Rusko, další autoři |
| E. Česká literatura a drama | Němcová/Babička, Jirásek, drama, Stroupežnický, Preissová, Mrštíkové/Maryša |
| F. Rozbory děl | Máj, Kytice, Babička |

Topic dependency graph řídí doporučené pořadí (acyclic).

## Spuštění

```bash
npm run seed:curriculum
```

Artefakt: `data/curriculum/cjl-beta.json` (DB-shaped).  
Postgres (až `DATABASE_URL` + migrace `0001` + `0002`): upsert Subject/Curriculum/Module/Topic/edges.

## Maturita CERMAT – Český jazyk a literatura (odděleně)

Společný **didaktický test** (katalog CERMAT 2025/2026) je **jiný produktový režim** než `cjl-beta` / Moje materiály:

| Režim | Účel |
|-------|------|
| **Moje materiály** | Katalog ČJL + nahrané / školní podklady |
| **CERMAT příprava** (`/app/cermat`) | Národní didaktický test §1.1–1.9 |

Model + mapování KU → oficiální ID: `src/domain/cermat-curriculum/`.  
Admin report: `CERMAT_COVERAGE.md` (`npm run report:cermat-coverage`).  
**Nikdy** netvrdit „kompletní příprava na CERMAT“, dokud report ukazuje partial/missing.

## Schéma

- Drizzle: `src/db/schema/content.ts` (`modules`, `topic_prerequisites`, `topics.module_id`)
- SQL: `src/db/migrations/0002_curriculum_modules.sql`
- Definice (seed source of truth): `src/server/curriculum/definitions/cjl-beta.ts`
- Repository: `src/server/curriculum/repository.ts`

## UI

- `/app/topics` — student outline
- `/admin/content` — outline + dependency graph + KU návrhy

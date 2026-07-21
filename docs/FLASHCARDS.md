# FLASHCARDS — DámMaturu.cz

Plnohodnotný flashcard engine se SM-2 schedulingem (D-006 / D-023).

## Typy karet

| Typ | Směr |
|-----|------|
| `term_definition` | termín → definice |
| `author_work` | autor → dílo |
| `work_author` | dílo → autor |
| `event_meaning` | událost → význam |
| `character_work` | postava → dílo |
| `description_identify` | popis → identifikace |
| `question_answer` | otázka → odpověď |
| `context_concept` | kontext → pojem |

## Session flow

1. Student vidí front (odpověď v hlavě)
2. Otočí kartu (mezerník / klepnutí / swipe ↑)
3. Ohodnotí: **Nevěděl/a** · **Téměř** · **Věděl/a** (1 / 2 / 3 nebo swipe ← / ↑ / →)
4. Grade → SM-2 update `easiness` / `interval` / `dueAt`
5. Session summary

## Spuštění

```bash
npm run seed:flashcards
```

UI: `/app/review`

## Kód

- Scheduler: `src/domain/learning/scheduler.ts`
- Engine: `src/domain/learning/flashcards.ts`
- Pack: `src/server/flashcards/packs/cjl-literarni.ts`
- UI: `src/components/flashcards/flashcard-session.tsx`

# QUESTION ENGINE — DámMaturu.cz

Jednotný assessment engine pro všechny typy otázek.

## Typy

single choice · multiple choice · true/false · short answer · long answer · fill blank · matching · ordering · timeline ordering · categorization · author-work pairing · character-work pairing · identify from clues · error spotting

## Schema (povinné)

| Pole | Účel |
|------|------|
| `difficulty` | 1–5 |
| `knowledgeUnits` | mapování na KU |
| `correctAnswer` | typově specifické |
| `distractors` | chybné volby / mýlky |
| `explanation` | **vždy** po odpovědi (≥40 znaků) |
| `source` | provenience |
| `examRelevance` | none→critical |

## Feedback

Po odpovědi student dostane:
- headline + continuous `score` (0–1)
- **vysvětlení** (ne jen barva)
- rozbor details
- očekávanou odpověď
- KU credited / mezera

Výsledek: `correct | partial | incorrect`.

## Spuštění

```bash
npm run seed:question-engine
```

UI: `/app/tests` → `/app/tests/otazky/cjl-otazky`

## Kód

- Domain: `src/domain/learning/question-engine.ts`
- Pack: `src/server/question-engine/packs/cjl-otazky.ts`
- UI: `src/components/questions/question-engine-player.tsx`

# LESSON_ENGINE — DámMaturu.cz

Téma se **nesmí** zobrazit jako jeden dlouhý text. Lekce = uspořádané typované bloky.

## Bloky

Hook · Quick context · Core explanation · Timeline · Story · Example · Visual comparison · Character / Author / Work card · Remember this · Common trap · Mnemonic · Flashcard burst · Mini quiz · Active recall · Teach-back · Summary · Exit ticket

Schéma: `src/domain/learning/blocks.ts` (Zod discriminated union).  
Renderer: `LessonBlockView` — switch jen podle `block.type`.

## Student akce

`continue` · `back` · `understand` (rozumím) · `dont_know` (nevím) · `save` · `open_explanation` (+ quiz/flashcard/recall submit)

## Persistence (mastery)

- Interakce: `data/lesson-engine/interactions.jsonl`
- Progress: `data/lesson-engine/progress/`
- Mastery snapshoty: `data/lesson-engine/mastery/`
- Lekce: `data/lessons/*.json`

Přechody mastery: `applyInteractionToMastery` (pasivní continue ≠ nad `exposed`).

## Spuštění

```bash
npm run seed:lessons
```

UI: `/app/learn` · `/app/learn/homonyma-uvod`

## Invariant

`assertLessonNotBlob`: ≥3 typy bloků, ≥1 aktivní blok, limit textové hustoty.

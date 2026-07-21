# LEARNING ANALYTICS — DámMaturu.cz

Privacy-first learning analytics (D-049). **Ne vanity metrics** — odpovídá na otázky o skutečném učení.

## Otázky, které dashboard řeší

| Otázka | Signál |
|--------|--------|
| Učí se uživatel skutečně? | lesson/review/simulation completions + accuracy |
| Která metoda funguje? | method effectiveness (accuracy, rating, completions) |
| Kde odpadá? | `session_drop_off` |
| Co se naučil? | `mastery_changed`, completions |
| Co zapomíná? | low review ratings (≤1) |
| Lehké/těžké otázky? | question quality (≥5 pokusů, ≥95 % / ≤20 %) |
| Chyby v obsahu? | content error signals z too_hard / drop-off |

## Trackované eventy

`lesson_started` · `lesson_completed` · `question_answered` · `answer_correct` · `answer_incorrect` · `hint_used` · `flashcard_rating` · `review_completed` · `mastery_changed` · `study_plan_completed` · `simulation_completed` · `session_drop_off`

## Privacy

- Opaque learner keys; export = SHA-256 hash (16 hex)
- Bez free-text odpovědí, e-mailu, IP, zařízení
- Allow/deny list v `learning-analytics.ts`

## Admin UI

`/admin/analytics` — learning dashboards + anonymizovaný JSON export + beta pulse (D-039).

## Seed

```bash
npm run seed:learning-analytics
```

## Kód

- Domain: `src/domain/learning/learning-analytics.ts`
- Store: `src/server/learning-analytics/`
- Actions: `src/server/actions/learning-analytics.ts`
- UI: `src/components/admin/admin-learning-analytics.tsx`

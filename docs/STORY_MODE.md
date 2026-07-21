# STORY_MODE — DámMaturu.cz

Historie literatury jako **příběh**, ne izolované seznamy.

## Pravidla

1. Každý zobrazený fakt = **verified** / **corrected** FINAL z Content QA.
2. **Žádná fikční historická fakta.**
3. Beat typy: `timeline` · `cause_effect` · `person_card` · `what_next` · `decision_moment` · `checkpoint`.
4. Seed ověří SOURCE beze změn (`verified_from_source` + audit note).

## Národní obrození (příklad)

stav češtiny → reformy → decision (úřední němčina) → obranná etapa → Dobrovský → co dál? → budování jazyka → kultura → Palacký → 1848 → checkpoint

## Spuštění

```bash
npm run ingest          # pokud chybí
npm run content-qa
npm run seed:story-mode
```

UI: `/app/learn/pribeh/narodni-obrozeni`

## Kód

- Schema: `src/domain/learning/story-mode.ts`
- Pack: `src/server/story-mode/packs/narodni-obrozeni.ts`
- Bootstrap verify: `src/server/story-mode/bootstrap.ts`

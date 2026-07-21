# KDO JSEM? — DámMaturu.cz

Kreativní game mode: postupné nápovědy, tip po každé, víc bodů za dřívější odpověď.

## Pravidla

1. Odhalí se nápověda (role / dílo / znak / kontext)
2. Student tipne jméno
3. Špatně → další nápověda
4. Správně → body = `maxHints - revealed + 1`

## Provenance

**Jen ověřená databázová fakta.** Seed:

1. Vezme exact substring z ingested SOURCE (`data/ingestion/documents`)
2. Zapíše Content QA item + `verified_from_source` (FINAL = SOURCE)
3. Hint display = mechanická redakce jména z FINAL (žádná nová fakta)

Stejný princip jako Story Mode (D-020).

## Osobnosti (pack)

Balzac · Flaubert · Zola · Dickens · Gogol · Dostojevskij · Tolstoj · Mácha · Erben · Němcová · Jirásek · Stroupežnický · Preissová · Mrštíkové

## Spuštění

```bash
npm run ingest   # pokud chybí dokumenty
npm run seed:kdo-jsem
```

UI: `/app/learn/kdo-jsem/literarni-osobnosti`

## Kód

- Domain: `src/domain/learning/kdo-jsem.ts`
- Bootstrap: `src/server/kdo-jsem/bootstrap.ts`
- Pack: `src/server/kdo-jsem/packs/literarni-osobnosti.ts`
- UI: `src/components/kdo-jsem/kdo-jsem-player.tsx`

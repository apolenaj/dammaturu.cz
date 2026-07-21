# Najdi nesmysl

> Game mode: 3 true + 1 false. Decision: **D-029**.

## Pravidla

1. Student vidí **4 tvrzení**.
2. Přesně **3 jsou pravdivá**, **1 je nesmysl**.
3. Musí **vybrat nesmysl** a **napsat proč**.
4. Poté vždy **skutečné vysvětlení** (korekce + ukotvení pravd).

## Kategorie

autoři · díla · období · literární směry · postavy · žánry

## Distraktory

Realistické záměny (časté maturitní omyly), ale **každé kolo má ≥80 znaků korektivního explanation**, aby falešné tvrzení nestihlo „přilepit“ jako znalost.

## Stack

| Vrstva | Cesta |
|--------|-------|
| Domain | `src/domain/learning/najdi-nesmysl.ts` |
| Pack | `src/server/najdi-nesmysl/packs/cjl-nesmysl.ts` |
| Route | `/app/learn/najdi-nesmysl/[slug]` |

## Seed

```bash
npm run seed:najdi-nesmysl
```

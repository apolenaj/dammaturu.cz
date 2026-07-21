# RYCHLE POCHOPIT — DámMaturu.cz

Režim pro velká témata bez scrollování 15 minut textem.

## Pravidla

- Mikroblok (2–5 min): **1 myšlenka · 1 příklad · 1 kontrolní otázka**
- Po **3–5** mikroblocích → **retrieval checkpoint**
- Progress: `3/8 bloků` · `≈ 6 min zbývá`
- Ukládá se **completion** i **úspěšnost** (`checksCorrect / checksAnswered`)

## Příklad: Realismus

1. Co je realismus  
2. Proč vznikl  
3. Znaky  
4. **Checkpoint**  
5. Kritický realismus  
6. Naturalismus  
7. Autoři  
8. **Checkpoint**

## Spuštění

```bash
npm run seed:quick-grasp
```

UI: `/app/learn` · `/app/learn/rychle/realismus`

## Kód

- Schema: `src/domain/learning/quick-grasp.ts`
- Pack: `src/server/quick-grasp/packs/realismus.ts`
- Store: `data/quick-grasp/`

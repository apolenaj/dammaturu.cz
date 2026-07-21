# TEACH_IT_BACK — DámMaturu.cz

Vysvětli vlastními slovy (text nebo hlas). Hodnocení podle checklistu knowledge units.

## Feedback

1. **Co jsi vysvětlil/a dobře** — zásahy checklistu  
2. **Co chybí** — chybějící KU body  
3. **Co je nepřesné** — detekované záměny / miskoncepce  
4. **Jak by vypadala výborná odpověď** — model  

Délka textu **neodměňuje**. Dlouhá prázdná odpověď → `lengthWithoutSubstance`.

## Seed

```bash
npm run seed:teach-it-back
```

UI: `/app/learn/nauc-zpatky/cjl-teach-back`

Příklady výzev:

- „Vysvětli vlastními slovy rozdíl mezi realismem a romantismem.“
- „Vysvětli, proč je Máj romantické dílo.“

## Kód

- Domain: `src/domain/learning/teach-it-back.ts`
- Pack: `src/server/teach-it-back/packs/cjl-teach-back.ts`
- UI: `src/components/teach-it-back/teach-it-back-player.tsx`

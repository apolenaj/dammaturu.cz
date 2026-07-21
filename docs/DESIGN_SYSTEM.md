# DESIGN_SYSTEM — DámMaturu.cz

> Premium EdTech visual system. Light = primary. Dark via `.dark`.

## Feel

**motivating · fast · modern · calm · confident**

Reference: Duolingo friendliness + Linear polish. Trustworthy for parents and schools.

**ANO:** silná typografie, konzistentní karty, progress, mikro-interakce, celebratory moments, excellent spacing, clear states.  
**NE:** infantilní vizuály, AI purple/neon gradienty, dashboard clutter, corporate SaaS šedivost, cream+terracotta AI klíšé.

## Tokens

Runtime: `src/app/globals.css` (`:root` + `.dark`).  
Tailwind: `tailwind.config.ts`.  
Helpers: `src/lib/design-system.ts`.

| Skupina | Příklady |
|---------|----------|
| Surface | `--bg-canvas`, `--bg-surface`, `--bg-subtle` |
| Foreground | `--fg-primary`, `--fg-secondary`, `--fg-muted` |
| Action | deep teal `#0d7a6a` |
| Accent | warm ember `#d18a1a` (progress / celebrate) |
| Mastery | unknown → mastered |
| Elevation | `--shadow-xs` … `--shadow-lg`, `--shadow-lift` |
| Radius | sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 |
| Motion | `--ease-out`, `--ease-spring`, fast 140 / base 220 / slow 420 |

Atmosphere: `bg-paper-wash` — soft teal + ember washes, never neon.

## Typografie

- **Display:** Fraunces (`font-display`) — brand, H1/H2, celebration titles  
- **UI:** Manrope (`font-sans`)  
- Scale: `display-lg/md/sm`, `title-lg/md/sm`, `body-lg/md/sm`, `caption`, `overline`  
- Prefer `text-balance` on headlines

## Komponenty (`src/components/ui/`)

| Komponenta | Soubor |
|------------|--------|
| Button | `button.tsx` — press scale, soft shadow |
| Card | `card.tsx` — variants: default / muted / interactive / hero |
| Badge | `badge.tsx` — soft ring tones |
| Progress | `progress.tsx` — shine + celebrate at 100% |
| Score | `score.tsx` — animated ring |
| CelebrateMoment / StreakPill / ProgressSteps | `celebrate.tsx` |
| EmptyState | `empty-state.tsx` |
| Alert | `alert.tsx` |
| AppPageHeader / loading / error | `shell/app-screen.tsx` |

Utility classes: `.dm-surface`, `.dm-surface-interactive`, `.dm-press`, `.animate-in-rise`, `.animate-in-pop`.

## Showcase

`/design-system` — **development only**.

```bash
npm run dev
# http://localhost:3000/design-system
```

## A11y

- `:focus-visible` ring 2px + offset on surface  
- Skip link in root layout  
- Progressbar / Score accessible labels  
- Toast `aria-live="polite"`  
- Celebrate `role="status"`  
- `prefers-reduced-motion` hard-shortens animations  
- Touch targets md+ ≥ 44px  

Token contrast target: **WCAG AA**.

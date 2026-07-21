# DESIGN_SYSTEM — DámMaturu.cz

> Prémiový EdTech design system. Light mode je primární. Dark je podporovaný přes class `.dark`.

## Princip

**ANO:** důvěryhodnost, energie, pocit postupu, 17–25 + rodiče.  
**NE:** infantilní škola, AI neon gradienty, roboti, mozky, přeplácané efekty.

## Tokens

Runtime: `src/app/globals.css` (`:root` + `.dark`).  
Tailwind mapování: `tailwind.config.ts`.

### Semantic layers

| Skupina | Příklady |
|---------|----------|
| Surface | `--bg-canvas`, `--bg-surface`, `--bg-subtle` |
| Foreground | `--fg-primary`, `--fg-secondary`, `--fg-muted` |
| Border | `--border-default`, `--border-strong` |
| Action | `--action-primary`, `--action-primary-hover`, `--action-primary-soft` |
| Accent | `--accent` (warm energy, ne neon) |
| Feedback | success / warning / danger / info |
| Mastery | unknown → mastered spektrum |
| Focus | `--focus-ring` + offset na surface |
| Elevation | `--shadow-xs` … `--shadow-lg` |
| Radius | sm 6 · md 10 · lg 14 · xl 20 |

## Typografie

- **Display:** Fraunces (`font-display`) — brand, H1/H2
- **UI:** Manrope (`font-sans`)
- Scale: `display-lg/md`, `title-lg/md/sm`, `body-lg/md/sm`, `caption`, `overline`

## Komponenty (`src/components/ui/`)

| Komponenta | Soubor |
|------------|--------|
| Button | `button.tsx` |
| Input / Textarea / Label | `input.tsx`, `textarea.tsx`, `label.tsx` |
| Badge | `badge.tsx` |
| Card | `card.tsx` |
| Progress | `progress.tsx` |
| Score | `score.tsx` |
| Charts | `chart.tsx` (BarChart, Sparkline) |
| EmptyState | `empty-state.tsx` |
| Skeleton | `skeleton.tsx` |
| Alert / Success / Error | `alert.tsx` |
| Toast | `toast.tsx` + `ToastProvider` |
| Theme | `theme/theme-provider.tsx` |

## Showcase

`/design-system` — **pouze development**.

Ochrana:
1. `notFound()` v page při `NODE_ENV === "production"`
2. `src/middleware.ts` → HTTP 404 v produkci

```bash
npm run dev
# http://localhost:3000/design-system
```

## A11y

- `:focus-visible` ring 2px + offset
- Skip link v root layout
- Progressbar / Score `role="img"` s label
- Toast `aria-live="polite"`
- `prefers-reduced-motion` respektován
- Touch target tlačítek md+ ≥ 44px výška

### Kontrast

Tokeny navrženy na **WCAG AA** (text ≥ 4.5:1, UI ≥ 3:1).  
Automatický audit kontrastu v CI: **zatím NOT VERIFIED** — manuální kontrola na showcase.

## Dark mode

- Primární: light
- Toggle na showcase; persistence `localStorage` klíč `dammaturu-theme`
- Produkční UI zatím default light (toggle není v learner shell — záměr)

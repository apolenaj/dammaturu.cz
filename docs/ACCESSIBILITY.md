# Accessibility — DámMaturu.cz

Target: **WCAG 2.2 Level AA** where applicable. This document records what is hardened, how we test, and **remaining issues** (not hidden).

## Hardened (2026-07-22)

| Area | Change |
|------|--------|
| Skip link | Visible on focus; targets `#main-content` in marketing + learner shells |
| Focus | Shared `focus-visible` rings on buttons, inputs, nav, CTAs |
| Forms | `Field` component: `htmlFor`, hint/`aria-describedby`, `role="alert"` errors; register uses it |
| Study phases | Named regions (`aria-labelledby` / `aria-label`); progress `aria-live` |
| Tap targets | Primary controls ≥44px (`min-h-11`/`min-h-12`); bottom nav ≥48px |
| Overlays | Removed sticky/fixed study docks that covered answers; in-flow `study-action-dock` |
| Feedback FAB | Hidden on learning/test/review/mistakes/materials/oral paths; Escape closes dialog |
| Reduced motion | Global: animations/transitions/press-scale disabled under `prefers-reduced-motion` |
| Zoom | `maximumScale: 5` in viewport; inputs use `text-base` (16px) to avoid iOS zoom |
| Overflow | `overflow-x-clip` on shells; mobile e2e checks 320–430 / tablet / desktop |
| Contrast | Light `--fg-muted` darkened for AA on canvas |
| Color alone | Mastery chips + grade badges include text labels |

## Automated tests

```bash
npx playwright install chromium   # once per machine
npm test -- src/components/ui/a11y.test.tsx
npx playwright test e2e/a11y-mobile.spec.ts
npx playwright test e2e/mobile-first.spec.ts
```

**CI note:** Playwright Chromium must be installed (`npx playwright install chromium`). Unit axe tests run without browsers.

- **Vitest + jest-axe**: Field, StudySessionChrome, TopicCard, Alert
- **Playwright + @axe-core/playwright**: homepage + registrace (critical/serious = fail)
- **Playwright**: overflow at 320 / 375 / 390 / 430 / tablet / desktop; skip link; keyboard on register

## Manual checklist (learning flows)

Do on a real phone (~390px) and keyboard-only desktop:

1. **Learn / materials session** — answer textarea fully visible; Submit / Next not under bottom nav; one-handed thumb reach after scroll
2. **Flashcards** — flip + grade buttons full-width, not covered by nav or FAB
3. **Mistakes practice** — reveal + “Už vím” reachable; live feedback announced
4. **Oral simulation** — answer field + primary CTA in flow (not under fixed chrome)
5. **Zoom 200%** — no clipped primary CTAs; no essential horizontal scroll
6. **VoiceOver / TalkBack** — question → answer → feedback order matches visual order

## Remaining issues (known / deferred)

| ID | Severity | Issue | Notes |
|----|----------|-------|-------|
| A11Y-01 | Medium | Bottom nav labels at ~11px | Readable but below preferred 12px; truncated on 320px with 5+ items |
| A11Y-02 | Medium | Mobile “Víc” menu has no focus trap | Escape returns focus to button; Tab can leave panel |
| A11Y-03 | Medium | Beta feedback dialog: no full focus trap / inert backdrop | Escape works; `aria-modal` set |
| A11Y-04 | Medium | Some legacy players still use raw `<textarea>` without `Field` | Learning/materials/oral have `aria-label`; migrate gradually |
| A11Y-05 | Low | Marketing homepage metadata still older promise string in `page.tsx` | SEO copy; not a11y blocker |
| A11Y-06 | Low | Decorative preview graphics may lack exhaustive `aria-hidden` | Spot-check product previews |
| A11Y-07 | Medium | Dark mode muted text contrast not fully audited | Light theme is primary; re-check dark tokens |
| A11Y-08 | High* | Authenticated learning routes not in CI axe yet | *Requires guest/auth harness; manual until e2e guest session is stable |
| A11Y-09 | Low | `Button` size `sm` is 40px tall | Meets WCAG 2.2 AA 24px target size; prefer `md`/`lg` for primary study actions |
| A11Y-10 | Medium | Timeline / connection-map horizontal carousels | Overflow intentional; ensure keyboard alternatives remain (existing controls) |

## Do not regress

- Do **not** reintroduce `position: sticky/fixed` study CTAs that sit over answer inputs
- Keep learner `main` padding ≥ bottom nav + safe-area
- Keep primary study actions in document flow after the answer phase
- Prefer text + color for correct/incorrect (never color alone)

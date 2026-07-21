/**
 * DámMaturu design system — semantic helpers & usage notes.
 * Runtime tokens: `src/app/globals.css` (:root / .dark).
 * Tailwind map: `tailwind.config.ts`.
 */

export const typographyScale = {
  displayLg: "font-display text-display-lg tracking-tight text-balance",
  displayMd: "font-display text-display-md tracking-tight text-balance",
  displaySm: "font-display text-display-sm tracking-tight text-balance",
  titleLg: "font-display text-title-lg tracking-tight",
  titleMd: "font-display text-title-md tracking-tight",
  titleSm: "font-display text-title-sm tracking-tight",
  bodyLg: "font-sans text-body-lg text-fg-secondary",
  bodyMd: "font-sans text-body-md text-fg-secondary",
  bodySm: "font-sans text-body-sm text-fg-muted",
  caption: "font-sans text-caption font-medium text-fg-muted",
  overline:
    "font-sans text-overline font-semibold uppercase tracking-[0.1em] text-action",
  label: "font-sans text-body-sm font-semibold text-fg",
} as const;

/** 4px rhythm — prefer these for vertical stacks. */
export const spacingScale = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const;

export const radiusScale = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  "2xl": "var(--radius-2xl)",
  full: "9999px",
} as const;

export const elevationScale = {
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  lift: "shadow-lift",
} as const;

export const motionClasses = {
  press: "transition duration-fast ease-out active:scale-[0.985]",
  rise: "animate-rise-in",
  pop: "animate-pop-in",
  interactiveCard:
    "transition duration-base ease-out hover:-translate-y-px hover:shadow-md",
} as const;

/** Product feel north star — keep UI decisions aligned. */
export const designPrinciples = [
  "motivating",
  "fast",
  "modern",
  "calm",
  "confident",
] as const;

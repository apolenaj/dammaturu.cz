/**
 * DámMaturu design system — semantic token names & usage notes.
 * Runtime values live in `src/app/globals.css` (:root / .dark).
 */

export const typographyScale = {
  display: "font-display text-4xl sm:text-5xl font-semibold tracking-tight",
  h1: "font-display text-3xl sm:text-4xl font-semibold tracking-tight",
  h2: "font-display text-2xl font-semibold tracking-tight",
  h3: "font-display text-xl font-semibold tracking-tight",
  h4: "font-sans text-lg font-semibold tracking-tight",
  body: "font-sans text-base leading-relaxed",
  bodySm: "font-sans text-sm leading-relaxed",
  caption: "font-sans text-xs leading-snug",
  overline: "font-sans text-[11px] font-semibold uppercase tracking-wider",
  label: "font-sans text-sm font-medium",
} as const;

export const spacingScale = {
  0: "0",
  1: "0.25rem", // 4
  2: "0.5rem", // 8
  3: "0.75rem", // 12
  4: "1rem", // 16
  5: "1.25rem", // 20
  6: "1.5rem", // 24
  8: "2rem", // 32
  10: "2.5rem", // 40
  12: "3rem", // 48
  16: "4rem", // 64
} as const;

export const radiusScale = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  full: "9999px",
} as const;

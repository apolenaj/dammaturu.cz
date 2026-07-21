import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "var(--bg-canvas)",
          elevated: "var(--bg-canvas-elevated)",
        },
        surface: {
          DEFAULT: "var(--bg-surface)",
          muted: "var(--bg-surface-muted)",
        },
        subtle: "var(--bg-subtle)",
        inverse: "var(--bg-inverse)",
        fg: {
          DEFAULT: "var(--fg-primary)",
          secondary: "var(--fg-secondary)",
          muted: "var(--fg-muted)",
          disabled: "var(--fg-disabled)",
          inverse: "var(--fg-inverse)",
          "on-brand": "var(--fg-on-brand)",
          "on-accent": "var(--fg-on-accent)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          subtle: "var(--border-subtle)",
        },
        action: {
          DEFAULT: "var(--action-primary)",
          hover: "var(--action-primary-hover)",
          pressed: "var(--action-primary-pressed)",
          soft: "var(--action-primary-soft)",
          secondary: "var(--action-secondary)",
          "secondary-hover": "var(--action-secondary-hover)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
        success: {
          DEFAULT: "var(--feedback-success)",
          soft: "var(--feedback-success-soft)",
        },
        warning: {
          DEFAULT: "var(--feedback-warning)",
          soft: "var(--feedback-warning-soft)",
        },
        danger: {
          DEFAULT: "var(--feedback-danger)",
          soft: "var(--feedback-danger-soft)",
        },
        info: {
          DEFAULT: "var(--feedback-info)",
          soft: "var(--feedback-info-soft)",
        },
        mastery: {
          unknown: "var(--mastery-unknown)",
          exposed: "var(--mastery-exposed)",
          fragile: "var(--mastery-fragile)",
          stable: "var(--mastery-stable)",
          proficient: "var(--mastery-proficient)",
          mastered: "var(--mastery-mastered)",
        },
        focus: "var(--focus-ring)",
        ink: {
          DEFAULT: "var(--color-ink)",
          muted: "var(--color-ink-muted)",
          soft: "var(--color-ink-soft)",
        },
        paper: {
          DEFAULT: "var(--color-paper)",
          raised: "var(--color-paper-raised)",
          deep: "var(--color-paper-deep)",
        },
        brand: {
          DEFAULT: "var(--color-brand)",
          hover: "var(--color-brand-hover)",
          soft: "var(--color-brand-soft)",
        },
        line: "var(--color-line)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": [
          "3.25rem",
          { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "600" },
        ],
        "display-md": [
          "2.375rem",
          { lineHeight: "1.12", letterSpacing: "-0.025em", fontWeight: "600" },
        ],
        "display-sm": [
          "1.875rem",
          { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        "title-lg": [
          "1.75rem",
          { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        "title-md": [
          "1.375rem",
          { lineHeight: "1.28", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        "title-sm": [
          "1.125rem",
          { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "body-lg": ["1.125rem", { lineHeight: "1.65", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55", fontWeight: "450" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
        overline: [
          "0.6875rem",
          { lineHeight: "1.3", letterSpacing: "0.1em", fontWeight: "650" },
        ],
      },
      spacing: {
        4.5: "1.125rem",
        13: "3.25rem",
        15: "3.75rem",
        18: "4.5rem",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        soft: "var(--shadow-md)",
        lift: "var(--shadow-lift)",
        focus: "var(--shadow-focus)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        spring: "var(--ease-spring)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      backgroundImage: {
        "paper-wash":
          "radial-gradient(1100px 560px at 8% -8%, var(--wash-a), transparent 55%), radial-gradient(800px 480px at 100% 0%, var(--wash-c), transparent 48%), radial-gradient(700px 400px at 70% 100%, var(--wash-b), transparent 50%), linear-gradient(180deg, var(--bg-canvas) 0%, var(--bg-canvas-elevated) 100%)",
        "progress-shine":
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
      },
      keyframes: {
        "skeleton-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.92)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "bar-shine": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "celebrate-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(13, 122, 106, 0.35)" },
          "50%": { boxShadow: "0 0 0 10px rgba(13, 122, 106, 0)" },
        },
        "check-draw": {
          from: { strokeDashoffset: "24" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        skeleton: "skeleton-pulse 1.4s var(--ease-out) infinite",
        "toast-in": "toast-in var(--duration-base) var(--ease-out)",
        "rise-in": "rise-in var(--duration-base) var(--ease-out) both",
        "pop-in": "pop-in var(--duration-base) var(--ease-spring) both",
        "bar-shine": "bar-shine 1.6s var(--ease-out) infinite",
        celebrate: "celebrate-pulse 1.2s var(--ease-out) 2",
        "check-draw": "check-draw 420ms var(--ease-out) forwards",
      },
    },
  },
  plugins: [],
};

export default config;

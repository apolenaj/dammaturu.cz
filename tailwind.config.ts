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
        /* legacy aliases used by existing shells */
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
          "3rem",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        "display-md": [
          "2.25rem",
          { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "600" },
        ],
        "title-lg": [
          "1.75rem",
          { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" },
        ],
        "title-md": [
          "1.375rem",
          { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "title-sm": [
          "1.125rem",
          { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "body-lg": ["1.125rem", { lineHeight: "1.65", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
        overline: [
          "0.6875rem",
          { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "600" },
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
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        soft: "var(--shadow-md)",
        focus: "var(--shadow-focus)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
      },
      backgroundImage: {
        "paper-wash":
          "radial-gradient(1200px 600px at 10% -10%, var(--wash-a), transparent 55%), radial-gradient(900px 500px at 100% 0%, var(--wash-b), transparent 50%), linear-gradient(180deg, var(--bg-canvas) 0%, var(--bg-canvas-elevated) 100%)",
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
      },
      animation: {
        skeleton: "skeleton-pulse 1.4s var(--ease-out) infinite",
        "toast-in": "toast-in 180ms var(--ease-out)",
      },
    },
  },
  plugins: [],
};

export default config;

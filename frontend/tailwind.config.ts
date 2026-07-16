import type { Config } from "tailwindcss";

/** Robinhood neon lime (Pantone 389 C) */
const RH_NEON = "#CCFF00";
const RH_NEON_DIM = "#B8E600";
const RH_NEON_SOFT = "#D4FF33";
const RH_NEON_MUTED = "#2A3300";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Dark terminal + Robinhood neon accents
        bg: "#000000",
        panel: "#0a0a0a",
        "panel-hover": "#141414",
        border: "#1f1f1f",
        "border-strong": "#333333",
        muted: "#737373",
        faint: "#525252",
        ink: "#f5f5f5",
        "ink-soft": "#a3a3a3",
        primary: "#ffffff",
        accent: "#e5e5e5",
        "on-primary": "#000000",
        // Robinhood neon #CCFF00 (rgb 204,255,0)
        green: RH_NEON,
        "green-dim": RH_NEON_DIM,
        "green-soft": RH_NEON_SOFT,
        "green-muted": RH_NEON_MUTED,
        // PnL / long: neon up, gray down
        positive: RH_NEON,
        "positive-dim": RH_NEON_DIM,
        negative: "#737373",
        "negative-dim": "#525252",
        cloud: "#ffffff",
        glass: "#0a0a0a",
        "glass-strong": "#141414",
        "glass-border": "#1f1f1f",
        "cloud-soft": "#a3a3a3",
      },
      borderRadius: {
        glass: "12px",
        "glass-lg": "16px",
      },
      boxShadow: {
        glass: "none",
        "glass-sm": "none",
        panel: "0 0 0 1px #1f1f1f",
        green: "0 0 0 1px rgba(204, 255, 0, 0.4)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
        // Wordmark: Helvetica Neue Regular (system); Arial/system fallbacks elsewhere
        brand: [
          '"Helvetica Neue"',
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

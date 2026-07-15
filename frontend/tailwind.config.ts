import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Strict monochrome — black / white / gray only
        bg: "#000000",
        panel: "#0a0a0a",
        "panel-hover": "#141414",
        border: "#1f1f1f",
        "border-strong": "#333333",
        muted: "#737373",
        faint: "#525252",
        ink: "#f5f5f5",
        "ink-soft": "#a3a3a3",
        // White CTAs; on-primary is black ink on white fills
        primary: "#ffffff",
        accent: "#e5e5e5",
        "on-primary": "#000000",
        // PnL / long-short: white vs mid-gray (no hue)
        positive: "#f5f5f5",
        "positive-dim": "#d4d4d4",
        negative: "#737373",
        "negative-dim": "#525252",
        cloud: "#ffffff",
        // legacy aliases
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
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

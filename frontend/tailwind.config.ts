import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Dark terminal + green accents
        bg: "#000000",
        panel: "#0a0a0a",
        "panel-hover": "#141414",
        border: "#1f1f1f",
        "border-strong": "#333333",
        muted: "#737373",
        faint: "#525252",
        ink: "#f5f5f5",
        "ink-soft": "#a3a3a3",
        // Primary CTAs stay white; green for live/positive accents
        primary: "#ffffff",
        accent: "#e5e5e5",
        "on-primary": "#000000",
        green: "#22c55e",
        "green-dim": "#16a34a",
        "green-soft": "#4ade80",
        "green-muted": "#14532d",
        // PnL / long: green up, gray down
        positive: "#22c55e",
        "positive-dim": "#16a34a",
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
        green: "0 0 0 1px rgba(34, 197, 94, 0.35)",
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

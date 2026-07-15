import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Obsession OS flat terminal + PEPT mock accents
        bg: "#0a0a0a",
        panel: "#141414",
        "panel-hover": "#1a1a1a",
        border: "#1f1f1f",
        "border-strong": "#2a2a2a",
        muted: "#737373",
        faint: "#525252",
        ink: "#e5e5e5",
        "ink-soft": "#a3a3a3",
        primary: "#8b5cf6",
        accent: "#a78bfa",
        positive: "#22c55e",
        "positive-dim": "#16a34a",
        negative: "#ef4444",
        "negative-dim": "#dc2626",
        cloud: "#ffffff",
        // legacy aliases used in marketplace components
        glass: "#141414",
        "glass-strong": "#1a1a1a",
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

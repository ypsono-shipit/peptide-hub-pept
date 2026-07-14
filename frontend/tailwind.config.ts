import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Peptide Hub "elegant scientific financial platform" design system:
        // deep navy canvas + frosted glass panels lit from within — glass
        // only reads convincingly against a dark/rich backdrop, not a flat
        // light one.
        bg: "#0A0E1C",
        glass: "rgba(255,255,255,0.07)",
        "glass-strong": "rgba(255,255,255,0.14)",
        "glass-border": "rgba(255,255,255,0.14)",
        primary: "#7C8DFF",
        accent: "#A57DFF",
        positive: "#3CCF7E",
        negative: "#FF6B81",
        cloud: "#FFFFFF",
        "cloud-soft": "rgba(255,255,255,0.72)",
        ink: "#FFFFFF",
        "ink-soft": "rgba(255,255,255,0.68)",
      },
      borderRadius: {
        glass: "28px",
        "glass-lg": "32px",
      },
      boxShadow: {
        glass: "0 24px 70px -24px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.25)",
        "glass-sm": "0 12px 32px -16px rgba(0,0,0,0.45)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

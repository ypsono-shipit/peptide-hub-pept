import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Robinhood-terminal-inspired dark theme (see Peptide-Hub-PRD.md §8)
        surface: "#0B0C0E",
        panel: "#151619",
        border: "#26282C",
        text: {
          primary: "#F5F5F5",
          secondary: "#8B8D93",
        },
        long: "#00C853",
        short: "#FF3B30",
        accent: "#7CFF6B",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

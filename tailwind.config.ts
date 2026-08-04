import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // Design System v1.0 — Mediterranean Premium
        quartz: "#F8F7F3",
        turquoise: {
          DEFAULT: "#4CB8C4",
          dark: "#2E8A93",
        },
        "deep-sea": "#18323B",
        coral: "#F18C79",
        sand: "#EFE7DA",
        olive: "#708A64",
        neutral: {
          100: "#FFFFFF",
          200: "#F7F6F2",
          300: "#EEEAE2",
          400: "#D7D2C8",
          500: "#B2ACA1",
          700: "#6D6862",
          900: "#18323B",
        },
        success: "#6DAE72",
        warning: "#F6B34D",
        error: "#D96B6B",
        info: "#4CB8C4",
        cat: {
          utazas: "#F18C79",
          strand: "#4CB8C4",
          apartman: "#708A64",
          kirandulas: "#C6A56A",
          etterem: "#B86C5C",
        },
        wx: {
          air: "#4CB8C4",
          sea: "#7AD4DD",
          sunset: "#F7A567",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        l: "28px",
        m: "20px",
        s: "14px",
      },
      backdropBlur: {
        glass: "16px",
      },
      boxShadow: {
        glass: "0 8px 24px rgba(24,50,59,0.08)",
        card: "0 6px 20px rgba(24,50,59,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;

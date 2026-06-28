import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          100: "#E0E7FF",
          300: "#A5B4FC",
          500: "#4F46E5", // Meet Interview Blue (primary)
          700: "#3730A3",
          900: "#1E1B4B", // Indigo Ink
        },
        coral: {
          300: "#FECDD3",
          500: "#FB7185", // Meet Interview Coral — the "win" moment
          600: "#E5484D",
        },
        amber: { DEFAULT: "#F59E0B" },
        ok: { DEFAULT: "#16A34A" },
        warn: { DEFAULT: "#F59E0B" },
        danger: { DEFAULT: "#DC2626" },
        info: { DEFAULT: "#0EA5E9" },
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(24,24,27,0.04), 0 4px 16px rgba(24,24,27,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;

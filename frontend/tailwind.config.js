/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/world/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090A0F",
        surface: "#12141C",
        "surface-raised": "#1A1D28",
        border: "#262A3B",
        "border-subtle": "#1B1E2B",
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          foreground: "#FFFFFF",
        },
        accent: {
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
          purple: "#8B5CF6",
        },
        muted: {
          DEFAULT: "#1E2235",
          foreground: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

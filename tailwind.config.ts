import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        layout: "1440px",
      },
      colors: {
        white: "var(--white)",
        "bg-light": "var(--bg-light)",
        "table-header": "var(--table-header)",
        border: "var(--border)",
        "text-title": "var(--text-title)",
        "text-sub-title": "var(--text-sub-title)",
        "text-body": "var(--text-body)",
        "text-sub": "var(--text-sub)",
        accent: "var(--accent)",
        "accent-dark": "var(--accent-dark)",
        "sidebar-bg": "var(--sidebar-bg)",
      },
      fontFamily: {
        serif: ["Noto Serif KR", "serif"],
        sans: ["Noto Sans KR", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "var(--border)",
      },
    },
  },
  plugins: [],
};
export default config;

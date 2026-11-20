import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#14213d", 600: "#1f3260", 50: "#eef1f7" },
        kesri: { DEFAULT: "#e8891c", 600: "#c96f0c", 50: "#fdebd3" },
        paper: "#f4f6fa",
        line: "#d4dae6",
        muted: "#56607a",
      },
      fontFamily: {
        sans: ["var(--font-body)", "Segoe UI", "system-ui", "sans-serif"],
        pa: ["var(--font-pa)", "var(--font-body)", "sans-serif"],
      },
      fontSize: { base: ["18px", "1.45"] },
    },
  },
  plugins: [],
};
export default config;

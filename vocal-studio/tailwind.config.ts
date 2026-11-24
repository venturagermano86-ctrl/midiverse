import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#f3ebe0",
        mute: "#9a8f82",
        accent: {
          DEFAULT: "#d4a574",
          dim: "rgba(212, 165, 116, 0.18)",
        },
        surface: {
          DEFAULT: "rgba(255,255,255,0.03)",
          border: "rgba(243, 235, 224, 0.12)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm)", "system-ui", "sans-serif"],
        display: ["var(--font-instrument)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

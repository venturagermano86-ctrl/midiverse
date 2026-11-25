import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0c0d0f",
        panel: "#14171c",
        row: "#1a1e24",
        mist: "#e8eaed",
        muted: "#7d828a",
        soft: "#a3a8b0",
        signal: "#5fd4a8",
        "signal-hi": "#6ee7b7",
        bandcamp: "#1da0c3",
        ember: "#f0a483",
        line: "#252a32",
      },
      borderRadius: {
        dig: "10px",
        "dig-lg": "16px",
      },
      fontFamily: {
        display: ["var(--font-archivo)", "Archivo", "system-ui", "sans-serif"],
        body: ["var(--font-archivo)", "Archivo", "system-ui", "sans-serif"],
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(1.5%, -1%, 0) scale(1.03)" },
        },
      },
      animation: {
        rise: "rise 0.65s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        drift: "drift 20s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

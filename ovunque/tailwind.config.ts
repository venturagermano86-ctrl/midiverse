import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        panel: "#0e0e0e",
        row: "#121212",
        mist: "#f2f2f2",
        muted: "#8a8a8a",
        signal: "#a8ff3e",
        bandcamp: "#1da0c3",
        ember: "#ff5a36",
        line: "#222222",
      },
      fontFamily: {
        display: ["Syne", "system-ui", "sans-serif"],
        body: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
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
        rise: "rise 0.65s ease-out both",
        drift: "drift 20s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0f14",
        mist: "#e8eef5",
        signal: "#2ec4b6",
        ember: "#ff7a45",
        slate: {
          soft: "#1a222d",
          line: "#2a3544",
        },
      },
      fontFamily: {
        display: ["Syne", "system-ui", "sans-serif"],
        body: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(2%, -1%, 0) scale(1.04)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        rise: "rise 0.7s ease-out both",
        drift: "drift 18s ease-in-out infinite",
        "pulse-soft": "pulseSoft 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0D",
        textPrimary: "#FFFFFF",
        textSecondary: "#B3B3BF",
        accent: "#93C5FD",
        accentHover: "#60A5FA",
      },
      fontFamily: {
        serif: ["var(--font-crimson-pro)", "serif"],
        display: ["var(--font-playfair-display)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

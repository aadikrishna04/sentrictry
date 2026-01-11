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
        background: "#0A0A0D", // Very dark blue-black
        surface: "#111111",     // Dark Grey
        surfaceHighlight: "#1A1A1A",
        border: "#333333",
        textPrimary: "#FFFFFF",
        textSecondary: "#B3B3BF",
        accent: "#93C5FD",      // Blue-300
        accentHover: "#60A5FA", // Blue-400
        success: "#4ADE80",     // Green-400
        error: "#F87171",       // Red-400
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
        serif: ["var(--font-manrope)", "sans-serif"], // Spec says font-serif maps to Manrope
        display: ["var(--font-manrope)", "sans-serif"], // Spec says font-display maps to Manrope (mostly)
        logo: ["var(--font-playfair-display)", "serif"], // Spec says font-logo is Playfair
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

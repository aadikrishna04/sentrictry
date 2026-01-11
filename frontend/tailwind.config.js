/** @type {import('tailwindcss').Config} */
module.exports = {
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
        sans: ["var(--font-manrope)", "sans-serif"],
        serif: ["var(--font-manrope)", "sans-serif"],
        display: ["var(--font-manrope)", "sans-serif"],
        logo: ["var(--font-playfair-display)", "serif"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#E8C48E", // Gold/Champagne
        secondary: "#000000", // Pure Black
        accent: "#1A1A1A", // Dark Gray
        surface: "#FFFFFF",
        background: "#050505", // Very dark gray/black
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}

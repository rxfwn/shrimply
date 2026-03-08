/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#3B35D4",
          orange: "#F4622A",
          purple: "#2D1B8E",
          cyan: "#5BC8C8",
          cream: "#F5F0E8",
          dark: "#0F0D2E",
          darker: "#080619",
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
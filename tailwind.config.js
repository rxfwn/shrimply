/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  corePlugins: {
    preflight: false, // Attention, comme tu as désactivé le preflight, on gèrera le body à la main !
  },
  theme: {
    extend: {
      colors: {
        brand: {
          white: "#ffffff",
          blue: "#3B35D4",
          orange: "#f3501e",
          purple: "#2D1B8E",
          cyan: "#5BC8C8",
          cream: "#F5F0E8",
          dark: "#111111",
          sidebar: "#091718",
        }
      },
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
      // 👇 AJOUTE JUSTE CE BLOC ICI 👇
      letterSpacing: {
        'illustrator': '-0.3em', // Correspond à ton -100 sur Illustrator
      }
    },
  },
  plugins: [],
}
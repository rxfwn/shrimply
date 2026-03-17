/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  corePlugins: {
    preflight: false,
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
          darker:"#2D2D2D",
        }
      },
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
    
      letterSpacing: {
        'illustrator': '-0.3em', 
      }
    },
  },
  plugins: [],
}
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
        // ── BRAND (existant, inchangé) ───────────────────
        brand: {
          white:   "#ffffff",
          blue:    "#3B35D4",
          orange:  "#f3501e",
          purple:  "#2D1B8E",
          cyan:    "#5BC8C8",
          cream:   "#F5F0E8",
          dark:    "#111111",
          sidebar: "#091718",
          darker:  "#2D2D2D",
        },

        // ── NIGHT ────────────────────────────────────────
        night: {
          bg:       "#111111",
          surface:  "#1a1a1a",
          surface2: "#2d2d2d",
          text:     "#ffffff",
          "text-2": "rgba(255,255,255,0.6)",
          "text-3": "rgba(255,255,255,0.35)",
          "text-4": "rgba(255,255,255,0.12)",
          border:   "rgba(255,255,255,0.06)",
        },

        // ── DAY ──────────────────────────────────────────
        day: {
          bg:       "#F5F0E8",
          surface:  "#FFFFFF",
          surface2: "#EDE8DF",
          text:     "#111111",
          "text-2": "rgba(0,0,0,0.55)",
          "text-3": "rgba(0,0,0,0.35)",
          "text-4": "rgba(0,0,0,0.10)",
          border:   "rgba(0,0,0,0.07)",
        },
      },

      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },

      letterSpacing: {
        illustrator: "-0.3em",
      },
    },
  },
  plugins: [],
}
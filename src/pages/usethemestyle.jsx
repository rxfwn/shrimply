// src/hooks/useThemeStyles.js
// Hook utilitaire — retourne les valeurs de style selon le thème actif.
// Remplace tous les #111111, #1a1a1a, rgba(255,255,255,...) codés en dur.
//
// Usage :
//   const T = useThemeStyles()
//   <div style={{ backgroundColor: T.bg, color: T.text }}>

import { useTheme } from "../context/ThemeContext"

export function useThemeStyles() {
  const { isDay } = useTheme()

  return {
    // Fonds
    bg:       isDay ? "#F5F0E8" : "#111111",
    surface:  isDay ? "#FFFFFF" : "#1a1a1a",
    surface2: isDay ? "#EDE8DF" : "#2d2d2d",

    // Bordures
    border:   isDay ? "rgba(0,0,0,0.07)"  : "rgba(255,255,255,0.06)",
    border2:  isDay ? "rgba(0,0,0,0.14)"  : "rgba(255,255,255,0.12)",

    // Textes
    text:     isDay ? "#111111"            : "#ffffff",
    text2:    isDay ? "rgba(0,0,0,0.55)"  : "rgba(255,255,255,0.6)",
    text3:    isDay ? "rgba(0,0,0,0.35)"  : "rgba(255,255,255,0.35)",
    text4:    isDay ? "rgba(0,0,0,0.10)"  : "rgba(255,255,255,0.12)",

    // Inputs
    inputBg:     isDay ? "#FFFFFF"           : "#1a1a1a",
    inputBorder: isDay ? "rgba(0,0,0,0.1)"  : "rgba(255,255,255,0.06)",

    // Brand (inchangé)
    orange: "#f3501e",
    purple: "#d57bff",
    green:  "#34d399",

    // Helper : génère un objet style de card standard
    card: {
      backgroundColor: isDay ? "#FFFFFF" : "#1a1a1a",
      border: `1px solid ${isDay ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)"}`,
    },

    // Helper : style input standard
    input: (hasError) => ({
      width: "100%",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      outline: "none",
      background: hasError
        ? "rgba(239,68,68,0.08)"
        : isDay ? "#FFFFFF" : "#1a1a1a",
      border: hasError
        ? "1.5px solid rgba(239,68,68,0.5)"
        : `1.5px solid ${isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)"}`,
      color: isDay ? "#111111" : "#ffffff",
      fontFamily: "Poppins, sans-serif",
      fontWeight: 500,
      letterSpacing: "-0.05em",
      boxSizing: "border-box",
      transition: "border-color 0.15s",
    }),
  }
}
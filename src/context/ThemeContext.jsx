// src/context/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("shrimply-theme") || "night"
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === "day") {
      root.classList.remove("dark")
      root.classList.add("day")
    } else {
      root.classList.remove("day")
      root.classList.add("dark")
    }
    localStorage.setItem("shrimply-theme", theme)
  }, [theme])

  const toggle = () => setTheme(t => t === "night" ? "day" : "night")
  const isDay = theme === "day"

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDay }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
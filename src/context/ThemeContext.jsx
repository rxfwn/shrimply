import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    // Par défaut dark mode
    return localStorage.getItem("theme") !== "light"
  })

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add("dark")
      root.classList.remove("light")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      root.classList.add("light")
      localStorage.setItem("theme", "light")
    }
  }, [darkMode])

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
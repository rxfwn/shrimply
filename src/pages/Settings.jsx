import { useTheme } from "../context/ThemeContext"

export default function Settings() {
  const { darkMode, setDarkMode } = useTheme()

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">⚙️ Paramètres</h1>

      <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-700">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Mode nuit</p>
            <p className="text-xs text-zinc-400 mt-0.5">Réduit la luminosité de l'interface</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${darkMode ? "bg-orange-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${darkMode ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </div>
    </div>
  )
}
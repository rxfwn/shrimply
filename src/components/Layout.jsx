import { NavLink, useNavigate, Outlet } from "react-router-dom"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"

export default function Layout() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* SIDEBAR */}
      <div className="w-52 bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800 flex flex-col flex-shrink-0 h-screen">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-50 dark:border-zinc-800">
          <span className="font-serif text-xl font-semibold text-zinc-900 dark:text-white">
            🦐 Shrim<em className="text-orange-500 not-italic">ply</em>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-1 overflow-y-auto">
          <p className="text-xs text-zinc-400 uppercase tracking-widest px-2 py-1 font-medium">Menu</p>
          <NavLink to="/calendar" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white"}`
          }>📅 Calendrier</NavLink>
          <NavLink to="/recipes" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white"}`
          }>📖 Mes recettes</NavLink>
          <NavLink to="/shopping" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white"}`
          }>🛒 Courses</NavLink>
          <NavLink to="/fridge" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white"}`
          }>🧊 Mon frigo</NavLink>
          <NavLink to="/friends" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white"}`
          }>👥 Amis</NavLink>
          <NavLink to="/discover" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white"}`
          }>✨ Découvrir</NavLink>

          <p className="text-xs text-zinc-400 uppercase tracking-widest px-2 py-1 font-medium mt-3">IA</p>
          <NavLink to="/nutrition" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white"}`
          }>🤖 Bilan nutrition</NavLink>
          <NavLink to="/suggestions" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white"}`
          }>🌈 Suggestions</NavLink>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-gray-50 dark:border-zinc-800">
          <NavLink to="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white transition">
            ⚙️ Paramètres
          </NavLink>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-white transition">
            🚪 Déconnexion
          </button>
        </div>
      </div>

      {/* CONTENU */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
        <Outlet />
      </div>
    </div>
  )
}
import { NavLink, useNavigate, Outlet } from "react-router-dom"
import { supabase } from "../supabase"

export default function Layout() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* SIDEBAR */}
      <div className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-screen">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-50">
          <span className="font-serif text-xl font-semibold text-zinc-900">
            🦐 Shrim<em className="text-orange-500 not-italic">ply</em>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-1">
          <p className="text-xs text-zinc-400 uppercase tracking-widest px-2 py-1 font-medium">Menu</p>
          <NavLink to="/calendar" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 hover:text-zinc-800"}`
          }>📅 Calendrier</NavLink>
          <NavLink to="/recipes" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 hover:text-zinc-800"}`
          }>📖 Mes recettes</NavLink>
          <NavLink to="/shopping" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 hover:text-zinc-800"}`
          }>🛒 Courses</NavLink>
          <NavLink to="/fridge" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 hover:text-zinc-800"}`
          }>🧊 Mon frigo</NavLink>
          <NavLink to="/friends" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 hover:text-zinc-800"}`
          }>👥 Amis</NavLink>
          <NavLink to="/discover" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 hover:text-zinc-800"}`
          }>✨ Découvrir</NavLink>

          <p className="text-xs text-zinc-400 uppercase tracking-widest px-2 py-1 font-medium mt-3">IA</p>
          <NavLink to="/nutrition" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 hover:text-zinc-800"}`
          }>🤖 Bilan nutrition</NavLink>
          <NavLink to="/suggestions" className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? "bg-orange-50 text-orange-500 font-medium" : "text-zinc-400 hover:bg-gray-50 hover:text-zinc-800"}`
          }>🌈 Suggestions</NavLink>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-gray-50">
          <NavLink to="/settings" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-gray-50 hover:text-zinc-800 transition">
            ⚙️ Paramètres
          </NavLink>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-gray-50 hover:text-zinc-800 transition">
            🚪 Déconnexion
          </button>
        </div>
      </div>

      {/* CONTENU */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
        <Outlet />
      </div>
    </div>
  )
}
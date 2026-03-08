import { useState, useEffect } from "react"
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { darkMode } = useTheme()
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  // Ferme la sidebar à chaque changement de page sur mobile
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    if (data) setProfile(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const navItem = (to, icon, label) => (
    <NavLink to={to} className={({ isActive }) =>
      `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
      ${isActive
        ? "bg-brand-orange text-white shadow-md"
        : "text-brand-cream/60 hover:bg-white/10 hover:text-brand-cream"}`
    }>
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight text-brand-cream">
          🦐 Shrim<span className="text-brand-orange">ply</span>
        </span>
        {/* Bouton fermer sur mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden text-brand-cream/60 hover:text-brand-cream transition text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Profil */}
      <div className="px-3 pt-3 pb-2">
        <div onClick={() => { navigate("/settings"); setSidebarOpen(false) }}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer bg-white/10 hover:bg-brand-orange/20 transition">
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-brand-orange/30 border-2 border-brand-orange/50">
            {profile?.avatar_url ? (
              <img src={`${profile.avatar_url}?t=${Date.now()}`} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">👤</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-cream truncate">
              {profile?.username || user?.email?.split("@")[0] || "Mon profil"}
            </p>
            <p className="text-xs text-brand-cream/40">Voir le profil</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-xs font-semibold px-3 py-2 uppercase tracking-widest text-brand-cream/30">Menu</p>
        {navItem("/calendar", "📅", "Calendrier")}
        {navItem("/recipes", "📖", "Mes recettes")}
        {navItem("/shopping", "🛒", "Courses")}
        {navItem("/fridge", "🧊", "Mon frigo")}
        {navItem("/friends", "👥", "Amis")}
        {navItem("/discover", "✨", "Découvrir")}
        {navItem("/inspirations", "💡", "Inspirations")}
        <p className="text-xs font-semibold px-3 py-2 mt-2 uppercase tracking-widest text-brand-cream/30">IA</p>
        {navItem("/nutrition", "🤖", "Bilan nutrition")}
        {navItem("/suggestions", "🌈", "Améliorations à venir")}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/10">
        <NavLink to="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-brand-cream/60 hover:bg-white/10 hover:text-brand-cream transition">
          ⚙️ Paramètres
        </NavLink>
        <button onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-brand-cream/60 hover:bg-white/10 hover:text-brand-cream transition">
          🚪 Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* POPUP DÉCONNEXION */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-brand-dark/70 z-50 flex items-center justify-center">
          <div className="bg-brand-purple/90 border border-white/10 rounded-2xl p-6 shadow-2xl w-80">
            <h3 className="text-base font-semibold text-brand-cream mb-2">Se déconnecter ?</h3>
            <p className="text-sm text-brand-cream/50 mb-5">Tu vas être redirigé vers la page de connexion.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-white/10 text-brand-cream hover:bg-white/20 transition">
                Annuler
              </button>
              <button onClick={handleLogout}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition">
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY mobile quand sidebar ouverte */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR desktop — toujours visible */}
      <div className="hidden md:flex w-52 bg-brand-purple flex-col flex-shrink-0 h-screen border-r border-white/10">
        <SidebarContent />
      </div>

      {/* SIDEBAR mobile — slide depuis la gauche */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-brand-purple flex flex-col z-40 border-r border-white/10 transition-transform duration-300 md:hidden
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </div>

      {/* CONTENU */}
      <div className={`flex-1 flex flex-col overflow-y-auto ${darkMode ? "bg-brand-dark" : "bg-brand-cream"}`}>

        {/* TOPBAR mobile */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col gap-1 p-1"
          >
            <span className="block w-5 h-0.5 bg-zinc-600 dark:bg-zinc-300 rounded" />
            <span className="block w-5 h-0.5 bg-zinc-600 dark:bg-zinc-300 rounded" />
            <span className="block w-5 h-0.5 bg-zinc-600 dark:bg-zinc-300 rounded" />
          </button>
          <span className="text-base font-bold tracking-tight text-brand-purple dark:text-brand-cream">
            🦐 Shrim<span className="text-brand-orange">ply</span>
          </span>
          <div onClick={() => navigate("/settings")}
            className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-brand-orange/30 border-2 border-brand-orange/50 cursor-pointer">
            {profile?.avatar_url ? (
              <img src={`${profile.avatar_url}?t=${Date.now()}`} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">👤</span>
            )}
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  )
}
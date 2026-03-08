import { useState, useEffect } from "react"
import { NavLink, useNavigate, Outlet } from "react-router-dom"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"

export default function Layout() {
  const navigate = useNavigate()
  const { darkMode } = useTheme()
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    // CORRECTION ICI : On utilise maybeSingle() au lieu de single()
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

      {/* SIDEBAR */}
      <div className="w-52 bg-brand-purple flex flex-col flex-shrink-0 h-screen border-r border-white/10">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <span className="text-xl font-bold tracking-tight text-brand-cream">
            🦐 Shrim<span className="text-brand-orange">ply</span>
          </span>
        </div>

        {/* Profil */}
        <div className="px-3 pt-3 pb-2">
          <div onClick={() => navigate("/settings")}
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
      </div>

      {/* CONTENU */}
      <div className={`flex-1 flex flex-col overflow-y-auto ${darkMode ? "bg-brand-dark" : "bg-brand-cream"}`}>
        <Outlet />
      </div>
    </div>
  )
}
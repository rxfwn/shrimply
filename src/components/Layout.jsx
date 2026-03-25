import { useState, useEffect } from "react"
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"
import { useProfile } from "../context/ProfileContext"

function NavIcon({ name, size = 18 }) {
  return (
    <img
      src={`/icons/${name}.webp`}
      alt=""
      style={{ width: size, height: size, flexShrink: 0, filter: "none", imageRendering: "auto" }}
      onError={e => { e.target.style.display = "none" }}
    />
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isDay } = useTheme()
  const { profile, user, refreshProfile } = useProfile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false)

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Détecte le retour depuis Stripe (?success=true) et attend que le webhook ait mis à jour le profil
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("success") !== "true") return

    // Nettoie l'URL immédiatement
    navigate(location.pathname, { replace: true })

    // Attend 3s que le webhook Stripe ait le temps de mettre à jour le profil
    const timer = setTimeout(async () => {
      await refreshProfile()
      setShowPremiumWelcome(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  const navItem = (to, iconName, label, id) => (
    <NavLink
      to={to}
      id={id || undefined}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", borderRadius: 10,
        fontFamily: "'Poppins', sans-serif", fontWeight: 700,
        fontSize: 13, letterSpacing: "-0.05em",
        textDecoration: "none",
        color: "white",
        backgroundColor: isActive ? "#f3501e" : "transparent",
        transition: "background-color 0.15s",
      })}>
      <NavIcon name={iconName} />
      <span>{label}</span>
    </NavLink>
  )

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.03em" }}>
          <img src="/icons/shrim.webp" alt="shrimp" style={{ width: 22, height: 22, filter: "none" }} />
          <span>Shrim<span style={{ color: "#f3501e" }}>ply</span></span>
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          style={{ display: "none", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
          className="md:hidden"
        >×</button>
      </div>

      {/* Profil */}
      <div style={{ padding: "0 12px 12px" }}>
        <div
          onClick={() => { navigate("/profile"); setSidebarOpen(false) }}
          style={{ backgroundColor: "#2d2d2d", borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {profile?.avatar_url ? (
              <img src={`${profile.avatar_url}`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <img src="/icons/profile.webp" alt="profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display="none" }} />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
              {profile?.username || user?.email?.split("@")[0] || "Mon profil"}
            </p>
            <p className="text-light" style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontSize: 9, color: "rgba(255,255,255,1)", lineHeight: 1.4 }}>
              voir le profil
            </p>
          </div>
        </div>
      </div>

      {/* Séparateur */}
      <div className="mx-4 mb-2 h-px bg-white/8 flex-shrink-0" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto">
        {navItem("/calendar",    "calendar", "calendrier",              "nav-calendar")}
        {navItem("/recipes",     "book",     "mes recettes",            "nav-recipes")}
        {navItem("/shopping",    "kart",     "courses",                 "nav-shopping")}
        {navItem("/fridge",      "ice",      "mon frigo")}
        {navItem("/friends",     "friends",  "amis")}
        {navItem("/discover",    "spark",    "découvrir",               "nav-discover")}
        {navItem("/nutrition",   "chart",    "bilan nutrition")}
        {navItem("/suggestions", "rainbow",  "améliorations à venir")}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "12px" }}>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 8 }} />
        <NavLink to="/settings" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "-0.05em", textDecoration: "none", color: "white" }}>
          <NavIcon name="gear" />
          paramètres
        </NavLink>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "-0.05em", color: "white", background: "none", border: "none", cursor: "pointer" }}>
          <NavIcon name="door" />
          déconnexion
        </button>
      </div>
    </>
  )

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* POPUP confirmation déconnexion */}
      {showLogoutConfirm && (
        <div onClick={() => setShowLogoutConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1a1a1a", borderRadius: 20, padding: "24px 20px", width: "100%", maxWidth: 360, margin: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", textAlign: "center", letterSpacing: "-0.04em" }}>
              se déconnecter ?
            </p>
            <p style={{ margin: 0, fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
              tu devras te reconnecter à ta prochaine visite.
            </p>
            <button onClick={handleLogout} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#f3501e", color: "#fff", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-0.04em", cursor: "pointer" }}>
              se déconnecter
            </button>
            <button onClick={() => setShowLogoutConfirm(false)} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-0.04em", cursor: "pointer" }}>
              annuler
            </button>
          </div>
        </div>
      )}

      {/* POPUP bienvenue Premium */}
      {showPremiumWelcome && (
        <div onClick={() => setShowPremiumWelcome(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#111111", border: "1.5px solid rgba(243,80,30,0.4)", borderRadius: 24, padding: "32px 24px", width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <p style={{ margin: "0 0 8px", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 18, color: "#ffffff", letterSpacing: "-0.05em" }}>
              tu es Premium !
            </p>
            <p style={{ margin: "0 0 24px", fontFamily: "Poppins, sans-serif", fontWeight: 400, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
              toutes les fonctionnalités sont maintenant débloquées.<br />recettes illimitées, import, partage et bien plus.
            </p>
            <button onClick={() => setShowPremiumWelcome(false)} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#f3501e", color: "#fff", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-0.04em", cursor: "pointer" }}>
              c'est parti 🚀
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR desktop — toujours sombre */}
      <div className="hidden md:flex w-52 flex-col flex-shrink-0 h-screen"
        style={{ backgroundColor: "#091718" }}>
        <SidebarContent />
      </div>

      {/* SIDEBAR mobile */}
      <div className={`fixed top-0 left-0 h-full w-52 flex flex-col z-40 transition-transform duration-300 md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: "#091718" }}>
        <SidebarContent />
      </div>

      {/* CONTENU PRINCIPAL — fond thémé */}
      <div
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ backgroundColor: "var(--bg-main)", transition: "background-color 0.25s ease" }}
      >

        {/* TOPBAR mobile */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ backgroundColor: "#091718" }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <img src="/icons/burger.webp" alt="menu" className="no-select" style={{ width: 24, height: 28, display: "block" }} />
          </button>

          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            <img src="/icons/shrim.webp" alt="shrimp" className="no-select" style={{ width: 22, height: 22 }} />
            <span>Shrim<span className="text-[#f3501e]">ply</span></span>
          </span>

          <div
            onClick={() => navigate("/profile")}
            className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-[#f3501e]/30 border-2 border-[#f3501e]/60 cursor-pointer"
          >
            {profile?.avatar_url ? (
              <img src={`${profile.avatar_url}`} alt="avatar" className="w-full h-full object-cover" />
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
import { useState, useEffect } from "react"
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"
import { useProfile } from "../context/ProfileContext"

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days}j`
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function notifMessage(notif, profile) {
  const name = profile?.username || "quelqu'un"
  if (notif.type === "follow") return `${name} a commencé à te suivre`
  if (notif.type === "recipe_imported") return `${name} a importé ta recette`
  return ""
}

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
  const [notifs, setNotifs] = useState([])
  const [notifProfiles, setNotifProfiles] = useState({})
  const [showNotifPanel, setShowNotifPanel] = useState(false)

  const unreadCount = notifs.filter(n => !n.read).length

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!user?.id) return
    fetchNotifs(user.id)
    const channel = supabase
      .channel("notifs-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const n = payload.new
          setNotifs(prev => [n, ...prev])
          if (n.from_user_id) {
            const { data } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", n.from_user_id).single()
            if (data) setNotifProfiles(prev => ({ ...prev, [data.id]: data }))
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const fetchNotifs = async (userId) => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30)
    if (!data) return
    setNotifs(data)
    const ids = [...new Set(data.map(n => n.from_user_id).filter(Boolean))]
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
      const map = {}
      ;(profiles || []).forEach(p => { map[p.id] = p })
      setNotifProfiles(map)
    }
  }

  const openNotifPanel = () => {
    setShowNotifPanel(true)
    if (unreadCount > 0 && user?.id) {
      supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false).then(() => {
        setNotifs(prev => prev.map(n => ({ ...n, read: true })))
      })
    }
  }

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

  const navLinkStyle = (isActive) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "7px 14px", borderRadius: 10,
    fontFamily: "'Poppins', sans-serif", fontWeight: 700,
    fontSize: 13, letterSpacing: "-0.05em",
    textDecoration: "none",
    color: "white",
    backgroundColor: isActive ? "#f3501e" : "transparent",
    transition: "background-color 0.15s",
  })

  const navItem = (to, iconName, label, id) => (
    <NavLink
      to={to}
      id={id || undefined}
      style={({ isActive }) => navLinkStyle(isActive)}>
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
      <nav className="flex-1 px-3 py-1 flex flex-col gap-0.5 overflow-y-auto">
        {navItem("/calendar",    "calendar", "calendrier",              "nav-calendar")}
        {navItem("/recipes",     "book",     "mes recettes",            "nav-recipes")}
        {navItem("/glaces",      "icecream", "glaces")}
        {navItem("/boissons",    "drink",    "boissons")}
        {navItem("/shopping",    "kart",     "courses",                 "nav-shopping")}
        {navItem("/friends",     "friends",  "amis")}
        {navItem("/discover",    "spark",    "découvrir",               "nav-discover")}
        {navItem("/nutrition",   "chart",    "budget courses")}
        {navItem("/suggestions", "rainbow",  "roadmap")}
        {navItem("/app/blog",    "memo",     "blog",                    "nav-blog")}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "12px" }}>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 8 }} />
        <button onClick={openNotifPanel}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "-0.05em", color: "white", background: "none", border: "none", cursor: "pointer" }}>
          <NavIcon name="bell" />
          notifications
          {unreadCount > 0 && (
            <span style={{ marginLeft: "auto", backgroundColor: "#f3501e", color: "#fff", borderRadius: "50%", minWidth: 18, height: 18, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
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

      {/* PANEL NOTIFICATIONS */}
      {showNotifPanel && (
        <div onClick={() => setShowNotifPanel(false)} style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: "fixed", left: 208, top: 0, bottom: 0, width: 300,
            backgroundColor: "#091718", borderRight: "1px solid rgba(255,255,255,0.08)",
            display: "flex", flexDirection: "column", zIndex: 201,
          }}
            className="hidden md:flex"
          >
            <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em" }}>notifications</span>
              <button onClick={() => setShowNotifPanel(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {notifs.length === 0 ? (
                <div style={{ padding: "40px 16px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.25)", fontFamily: "Poppins, sans-serif" }}>aucune notification</p>
                </div>
              ) : notifs.map(n => {
                const p = notifProfiles[n.from_user_id]
                return (
                  <div key={n.id} onClick={() => { if (n.type === "follow" && n.from_user_id) { navigate(`/profile/${n.from_user_id}`); setShowNotifPanel(false) } }}
                    style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", backgroundColor: n.read ? "transparent" : "rgba(243,80,30,0.07)", display: "flex", alignItems: "center", gap: 12, cursor: n.type === "follow" ? "pointer" : "default", transition: "background-color 0.15s" }}
                    onMouseEnter={e => { if (n.type === "follow") e.currentTarget.style.backgroundColor = n.read ? "rgba(255,255,255,0.03)" : "rgba(243,80,30,0.12)" }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = n.read ? "transparent" : "rgba(243,80,30,0.07)" }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#2d2d2d", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {p?.avatar_url
                        ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <img src="/icons/profile.webp" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em", lineHeight: 1.4 }}>
                        {notifMessage(n, p)}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "Poppins, sans-serif" }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#f3501e", flexShrink: 0 }} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile : bottom sheet */}
          <div onClick={e => e.stopPropagation()} style={{
            position: "fixed", left: 0, right: 0, bottom: 0,
            maxHeight: "75vh", backgroundColor: "#091718",
            borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column",
          }}
            className="md:hidden"
          >
            <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em" }}>notifications</span>
              <button onClick={() => setShowNotifPanel(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {notifs.length === 0 ? (
                <div style={{ padding: "40px 16px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.25)", fontFamily: "Poppins, sans-serif" }}>aucune notification</p>
                </div>
              ) : notifs.map(n => {
                const p = notifProfiles[n.from_user_id]
                return (
                  <div key={n.id} onClick={() => { if (n.type === "follow" && n.from_user_id) { navigate(`/profile/${n.from_user_id}`); setShowNotifPanel(false) } }}
                    style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", backgroundColor: n.read ? "transparent" : "rgba(243,80,30,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#2d2d2d", flexShrink: 0, overflow: "hidden" }}>
                      {p?.avatar_url
                        ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <img src="/icons/profile.webp" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em", lineHeight: 1.4 }}>{notifMessage(n, p)}</p>
                      <p style={{ margin: 0, fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "Poppins, sans-serif" }}>{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#f3501e", flexShrink: 0 }} />}
                  </div>
                )
              })}
            </div>
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

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={openNotifPanel} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, position: "relative" }}>
            <img src="/icons/bell.webp" alt="notifications" style={{ width: 22, height: 22 }} onError={e => e.target.style.display = "none"} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: 0, right: 0, backgroundColor: "#f3501e", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
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
        </div>

        <Outlet />
      </div>
    </div>
  )
}
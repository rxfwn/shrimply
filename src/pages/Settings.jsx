import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { TAGS } from "../tags"

export default function Settings() {
  const navigate = useNavigate()
  const fileRef = useRef()

  const [user, setUser] = useState(null)
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [selectedPrefs, setSelectedPrefs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")

  const [notifNewFollower, setNotifNewFollower] = useState(
    localStorage.getItem("notif_follower") !== "false"
  )
  const [notifRecipeLiked, setNotifRecipeLiked] = useState(
    localStorage.getItem("notif_liked") !== "false"
  )

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    if (data) {
      setUsername(data.username || "")
      setAvatarUrl(data.avatar_url || "")
      setSelectedPrefs(data.preferences || [])
    }
  }

  const togglePref = (pref) => {
    setSelectedPrefs(prev => prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref])
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setSuccess("❌ image trop lourde (max 2MB)")
      setTimeout(() => setSuccess(""), 3000)
      return
    }
    setUploading(true)
    await supabase.storage.from("avatars").upload(`${user.id}`, file, { upsert: true, contentType: file.type })
    const { data } = supabase.storage.from("avatars").getPublicUrl(`${user.id}`)
    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from("profiles").upsert({ id: user.id, username, avatar_url: avatarUrl, preferences: selectedPrefs })
    localStorage.setItem("notif_follower", notifNewFollower)
    localStorage.setItem("notif_liked", notifRecipeLiked)
    setSaving(false)
    setSuccess("✅ profil sauvegardé !")
    setTimeout(() => setSuccess(""), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const handleDeleteAccount = async () => {
    if (deleteInput !== username) return
    await supabase.from("recipes").delete().eq("user_id", user.id)
    await supabase.from("profiles").delete().eq("id", user.id)
    await supabase.auth.signOut()
    navigate("/login")
  }

  // ── Composants internes ────────────────────────────────────────────────────

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        position: "relative", width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        backgroundColor: value ? "#f3501e" : "#4c4c4c",
        border: "none", cursor: "pointer", transition: "background-color 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: 2,
        width: 20, height: 20, borderRadius: "50%",
        backgroundColor: "#ffffff",
        transform: value ? "translateX(20px)" : "translateX(0)",
        transition: "transform 0.2s",
        display: "block",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </button>
  )

  const Section = ({ title, icon, children }) => (
    <div style={{
      backgroundColor: "#1a1a1a",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.06)",
      overflow: "hidden",
      marginBottom: 12,
    }}>
      <div style={{
        padding: "14px 18px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {icon && <img src={`/icons/${icon}.png`} alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display = "none"} />}
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )

  const Row = ({ label, sub, right, onClick, danger, noBorder }) => (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 18px",
        borderBottom: noBorder ? "none" : "1px solid rgba(255,255,255,0.04)",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)" }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.backgroundColor = "transparent" }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: danger ? "#f87171" : "#ffffff", letterSpacing: "-0.03em" }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{sub}</p>}
      </div>
      {right}
    </div>
  )

  const inputStyle = {
    width: "100%", borderRadius: 10, padding: "10px 14px",
    fontSize: 13, outline: "none",
    backgroundColor: "#2d2d2d",
    border: "1.5px solid rgba(255,255,255,0.06)",
    color: "#ffffff", fontFamily: "Poppins, sans-serif", fontWeight: 500,
    letterSpacing: "-0.05em", boxSizing: "border-box", transition: "border-color 0.15s",
  }

  const btnBase = {
    fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13,
    letterSpacing: "-0.05em", border: "none", cursor: "pointer",
    borderRadius: 10, transition: "transform 0.15s",
  }

  return (
    <div style={{ backgroundColor: "#111111", minHeight: "100%", padding: "24px", fontFamily: "Poppins, sans-serif", maxWidth: 560 }}>

      {/* Toast */}
      {success && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, backgroundColor: success.startsWith("❌") ? "#f87171" : "#34d399", color: success.startsWith("❌") ? "#ffffff" : "#064e3b", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          {success}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <img src="/icons/settings.png" alt="" style={{ width: 22, height: 22 }} onError={e => e.target.style.display = "none"} />
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.05em" }}>paramètres</h1>
      </div>

      {/* ── PROFIL ─────────────────────────────────────────────────────────── */}
      <Section title="profil" icon="book">
        <div style={{ padding: "16px 18px" }}>

          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div
              onClick={() => fileRef.current.click()}
              style={{
                width: 64, height: 64, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                border: "2.5px solid rgba(243,80,30,0.5)",
                backgroundColor: "#2d2d2d",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#f3501e"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(243,80,30,0.5)"}
            >
              {avatarUrl ? (
                <img src={`${avatarUrl}?t=${Date.now()}`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 26 }}>👤</span>
              )}
            </div>
            <div>
              <button
                onClick={() => fileRef.current.click()}
                style={{ ...btnBase, background: "none", border: "none", padding: 0, color: "#f3501e", fontSize: 13, display: "block", marginBottom: 4 }}
              >
                {uploading ? "upload en cours..." : "changer la photo"}
              </button>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>JPG, PNG — max 2MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
          </div>

          {/* Nom d'utilisateur */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              nom d'utilisateur
            </label>
            <input
              style={inputStyle}
              placeholder="ton prénom ou pseudo"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={e => e.target.style.borderColor = "#f3501e"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.06)"}
            />
          </div>

          {/* Email (désactivé) */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
              email
            </label>
            <input
              style={{ ...inputStyle, backgroundColor: "#141414", color: "rgba(255,255,255,0.3)", cursor: "not-allowed", border: "1.5px solid rgba(255,255,255,0.03)" }}
              value={user?.email || ""}
              disabled
            />
          </div>
        </div>
      </Section>

      {/* ── PRÉFÉRENCES ALIMENTAIRES ────────────────────────────────────────── */}
      <Section title="préférences alimentaires" icon="salad">
        <div style={{ padding: "12px 18px 16px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500, lineHeight: 1.5 }}>
            utilisées pour personnaliser tes suggestions de recettes.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TAGS.map(tag => {
              const active = selectedPrefs.includes(tag.value)
              return (
                <button
                  key={tag.value}
                  onClick={() => togglePref(tag.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em",
                    cursor: "pointer", transition: "all 0.15s",
                    backgroundColor: active ? tag.pillBg : "transparent",
                    color: active ? tag.pillText : "rgba(255,255,255,0.4)",
                    border: active ? "1.5px solid transparent" : "1.5px solid rgba(255,255,255,0.1)",
                    transform: active ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 12, height: 12 }} onError={e => e.target.style.display = "none"} />
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ── NOTIFICATIONS ───────────────────────────────────────────────────── */}
      <Section title="notifications" icon="clock">
        <Row
          label="nouveaux abonnés"
          sub="quand quelqu'un commence à te suivre"
          right={<Toggle value={notifNewFollower} onChange={setNotifNewFollower} />}
        />
        <Row
          label="recette aimée"
          sub="quand quelqu'un aime une de tes recettes"
          right={<Toggle value={notifRecipeLiked} onChange={setNotifRecipeLiked} />}
          noBorder
        />
      </Section>

      {/* ── CONFIDENTIALITÉ ─────────────────────────────────────────────────── */}
      <Section title="confidentialité">
        <Row
          label="profil public"
          sub="tes recettes publiques sont visibles par tous"
          right={<span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>toujours actif</span>}
        />
        <Row
          label="voir mes recettes publiées"
          right={<span style={{ color: "rgba(255,255,255,0.25)", fontSize: 16 }}>→</span>}
          onClick={() => navigate("/profile")}
          noBorder
        />
      </Section>

      {/* ── COMPTE ──────────────────────────────────────────────────────────── */}
      <Section title="compte">
        <Row
          label="se déconnecter"
          right={<span style={{ color: "rgba(255,255,255,0.25)", fontSize: 16 }}>→</span>}
          onClick={handleLogout}
        />
        <Row
          label="supprimer mon compte"
          sub="action irréversible"
          danger
          onClick={() => setConfirmDelete(true)}
          noBorder
        />
      </Section>

      {/* ── BOUTON SAUVEGARDER ──────────────────────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          ...btnBase,
          width: "100%", padding: "13px",
          backgroundColor: "#f3501e", color: "#ffffff",
          fontSize: 13, opacity: saving ? 0.6 : 1,
          marginTop: 4,
        }}
        onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = "scale(1.02)" }}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
        onMouseUp={e => e.currentTarget.style.transform = "scale(1.02)"}
      >
        {saving ? "sauvegarde..." : "💾 sauvegarder"}
      </button>

      {/* ── POPUP SUPPRESSION ───────────────────────────────────────────────── */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ backgroundColor: "#1a1a1a", borderRadius: 16, maxWidth: 380, width: "100%", overflow: "hidden", border: "1px solid rgba(239,68,68,0.2)" }}>

            {/* Header rouge */}
            <div style={{ backgroundColor: "rgba(239,68,68,0.08)", padding: "28px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid rgba(239,68,68,0.12)" }}>
              <div style={{ width: 52, height: 52, backgroundColor: "#2d2d2d", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.05em" }}>supprimer mon compte</h2>
            </div>

            <div style={{ padding: "20px 24px 24px" }}>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, textAlign: "center", fontWeight: 500 }}>
                action <strong style={{ color: "rgba(255,255,255,0.7)" }}>irréversible</strong> — toutes tes recettes seront supprimées.
              </p>

              <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                tape « {username} » pour confirmer
              </label>
              <input
                style={{ ...inputStyle, border: "1.5px solid rgba(239,68,68,0.3)", marginBottom: 16 }}
                placeholder={username}
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                onFocus={e => e.target.style.borderColor = "#f87171"}
                onBlur={e => e.target.style.borderColor = "rgba(239,68,68,0.3)"}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteInput("") }}
                  style={{ ...btnBase, flex: 1, padding: "11px", backgroundColor: "#2d2d2d", color: "rgba(255,255,255,0.6)" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== username}
                  style={{ ...btnBase, flex: 1, padding: "11px", backgroundColor: "#ef4444", color: "#ffffff", opacity: deleteInput !== username ? 0.35 : 1 }}
                  onMouseEnter={e => { if (deleteInput === username) e.currentTarget.style.transform = "scale(1.02)" }}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
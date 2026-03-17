import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { TAGS } from "../tags"
import { useTheme } from "../context/ThemeContext"
import { useProfile } from "../context/ProfileContext"

// ── Composants hors du composant principal (évite le remount à chaque render) ──

const btnBase = {
  fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13,
  letterSpacing: "-0.05em", border: "none", cursor: "pointer",
  borderRadius: 10, transition: "transform 0.15s",
}

function SectionComp({ title, icon, children }) {
  return (
    <div style={{
      backgroundColor: "var(--bg-card)",
      borderRadius: 14,
      border: "1px solid var(--border)",
      overflow: "hidden",
      marginBottom: 12,
    }}>
      <div style={{
        padding: "14px 18px 10px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {icon && <img src={`/icons/${icon}.png`} alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display = "none"} />}
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function RowComp({ label, sub, right, onClick, danger, noBorder }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 18px",
        borderBottom: noBorder ? "none" : "1px solid var(--border)",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.backgroundColor = "var(--bg-card-2)" }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.backgroundColor = "transparent" }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: danger ? "#f87171" : "var(--text-main)", letterSpacing: "-0.03em" }}>
          {label}
        </p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const { isDay, toggle } = useTheme()
  const { user, profile, refreshProfile } = useProfile()

  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [selectedPrefs, setSelectedPrefs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")

  // Init local state depuis le contexte partagé
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "")
      setAvatarUrl(profile.avatar_url || "")
      setSelectedPrefs(profile.preferences || [])
    }
  }, [profile])

  // Fond du body thémé même au scroll
  useEffect(() => {
    document.body.style.backgroundColor = "var(--bg-main)"
    return () => { document.body.style.backgroundColor = "" }
  }, [isDay])

  const togglePref = (pref) =>
    setSelectedPrefs(prev => prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setSuccess("❌ image trop lourde (max 2MB)"); setTimeout(() => setSuccess(""), 3000); return }
    setUploading(true)
    await supabase.storage.from("avatars").upload(`${user.id}`, file, { upsert: true, contentType: file.type })
    const { data } = supabase.storage.from("avatars").getPublicUrl(`${user.id}`)
    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from("profiles").upsert({ id: user.id, username, avatar_url: avatarUrl, preferences: selectedPrefs })
    await refreshProfile()
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

  const inputStyle = {
    width: "100%", borderRadius: 10, padding: "10px 14px",
    fontSize: 13, outline: "none",
    backgroundColor: "var(--bg-card-2)",
    border: "1.5px solid var(--input-border)",
    color: "var(--text-main)",
    fontFamily: "Poppins, sans-serif", fontWeight: 500,
    letterSpacing: "-0.05em", boxSizing: "border-box",
    transition: "border-color 0.15s",
  }

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: 48 }}>
      <div style={{ padding: "24px", maxWidth: 560, margin: "0 auto", fontFamily: "Poppins, sans-serif" }}>

        {/* Toast */}
        {success && (
          <div style={{
            position: "fixed", top: 16, right: 16, zIndex: 50,
            backgroundColor: success.startsWith("❌") ? "#f87171" : "#34d399",
            color: success.startsWith("❌") ? "#ffffff" : "#064e3b",
            padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700,
          }}>{success}</div>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <img src="/icons/settings.png" alt="" style={{ width: 22, height: 22 }} onError={e => e.target.style.display = "none"} />
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.05em" }}>
            paramètres
          </h1>
        </div>

        {/* ── APPARENCE ── */}
        <SectionComp title="apparence" icon="sun">
          <RowComp
            label={isDay ? "mode jour" : "mode nuit"}
            sub="basculer entre le thème clair et sombre"
            noBorder
            right={
              <button
                onClick={toggle}
                style={{
                  ...btnBase, display: "flex", alignItems: "center", gap: 7,
                  padding: "6px 14px", borderRadius: 20,
                  backgroundColor: isDay ? "#111111" : "#F5F0E8",
                  color: isDay ? "#F5F0E8" : "#111111",
                  fontSize: 11,
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <img src={isDay ? "/icons/night.png" : "/icons/sun.png"} alt="" style={{ width: 16, height: 16 }} onError={e => e.target.style.display = "none"} />
                {isDay ? "nuit" : "jour"}
              </button>
            }
          />
        </SectionComp>

        {/* ── PROFIL ── */}
        <SectionComp title="profil" icon="book">
          <div style={{ padding: "16px 18px" }}>

            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div
                onClick={() => fileRef.current.click()}
                style={{
                  width: 64, height: 64, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                  border: "2.5px solid rgba(243,80,30,0.5)",
                  backgroundColor: "var(--bg-card-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#f3501e"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(243,80,30,0.5)"}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 26 }}>👤</span>
                }
              </div>
              <div>
                <button onClick={() => fileRef.current.click()}
                  style={{ ...btnBase, background: "none", border: "none", padding: 0, color: "#f3501e", fontSize: 13, display: "block", marginBottom: 4 }}>
                  {uploading ? "upload en cours..." : "changer la photo"}
                </button>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-faint)", fontWeight: 500 }}>JPG, PNG — max 2MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            </div>

            {/* Nom d'utilisateur */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                nom d'utilisateur
              </label>
              <input
                style={inputStyle}
                placeholder="ton prénom ou pseudo"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={e => e.target.style.borderColor = "#f3501e"}
                onBlur={e => e.target.style.borderColor = "var(--input-border)"}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                email
              </label>
              <input
                style={{ ...inputStyle, backgroundColor: "var(--bg-main)", color: "var(--text-faint)", cursor: "not-allowed", border: "1.5px solid var(--border)" }}
                value={user?.email || ""}
                disabled
              />
            </div>
          </div>
        </SectionComp>

        {/* ── PRÉFÉRENCES ── */}
        <SectionComp title="préférences alimentaires" icon="salad">
          <div style={{ padding: "12px 18px 16px" }}>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.5 }}>
              utilisées pour personnaliser tes suggestions de recettes.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TAGS.map(tag => {
                const active = selectedPrefs.includes(tag.value)
                const anyActive = selectedPrefs.length > 0
                return (
                  <button
                    key={tag.value}
                    onClick={() => togglePref(tag.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em",
                      cursor: "pointer", transition: "all 0.2s ease",
                      backgroundColor: tag.pillBg, color: tag.pillText,
                      border: "none",
                      opacity: anyActive && !active ? 0.35 : 1,
                      transform: active ? "scale(1.08)" : "scale(1)",
                      boxShadow: active ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                    }}
                  >
                    <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 12, height: 12 }} onError={e => e.target.style.display = "none"} />
                    {tag.label}
                  </button>
                )
              })}
            </div>
          </div>
        </SectionComp>

        {/* ── CONFIDENTIALITÉ ── */}
        <SectionComp title="confidentialité">
          <RowComp
            label="profil public"
            sub="tes recettes publiques sont visibles par tous"
            right={<span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>toujours actif</span>}
          />
          <RowComp label="voir mes recettes publiées" onClick={() => navigate("/profile")} noBorder />
        </SectionComp>

        {/* ── COMPTE ── */}
        <SectionComp title="compte">
          <RowComp label="se déconnecter" onClick={handleLogout} />
          <RowComp label="supprimer mon compte" sub="action irréversible" danger onClick={() => setConfirmDelete(true)} noBorder />
        </SectionComp>

        {/* ── SAUVEGARDER ── */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...btnBase, width: "100%", padding: "13px", backgroundColor: "#f3501e", color: "#ffffff", fontSize: 13, opacity: saving ? 0.6 : 1, marginTop: 4 }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = "scale(1.02)" }}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1.02)"}
        >
          {saving ? "sauvegarde..." : "💾 sauvegarder"}
        </button>

        {/* ── POPUP SUPPRESSION ── */}
        {confirmDelete && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 16, maxWidth: 380, width: "100%", overflow: "hidden", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div style={{ backgroundColor: "rgba(239,68,68,0.08)", padding: "28px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid rgba(239,68,68,0.12)" }}>
                <div style={{ width: 52, height: 52, backgroundColor: "var(--bg-card-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>⚠️</div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.05em" }}>supprimer mon compte</h2>
              </div>
              <div style={{ padding: "20px 24px 24px" }}>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, textAlign: "center", fontWeight: 500 }}>
                  action <strong style={{ color: "var(--text-main)" }}>irréversible</strong> — toutes tes recettes seront supprimées.
                </p>
                <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
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
                    style={{ ...btnBase, flex: 1, padding: "11px", backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >annuler</button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== username}
                    style={{ ...btnBase, flex: 1, padding: "11px", backgroundColor: "#ef4444", color: "#ffffff", opacity: deleteInput !== username ? 0.35 : 1 }}
                    onMouseEnter={e => { if (deleteInput === username) e.currentTarget.style.transform = "scale(1.02)" }}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  >supprimer</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
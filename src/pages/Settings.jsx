import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"

const PREFERENCES = [
  "🌿 Végétarien", "🌱 Vegan", "🐟 Pescétarien", "🥩 Sans restrictions",
  "🚫 Sans gluten", "🥛 Sans lactose", "🥜 Sans arachides", "💰 Économique"
]

export default function Settings() {
  const navigate = useNavigate()
  const { darkMode, setDarkMode } = useTheme()
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

  // Notifications (stockées localement)
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
      setSuccess("❌ Image trop lourde (max 2MB)")
      setTimeout(() => setSuccess(""), 3000)
      return
    }
    setUploading(true)
    const path = `${user.id}`
    await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type })
    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from("profiles").upsert({
      id: user.id,
      username,
      avatar_url: avatarUrl,
      preferences: selectedPrefs,
    })
    localStorage.setItem("notif_follower", notifNewFollower)
    localStorage.setItem("notif_liked", notifRecipeLiked)
    setSaving(false)
    setSuccess("✅ Profil sauvegardé !")
    setTimeout(() => setSuccess(""), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const handleDeleteAccount = async () => {
    if (deleteInput !== username) return
    // Supprimer les données de l'utilisateur
    await supabase.from("recipes").delete().eq("user_id", user.id)
    await supabase.from("profiles").delete().eq("id", user.id)
    await supabase.auth.signOut()
    navigate("/login")
  }

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${value ? "bg-brand-orange" : "bg-gray-200 dark:bg-zinc-600"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  )

  const Section = ({ title, children }) => (
    <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl shadow-sm mb-4 overflow-hidden">
      <div className="px-5 pt-4 pb-1">
        <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">{title}</h2>
      </div>
      <div className="pb-2">{children}</div>
    </div>
  )

  const Row = ({ label, sub, right, onClick, danger }) => (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-5 py-3 ${onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition" : ""} ${danger ? "text-red-500" : ""}`}
    >
      <div>
        <p className={`text-sm font-medium ${danger ? "text-red-500" : "text-zinc-900 dark:text-white"}`}>{label}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  )

  return (
    <div className="p-6 max-w-xl">

      {/* Toast */}
      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          {success}
        </div>
      )}

      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">⚙️ Paramètres</h1>

      {/* ── PROFIL ──────────────────────────────────────────────────────── */}
      <Section title="Profil">
        <div className="px-5 pb-3">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-full bg-orange-100 dark:bg-zinc-700 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-orange-200 hover:border-orange-400 transition"
              onClick={() => fileRef.current.click()}
            >
              {avatarUrl ? (
                <img src={`${avatarUrl}?t=${Date.now()}`} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <div>
              <button
                onClick={() => fileRef.current.click()}
                className="text-sm text-brand-orange hover:text-brand-orange/70 font-medium transition"
              >
                {uploading ? "Upload..." : "Changer la photo"}
              </button>
              <p className="text-xs text-zinc-400 mt-0.5">JPG, PNG — max 2MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Nom */}
          <div className="mb-3">
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Nom d'utilisateur</label>
            <input
              className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-brand-orange transition"
              placeholder="Ton prénom ou pseudo"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1 block">Email</label>
            <input
              className="w-full border border-gray-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-2.5 text-sm text-zinc-400 cursor-not-allowed"
              value={user?.email || ""}
              disabled
            />
          </div>
        </div>
      </Section>

      {/* ── PRÉFÉRENCES ALIMENTAIRES ─────────────────────────────────────── */}
      <Section title="Préférences alimentaires">
        <div className="px-5 pb-3">
          <p className="text-xs text-zinc-400 mb-3">Utilisées pour personnaliser tes suggestions de recettes.</p>
          <div className="flex flex-wrap gap-2">
            {PREFERENCES.map(pref => (
              <button
                key={pref}
                onClick={() => togglePref(pref)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${selectedPrefs.includes(pref)
                  ? "bg-brand-orange border-brand-orange text-white"
                  : "bg-white dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-brand-orange"}`}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── APPARENCE ───────────────────────────────────────────────────── */}
      <Section title="Apparence">
        <Row
          label="Mode nuit"
          sub="Réduit la luminosité de l'interface"
          right={<Toggle value={darkMode} onChange={setDarkMode} />}
        />
      </Section>

      {/* ── NOTIFICATIONS ───────────────────────────────────────────────── */}
      <Section title="Notifications">
        <Row
          label="Nouveaux abonnés"
          sub="Quand quelqu'un commence à te suivre"
          right={<Toggle value={notifNewFollower} onChange={setNotifNewFollower} />}
        />
        <Row
          label="Recette aimée"
          sub="Quand quelqu'un aime une de tes recettes"
          right={<Toggle value={notifRecipeLiked} onChange={setNotifRecipeLiked} />}
        />
      </Section>

      {/* ── CONFIDENTIALITÉ ─────────────────────────────────────────────── */}
      <Section title="Confidentialité">
        <Row
          label="Profil public"
          sub="Tes recettes publiques sont visibles par tous"
          right={<span className="text-xs text-zinc-400">Toujours actif</span>}
        />
        <Row
          label="Voir mes recettes publiées"
          right={<span className="text-zinc-400">→</span>}
          onClick={() => navigate("/profile")}
        />
      </Section>

      {/* ── COMPTE ──────────────────────────────────────────────────────── */}
      <Section title="Compte">
        <Row
          label="Se déconnecter"
          right={<span className="text-zinc-400">→</span>}
          onClick={handleLogout}
        />
        <Row
          label="Supprimer mon compte"
          sub="Action irréversible"
          danger
          onClick={() => setConfirmDelete(true)}
        />
      </Section>

      {/* Bouton sauvegarder */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand-orange text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-orange/80 transition disabled:opacity-50 shadow-md"
      >
        {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
      </button>

      {/* ── MODAL SUPPRESSION ───────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-red-100 dark:border-red-900/30">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Supprimer mon compte</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Cette action est <strong>irréversible</strong>. Toutes tes recettes seront supprimées.
              </p>
            </div>
            <p className="text-xs text-zinc-500 mb-2">
              Tape ton nom d'utilisateur <strong className="text-zinc-800 dark:text-white">"{username}"</strong> pour confirmer :
            </p>
            <input
              className="w-full border border-red-200 dark:border-red-800 rounded-lg p-2.5 text-sm outline-none mb-4 dark:bg-zinc-700 dark:text-white focus:border-red-400"
              placeholder={username}
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteInput("") }}
                className="flex-1 border border-gray-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== username}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"

export default function Settings() {
  const { darkMode, setDarkMode } = useTheme()
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef()

  const PREFERENCES = ["🌿 Végétarien", "🌱 Vegan", "🐟 Pescétarien", "🥩 Sans restrictions", "🚫 Sans gluten", "🥛 Sans lactose", "🥜 Sans arachides"]
  const [selectedPrefs, setSelectedPrefs] = useState([])

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
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
  setUploading(true)
  const path = `${user.id}`
  const { error } = await supabase.storage.from("avatars").upload(path, file, { 
    upsert: true,
    contentType: file.type
  })
  console.log("upload error:", error)
  const { data } = supabase.storage.from("avatars").getPublicUrl(path)
  console.log("public url:", data.publicUrl)
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
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="p-6 max-w-xl">

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ Profil sauvegardé !
        </div>
      )}

      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">⚙️ Paramètres</h1>

      {/* Profil */}
      <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-4">Profil</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-orange-200 hover:border-orange-400 transition"
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
              className="text-sm text-orange-500 hover:text-orange-600 font-medium transition"
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
            className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400"
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

      {/* Préférences alimentaires */}
      <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-5 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3">Préférences alimentaires</h2>
        <div className="flex flex-wrap gap-2">
          {PREFERENCES.map(pref => (
            <button
              key={pref}
              onClick={() => togglePref(pref)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${selectedPrefs.includes(pref) ? "bg-orange-500 border-orange-500 text-white" : "bg-white dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-orange-300"}`}
            >
              {pref}
            </button>
          ))}
        </div>
      </div>

      {/* Apparence */}
      <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl shadow-sm mb-4">
        <div className="flex items-center justify-between p-4">
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

      {/* Sauvegarder */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-orange-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
      >
        {saving ? "Sauvegarde..." : "Sauvegarder"}
      </button>
    </div>
  )
}
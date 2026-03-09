import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [stats, setStats] = useState({ total: 0, public: 0, private: 0, followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("public")

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: profileData }, { data: recipesData }, { count: followers }, { count: following }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
    ])

    setProfile({ ...profileData, email: user.email })
    setRecipes(recipesData || [])
    setStats({
      total: recipesData?.length || 0,
      public: recipesData?.filter(r => r.is_public).length || 0,
      private: recipesData?.filter(r => !r.is_public).length || 0,
      followers: followers || 0,
      following: following || 0,
    })
    setLoading(false)
  }

  const displayedRecipes = activeTab === "public"
    ? recipes.filter(r => r.is_public)
    : recipes

  if (loading) return <div className="p-6 text-zinc-400 text-center">Chargement...</div>

  return (
    <div className="max-w-2xl mx-auto p-6">

      {/* ── HEADER PROFIL ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-6 mb-8">

        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-orange/30 bg-orange-50 dark:bg-zinc-700 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={`${profile.avatar_url}?t=${Date.now()}`} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">👤</span>
            )}
          </div>
        </div>

        {/* Infos + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">
              {profile?.username || "Utilisateur"}
            </h1>
            <button
              onClick={() => navigate("/settings")}
              className="flex-shrink-0 text-xs border border-gray-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 px-3 py-1 rounded-lg hover:border-brand-orange hover:text-brand-orange transition"
            >
              ✏️ Modifier
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-zinc-400">recettes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.followers}</p>
              <p className="text-xs text-zinc-400">abonnes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-900 dark:text-white">{stats.following}</p>
              <p className="text-xs text-zinc-400">abonnements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Préférences alimentaires */}
      {profile?.preferences?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {profile.preferences.map(pref => (
            <span key={pref} className="text-xs bg-brand-orange/10 text-brand-orange px-2.5 py-1 rounded-full">
              {pref}
            </span>
          ))}
        </div>
      )}

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-100 dark:border-zinc-700 mb-5">
        <button
          onClick={() => setActiveTab("public")}
          className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${activeTab === "public"
            ? "border-brand-orange text-brand-orange"
            : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
        >
          🌍 Publiques ({stats.public})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 py-2.5 text-sm font-medium transition border-b-2 ${activeTab === "all"
            ? "border-brand-orange text-brand-orange"
            : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"}`}
        >
          📋 Toutes ({stats.total})
        </button>
      </div>

      {/* ── GRILLE PHOTOS ─────────────────────────────────────────────────── */}
      {displayedRecipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🍽</p>
          <p className="text-zinc-400 text-sm">
            {activeTab === "public"
              ? "Aucune recette publique — partage tes créations !"
              : "Aucune recette pour l'instant"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {displayedRecipes.map(recipe => (
            <div
              key={recipe.id}
              onClick={() => navigate(`/recipes/${recipe.id}`)}
              className="relative aspect-square cursor-pointer group overflow-hidden rounded-2xl"
            >
              {/* Image ou placeholder */}
              {recipe.photo_url ? (
                <img
                  src={recipe.photo_url}
                  alt={recipe.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-100 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center">
                  <span className="text-3xl opacity-30">🍽</span>
                </div>
              )}

              {/* Overlay hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition duration-300 text-center px-2">
                  <p className="text-white text-xs font-semibold line-clamp-2">{recipe.name}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {recipe.prep_time && <span className="text-white/80 text-[10px]">⏱ {recipe.prep_time}min</span>}
                    {!recipe.is_public && <span className="text-white/80 text-[10px]">🔒</span>}
                  </div>
                </div>
              </div>

              {/* Badge privé */}
              {!recipe.is_public && (
                <div className="absolute top-1.5 right-1.5 bg-black/50 rounded-full p-1">
                  <span className="text-[10px]">🔒</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
import { useState, useEffect } from "react"
import { supabase } from "../supabase"

export default function Friends() {
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [following, setFollowing] = useState([])
  const [followers, setFollowers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    // On récupère les abonnements
    const { data: followingData, error: followError } = await supabase
      .from("follows")
      .select("following_id, profiles!follows_following_id_fkey(id, username, avatar_url)")
      .eq("follower_id", user.id)

    // On récupère les abonnés
    const { data: followersData, error: followerError } = await supabase
      .from("follows")
      .select("follower_id, profiles!follows_follower_id_fkey(id, username, avatar_url)")
      .eq("following_id", user.id)

    if (followError) console.error("Erreur abonnements:", followError)
    if (followerError) console.error("Erreur abonnés:", followerError)

    // On filtre pour éviter les erreurs si un profil lié est null (406 protection)
    if (followingData) setFollowing(followingData.filter(f => f.profiles !== null))
    if (followersData) setFollowers(followersData.filter(f => f.profiles !== null))
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    
    // Recherche de profils avec une sécurité simple
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${search}%`)
      .neq("id", currentUser.id)
      .limit(10)

    if (error) console.error("Erreur recherche:", error)
    
    setSearchResults(data || [])
    setLoading(false)
  }

  const handleFollow = async (userId) => {
    const { error } = await supabase.from("follows").insert({
      follower_id: currentUser.id,
      following_id: userId,
    })

    if (!error) {
      setSuccess("Utilisateur suivi !")
      setTimeout(() => setSuccess(""), 2000)
      await fetchData()
    }
  }

  const handleUnfollow = async (userId) => {
    const { error } = await supabase.from("follows")
      .delete()
      .eq("follower_id", currentUser.id)
      .eq("following_id", userId)
    
    if (!error) await fetchData()
  }

  const isFollowing = (userId) => {
    return following.some(f => f.following_id === userId)
  }

  return (
    <div className="p-6 max-w-2xl">

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ {success}
        </div>
      )}

      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-6">👥 Amis</h1>

      {/* Recherche */}
      <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-5 shadow-sm mb-5">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3">Rechercher des utilisateurs</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400"
            placeholder="Rechercher par nom d'utilisateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
          >
            {loading ? "..." : "Chercher"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {searchResults.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">👤</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{user.username || "Utilisateur"}</p>
                </div>
                {isFollowing(user.id) ? (
                  <button
                    onClick={() => handleUnfollow(user.id)}
                    className="text-xs border border-gray-200 dark:border-zinc-600 text-zinc-500 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
                  >
                    Ne plus suivre
                  </button>
                ) : (
                  <button
                    onClick={() => handleFollow(user.id)}
                    className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition"
                  >
                    + Suivre
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && search && !loading && (
          <p className="text-xs text-zinc-400 mt-3 text-center">Aucun utilisateur trouvé</p>
        )}
      </div>

      {/* Abonnements */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3">
            Abonnements · {following.length}
          </h2>
          {following.length === 0 ? (
            <p className="text-xs text-zinc-400">Tu ne suis personne encore</p>
          ) : (
            <div className="flex flex-col gap-2">
              {following.map(f => (
                <div key={f.following_id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {f.profiles?.avatar_url ? (
                      <img src={f.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">👤</span>
                    )}
                  </div>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate">{f.profiles?.username || "Utilisateur"}</span>
                  <button
                    onClick={() => handleUnfollow(f.following_id)}
                    className="text-zinc-300 hover:text-red-400 transition text-base leading-none"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3">
            Abonnés · {followers.length}
          </h2>
          {followers.length === 0 ? (
            <p className="text-xs text-zinc-400">Personne ne te suit encore</p>
          ) : (
            <div className="flex flex-col gap-2">
              {followers.map(f => (
                <div key={f.follower_id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {f.profiles?.avatar_url ? (
                      <img src={f.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs">👤</span>
                    )}
                  </div>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{f.profiles?.username || "Utilisateur"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
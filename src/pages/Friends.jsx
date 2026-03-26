import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"

function Avatar({ url, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: "var(--bg-card-2)", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {url
        ? <img src={url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <img src="/icons/profile.webp" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
      }
    </div>
  )
}

export default function Friends() {
  const navigate = useNavigate()
  const { isDay } = useTheme()

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

    const [{ data: followingData }, { data: followersData }] = await Promise.all([
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("follows").select("follower_id").eq("following_id", user.id),
    ])

    if (followingData?.length > 0) {
      const ids = followingData.map(f => f.following_id)
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
      setFollowing(followingData.map(f => ({ ...f, profile: profiles?.find(p => p.id === f.following_id) })))
    } else setFollowing([])

    if (followersData?.length > 0) {
      const ids = followersData.map(f => f.follower_id)
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
      setFollowers(followersData.map(f => ({ ...f, profile: profiles?.find(p => p.id === f.follower_id) })))
    } else setFollowers([])
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    const { data } = await supabase.from("profiles").select("id, username, avatar_url")
      .ilike("username", `%${search}%`).neq("id", currentUser.id).limit(10)
    setSearchResults(data || [])
    setLoading(false)
  }

  const handleFollow = async (userId) => {
    await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: userId })
    setSuccess("utilisateur suivi !")
    setTimeout(() => setSuccess(""), 2000)
    await fetchData()
  }

  const handleUnfollow = async (userId) => {
    await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", userId)
    await fetchData()
  }

  const isFollowingUser = (userId) => following.some(f => f.following_id === userId)

  const btnBase = {
    fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12,
    letterSpacing: "-0.05em", border: "none", cursor: "pointer",
    borderRadius: 10, transition: "transform 0.15s",
  }

  const usernameBtn = {
    flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text-main)",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    cursor: "pointer", transition: "color 0.12s",
    background: "none", border: "none", padding: 0, textAlign: "left",
    fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em",
  }

  return (
    <div style={{ padding: "20px 24px", backgroundColor: "var(--bg-main)", minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease" }}>
      <style>{`
        .friends-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) { .friends-grid { grid-template-columns: 1fr; } }
      `}</style>

      {success && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, backgroundColor: "#34d399", color: "#064e3b", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          ✅ {success}
        </div>
      )}

      {/* Header */}
      <h1 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.05em" }}>
        <img src="/icons/friends.webp" alt="" style={{ width: 22, height: 22 }} onError={e => e.target.style.display = "none"} />
        amis
      </h1>

      {/* Recherche */}
      <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, padding: 16, border: "1px solid var(--border)", marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          rechercher des utilisateurs
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            style={{ width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--input-border)", color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 500, letterSpacing: "-0.05em", boxSizing: "border-box", transition: "border-color 0.15s" }}
            placeholder="rechercher par pseudo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            onFocus={e => e.target.style.borderColor = "#8b5cf6"}
            onBlur={e => e.target.style.borderColor = "var(--input-border)"}
          />
          <button onClick={handleSearch} disabled={loading}
            style={{ ...btnBase, width: "100%", padding: "10px 16px", backgroundColor: "#8b5cf6", color: "#ffffff", opacity: loading ? 0.5 : 1 }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "scale(1.02)" }}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1.02)"}
          >
            {loading ? "recherche..." : "chercher"}
          </button>
        </div>

        {/* Résultats */}
        {searchResults.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map(user => (
              <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", backgroundColor: "var(--bg-card-2)", borderRadius: 10 }}>
                <Avatar url={user.avatar_url} size={36} />
                <button style={usernameBtn} onClick={() => navigate(`/profile/${user.id}`)}
                  onMouseEnter={e => e.currentTarget.style.color = "#f3501e"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-main)"}
                >
                  {user.username || "utilisateur"}
                </button>
                {isFollowingUser(user.id) ? (
                  <button onClick={() => handleUnfollow(user.id)}
                    style={{ ...btnBase, padding: "5px 12px", fontSize: 11, backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#fca5a5" }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "var(--bg-card-2)"; e.currentTarget.style.color = "var(--text-muted)" }}
                  >ne plus suivre</button>
                ) : (
                  <button onClick={() => handleFollow(user.id)}
                    style={{ ...btnBase, padding: "5px 12px", fontSize: 11, backgroundColor: "#f3501e", color: "#ffffff" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                    onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
                  >+ suivre</button>
                )}
              </div>
            ))}
          </div>
        )}

        {searchResults.length === 0 && search && !loading && (
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-faint)", textAlign: "center", fontWeight: 500 }}>aucun utilisateur trouvé</p>
        )}
      </div>

      {/* Abonnements + Abonnés */}
      <div className="friends-grid">
        {[
          { title: "abonnements", count: following.length, list: following, idKey: "following_id", empty: "tu ne suis personne encore" },
          { title: "abonnés", count: followers.length, list: followers, idKey: "follower_id", empty: "personne ne te suit encore" },
        ].map(({ title, count, list, idKey, empty }) => (
          <div key={title} style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, padding: 16, border: "1px solid var(--border)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {title} · {count}
            </h2>
            {list.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-faint)", fontWeight: 500 }}>{empty}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.map(f => (
                  <div key={f[idKey]} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar url={f.profile?.avatar_url} size={30} />
                    <button
                      style={{ ...usernameBtn, fontSize: 12 }}
                      onClick={() => navigate(`/profile/${f.profile?.id}`)}
                      onMouseEnter={e => e.currentTarget.style.color = "#f3501e"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-main)"}
                    >
                      {f.profile?.username || "utilisateur"}
                    </button>
                    {title === "abonnements" && (
                      <button onClick={() => handleUnfollow(f[idKey])}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 18, lineHeight: 1, padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

const inputStyle = {
  width: "100%", borderRadius: 10, padding: "10px 14px",
  fontSize: 13, outline: "none",
  background: "#111111", border:"none",
  color: "#ffffff", fontFamily: "Poppins, sans-serif", fontWeight: 500,
  letterSpacing: "-0.05em", boxSizing: "border-box",
}

const btnBase = {
  fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13,
  letterSpacing: "-0.05em", border: "none", cursor: "pointer",
  borderRadius: 10, transition: "transform 0.2s ease",
}

function Avatar({ url, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: "#2d2d2d", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4 }}>
      {url ? <img src={url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
    </div>
  )
}

export default function Friends() {
  const navigate = useNavigate()
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

    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)

    const { data: followersData } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", user.id)

    if (followingData?.length > 0) {
      const ids = followingData.map(f => f.following_id)
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
      setFollowing(followingData.map(f => ({ ...f, profile: profiles?.find(p => p.id === f.following_id) })))
    } else {
      setFollowing([])
    }

    if (followersData?.length > 0) {
      const ids = followersData.map(f => f.follower_id)
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids)
      setFollowers(followersData.map(f => ({ ...f, profile: profiles?.find(p => p.id === f.follower_id) })))
    } else {
      setFollowers([])
    }
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${search}%`)
      .neq("id", currentUser.id)
      .limit(10)
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

  const isFollowing = (userId) => following.some(f => f.following_id === userId)

  const usernameStyle = {
    flex: 1, fontSize: 13, fontWeight: 700, color: "#ffffff",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    cursor: "pointer", transition: "color 0.12s",
    background: "none", border: "none", padding: 0, textAlign: "left",
    fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em",
  }

  return (
    <div style={{ padding: "20px 24px", backgroundColor: "#111111", minHeight: "100%", fontFamily: "Poppins, sans-serif" }}>

      {success && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, backgroundColor: "#34d399", color: "#064e3b", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          ✅ {success}
        </div>
      )}

      {/* HEADER */}
      <h1 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/icons/friends.png" alt="" style={{ width: 24, height: 24 }} onError={e => e.target.style.display="none"} />
        amis
      </h1>

      {/* RECHERCHE */}
      <div style={{ backgroundColor: "#091718", borderRadius: 12, padding: 16, border: "none", marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          rechercher des utilisateurs
        </h2>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={inputStyle}
            placeholder="rechercher par pseudo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch} disabled={loading}
            style={{ ...btnBase, padding: "10px 16px", backgroundColor: "#f3501e", color: "#ffffff", opacity: loading ? 0.5 : 1, whiteSpace: "nowrap" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "scale(1.03)" }}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
          >
            {loading ? "..." : "chercher"}
          </button>
        </div>

        {/* Résultats */}
        {searchResults.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map(user => (
              <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", backgroundColor: "#1a1a1a", borderRadius: 10 }}>
                <Avatar url={user.avatar_url} size={36} />
                <button
                  style={usernameStyle}
                  onClick={() => navigate(`/profile/${user.id}`)}
                  onMouseEnter={e => e.currentTarget.style.color = "#f3501e"}
                  onMouseLeave={e => e.currentTarget.style.color = "#ffffff"}
                >
                  {user.username || "utilisateur"}
                </button>
                {isFollowing(user.id) ? (
                  <button onClick={() => handleUnfollow(user.id)}
                    style={{ ...btnBase, padding: "5px 12px", fontSize: 11, backgroundColor: "#2d2d2d", color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#2d0a0a"; e.currentTarget.style.color = "#fca5a5" }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#2d2d2d"; e.currentTarget.style.color = "rgba(255,255,255,0.5)" }}
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
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", fontWeight: 500 }}>aucun utilisateur trouvé</p>
        )}
      </div>

      {/* ABONNEMENTS + ABONNÉS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Abonnements */}
        <div style={{ backgroundColor: "#091718", borderRadius: 12, padding: 16, border: "none" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            abonnements · {following.length}
          </h2>
          {following.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>tu ne suis personne encore</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {following.map(f => (
                <div key={f.following_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar url={f.profile?.avatar_url} size={30} />
                  <button
                    style={{ ...usernameStyle, fontSize: 12 }}
                    onClick={() => navigate(`/profile/${f.profile?.id}`)}
                    onMouseEnter={e => e.currentTarget.style.color = "#f3501e"}
                    onMouseLeave={e => e.currentTarget.style.color = "#ffffff"}
                  >
                    {f.profile?.username || "utilisateur"}
                  </button>
                  <button onClick={() => handleUnfollow(f.following_id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", fontSize: 18, lineHeight: 1, padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Abonnés */}
        <div style={{ backgroundColor: "#091718", borderRadius: 12, padding: 16, border: "none" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            abonnés · {followers.length}
          </h2>
          {followers.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>personne ne te suit encore</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {followers.map(f => (
                <div key={f.follower_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar url={f.profile?.avatar_url} size={30} />
                  <button
                    style={{ ...usernameStyle, fontSize: 12 }}
                    onClick={() => navigate(`/profile/${f.profile?.id}`)}
                    onMouseEnter={e => e.currentTarget.style.color = "#f3501e"}
                    onMouseLeave={e => e.currentTarget.style.color = "#ffffff"}
                  >
                    {f.profile?.username || "utilisateur"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
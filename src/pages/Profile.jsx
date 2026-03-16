import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../supabase"
import { TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_BORDER } from "../tags"

function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

export default function Profile() {
  const navigate = useNavigate()
  const { userId } = useParams()

  const [profile, setProfile] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [stats, setStats] = useState({ total: 0, public: 0, followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("public")
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => { fetchProfile() }, [userId])

  const fetchProfile = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user.id)

    const targetId = userId || user.id
    const own = targetId === user.id
    setIsOwnProfile(own)

    const [{ data: profileData }, { data: recipesData }, { count: followers }, { count: following }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetId).maybeSingle(),
      own
        ? supabase.from("recipes").select("*").eq("user_id", targetId).order("created_at", { ascending: false })
        : supabase.from("recipes").select("*").eq("user_id", targetId).eq("is_public", true).order("created_at", { ascending: false }),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", targetId),
    ])

    if (!own) {
      const { count: alreadyFollowing } = await supabase
        .from("follows").select("*", { count: "exact", head: true })
        .eq("follower_id", user.id).eq("following_id", targetId)
      setIsFollowing((alreadyFollowing || 0) > 0)
    }

    setProfile({ ...profileData, email: own ? user.email : null })
    setRecipes(recipesData || [])
    setStats({
      total: recipesData?.length || 0,
      public: own ? (recipesData?.filter(r => r.is_public).length || 0) : (recipesData?.length || 0),
      followers: followers || 0,
      following: following || 0,
    })
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!currentUserId || !userId) return
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", userId)
      setIsFollowing(false)
      setStats(s => ({ ...s, followers: s.followers - 1 }))
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: userId })
      setIsFollowing(true)
      setStats(s => ({ ...s, followers: s.followers + 1 }))
    }
    setFollowLoading(false)
  }

  const displayedRecipes = isOwnProfile && activeTab === "public"
    ? recipes.filter(r => r.is_public)
    : recipes

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", backgroundColor: "#111111" }}>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontFamily: "Poppins, sans-serif" }}>chargement...</span>
      </div>
    )
  }

  const tabStyle = (active) => ({
    flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700,
    fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em",
    border: "none", borderBottom: active ? "2px solid #f3501e" : "2px solid transparent",
    cursor: "pointer", backgroundColor: "transparent",
    color: active ? "#f3501e" : "rgba(255,255,255,0.35)",
    transition: "all 0.15s",
  })

  return (
    <div style={{ backgroundColor: "#111111", minHeight: "100%", fontFamily: "Poppins, sans-serif" }}>

      <div style={{ padding: "28px 24px 0" }}>

        {/* Bouton retour (profil d'un autre) */}
        {!isOwnProfile && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600,
              fontFamily: "Poppins, sans-serif", padding: 0, transition: "color 0.12s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
          >
            ← retour
          </button>
        )}

        {/* Avatar + action */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", overflow: "hidden", flexShrink: 0, backgroundColor: "#2d2d2d",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {profile?.avatar_url ? (
              <img src={`${profile.avatar_url}?t=${Date.now()}`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 32 }}>👤</span>
            )}
          </div>

          {isOwnProfile ? (
            <button
              onClick={() => navigate("/settings")}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 10, backgroundColor: "#2d2d2d",
                color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700,
                fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#f3501e"; e.currentTarget.style.color = "#f3501e" }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}
            >
              ✏️ modifier le profil
            </button>
          ) : (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              style={{
                padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em",
                cursor: "pointer", transition: "all 0.15s", border: "none",
                backgroundColor: isFollowing ? "#2d2d2d" : "#f3501e",
                color: isFollowing ? "rgba(255,255,255,0.6)" : "#ffffff",
                opacity: followLoading ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!followLoading) e.currentTarget.style.transform = "scale(1.03)" }}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {followLoading ? "..." : isFollowing ? "✓ abonné" : "+ suivre"}
            </button>
          )}
        </div>

        {/* Nom + email */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.05em" }}>
            {profile?.username || "utilisateur"}
          </h1>
          {isOwnProfile && profile?.email && (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{profile.email}</p>
          )}
        </div>

        {/* Préférences */}
        {profile?.preferences?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {profile.preferences.map(pref => {
              const tag = TAGS.find(t => t.value === pref || t.label === pref)
              return (
                <span key={pref} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                  backgroundColor: tag?.pillBg || "rgba(243,80,30,0.15)",
                  color: tag?.pillText || "#f3501e",
                }}>
                  {tag && <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 11, height: 11 }} onError={e => e.target.style.display = "none"} />}
                  {pref}
                </span>
              )
            })}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
          {[
            { value: stats.total, label: "recettes" },
            { value: stats.public, label: "publiques" },
            { value: stats.followers, label: "abonnés" },
            { value: stats.following, label: "abonnements" },
          ].map(({ value, label }) => (
            <div key={label} style={{
              backgroundColor: "#2d2d2d", borderRadius: 12, padding: "12px 8px",
              textAlign: "center", border: "1.5px solid rgba(255,255,255,0.05)",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: "-0.05em" }}>{value}</p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs (seulement son propre profil) */}
      {isOwnProfile && (
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 2, paddingLeft: 24, paddingRight: 24 }}>
          <button onClick={() => setActiveTab("public")} style={tabStyle(activeTab === "public")}>
            🌍 publiques ({stats.public})
          </button>
          <button onClick={() => setActiveTab("all")} style={tabStyle(activeTab === "all")}>
            📋 toutes ({stats.total})
          </button>
        </div>
      )}

      {/* Grille */}
      <div style={{ padding: "3px 3px 24px" }}>
        {displayedRecipes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🍽</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.3)", margin: 0 }}>
              {isOwnProfile
                ? activeTab === "public" ? "aucune recette publique — partage tes créations !" : "aucune recette pour l'instant"
                : "cet utilisateur n'a pas encore partagé de recettes"}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
            {displayedRecipes.map(recipe => {
              const primaryTagInfo = TAGS.find(t => t.value === recipe.primary_tag || t.key === recipe.primary_tag)
              const bg = primaryTagInfo?.cardBg || DEFAULT_CARD_BG

              return (
                <div
                  key={recipe.id}
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                  style={{ position: "relative", aspectRatio: "1 / 1", cursor: "pointer", overflow: "hidden", backgroundColor: bg }}
                >
                  {recipe.photo_url ? (
                    <img src={recipe.photo_url} alt={recipe.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s ease" }}
                      onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
                      onMouseLeave={e => e.target.style.transform = "scale(1)"}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, opacity: 0.25 }}>🍽</div>
                  )}

                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: "24px 8px 8px",
                    background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
                  }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#ffffff", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {recipe.name}
                    </p>
                    {recipe.prep_time && (
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.6)" }}>⏱ {recipe.prep_time}min</p>
                    )}
                  </div>

                  {isOwnProfile && !recipe.is_public && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      backgroundColor: "rgba(0,0,0,0.55)", borderRadius: "50%",
                      width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                    }}>🔒</div>
                  )}

                  {primaryTagInfo && (
                    <div style={{
                      position: "absolute", top: 6, left: 6,
                      backgroundColor: primaryTagInfo.pillBg, borderRadius: 6, padding: "2px 5px",
                      display: "flex", alignItems: "center", gap: 3,
                    }}>
                      <img src={`/icons/${primaryTagInfo.icon}.png`} alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display = "none"} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: primaryTagInfo.pillText }}>{primaryTagInfo.label}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
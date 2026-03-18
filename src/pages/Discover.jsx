import { TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_TEXT, DEFAULT_CARD_BORDER } from "../tags"
import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { findBestMatch, calcIngredientPrice, computeCostDetails } from "../utils/priceEngine"
import { useTheme } from "../context/ThemeContext"

function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

function TagPill({ tag, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 20, fontSize: 11,
        fontWeight: 700, fontFamily: "Poppins, sans-serif",
        border: "none", cursor: "pointer",
        backgroundColor: tag.pillBg,
        transition: "opacity 0.2s, transform 0.2s",
        opacity: active ? 1 : 0.7,
        transform: active ? "scale(1.06)" : "scale(1)",
        flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
      onMouseLeave={e => e.currentTarget.style.opacity = active ? "1" : "0.7"}
    >
      <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
      <span style={{ color: tag.pillText }}>{tag.label}</span>
    </button>
  )
}

export default function Discover() {
  const { isDay } = useTheme()

  const [recipes, setRecipes] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [bannedPopup, setBannedPopup] = useState(null)
  const [previewRecipe, setPreviewRecipe] = useState(null)
  const [previewIngredients, setPreviewIngredients] = useState([])
  const [previewSteps, setPreviewSteps] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => { fetchRecipes() }, [])

  const fetchRecipes = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { setLoading(false); return }
      setCurrentUser(user)

    // Première requête : recettes seulement — affichage immédiat
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("is_public", true)
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40)

    if (!data) { setLoading(false); return }

    // Afficher les cartes de suite sans les données enrichies
    setRecipes(data.map(r => ({ ...r, profiles: null, estimatedTotal: null })))
    setLoading(false)

    // Enrichissement en parallèle en arrière-plan
    const userIds = [...new Set(data.map(r => r.user_id))]
    const recipeIds = data.map(r => r.id)

    const [profilesRes, pricesRes, ingredientsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, avatar_url").in("id", userIds),
      supabase.from("ingredient_prices").select("name, price, unit"),
      supabase.from("ingredients").select("*").in("recipe_id", recipeIds),
    ])

    const profileMap = {}
    profilesRes.data?.forEach(p => { profileMap[p.id] = p })

    const recipesWithData = data.map(r => {
      const ings = ingredientsRes.data?.filter(i => i.recipe_id === r.id) || []
      const { total, details } = computeCostDetails(ings, pricesRes.data || [], r.servings)
      const hasAnyMatch = details.some(d => d.found)
      return { ...r, profiles: profileMap[r.user_id] || null, estimatedTotal: hasAnyMatch ? total : null }
    })

    setRecipes(recipesWithData)
    } catch (e) { console.error("fetchRecipes error:", e); setLoading(false) }
  }

  const checkBannedWords = async (textsToCheck) => {
    const { data: banned } = await supabase.from("banned_words").select("word")
    if (!banned) return null
    const fullText = textsToCheck.join(" ").toLowerCase()
    for (const { word } of banned) {
      if (new RegExp(`\\b${word.toLowerCase()}\\b`, "i").test(fullText)) return word
    }
    return null
  }

  const openPreview = async (recipe) => {
    setPreviewRecipe(recipe)
    setPreviewLoading(true)
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("recipe_id", recipe.id)
    const { data: steps } = await supabase.from("steps").select("*").eq("recipe_id", recipe.id).order("step_number")
    setPreviewIngredients(ingredients || [])
    setPreviewSteps(steps || [])
    setPreviewLoading(false)
  }

  const closePreview = () => { setPreviewRecipe(null); setPreviewIngredients([]); setPreviewSteps([]) }

  const handleAddToMyRecipes = async (recipe) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("recipe_id", recipe.id)
    const { data: steps } = await supabase.from("steps").select("*").eq("recipe_id", recipe.id).order("step_number")
    const found = await checkBannedWords([recipe.name, recipe.description||"", ...(ingredients||[]).map(i=>i.name), ...(steps||[]).map(s=>s.description)])
    if (found) { setBannedPopup(found); return }
    const { data: newRecipe, error } = await supabase.from("recipes").insert({
      user_id: user.id, name: recipe.name, description: recipe.description,
      prep_time: recipe.prep_time, servings: recipe.servings, tags: recipe.tags,
      is_public: false, photo_url: recipe.photo_url || null,
    }).select().single()
    if (error) { console.error(error); return }
    if (newRecipe) {
      if (ingredients?.length > 0) await supabase.from("ingredients").insert(ingredients.map(i => ({ recipe_id: newRecipe.id, name: i.name, quantity: i.quantity, unit: i.unit, calories: i.calories })))
      if (steps?.length > 0) await supabase.from("steps").insert(steps.map(s => ({ recipe_id: newRecipe.id, step_number: s.step_number, description: s.description })))
      setSuccess(`"${recipe.name}" ajoutée !`)
      setTimeout(() => setSuccess(""), 3000)
    }
  }

  const filteredRecipes = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || (r.tags && r.tags.includes(filter))
    return matchSearch && matchFilter
  })

  const btnBase = {
    fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12,
    letterSpacing: "-0.05em", border: "none", cursor: "pointer",
    borderRadius: 10, transition: "transform 0.15s",
  }


  return (
    <div style={{ padding: "20px 24px", backgroundColor: "var(--bg-main)", minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease" }}>

      {/* Popup mot banni */}
      {bannedPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 16, maxWidth: 360, width: "100%", overflow: "hidden", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ backgroundColor: "rgba(239,68,68,0.08)", padding: "28px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid rgba(239,68,68,0.12)" }}>
              <div style={{ width: 52, height: 52, backgroundColor: "var(--bg-card-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>importation bloquée</h2>
            </div>
            <div style={{ padding: "20px 24px 24px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>mot non autorisé :</p>
              <div style={{ display: "inline-block", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "6px 16px", borderRadius: 8, fontWeight: 700, marginBottom: 16 }}>« {bannedPopup} »</div>
              <button onClick={() => setBannedPopup(null)}
                style={{ ...btnBase, width: "100%", padding: "11px", backgroundColor: "#f87171", color: "#ffffff" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {success && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, backgroundColor: "#34d399", color: "#064e3b", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          ✅ {success}
        </div>
      )}

      {/* Modal preview */}
      {previewRecipe && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end" }} onClick={closePreview}>
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            {/* Handle mobile */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, backgroundColor: "var(--border-2)", borderRadius: 2 }} />
            </div>
            <div style={{ padding: "12px 20px 32px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.04em" }}>{previewRecipe.name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", overflow: "hidden", backgroundColor: "rgba(243,80,30,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {previewRecipe.profiles?.avatar_url
                        ? <img src={previewRecipe.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        : <span style={{ fontSize: 10 }}>👤</span>}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{previewRecipe.profiles?.username || "Utilisateur"}</span>
                  </div>
                </div>
                <button onClick={closePreview}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
              </div>

              {previewRecipe.description && <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{previewRecipe.description}</p>}

              {/* Meta */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {previewRecipe.prep_time && <span style={{ fontSize: 11, color: "var(--text-muted)", backgroundColor: "var(--bg-card-2)", padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>⏱ {previewRecipe.prep_time} min</span>}
                {previewRecipe.servings && <span style={{ fontSize: 11, color: "var(--text-muted)", backgroundColor: "var(--bg-card-2)", padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>🍽 {previewRecipe.servings} pers.</span>}
                {previewRecipe.estimatedTotal !== null && <span style={{ fontSize: 11, color: "#34d399", backgroundColor: "rgba(52,211,153,0.1)", padding: "4px 10px", borderRadius: 20, fontWeight: 700 }}>💰 {previewRecipe.estimatedTotal.toFixed(2)}€</span>}
              </div>

              {/* Tags */}
              {previewRecipe.tags?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {previewRecipe.tags.map(tv => {
                    const t = TAGS.find(t => t.value === tv)
                    return t ? (
                      <span key={tv} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 700, backgroundColor: t.pillBg, color: t.pillText }}>
                        <img src={`/icons/${t.icon}.png`} alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display = "none"} />
                        {t.label}
                      </span>
                    ) : null
                  })}
                </div>
              )}

              {previewLoading ? (
                <p style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center", padding: "24px 0" }}>chargement...</p>
              ) : (
                <>
                  {previewIngredients.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>🛒 ingrédients</h3>
                      {previewIngredients.map((ing, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < previewIngredients.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <span style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 500 }}>{ing.name}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 12, flexShrink: 0 }}>{ing.quantity} {ing.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {previewSteps.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>👨‍🍳 préparation</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {previewSteps.map((step, i) => (
                          <div key={i} style={{ display: "flex", gap: 12 }}>
                            <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", backgroundColor: "rgba(243,80,30,0.12)", color: "#f3501e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, marginTop: 1 }}>{i + 1}</div>
                            <p style={{ margin: 0, fontSize: 13, color: "var(--text-main)", lineHeight: 1.6, fontWeight: 500 }}>{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)", marginTop: 8 }}>
                <button onClick={() => { handleAddToMyRecipes(previewRecipe); closePreview() }}
                  style={{ ...btnBase, flex: 1, padding: "12px", backgroundColor: "#f3501e", color: "#ffffff" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >+ ajouter à mes recettes</button>
                <button onClick={closePreview}
                  style={{ ...btnBase, flex: 1, padding: "12px", backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.05em" }}>
          <img src="/icons/spark.png" alt="" style={{ width: 22, height: 22 }} />
          découvrir
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>recettes partagées par la communauté</p>
      </div>

      {/* Recherche */}
      <div style={{ marginBottom: 14, position: "relative", maxWidth: 400 }}>
        <img src="/icons/loupe.png" alt="" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, pointerEvents: "none" }} />
        <input
          style={{ width: "100%", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px 9px 36px", fontSize: 13, color: "var(--text-main)", outline: "none", fontFamily: "Poppins, sans-serif", fontWeight: 500, letterSpacing: "-0.05em", boxSizing: "border-box", transition: "border-color 0.15s" }}
          placeholder="rechercher une recette..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={e => e.target.style.borderColor = "#f3501e"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        />
      </div>

      {/* Filtres */}
      <style>{`
        .filters-desktop { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; align-items: center; }
        .filters-mobile  { display: flex; gap: 6px; margin-bottom: 20px; align-items: center; overflow-x: auto; padding-bottom: 4px; }
        @media (min-width: 768px) { .filters-mobile { display: none; } }
        @media (max-width: 767px) { .filters-desktop { display: none; } }
      `}</style>

      {/* Desktop : tous les tags visibles, pas de voir plus */}
      <div className="filters-desktop">
        <button onClick={() => setFilter(filter === "all" ? "" : "all")}
          style={{
            ...btnBase, display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 20, fontSize: 11,
            backgroundColor: "#fe7c3e", color: "#510312", flexShrink: 0,
            opacity: filter !== "" && filter !== "all" ? 0.35 : 1,
            transform: filter === "all" || filter === "" ? "scale(1)" : "scale(1)",
            transition: "opacity 0.2s, transform 0.2s",
          }}
        >
          <img src="/icons/book.png" alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
          toutes
        </button>
        {TAGS.map(tag => {
          const isActive = filter === tag.value
          const anyActive = filter !== "" && filter !== "all"
          return (
            <button key={tag.value}
              onClick={() => setFilter(isActive ? "all" : tag.value)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20, fontSize: 11,
                fontWeight: 700, fontFamily: "Poppins, sans-serif",
                border: "none", cursor: "pointer", flexShrink: 0,
                backgroundColor: tag.pillBg,
                opacity: anyActive && !isActive ? 0.35 : 1,
                transform: isActive ? "scale(1.08)" : "scale(1)",
                boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.25)" : "none",
                transition: "opacity 0.2s, transform 0.2s, box-shadow 0.2s",
              }}
            >
              <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
              <span style={{ color: tag.pillText }}>{tag.label}</span>
            </button>
          )
        })}
      </div>

      {/* Mobile : scroll horizontal avec voir plus */}
      <div className="filters-mobile">
        <button onClick={() => setFilter(filter === "all" ? "" : "all")}
          style={{
            ...btnBase, display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 20, fontSize: 11,
            backgroundColor: "#fe7c3e", color: "#510312", flexShrink: 0,
            opacity: filter !== "" && filter !== "all" ? 0.35 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <img src="/icons/book.png" alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
          toutes
        </button>
        {TAGS.map(tag => {
          const isActive = filter === tag.value
          const anyActive = filter !== "" && filter !== "all"
          return (
            <button key={tag.value}
              onClick={() => setFilter(isActive ? "all" : tag.value)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20, fontSize: 11,
                fontWeight: 700, fontFamily: "Poppins, sans-serif",
                border: "none", cursor: "pointer", flexShrink: 0,
                backgroundColor: tag.pillBg,
                opacity: anyActive && !isActive ? 0.35 : 1,
                transform: isActive ? "scale(1.08)" : "scale(1)",
                transition: "opacity 0.2s, transform 0.2s",
              }}
            >
              <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
              <span style={{ color: tag.pillText }}>{tag.label}</span>
            </button>
          )
        })}
      </div>

      {/* Grille */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: "hidden", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div style={{ width: "100%", aspectRatio: "4/3", backgroundColor: "var(--bg-card-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ padding: "10px 12px 14px" }}>
                <div style={{ height: 10, borderRadius: 6, backgroundColor: "var(--bg-card-2)", marginBottom: 8, width: "75%", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 8, borderRadius: 6, backgroundColor: "var(--bg-card-2)", marginBottom: 8, width: "50%", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <div style={{ flex: 1, height: 28, borderRadius: 8, backgroundColor: "var(--bg-card-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ flex: 1, height: 28, borderRadius: 8, backgroundColor: "var(--bg-card-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            </div>
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, padding: "32px 24px", textAlign: "center", maxWidth: 400, border: "1px solid var(--border)" }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-main)", fontWeight: 700 }}>aucune recette publique</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>partage tes recettes pour qu'elles apparaissent ici !</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {filteredRecipes.map(recipe => {
            const primaryTag = TAGS.find(t => t.value === recipe.primary_tag)
            const bg = primaryTag?.cardBg || DEFAULT_CARD_BG
            const border = primaryTag?.cardBorder || DEFAULT_CARD_BORDER
            const textColor = getTextColor(bg)
            const overlayBg = textColor === "#ffffff" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.22)"

            return (
              <div key={recipe.id}
                style={{ backgroundColor: bg, border: `2px solid ${border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", display: "flex", flexDirection: "column" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)" }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
              >
                {recipe.photo_url ? (
                  <img src={recipe.photo_url} alt={recipe.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.2, backgroundColor: bg }}>🍽</div>
                )}

                <div style={{ padding: "8px 12px 12px", color: textColor, flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Auteur */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", overflow: "hidden", backgroundColor: overlayBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {recipe.profiles?.avatar_url
                        ? <img src={recipe.profiles.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 9 }}>👤</span>}
                    </div>
                    <span style={{ fontSize: 10, opacity: 0.65, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipe.profiles?.username || "Utilisateur"}</span>
                  </div>

                  <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", letterSpacing: "-0.04em" }}>
                    {recipe.name}
                  </h3>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 6, opacity: 0.7 }}>
                    {recipe.prep_time && <span>⏱ {recipe.prep_time}min</span>}
                    {recipe.servings && <span>🍽 {recipe.servings}p</span>}
                    {recipe.estimatedTotal !== null && <span style={{ color: "#34d399", opacity: 1, fontWeight: 700 }}>💰 {recipe.estimatedTotal.toFixed(2)}€</span>}
                  </div>

                  {recipe.tags?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {recipe.tags.slice(0, 2).map(tv => {
                        const t = TAGS.find(t => t.value === tv)
                        return (
                          <span key={tv} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 700, backgroundColor: overlayBg, color: textColor }}>
                            {t && <img src={`/icons/${t.icon}.png`} alt="" style={{ width: 9, height: 9 }} onError={e => e.target.style.display = "none"} />}
                            {t?.label || tv}
                          </span>
                        )
                      })}
                      {recipe.tags.length > 2 && <span style={{ fontSize: 10, opacity: 0.5, fontWeight: 700 }}>+{recipe.tags.length - 2}</span>}
                    </div>
                  )}

                  {/* Boutons */}
                  <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 4 }}>
                    <button onClick={() => openPreview(recipe)}
                      style={{ ...btnBase, flex: 1, padding: "7px", backgroundColor: overlayBg, color: textColor, fontSize: 11 }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >voir +</button>
                    <button onClick={() => handleAddToMyRecipes(recipe)}
                      style={{ ...btnBase, flex: 1, padding: "7px", backgroundColor: "#f3501e", color: "#ffffff", fontSize: 11 }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >+ ajouter</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
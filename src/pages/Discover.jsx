import { TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_TEXT, DEFAULT_CARD_BORDER } from "../tags"
import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { computeCostDetails } from "../utils/priceEngine"
import { useTheme } from "../context/ThemeContext"

function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

function OfficialBadge({ small = false }) {
  return (
    <img
      src="/icons/badge.png"
      alt="Compte officiel Shrimply"
      title="Compte officiel Shrimply"
      style={{
        width: small ? 16 : 18,
        height: small ? 16 : 18,
        verticalAlign: "middle",
        flexShrink: 0,
        objectFit: "contain",
      }}
    />
  )
}

const S = {
  btn: {
    fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12,
    letterSpacing: "-0.05em", border: "none", cursor: "pointer",
    borderRadius: 10, transition: "transform 0.15s, opacity 0.15s"
  },
  pill: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "4px 10px", borderRadius: 40,
    fontSize: 11, fontWeight: 700,
    fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em",
    border: "1.5px solid transparent",
    lineHeight: 1.2,
  },
}

function formatQuantity(value) {
  if (value === null || value === undefined || value === "") return ""
  const num = parseFloat(value)
  if (isNaN(num)) return value
  if (num < 10) return (Math.round(num * 10) / 10).toString().replace(".", ",")
  return Math.round(num).toString()
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
  const [checkedSteps, setCheckedSteps] = useState({})

  useEffect(() => { fetchRecipes() }, [])

  const fetchRecipes = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { setLoading(false); return }
      setCurrentUser(user)

      const { data } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_public", true)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40)

      if (!data) { setLoading(false); return }

      setRecipes(data.map(r => ({ ...r, profiles: null, estimatedTotal: null })))
      setLoading(false)

      const userIds = [...new Set(data.map(r => r.user_id))]
      const recipeIds = data.map(r => r.id)

      const [profilesRes, pricesRes, ingredientsRes] = await Promise.all([
        supabase.from("profiles").select("id, username, avatar_url, is_official").in("id", userIds),
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
    setCheckedSteps({})
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("recipe_id", recipe.id)
    const { data: steps } = await supabase.from("steps").select("*").eq("recipe_id", recipe.id).order("step_number")
    setPreviewIngredients(ingredients || [])
    setPreviewSteps(steps || [])
    setPreviewLoading(false)
  }

  const closePreview = () => {
    setPreviewRecipe(null)
    setPreviewIngredients([])
    setPreviewSteps([])
    setCheckedSteps({})
  }

  const handleAddToMyRecipes = async (recipe) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("recipe_id", recipe.id)
    const { data: steps } = await supabase.from("steps").select("*").eq("recipe_id", recipe.id).order("step_number")
    const found = await checkBannedWords([recipe.name, recipe.description||"", ...(ingredients||[]).map(i=>i.name), ...(steps||[]).map(s=>s.description)])
    if (found) { setBannedPopup(found); return }
    const { data: newRecipe, error } = await supabase.from("recipes").insert({
      user_id: user.id, name: recipe.name, description: recipe.description,
      prep_time: recipe.prep_time, servings: recipe.servings, tags: recipe.tags,
      primary_tag: recipe.primary_tag || null,
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

      {/* ── MODAL PREVIEW style RecipeDetails ── */}
      {previewRecipe && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end" }}
          onClick={closePreview}
        >
          <div
            style={{ backgroundColor: "var(--bg-main)", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "94vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px" }}>
              <div style={{ width: 36, height: 4, backgroundColor: "var(--border-2)", borderRadius: 2 }} />
            </div>

            <div style={{ padding: "0 16px 32px" }}>

              {/* ── HERO CARD ── */}
              <style>{`
                .discover-hero {
                  display: flex; align-items: stretch;
                  background: var(--bg-card); border: 1px solid var(--border);
                  border-radius: 14px; overflow: hidden; margin-bottom: 12px;
                  height: 220px;
                }
                .discover-hero-photo { width: 45%; flex-shrink: 0; object-fit: cover; display: block; height: 100%; }
                .discover-hero-placeholder { width: 45%; flex-shrink: 0; height: 100%; background: var(--bg-card-2); display: flex; align-items: center; justify-content: center; font-size: 52px; opacity: 0.12; }
                .discover-hero-right { flex: 1; min-width: 0; padding: 16px 18px; display: flex; flex-direction: column; justify-content: space-between; }
                .discover-budget-bar { display: flex; align-items: center; gap: 8px; background: var(--bg-card-2); border-radius: 40px; padding: 7px 12px; flex-wrap: wrap; }
                .discover-budget-chip { display: flex; align-items: center; gap: 6px; background: ${isDay ? "#E8E1D5" : "rgba(255,255,255,0.1)"}; border-radius: 40px; padding: 5px 12px; }
                @media (max-width: 560px) {
                  .discover-hero { height: auto; flex-direction: column; }
                  .discover-hero-photo { width: 100%; height: 200px; }
                  .discover-hero-placeholder { width: 100%; height: 140px; }
                  .discover-budget-bar { border-radius: 12px; }
                }
              `}</style>

              <div className="discover-hero">
                {previewRecipe.photo_url
                  ? <img src={previewRecipe.photo_url} alt={previewRecipe.name} className="discover-hero-photo" />
                  : <div className="discover-hero-placeholder">🍽</div>
                }

                <div className="discover-hero-right">
                  <div>
                    {/* Titre + close */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-main)", lineHeight: 1.2, letterSpacing: "-0.05em", flex: 1, minWidth: 0 }}>
                        {previewRecipe.name}
                      </h2>
                      <button onClick={closePreview}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 2, flexShrink: 0 }}>✕</button>
                    </div>

                    {/* Description */}
                    {previewRecipe.description && (
                      <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45, fontWeight: 400, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {previewRecipe.description}
                      </p>
                    )}

                    {/* Auteur */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", overflow: "hidden", backgroundColor: "rgba(243,80,30,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {previewRecipe.profiles?.avatar_url
                          ? <img src={previewRecipe.profiles.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                          : <span style={{ fontSize: 9 }}>👤</span>}
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                        {previewRecipe.profiles?.username || "Utilisateur"}
                      </span>
                      {previewRecipe.profiles?.is_official && <OfficialBadge small />}
                    </div>

                    {/* Pills : note, temps, tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
                      {previewRecipe.rating > 0 && (
                        <span style={{ ...S.pill, backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--border)", color: "var(--text-main)" }}>
                          ★ {previewRecipe.rating},0
                        </span>
                      )}
                      {previewRecipe.prep_time && (
                        <span style={{ ...S.pill, backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                          ⏱ {previewRecipe.prep_time} min
                        </span>
                      )}
                      {[...new Set([previewRecipe.primary_tag, ...(previewRecipe.tags || [])])].filter(Boolean).slice(0, 3).map(tv => {
                        const ti = TAGS.find(t => t.value === tv)
                        return ti ? (
                          <span key={tv} style={{ ...S.pill, backgroundColor: ti.pillBg, color: ti.pillText }}>
                            <img src={`/icons/${ti.icon}.png`} alt="" style={{ width: 11, height: 11 }} onError={e => e.target.style.display = "none"} />
                            {ti.label}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>

                  {/* Budget bar + bouton ajouter inline */}
                  <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                    <div className="discover-budget-bar" style={{ flex: 1, borderRadius: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <img src="/icons/money.png" alt="" style={{ width: 16, height: 16 }} onError={e => e.target.style.display = "none"} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-main)", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em" }}>budget</span>
                      </div>
                      {previewRecipe.estimatedTotal != null ? (
                        <>
                          <div className="discover-budget-chip" style={{ borderRadius: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#22C55E", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em" }}>{previewRecipe.estimatedTotal.toFixed(2)}€</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "Poppins, sans-serif" }}>total</span>
                          </div>
                          {previewRecipe.servings > 0 && (
                            <div className="discover-budget-chip" style={{ borderRadius: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#22C55E", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em" }}>{(previewRecipe.estimatedTotal / previewRecipe.servings).toFixed(2)}€</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "Poppins, sans-serif" }}>/personne</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "Poppins, sans-serif", fontStyle: "italic" }}>non estimé</span>
                      )}
                    </div>
                    <button
                      onClick={() => { handleAddToMyRecipes(previewRecipe); closePreview() }}
                      style={{ ...S.btn, padding: "0 16px", fontSize: 12, backgroundColor: "#f3501e", color: "#ffffff", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0, alignSelf: "stretch" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >+ ajouter à mes recettes</button>
                  </div>
                </div>
              </div>

              {/* ── GRILLE ingrédients / préparation ── */}
              {previewLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "var(--text-faint)", fontFamily: "Poppins, sans-serif" }}>chargement...</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>

                  {/* Ingrédients */}
                  {previewIngredients.length > 0 && (
                    <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <img src="/icons/cart.png" alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display = "none"} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "Poppins, sans-serif" }}>ingrédients</span>
                        </div>
                        {previewRecipe.servings && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", fontFamily: "Poppins, sans-serif" }}>
                            {previewRecipe.servings} pers.
                          </span>
                        )}
                      </div>
                      {previewIngredients.map((ing, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderBottom: i < previewIngredients.length - 1 ? "1px solid var(--border)" : "none" }}>
                          <span style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 500 }}>{ing.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginLeft: 12, flexShrink: 0 }}>
                            {formatQuantity(ing.quantity)} {ing.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Préparation */}
                  {previewSteps.length > 0 && (
                    <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                        <img src="/icons/chef.png" alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display = "none"} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "Poppins, sans-serif" }}>préparation</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {previewSteps.map((step, i) => (
                          <div key={i}
                            onClick={() => setCheckedSteps(prev => ({ ...prev, [i]: !prev[i] }))}
                            style={{ display: "flex", gap: 12, cursor: "pointer", opacity: checkedSteps[i] ? 0.35 : 1, transition: "opacity 0.2s" }}
                          >
                            <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, marginTop: 1, backgroundColor: checkedSteps[i] ? "#22C55E" : "var(--bg-card-2)", color: checkedSteps[i] ? "#fff" : "var(--text-muted)", transition: "all 0.2s" }}>
                              {checkedSteps[i] ? "✓" : i + 1}
                            </div>
                            <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.6, color: "var(--text-main)", fontWeight: 500, textDecoration: checkedSteps[i] ? "line-through" : "none" }}>
                              {step.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
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

      <div className="filters-desktop">
        <button onClick={() => setFilter(filter === "all" ? "" : "all")}
          style={{ ...btnBase, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, fontSize: 11, backgroundColor: "#fe7c3e", color: "#510312", flexShrink: 0, opacity: filter !== "" && filter !== "all" ? 0.35 : 1, transition: "opacity 0.2s, transform 0.2s" }}
        >
          <img src="/icons/book.png" alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
          toutes
        </button>
        {TAGS.map(tag => {
          const isActive = filter === tag.value
          const anyActive = filter !== "" && filter !== "all"
          return (
            <button key={tag.value} onClick={() => setFilter(isActive ? "all" : tag.value)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "Poppins, sans-serif", border: "none", cursor: "pointer", flexShrink: 0, backgroundColor: tag.pillBg, opacity: anyActive && !isActive ? 0.35 : 1, transform: isActive ? "scale(1.08)" : "scale(1)", boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.25)" : "none", transition: "opacity 0.2s, transform 0.2s, box-shadow 0.2s" }}
            >
              <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
              <span style={{ color: tag.pillText }}>{tag.label}</span>
            </button>
          )
        })}
      </div>

      <div className="filters-mobile">
        <button onClick={() => setFilter(filter === "all" ? "" : "all")}
          style={{ ...btnBase, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, fontSize: 11, backgroundColor: "#fe7c3e", color: "#510312", flexShrink: 0, opacity: filter !== "" && filter !== "all" ? 0.35 : 1, transition: "opacity 0.2s" }}
        >
          <img src="/icons/book.png" alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
          toutes
        </button>
        {TAGS.map(tag => {
          const isActive = filter === tag.value
          const anyActive = filter !== "" && filter !== "all"
          return (
            <button key={tag.value} onClick={() => setFilter(isActive ? "all" : tag.value)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "Poppins, sans-serif", border: "none", cursor: "pointer", flexShrink: 0, backgroundColor: tag.pillBg, opacity: anyActive && !isActive ? 0.35 : 1, transform: isActive ? "scale(1.08)" : "scale(1)", transition: "opacity 0.2s, transform 0.2s" }}
            >
              <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 13, height: 13 }} onError={e => e.target.style.display = "none"} />
              <span style={{ color: tag.pillText }}>{tag.label}</span>
            </button>
          )
        })}
      </div>

      {/* Grille */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: "hidden", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div style={{ width: "100%", aspectRatio: "4/3", backgroundColor: "var(--bg-card-2)", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ padding: "10px 12px 14px" }}>
                <div style={{ height: 10, borderRadius: 6, backgroundColor: "var(--bg-card-2)", marginBottom: 8, width: "75%", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 8, borderRadius: 6, backgroundColor: "var(--bg-card-2)", marginBottom: 8, width: "50%", animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 28, borderRadius: 8, backgroundColor: "var(--bg-card-2)", marginTop: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {filteredRecipes.map(recipe => {
            const primaryTag = TAGS.find(t => t.value === recipe.primary_tag)
            const bg = primaryTag?.cardBg || DEFAULT_CARD_BG
            const border = primaryTag?.cardBorder || DEFAULT_CARD_BORDER
            const textColor = primaryTag?.cardText || getTextColor(bg)
            const actionBg = primaryTag?.actionBg || (textColor === "#ffffff" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)")
            const actionText = getTextColor(actionBg) === "#111111" ? "#111111" : "#ffffff"

            const allTagValues = [...new Set([recipe.primary_tag, ...(recipe.tags || [])])].filter(Boolean)
            const validTags = allTagValues.map(tv => TAGS.find(t => t.value === tv)).filter(Boolean)

            return (
              <div key={recipe.id}
                onClick={() => openPreview(recipe)}
                style={{ backgroundColor: bg, border: `2px solid ${border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", display: "flex", flexDirection: "column" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)" }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
              >
                {recipe.photo_url ? (
                  <img src={recipe.photo_url} alt={recipe.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.2, backgroundColor: bg }}>🍽</div>
                )}

                <div style={{ padding: "8px 12px 12px", color: textColor, flex: 1, display: "flex", flexDirection: "column" }}>

                  {/* Auteur + badge officiel */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5, flexWrap: "nowrap", overflow: "hidden" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", overflow: "hidden", backgroundColor: actionBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {recipe.profiles?.avatar_url
                        ? <img src={recipe.profiles.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 9 }}>👤</span>}
                    </div>
                    <span style={{ fontSize: 10, color: textColor, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                      {recipe.profiles?.username || "Utilisateur"}
                    </span>
                    {recipe.profiles?.is_official && <OfficialBadge small />}
                  </div>

                  <h3 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 800, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", letterSpacing: "-0.04em", color: textColor }}>
                    {recipe.name}
                  </h3>

                  {/* Meta */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7, flexWrap: "wrap", fontSize: 11, color: textColor }}>
                    {recipe.prep_time && <span style={{ opacity: 0.75 }}>⏱ {recipe.prep_time}min</span>}
                    {recipe.servings && <span style={{ opacity: 0.75 }}>🍽 {recipe.servings}p</span>}
                    {recipe.estimatedTotal !== null && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 700, backgroundColor: actionBg, color: actionText }}>
                        <img src="/icons/money.png" alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display = "none"} />
                        {recipe.estimatedTotal.toFixed(2)}€
                      </span>
                    )}
                    {recipe.rating > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 700, backgroundColor: actionBg, color: actionText }}>
                        ★ {recipe.rating},0
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {validTags.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, flexWrap: "nowrap" }}>
                      {validTags.slice(0, 2).map(ti => (
                        <span key={ti.value} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 700, backgroundColor: ti.pillBg, color: ti.pillText, flexShrink: 0 }}>
                          <img src={`/icons/${ti.icon}.png`} alt="" style={{ width: 9, height: 9 }} onError={e => e.target.style.display = "none"} />
                          {ti.label}
                        </span>
                      ))}
                      {validTags.length > 2 && (
                        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.querySelector(".tag-tooltip").style.display = "flex"}
                          onMouseLeave={e => e.currentTarget.querySelector(".tag-tooltip").style.display = "none"}
                        >
                          <span style={{ fontSize: 10, fontWeight: 700, color: textColor, opacity: 0.6, cursor: "default" }}>+{validTags.length - 2}</span>
                          <div className="tag-tooltip" style={{ display: "none", position: "absolute", bottom: "calc(100% + 6px)", left: 0, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px", gap: 4, flexDirection: "column", zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", minWidth: 120 }}>
                            {validTags.slice(2).map(ti => (
                              <span key={ti.value} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 700, backgroundColor: ti.pillBg, color: ti.pillText, whiteSpace: "nowrap" }}>
                                <img src={`/icons/${ti.icon}.png`} alt="" style={{ width: 9, height: 9 }} onError={e => e.target.style.display = "none"} />
                                {ti.label}
                              </span>
                            ))}
                          </div>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bouton ajouter uniquement */}
                  <div style={{ marginTop: "auto", paddingTop: 4 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddToMyRecipes(recipe) }}
                      style={{ ...btnBase, width: "100%", padding: "7px", backgroundColor: actionBg, color: actionText, fontSize: 11, fontWeight: 800 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
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
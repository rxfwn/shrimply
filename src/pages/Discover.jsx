import { TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_TEXT, DEFAULT_CARD_BORDER, FILTER_ALL_BG, FILTER_ALL_TEXT } from "../tags"
import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { findBestMatch, calcIngredientPrice, computeCostDetails } from "../utils/priceEngine"

const DEFAULT_CARD_COLOR = DEFAULT_CARD_BG

function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

// ── Tag pill ─────────────────────────────────────────────────────────────────
function TagPill({ tag, active, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center rounded-full font-semibold transition-colors px-3 py-1.5 text-xs gap-1.5"
      style={{
        backgroundColor: tag.pillBg,
      }}
    >
      <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 14, height: 14, filter: "none", opacity: 1 }} onError={e => { e.target.style.display = "none" }} />
      <span style={{ color: tag.pillText, fontFamily: "inherit", fontWeight: "inherit" }}>{tag.label}</span>
    </button>
  )
}

export default function Discover() {
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
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    const { data } = await supabase.from("recipes").select("*").eq("is_public", true).neq("user_id", user.id).order("created_at", { ascending: false })
    if (data) {
      const userIds = [...new Set(data.map(r => r.user_id))]
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
      const profileMap = {}
      profiles?.forEach(p => { profileMap[p.id] = p })
      const { data: prices } = await supabase.from("ingredient_prices").select("name, price, unit")
      const recipeIds = data.map(r => r.id)
      const { data: allIngredients } = await supabase.from("ingredients").select("*").in("recipe_id", recipeIds)
      const recipesWithData = data.map(r => {
        const ings = allIngredients?.filter(i => i.recipe_id === r.id) || []
        const { total, details } = computeCostDetails(ings, prices || [], r.servings)
        const hasAnyMatch = details.some(d => d.found)
        return { ...r, profiles: profileMap[r.user_id] || null, estimatedTotal: hasAnyMatch ? total : null }
      })
      setRecipes(recipesWithData)
    }
    setLoading(false)
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

  return (
    <div className="p-4 md:p-6">

      {/* Popup mot banni */}
      {bannedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-[10px] p-6 shadow-2xl max-w-sm w-full border border-red-800 text-center" style={{ backgroundColor: "#2d2d2d" }}>
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-white mb-2">Importation bloquée</h2>
            <p className="text-sm text-white/50 mb-1">Mot non autorisé détecté :</p>
            <p className="text-sm font-bold text-red-400 bg-red-900/20 px-3 py-1.5 rounded-[10px] mb-4 inline-block">« {bannedPopup} »</p>
            <p className="text-xs text-white/30 mb-5">Tu ne peux pas ajouter cette recette.</p>
            <button onClick={() => setBannedPopup(null)} className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-[10px] text-sm font-semibold transition">Fermer</button>
          </div>
        </div>
      )}

      {/* Toast succès */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-[10px] shadow-lg text-sm font-medium">
          ✅ {success}
        </div>
      )}

      {/* Modal preview */}
      {previewRecipe && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60" onClick={closePreview}>
          <div className="rounded-t-2xl md:rounded-[10px] shadow-2xl w-full md:max-w-lg md:mx-4 border border-white/10 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#1a1a1f" }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="p-5 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-3">
                  <h2 className="text-lg font-bold text-white leading-tight">{previewRecipe.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#f3501e33" }}>
                      {previewRecipe.profiles?.avatar_url ? <img src={previewRecipe.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-xs">👤</span>}
                    </div>
                    <span className="text-xs text-white/40">{previewRecipe.profiles?.username || "Utilisateur"}</span>
                  </div>
                </div>
                <button onClick={closePreview} className="text-white/40 hover:text-white text-xl font-bold leading-none p-1">✕</button>
              </div>
              {previewRecipe.description && <p className="text-sm text-white/50 mb-4">{previewRecipe.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-white/40 mb-3">
                {previewRecipe.prep_time && <span>⏱ {previewRecipe.prep_time} min</span>}
                {previewRecipe.servings && <span>🍽 {previewRecipe.servings} portions</span>}
                {previewRecipe.estimatedTotal !== null && <span className="text-green-400 font-semibold">💰 {previewRecipe.estimatedTotal.toFixed(2)}€</span>}
              </div>
              {previewRecipe.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-5">
                  {previewRecipe.tags.map(tv => {
                    const t = TAGS.find(t => t.value === tv)
                    return t ? (
                      <span key={tv} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: t.pillBg }}>
                        <img src={`/icons/${t.icon}.png`} alt="" style={{ width: 10, height: 10 }} onError={e => { e.target.style.display = "none" }} />
                        <span style={{ color: t.pillText }}>{t.label}</span>
                      </span>
                    ) : <span key={tv} className="text-xs text-white/50 px-2 py-0.5 rounded-full border border-white/10">{tv}</span>
                  })}
                </div>
              )}
              {previewLoading ? <p className="text-sm text-white/40 text-center py-6">Chargement...</p> : (
                <>
                  {previewIngredients.length > 0 && (
                    <div className="mb-5">
                      <h3 className="font-bold text-white text-sm mb-2">🛒 Ingrédients</h3>
                      <div className="flex flex-col">
                        {previewIngredients.map((ing, i) => (
                          <div key={i} className="flex justify-between text-sm py-2.5 border-b border-white/5 last:border-0">
                            <span className="text-white/70">{ing.name}</span>
                            <span className="text-white/40 ml-3 flex-shrink-0">{ing.quantity} {ing.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {previewSteps.length > 0 && (
                    <div className="mb-5">
                      <h3 className="font-bold text-white text-sm mb-3">👨‍🍳 Préparation</h3>
                      <div className="space-y-3">
                        {previewSteps.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="font-black text-sm w-5 flex-shrink-0" style={{ color: "#f3501e" }}>{i + 1}.</span>
                            <p className="text-sm text-white/70 leading-relaxed">{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-2 pt-4 border-t border-white/10">
                <button onClick={() => { handleAddToMyRecipes(previewRecipe); closePreview() }}
                  className="flex-1 text-white py-3 rounded-[10px] text-sm font-semibold transition" style={{ backgroundColor: "#f3501e" }}>
                  + Ajouter à mes recettes
                </button>
                <button onClick={closePreview}
                  className="flex-1 text-white/70 hover:text-white py-3 rounded-[10px] text-sm font-medium transition" style={{ backgroundColor: "#2d2d2d" }}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white mb-1">✨ Découvrir</h1>
        <p className="text-sm text-white/40">Recettes partagées par la communauté</p>
      </div>

      {/* Recherche */}
      <div className="mb-4">
        <input
          className="w-full md:max-w-md rounded-[10px] px-4 py-2.5 text-sm outline-none transition text-white"
          style={{ backgroundColor: "#2d2d2d", border: "1px solid rgba(255,255,255,0.1)" }}
          placeholder="🔍 Rechercher une recette..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filtres */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible">
          {/* Toutes */}
          <button onClick={() => setFilter("all")}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              backgroundColor: "#e8402a",
              color: "#ffffff",
              outline: filter === "all" ? "2px solid #ffffff" : "2px solid transparent",
              outlineOffset: "2px",
              boxShadow: filter === "all" ? "0 0 0 1px #e8402a" : "none",
            }}>
            <img src="/icons/book.png" alt="" style={{ width: 14, height: 14, filter: "none" }} onError={e => { e.target.style.display = "none" }} />
            toutes
          </button>
          {TAGS.map(tag => (
            <div key={tag.value} className="flex-shrink-0">
              <TagPill tag={tag} active={filter === tag.value} onClick={() => setFilter(filter === tag.value ? "all" : tag.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="text-white/40 text-sm">Chargement...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-[10px] p-8 text-center max-w-md border border-white/10" style={{ backgroundColor: "#2d2d2d" }}>
          <p className="text-white/40 text-sm mb-1">Aucune recette publique pour l'instant</p>
          <p className="text-white/20 text-xs">Partage tes recettes pour qu'elles apparaissent ici !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filteredRecipes.map(recipe => {
            const primaryTag = TAGS.find(t => t.value === recipe.primary_tag)
            const bg = primaryTag?.cardBg || DEFAULT_CARD_COLOR
            const textColor = getTextColor(bg)
            const overlayBg = textColor === "#ffffff" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)"
            return (
              <div key={recipe.id} className="rounded-[10px] overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col"
                style={{ backgroundColor: bg, border: `2px solid ${border}` }}>
                {recipe.photo_url ? (
                  <img src={recipe.photo_url} alt={recipe.name} className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="w-full aspect-[4/3] flex items-center justify-center" style={{ backgroundColor: bg }}>
                    <span className="text-5xl opacity-20">🍽</span>
                  </div>
                )}
                <div className="p-3 flex flex-col flex-1" style={{ color: textColor }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: overlayBg }}>
                      {recipe.profiles?.avatar_url ? <img src={recipe.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-xs">👤</span>}
                    </div>
                    <span className="text-xs opacity-70 truncate">{recipe.profiles?.username || "Utilisateur"}</span>
                  </div>
                  <h3 className="font-black text-sm leading-tight mb-1 line-clamp-2">{recipe.name}</h3>
                  <div className="flex items-center gap-2 text-xs mb-2 opacity-70">
                    {recipe.prep_time && <span>⏱ {recipe.prep_time}min</span>}
                    {recipe.servings && <span>🍽 {recipe.servings}p</span>}
                    {recipe.estimatedTotal !== null && <span className="font-semibold">💰 {recipe.estimatedTotal.toFixed(2)}€</span>}
                  </div>
                  {recipe.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {recipe.tags.slice(0, 2).map(tv => {
                        const t = TAGS.find(t => t.value === tv)
                        return (
                          <span key={tv} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: overlayBg }}>
                            {t && <img src={`/icons/${t.icon}.png`} alt="" style={{ width: 9, height: 9 }} onError={e => { e.target.style.display = "none" }} />}
                            <span style={{ color: textColor }}>{t?.label || tv}</span>
                          </span>
                        )
                      })}
                      {recipe.tags.length > 2 && <span className="text-[10px] opacity-50">+{recipe.tags.length - 2}</span>}
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto pt-2">
                    <button onClick={() => openPreview(recipe)}
                      className="flex-1 py-2 rounded-[10px] text-xs font-semibold transition"
                      style={{ backgroundColor: overlayBg, color: textColor }}>
                      Voir +
                    </button>
                    <button onClick={() => handleAddToMyRecipes(recipe)}
                      className="flex-1 py-2 rounded-[10px] text-xs font-semibold transition"
                      style={{ backgroundColor: "#f3501e", color: "#ffffff" }}>
                      + Ajouter
                    </button>
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
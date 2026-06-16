import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { COCKTAIL_INGREDIENTS, COCKTAIL_INGREDIENT_CATEGORIES, BOISSON_TAGS, ALL_TAGS } from "../tags"
import { useTheme } from "../context/ThemeContext"

const COCKTAIL_KEYS = new Set(COCKTAIL_INGREDIENTS.map(i => i.key))

export default function CocktailFinder() {
  const { isDay } = useTheme()
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchIng, setSearchIng] = useState("")
  const [openCats, setOpenCats] = useState(() =>
    Object.fromEntries(Object.keys(COCKTAIL_INGREDIENT_CATEGORIES).map(k => [k, false]))
  )

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("recipes")
      .select("id, name, primary_tag, tags, photo_url, prep_time")
      .eq("user_id", user.id)
      .in("primary_tag", BOISSON_TAGS.map(t => t.key))
    setRecipes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRecipes() }, [])

  const toggle = (key) => setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  const toggleCat = (catKey) => setOpenCats(p => ({ ...p, [catKey]: !p[catKey] }))
  const clearAll = () => setSelected([])

  const results = recipes
    .map(recipe => {
      const recipeIngs = (recipe.tags || []).filter(t => COCKTAIL_KEYS.has(t))
      const missing = recipeIngs.filter(k => !selected.includes(k))
      return { ...recipe, recipeIngs, missing, missingCount: missing.length }
    })
    .filter(r => selected.length === 0 ? r.recipeIngs.length > 0 : true)
    .sort((a, b) => a.missingCount - b.missingCount)

  const bg = isDay ? "#F5F0E8" : "#111111"
  const surface = isDay ? "#FFFFFF" : "#1a1a1a"
  const surfaceBorder = isDay ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)"
  const textMain = isDay ? "#111111" : "#ffffff"
  const textMuted = isDay ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)"

  const canMakeNow = results.filter(r => r.missingCount === 0 && r.recipeIngs.length > 0 && selected.length > 0).length

  const searchResults = searchIng.trim()
    ? COCKTAIL_INGREDIENTS.filter(i => i.label.toLowerCase().includes(searchIng.toLowerCase().trim()))
    : []

  const pillBtn = (ing, catInfo, active) => (
    <button key={ing.key} onClick={() => toggle(ing.key)}
      style={{
        padding: "5px 13px", borderRadius: 20, fontSize: 11, fontWeight: 700,
        fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em", cursor: "pointer",
        transition: "all 0.15s",
        border: `1.5px solid ${active ? catInfo.color : isDay ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.10)"}`,
        backgroundColor: active ? catInfo.bg : "transparent",
        color: active ? catInfo.color : textMuted,
        transform: active ? "scale(1.05)" : "scale(1)",
      }}>
      {ing.label}
    </button>
  )

  return (
    <div style={{ padding: "20px 24px", backgroundColor: bg, minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.3s ease" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <button onClick={() => navigate("/boissons")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, color: textMuted, padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = textMain}
          onMouseLeave={e => e.currentTarget.style.color = textMuted}
        >← retour</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <img src="/icons/drink.webp" alt="" style={{ width: 22, height: 22 }} onError={e => e.target.style.display = "none"} />
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textMain, letterSpacing: "-0.04em" }}>cocktail finder</h1>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 12, color: textMuted }}>
        coche ce que tu as, on te dit ce que tu peux faire
      </p>

      {/* Picker ingrédients */}
      <div style={{ backgroundColor: surface, borderRadius: 16, padding: 20, border: surfaceBorder, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            ce que j'ai
            {selected.length > 0 && <span style={{ marginLeft: 6, color: "#f3501e" }}>({selected.length} sélectionné{selected.length > 1 ? "s" : ""})</span>}
          </span>
          {selected.length > 0 && (
            <button onClick={clearAll} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 11, color: textMuted, padding: 0 }}>
              tout effacer
            </button>
          )}
        </div>

        {/* Barre de recherche ingrédient */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none", opacity: 0.4 }}>🔍</span>
          <input
            value={searchIng}
            onChange={e => setSearchIng(e.target.value)}
            placeholder="rechercher un ingrédient..."
            style={{
              width: "100%", boxSizing: "border-box", borderRadius: 10,
              padding: "9px 12px 9px 36px", fontSize: 13, outline: "none",
              backgroundColor: isDay ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)",
              border: `1.5px solid ${isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}`,
              color: textMain, fontFamily: "Poppins, sans-serif", fontWeight: 500,
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "#d57bff"}
            onBlur={e => e.target.style.borderColor = isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"}
          />
          {searchIng && (
            <button onClick={() => setSearchIng("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 16, lineHeight: 1, padding: 2 }}>
              ×
            </button>
          )}
        </div>

        {/* Résultats de recherche flat */}
        {searchIng.trim() ? (
          searchResults.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {searchResults.map(ing => {
                const catInfo = COCKTAIL_INGREDIENT_CATEGORIES[ing.category]
                const active = selected.includes(ing.key)
                return pillBtn(ing, catInfo, active)
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: textMuted, textAlign: "center", padding: "12px 0" }}>
              aucun ingrédient trouvé pour « {searchIng} »
            </div>
          )
        ) : (
          /* Catégories en accordéon */
          Object.entries(COCKTAIL_INGREDIENT_CATEGORIES).map(([catKey, catInfo]) => {
            const isOpen = openCats[catKey]
            const ings = COCKTAIL_INGREDIENTS.filter(i => i.category === catKey)
            const activeCount = ings.filter(i => selected.includes(i.key)).length
            return (
              <div key={catKey} style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: `1.5px solid ${isOpen ? catInfo.color + "40" : isDay ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"}`, transition: "border-color 0.2s" }}>
                {/* En-tête catégorie cliquable */}
                <button onClick={() => toggleCat(catKey)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", border: "none", cursor: "pointer",
                    backgroundColor: isOpen ? catInfo.bg + "55" : isDay ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)",
                    transition: "background-color 0.2s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: catInfo.color, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: catInfo.color, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.02em" }}>
                      {catInfo.label}
                    </span>
                    {activeCount > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10, backgroundColor: catInfo.color, color: "#fff" }}>
                        {activeCount}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: catInfo.color, opacity: 0.6, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", lineHeight: 1 }}>▾</span>
                </button>

                {/* Pills ingrédients */}
                {isOpen && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 14px 12px" }}>
                    {ings.map(ing => pillBtn(ing, catInfo, selected.includes(ing.key)))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Résultats */}
      {selected.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {loading ? "chargement..." : `${results.length} boisson${results.length !== 1 ? "s" : ""}`}
            </span>
            {canMakeNow > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, backgroundColor: "#14532d", color: "#bbf7d0" }}>
                {canMakeNow} faisable{canMakeNow > 1 ? "s" : ""} maintenant
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map(recipe => {
              const tagInfo = ALL_TAGS.find(t => t.key === recipe.primary_tag)
              const cardBg = tagInfo?.cardBg || "#2d2d2d"
              const cardBorder = tagInfo?.cardBorder || "#444"
              const canMake = recipe.missingCount === 0 && recipe.recipeIngs.length > 0

              return (
                <div key={recipe.id}
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 14, backgroundColor: surface, borderRadius: 14, border: canMake ? `1.5px solid ${cardBorder}` : surfaceBorder, padding: "14px 16px", cursor: "pointer", transition: "transform 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.01)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <div style={{ width: 6, alignSelf: "stretch", borderRadius: 4, backgroundColor: cardBg, flexShrink: 0 }} />

                  {recipe.photo_url && (
                    <img src={recipe.photo_url} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: textMain, letterSpacing: "-0.03em" }}>{recipe.name}</span>
                      {canMake && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, backgroundColor: "#14532d", color: "#bbf7d0", flexShrink: 0 }}>
                          faisable maintenant
                        </span>
                      )}
                      {!canMake && recipe.recipeIngs.length === 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, backgroundColor: isDay ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)", color: textMuted }}>
                          ingrédients non renseignés
                        </span>
                      )}
                    </div>

                    {recipe.missingCount > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        <span style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>
                          {recipe.missingCount} manquant{recipe.missingCount > 1 ? "s" : ""} :
                        </span>
                        {recipe.missing.map(k => {
                          const ing = COCKTAIL_INGREDIENTS.find(i => i.key === k)
                          const cat = COCKTAIL_INGREDIENT_CATEGORIES[ing?.category]
                          return (
                            <span key={k} style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 10, backgroundColor: cat?.bg || "rgba(0,0,0,0.06)", color: cat?.color || textMuted }}>
                              {ing?.label || k}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {canMake && recipe.recipeIngs.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                        {recipe.recipeIngs.map(k => {
                          const ing = COCKTAIL_INGREDIENTS.find(i => i.key === k)
                          const cat = COCKTAIL_INGREDIENT_CATEGORIES[ing?.category]
                          return (
                            <span key={k} style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 10, backgroundColor: cat?.bg || "rgba(0,0,0,0.06)", color: cat?.color || textMuted, opacity: 0.7 }}>
                              {ing?.label || k}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {recipe.prep_time && (
                    <span style={{ fontSize: 11, color: textMuted, fontWeight: 600, flexShrink: 0 }}>⏱ {recipe.prep_time}m</span>
                  )}
                </div>
              )
            })}
          </div>

          {results.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 13 }}>
              aucune boisson avec ces ingrédients.<br />
              <span style={{ fontSize: 11 }}>essaie d'en ajouter d'autres ou crée une nouvelle recette.</span>
            </div>
          )}
        </div>
      )}

      {selected.length === 0 && !loading && recipes.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 13 }}>
          tu n'as pas encore de boissons.<br />
          <button onClick={() => navigate("/boissons")} style={{ background: "none", border: "none", cursor: "pointer", color: "#f3501e", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, padding: 0, marginTop: 8 }}>
            créer ma première boisson →
          </button>
        </div>
      )}

      {selected.length === 0 && recipes.length > 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: textMuted, fontSize: 12 }}>
          sélectionne ce que tu as pour voir les résultats
        </div>
      )}
    </div>
  )
}

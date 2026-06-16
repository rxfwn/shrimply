import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { COCKTAIL_INGREDIENTS, COCKTAIL_INGREDIENT_CATEGORIES, BOISSON_TAGS, ALL_TAGS } from "../tags"
import { useTheme } from "../context/ThemeContext"

const COCKTAIL_KEYS = new Set(COCKTAIL_INGREDIENTS.map(i => i.key))

const CAT_ICONS = {
  spiritueux: "🥃", liqueur: "🍾", vin: "🍷", biere: "🍺",
  amers: "🌿", sirop: "🍯", jus: "🍋", mixeur: "🧃", frigo: "🧊",
}

export default function CocktailFinder() {
  const { isDay } = useTheme()
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchIng, setSearchIng] = useState("")
  const [searchCocktail, setSearchCocktail] = useState("")
  const [openCats, setOpenCats] = useState(() =>
    Object.fromEntries(Object.keys(COCKTAIL_INGREDIENT_CATEGORIES).map(k => [k, false]))
  )
  const [filter, setFilter] = useState("all")
  const [expanded, setExpanded] = useState(new Set())

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("recipes")
      .select("id, name, primary_tag, tags, photo_url, prep_time, notes")
      .eq("user_id", user.id)
      .in("primary_tag", BOISSON_TAGS.map(t => t.key))
    setRecipes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRecipes() }, [])

  const toggle = (key) => setSelected(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  )
  const toggleCat = (catKey) => setOpenCats(p => ({ ...p, [catKey]: !p[catKey] }))
  const toggleExpand = (id) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const clearAll = () => setSelected([])

  const bg        = isDay ? "#F5F0E8" : "#111111"
  const surface   = isDay ? "#FFFFFF" : "#1a1a1a"
  const textMain  = isDay ? "#111111" : "#ffffff"
  const textMuted = isDay ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.38)"
  const border    = isDay ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"

  const allResults = recipes.map(recipe => {
    const recipeIngs = (recipe.tags || []).filter(t => COCKTAIL_KEYS.has(t))
    const missing = recipeIngs.filter(k => !selected.includes(k))
    return { ...recipe, recipeIngs, missing, missingCount: missing.length }
  }).sort((a, b) => a.missingCount - b.missingCount)

  const counts = {
    all:      allResults.length,
    canMake:  allResults.filter(r => r.missingCount === 0 && r.recipeIngs.length > 0).length,
    one:      allResults.filter(r => r.missingCount === 1).length,
    two:      allResults.filter(r => r.missingCount === 2).length,
  }

  const filtered = allResults.filter(r => {
    if (searchCocktail.trim() && !r.name.toLowerCase().includes(searchCocktail.toLowerCase())) return false
    if (filter === "0") return r.missingCount === 0 && r.recipeIngs.length > 0
    if (filter === "1") return r.missingCount === 1
    if (filter === "2") return r.missingCount === 2
    return true
  })

  const ingSearchResults = searchIng.trim()
    ? COCKTAIL_INGREDIENTS.filter(i => i.label.toLowerCase().includes(searchIng.toLowerCase().trim()))
    : []

  const tabs = [
    { key: "all", label: "toutes",       count: counts.all },
    { key: "0",   label: "réalisables",  count: counts.canMake },
    { key: "1",   label: "1 manquant",   count: counts.one },
    { key: "2",   label: "2 manquants",  count: counts.two },
  ]

  const IngPill = ({ ing, catInfo }) => {
    const active = selected.includes(ing.key)
    return (
      <button onClick={() => toggle(ing.key)} style={{
        padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
        fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em", cursor: "pointer",
        transition: "all 0.12s",
        border: `1.5px solid ${active ? catInfo.color : border}`,
        backgroundColor: active ? catInfo.bg : "transparent",
        color: active ? catInfo.color : textMuted,
        transform: active ? "scale(1.04)" : "scale(1)",
      }}>
        {ing.label}
      </button>
    )
  }

  const ScoreCircle = ({ have, total, canMake }) => {
    const pct = total === 0 ? 0 : have / total
    const color = canMake ? "#14532d" : pct > 0.5 ? "#92400e" : textMuted
    return (
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color,
        fontFamily: "Poppins, sans-serif", letterSpacing: "-0.02em",
        backgroundColor: canMake ? "rgba(20,83,45,0.08)" : "transparent",
      }}>
        {have}/{total}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", backgroundColor: bg, fontFamily: "Poppins, sans-serif" }}>
      <style>{`
        .cf-body { display: flex; gap: 0; flex: 1; }
        .cf-left { width: 320px; flex-shrink: 0; border-right: 1px solid ${border}; padding: 14px 16px; position: sticky; top: 0; max-height: 100vh; overflow-y: auto; align-self: flex-start; }
        .cf-right { flex: 1; padding: 14px 16px; min-width: 0; }
        .cf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .cf-left::-webkit-scrollbar { width: 3px; }
        .cf-left::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
        @media (max-width: 760px) {
          .cf-body { flex-direction: column; }
          .cf-left { width: 100%; position: static; max-height: none; border-right: none; border-bottom: 1px solid ${border}; }
          .cf-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${border}`, flexShrink: 0, backgroundColor: bg, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => navigate("/boissons")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 10, color: textMuted, padding: "0 0 8px", letterSpacing: "-0.02em" }}
          onMouseEnter={e => e.currentTarget.style.color = textMain}
          onMouseLeave={e => e.currentTarget.style.color = textMuted}
        >← retour</button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/icons/drink.webp" alt="" style={{ width: 20, height: 20 }} onError={e => e.target.style.display = "none"} />
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textMain, letterSpacing: "-0.05em" }}>cocktail finder</h1>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em",
                backgroundColor: filter === tab.key ? "#CFFF79" : isDay ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)",
                color: filter === tab.key ? "#091718" : textMuted,
                transition: "all 0.12s",
              }}>
                {tab.label} <span style={{ opacity: 0.65, fontWeight: 600 }}>{tab.count}</span>
              </button>
            ))}
            {selected.length > 0 && (
              <button onClick={clearAll} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 11, color: "#f3501e", padding: "5px 4px" }}>
                effacer ({selected.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="cf-body">

        {/* Left — ingredient picker */}
        <div className="cf-left">
          {/* Search ingrédient */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: 0.3, pointerEvents: "none" }}>🔍</span>
            <input value={searchIng} onChange={e => setSearchIng(e.target.value)}
              placeholder="Chercher un ingrédient..."
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "8px 28px 8px 30px", fontSize: 12, outline: "none", backgroundColor: isDay ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${border}`, color: textMain, fontFamily: "Poppins, sans-serif", fontWeight: 500 }}
              onFocus={e => e.target.style.borderColor = "#d57bff"}
              onBlur={e => e.target.style.borderColor = border}
            />
            {searchIng && (
              <button onClick={() => setSearchIng("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 14, lineHeight: 1, padding: 2 }}>×</button>
            )}
          </div>

          {/* Résultats recherche flat */}
          {searchIng.trim() ? (
            ingSearchResults.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {ingSearchResults.map(ing => <IngPill key={ing.key} ing={ing} catInfo={COCKTAIL_INGREDIENT_CATEGORIES[ing.category]} />)}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: textMuted, textAlign: "center", padding: "16px 0" }}>aucun résultat</div>
            )
          ) : (
            /* Catégories accordéon */
            Object.entries(COCKTAIL_INGREDIENT_CATEGORIES).map(([catKey, catInfo]) => {
              const isOpen = openCats[catKey]
              const ings = COCKTAIL_INGREDIENTS.filter(i => i.category === catKey)
              const activeCount = ings.filter(i => selected.includes(i.key)).length
              return (
                <div key={catKey} style={{ marginBottom: 6, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${isOpen ? catInfo.color + "55" : border}`, transition: "border-color 0.15s" }}>
                  <button onClick={() => toggleCat(catKey)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", border: "none", cursor: "pointer", backgroundColor: isOpen ? catInfo.bg + "44" : "transparent", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{CAT_ICONS[catKey]}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: isOpen ? catInfo.color : textMain, fontFamily: "Poppins, sans-serif", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        {catInfo.label}
                      </span>
                      {activeCount > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10, backgroundColor: catInfo.color, color: "#fff" }}>{activeCount}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: isOpen ? catInfo.color : textMuted, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", lineHeight: 1, flexShrink: 0 }}>▾</span>
                  </button>
                  {isOpen && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "6px 12px 10px" }}>
                      {ings.map(ing => <IngPill key={ing.key} ing={ing} catInfo={catInfo} />)}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Right — résultats */}
        <div className="cf-right">
          {/* Search cocktail */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, opacity: 0.3, pointerEvents: "none" }}>🔍</span>
            <input value={searchCocktail} onChange={e => setSearchCocktail(e.target.value)}
              placeholder="Chercher un cocktail..."
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "8px 28px 8px 30px", fontSize: 12, outline: "none", backgroundColor: isDay ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${border}`, color: textMain, fontFamily: "Poppins, sans-serif", fontWeight: 500 }}
              onFocus={e => e.target.style.borderColor = "#d57bff"}
              onBlur={e => e.target.style.borderColor = border}
            />
            {searchCocktail && (
              <button onClick={() => setSearchCocktail("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 14, lineHeight: 1, padding: 2 }}>×</button>
            )}
          </div>

          {/* Loading */}
          {loading && <div style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 12 }}>chargement...</div>}

          {/* No recipes */}
          {!loading && recipes.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 13 }}>
              tu n'as pas encore de boissons.<br />
              <button onClick={() => navigate("/boissons")} style={{ background: "none", border: "none", cursor: "pointer", color: "#f3501e", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, padding: 0, marginTop: 8 }}>
                créer ma première boisson →
              </button>
            </div>
          )}

          {/* Hint state */}
          {!loading && recipes.length > 0 && selected.length === 0 && !searchCocktail.trim() && (
            <div style={{ backgroundColor: surface, borderRadius: 14, border: `1px solid ${border}`, padding: "16px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>👈</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: textMain, letterSpacing: "-0.03em", marginBottom: 2 }}>Sélectionne tes ingrédients</div>
                <div style={{ fontSize: 11, color: textMuted, lineHeight: 1.4 }}>Les cocktails se trient automatiquement selon ce que tu as.</div>
              </div>
            </div>
          )}

          {/* Cards grid */}
          {!loading && recipes.length > 0 && (
            <div className="cf-grid">
              {filtered.map(recipe => {
                const tagInfo = ALL_TAGS.find(t => t.key === recipe.primary_tag)
                const canMake = recipe.missingCount === 0 && recipe.recipeIngs.length > 0
                const haveCount = recipe.recipeIngs.length - recipe.missingCount
                const totalCount = recipe.recipeIngs.length
                const isExpanded = expanded.has(recipe.id)

                return (
                  <div key={recipe.id}
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                    style={{ backgroundColor: surface, borderRadius: 14, border: `1.5px solid ${canMake ? (tagInfo?.cardBorder || "#CFFF79") : border}`, padding: "13px 13px 10px", cursor: "pointer", transition: "transform 0.12s, box-shadow 0.12s", display: "flex", flexDirection: "column", gap: 7 }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)" }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
                  >
                    {/* Top row: tag badge + score */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1 }}>
                        {tagInfo && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 10, backgroundColor: tagInfo.pillBg, color: tagInfo.pillText, letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0 }}>
                            {tagInfo.label}
                          </span>
                        )}
                        {recipe.missingCount > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 10, backgroundColor: isDay ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.07)", color: textMuted }}>
                            {recipe.missingCount} manquant{recipe.missingCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {totalCount > 0 && (
                        <ScoreCircle have={haveCount} total={totalCount} canMake={canMake} />
                      )}
                    </div>

                    {/* Name */}
                    <div style={{ fontSize: 15, fontWeight: 700, color: textMain, letterSpacing: "-0.04em", lineHeight: 1.2 }}>
                      {recipe.name}
                    </div>

                    {/* Notes */}
                    {recipe.notes && (
                      <div style={{ fontSize: 11, color: textMuted, lineHeight: 1.5, letterSpacing: "-0.01em" }}>
                        {recipe.notes.length > 90 ? recipe.notes.slice(0, 90) + "…" : recipe.notes}
                      </div>
                    )}

                    {/* Bottom row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                      {totalCount === 0 && (
                        <span style={{ fontSize: 9, color: textMuted, fontStyle: "italic" }}>ingrédients non renseignés</span>
                      )}
                      {totalCount > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleExpand(recipe.id) }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 13, lineHeight: 1, padding: 0, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.18s" }}
                        >▾</button>
                      )}
                    </div>

                    {/* Expanded ingredients */}
                    {isExpanded && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingTop: 8, borderTop: `1px solid ${border}` }}>
                        {recipe.recipeIngs.map(k => {
                          const ing = COCKTAIL_INGREDIENTS.find(i => i.key === k)
                          const cat = COCKTAIL_INGREDIENT_CATEGORIES[ing?.category]
                          const isMissing = recipe.missing.includes(k)
                          return (
                            <span key={k} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, backgroundColor: isMissing ? (isDay ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)") : (cat?.bg || "rgba(0,0,0,0.06)"), color: isMissing ? textMuted : (cat?.color || textMuted), opacity: isMissing ? 0.5 : 1, textDecoration: isMissing ? "line-through" : "none" }}>
                              {ing?.label || k}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (selected.length > 0 || searchCocktail.trim()) && (
            <div style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 13 }}>
              aucun résultat — essaie d'autres ingrédients ou modifie le filtre.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

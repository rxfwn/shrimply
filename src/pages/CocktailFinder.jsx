import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { COCKTAIL_INGREDIENTS, COCKTAIL_INGREDIENT_CATEGORIES, ALL_TAGS, getRecipeCategory } from "../tags"
import { useTheme } from "../context/ThemeContext"

const COCKTAIL_KEYS = new Set(COCKTAIL_INGREDIENTS.map(i => i.key))

const CAT_ICONS = {
  spiritueux: { type: "img", src: "/icons/alcool.webp" },
  liqueur:    { type: "img", src: "/icons/drink.webp" },
  vin:        { type: "img", src: "/icons/drink.webp" },
  biere:      { type: "img", src: "/icons/fizz.webp" },
  amers:      { type: "img", src: "/icons/herb.webp" },
  sirop:      { type: "img", src: "/icons/sirop.png" },
  jus:        { type: "img", src: "/icons/fruit.webp" },
  mixeur:     { type: "img", src: "/icons/fizz.webp" },
  frigo:      { type: "img", src: "/icons/ice.webp" },
}

function CatIcon({ catKey }) {
  const ic = CAT_ICONS[catKey]
  if (!ic) return null
  if (ic.type === "img") return <img src={ic.src} alt="" style={{ width: 16, height: 16, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
  return <span style={{ fontSize: 14, lineHeight: 1 }}>{ic.val}</span>
}

// Arc SVG de progression — orange pour partiel, vert pour complet
function ScoreCircle({ have, total, isDay, textMuted }) {
  const pct      = total === 0 ? 0 : have / total
  const canMake  = have === total && total > 0
  const hasAny   = pct > 0
  const r        = 13
  const stroke   = 2.5
  const circum   = 2 * Math.PI * r
  const offset   = circum * (1 - pct)
  const arcColor = canMake ? "#22c55e" : hasAny ? "#f3501e" : "transparent"
  const track    = isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.12)"
  const txtColor = canMake ? "#16a34a" : hasAny ? "#f3501e" : textMuted

  return (
    <div style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}>
      <svg width="34" height="34" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="17" cy="17" r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {hasAny && (
          <circle cx="17" cy="17" r={r} fill="none" stroke={arcColor} strokeWidth={stroke}
            strokeDasharray={circum} strokeDashoffset={offset} strokeLinecap="round" />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: txtColor, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.02em" }}>
        {have}/{total}
      </div>
    </div>
  )
}

export default function CocktailFinder() {
  const { isDay } = useTheme()
  const navigate  = useNavigate()
  const [selected, setSelected]         = useState([])
  const [recipes, setRecipes]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [searchIng, setSearchIng]       = useState("")
  const [searchCocktail, setSearchCocktail] = useState("")
  const [openCats, setOpenCats]         = useState(() =>
    Object.fromEntries(Object.keys(COCKTAIL_INGREDIENT_CATEGORIES).map(k => [k, false]))
  )
  const [filter, setFilter]   = useState("all")
  const [expanded, setExpanded] = useState(new Set())

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("recipes")
      .select("id, name, primary_tag, tags, photo_url")
      .eq("user_id", user.id)
    setRecipes((data || []).filter(r => getRecipeCategory(r.primary_tag) === "boisson"))
    setLoading(false)
  }

  useEffect(() => { fetchRecipes() }, [])

  const toggle = (key) => setSelected(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  )
  const selectFromSearch = (key) => { toggle(key); setSearchIng("") }
  const toggleCat    = (k) => setOpenCats(p => ({ ...p, [k]: !p[k] }))
  const toggleExpand = (id) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const clearAll = () => setSelected([])

  const bg        = isDay ? "#F5F0E8" : "#111111"
  const surface   = isDay ? "#FFFFFF" : "#1a1a1a"
  const textMain  = isDay ? "#111111" : "#ffffff"
  const textMuted = isDay ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.38)"
  const border    = isDay ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"

  const allResults = recipes.map(recipe => {
    const recipeIngs  = (recipe.tags || []).filter(t => COCKTAIL_KEYS.has(t))
    const missing     = recipeIngs.filter(k => !selected.includes(k))
    return { ...recipe, recipeIngs, missing, missingCount: missing.length }
  }).sort((a, b) => {
    const haveA = a.recipeIngs.length - a.missingCount
    const haveB = b.recipeIngs.length - b.missingCount
    if (haveB !== haveA) return haveB - haveA
    return a.missingCount - b.missingCount
  })

  const counts = {
    all:     allResults.length,
    canMake: allResults.filter(r => r.missingCount === 0 && r.recipeIngs.length > 0).length,
    one:     allResults.filter(r => r.missingCount === 1).length,
    two:     allResults.filter(r => r.missingCount === 2).length,
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
    { key: "all", label: "toutes",      count: counts.all },
    { key: "0",   label: "réalisables", count: counts.canMake },
    { key: "1",   label: "1 manquant",  count: counts.one },
    { key: "2",   label: "2 manquants", count: counts.two },
  ]

  const AccordionPill = ({ ing, catInfo }) => {
    const active = selected.includes(ing.key)
    return (
      <button onClick={() => toggle(ing.key)} style={{
        padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
        fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em", cursor: "pointer",
        transition: "all 0.12s",
        border: `1.5px solid ${active ? catInfo.color : border}`,
        backgroundColor: active ? catInfo.bg : "transparent",
        color: active ? catInfo.color : textMuted,
      }}>
        {ing.label}
      </button>
    )
  }

  const SearchPill = ({ ing, catInfo }) => {
    const active = selected.includes(ing.key)
    return (
      <button onClick={() => selectFromSearch(ing.key)} style={{
        padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, width: "100%", textAlign: "left",
        fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em", cursor: "pointer",
        border: `1.5px solid ${active ? catInfo.color : border}`,
        backgroundColor: active ? catInfo.bg : surface,
        color: active ? catInfo.color : textMain,
        display: "flex", alignItems: "center", gap: 7,
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6, backgroundColor: catInfo.bg, color: catInfo.color, textTransform: "uppercase", letterSpacing: "0.03em", flexShrink: 0 }}>
          {catInfo.label}
        </span>
        {ing.label}
      </button>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", backgroundColor: bg, fontFamily: "Poppins, sans-serif" }}>
      <style>{`
        .cf-body { display: flex; gap: 0; flex: 1; overflow: hidden; }
        .cf-left { width: 300px; flex-shrink: 0; border-right: 1px solid ${border}; padding: 14px 14px; position: sticky; top: 0; max-height: 100vh; overflow-y: auto; align-self: flex-start; box-sizing: border-box; }
        .cf-right { flex: 1; padding: 12px 14px; min-width: 0; overflow-y: auto; }
        .cf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .cf-card { background: ${surface}; border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.12s, box-shadow 0.12s; display: flex; flex-direction: column; }
        .cf-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.09); }
        .cf-left::-webkit-scrollbar { width: 3px; }
        .cf-left::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        @media (max-width: 900px) { .cf-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 680px) {
          .cf-body { flex-direction: column; overflow: visible; }
          .cf-left { width: 100%; position: static; max-height: none; border-right: none; border-bottom: 1px solid ${border}; }
          .cf-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header sticky */}
      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${border}`, flexShrink: 0, backgroundColor: bg, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => navigate("/boissons")}
          style={{ border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "-0.04em", backgroundColor: isDay ? "#E8E3D9" : "rgba(255,255,255,0.1)", color: isDay ? "#111111" : "rgba(255,255,255,0.75)", padding: "7px 16px", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10 }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >← retour</button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/icons/drink.webp" alt="" style={{ width: 18, height: 18 }} onError={e => e.target.style.display = "none"} />
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textMain, letterSpacing: "-0.05em" }}>cocktail finder</h1>
          </div>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em",
                backgroundColor: filter === tab.key ? "#CFFF79" : isDay ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)",
                color: filter === tab.key ? "#091718" : textMuted,
              }}>
                {tab.label} <span style={{ opacity: 0.6, fontWeight: 600 }}>{tab.count}</span>
              </button>
            ))}
            {selected.length > 0 && (
              <button onClick={clearAll} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 10, color: "#f3501e", padding: "4px 2px" }}>
                effacer ({selected.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="cf-body">

        {/* Panneau gauche — sélecteur d'ingrédients */}
        <div className="cf-left">
          <div style={{ position: "relative", marginBottom: 8 }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 11, opacity: 0.3, pointerEvents: "none" }}>🔍</span>
            <input value={searchIng} onChange={e => setSearchIng(e.target.value)}
              placeholder="Chercher un ingrédient..."
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "7px 26px 7px 28px", fontSize: 11, outline: "none", backgroundColor: isDay ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${border}`, color: textMain, fontFamily: "Poppins, sans-serif", fontWeight: 500 }}
              onFocus={e => e.target.style.borderColor = "#d57bff"}
              onBlur={e => e.target.style.borderColor = border}
            />
            {searchIng && (
              <button onClick={() => setSearchIng("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 13, lineHeight: 1, padding: 2 }}>×</button>
            )}
          </div>

          {/* Chips des ingrédients sélectionnés */}
          {selected.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10, padding: "7px 9px", backgroundColor: isDay ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)", borderRadius: 10 }}>
              {selected.map(key => {
                const ing = COCKTAIL_INGREDIENTS.find(i => i.key === key)
                const cat = COCKTAIL_INGREDIENT_CATEGORIES[ing?.category]
                return (
                  <div key={key} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 7px 3px 9px", borderRadius: 20, backgroundColor: cat?.bg || "rgba(0,0,0,0.08)", border: `1.5px solid ${cat?.color || border}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cat?.color || textMain, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em" }}>{ing?.label || key}</span>
                    <button onClick={() => toggle(key)} style={{ background: "none", border: "none", cursor: "pointer", color: cat?.color || textMuted, fontSize: 13, lineHeight: 1, padding: "0 0 0 2px", opacity: 0.55, display: "flex", alignItems: "center" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "0.55"}
                    >×</button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Résultats de recherche */}
          {searchIng.trim() ? (
            ingSearchResults.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {ingSearchResults.map(ing => <SearchPill key={ing.key} ing={ing} catInfo={COCKTAIL_INGREDIENT_CATEGORIES[ing.category]} />)}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: textMuted, textAlign: "center", padding: "14px 0" }}>aucun résultat</div>
            )
          ) : (
            /* Accordéons catégories */
            Object.entries(COCKTAIL_INGREDIENT_CATEGORIES).map(([catKey, catInfo]) => {
              const isOpen     = openCats[catKey]
              const ings       = COCKTAIL_INGREDIENTS.filter(i => i.category === catKey)
              const activeCount = ings.filter(i => selected.includes(i.key)).length
              return (
                <div key={catKey} style={{ marginBottom: 5, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${isOpen ? catInfo.color + "55" : border}`, transition: "border-color 0.15s" }}>
                  <button onClick={() => toggleCat(catKey)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 11px", border: "none", cursor: "pointer", backgroundColor: isOpen ? catInfo.bg + "44" : "transparent", gap: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <CatIcon catKey={catKey} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: isOpen ? catInfo.color : textMain, fontFamily: "Poppins, sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        {catInfo.label}
                      </span>
                      {activeCount > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 10, backgroundColor: catInfo.color, color: "#fff" }}>{activeCount}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: isOpen ? catInfo.color : textMuted, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", lineHeight: 1 }}>▾</span>
                  </button>
                  {isOpen && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "5px 11px 9px" }}>
                      {ings.map(ing => <AccordionPill key={ing.key} ing={ing} catInfo={catInfo} />)}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Panneau droit — résultats cocktails */}
        <div className="cf-right">
          {/* Recherche cocktail */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 11, opacity: 0.3, pointerEvents: "none" }}>🔍</span>
            <input value={searchCocktail} onChange={e => setSearchCocktail(e.target.value)}
              placeholder="Chercher un cocktail..."
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "7px 26px 7px 28px", fontSize: 11, outline: "none", backgroundColor: isDay ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${border}`, color: textMain, fontFamily: "Poppins, sans-serif", fontWeight: 500 }}
              onFocus={e => e.target.style.borderColor = "#d57bff"}
              onBlur={e => e.target.style.borderColor = border}
            />
            {searchCocktail && (
              <button onClick={() => setSearchCocktail("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 13, lineHeight: 1, padding: 2 }}>×</button>
            )}
          </div>

          {loading && <div style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 12 }}>chargement...</div>}

          {!loading && recipes.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 13 }}>
              tu n'as pas encore de boissons.
              <br />
              <button onClick={() => navigate("/boissons")} style={{ background: "none", border: "none", cursor: "pointer", color: "#f3501e", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, padding: 0, marginTop: 8 }}>
                créer ma première boisson →
              </button>
            </div>
          )}

          {!loading && recipes.length > 0 && selected.length === 0 && !searchCocktail.trim() && filter === "all" && (
            <div style={{ backgroundColor: surface, borderRadius: 12, border: `1px solid ${border}`, padding: "13px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
              <img src="/icons/hand.webp" alt="" style={{ width: 22, height: 22, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: textMain, letterSpacing: "-0.03em", marginBottom: 2 }}>Sélectionne tes ingrédients</div>
                <div style={{ fontSize: 10, color: textMuted, lineHeight: 1.4 }}>Les cocktails s'affichent du plus réalisable au moins réalisable.</div>
              </div>
            </div>
          )}

          {!loading && recipes.length > 0 && (
            <div className="cf-grid">
              {filtered.map(recipe => {
                const tagInfo    = ALL_TAGS.find(t => t.key === recipe.primary_tag)
                const canMake    = recipe.missingCount === 0 && recipe.recipeIngs.length > 0
                const haveCount  = recipe.recipeIngs.length - recipe.missingCount
                const totalCount = recipe.recipeIngs.length
                const isExpanded = expanded.has(recipe.id)
                const cardBorderColor = canMake ? (tagInfo?.cardBorder || "#22c55e") : border

                return (
                  <div key={recipe.id} className="cf-card"
                    style={{ border: `1.5px solid ${cardBorderColor}` }}
                    onClick={() => toggleExpand(recipe.id)}
                  >
                    {/* Ligne principale — photo carrée + info */}
                    <div style={{ display: "flex", alignItems: "stretch", minHeight: 60 }}>
                      {/* Photo carrée */}
                      <div style={{ width: 60, flexShrink: 0, position: "relative", overflow: "hidden", backgroundColor: tagInfo?.cardBg || (isDay ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)") }}>
                        {recipe.photo_url
                          ? <img src={recipe.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          : tagInfo && <div style={{ width: "100%", height: "100%", backgroundColor: tagInfo.cardBg, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }} />
                        }
                      </div>

                      {/* Contenu */}
                      <div style={{ flex: 1, padding: "9px 10px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, gap: 4 }}>
                        {/* Haut : tag + score */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                          {tagInfo ? (
                            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 8, backgroundColor: tagInfo.pillBg, color: tagInfo.pillText, letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0, lineHeight: 1.4 }}>
                              {tagInfo.label}
                            </span>
                          ) : <span />}
                          {totalCount > 0 && (
                            <ScoreCircle have={haveCount} total={totalCount} isDay={isDay} textMuted={textMuted} />
                          )}
                        </div>
                        {/* Nom */}
                        <div style={{ fontSize: 12, fontWeight: 700, color: textMain, letterSpacing: "-0.04em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {recipe.name}
                        </div>
                        {/* Ingrédients manquants — résumé compact */}
                        {selected.length > 0 && recipe.missingCount > 0 && (
                          <div style={{ fontSize: 9, color: textMuted, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            manque : {recipe.missing.map(k => COCKTAIL_INGREDIENTS.find(i => i.key === k)?.label || k).join(", ")}
                          </div>
                        )}
                        {canMake && (
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#16a34a" }}>✓ faisable</div>
                        )}
                      </div>
                    </div>

                    {/* Panneau déplié — ingrédients + lien recette */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${border}`, padding: "9px 10px", display: "flex", flexDirection: "column", gap: 7 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {totalCount > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {recipe.recipeIngs.map(k => {
                              const ing      = COCKTAIL_INGREDIENTS.find(i => i.key === k)
                              const cat      = COCKTAIL_INGREDIENT_CATEGORIES[ing?.category]
                              const isMissing = recipe.missing.includes(k)
                              return (
                                <span key={k} style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 8, backgroundColor: isMissing ? "transparent" : (cat?.bg || "rgba(0,0,0,0.06)"), color: isMissing ? textMuted : (cat?.color || textMuted), opacity: isMissing ? 0.4 : 1, textDecoration: isMissing ? "line-through" : "none", border: isMissing ? `1px dashed ${border}` : "none" }}>
                                  {ing?.label || k}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: 9, color: textMuted, fontStyle: "italic" }}>ingrédients non renseignés</span>
                        )}
                        <button
                          onClick={() => navigate(`/recipes/${recipe.id}`)}
                          style={{ alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 10, color: "#d57bff", letterSpacing: "-0.03em", padding: 0 }}
                        >voir la recette →</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (selected.length > 0 || searchCocktail.trim() || filter !== "all") && (
            <div style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 12 }}>
              aucun résultat — essaie d'autres ingrédients ou change le filtre.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

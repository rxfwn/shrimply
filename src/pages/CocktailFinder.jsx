import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { COCKTAIL_INGREDIENTS, COCKTAIL_INGREDIENT_CATEGORIES, ALL_TAGS, getRecipeCategory } from "../tags"
import { useTheme } from "../context/ThemeContext"

const COCKTAIL_KEYS = new Set(COCKTAIL_INGREDIENTS.map(i => i.key))

const CAT_ICONS = {
  spiritueux: { type: "img", src: "/icons/vin.webp" },
  liqueur:    { type: "img", src: "/icons/drink.webp" },
  vin:        { type: "img", src: "/icons/vin.webp" },
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
  const [activeCategory, setActiveCategory] = useState(() => Object.keys(COCKTAIL_INGREDIENT_CATEGORIES)[0])
  const [filter, setFilter]             = useState("all")
  const [selectedRecipeId, setSelectedRecipeId] = useState(null)

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: publicData }, { data: privateData }] = await Promise.all([
      supabase.from("recipes").select("id, name, description, primary_tag, tags, photo_url, user_id").eq("is_public", true),
      supabase.from("recipes").select("id, name, description, primary_tag, tags, photo_url, user_id").eq("user_id", user.id).not("is_public", "is", true),
    ])
    const seen = new Set()
    const merged = [...(publicData || []), ...(privateData || [])].filter(r => {
      if (seen.has(r.id)) return false; seen.add(r.id); return true
    })
    setRecipes(merged.filter(r => getRecipeCategory(r.primary_tag, r.tags) === "boisson"))
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRecipes() }, [])

  const toggle = (key) => setSelected(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  )
  const selectFromSearch = (key) => { toggle(key); setSearchIng("") }
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
    // Les recettes avec 0 ingrédient trouvé vont en bas (avec les sans-photo)
    const matchA = haveA > 0
    const matchB = haveB > 0
    if (matchA && !matchB) return -1
    if (matchB && !matchA) return 1
    if (!matchA && !matchB) {
      // Parmi les 0-match : avec photo avant sans photo
      const hasPhotoA = !!a.photo_url
      const hasPhotoB = !!b.photo_url
      if (hasPhotoA && !hasPhotoB) return -1
      if (hasPhotoB && !hasPhotoA) return 1
      return 0
    }
    // Parmi les matchées : réalisables d'abord, puis tri par manquants croissants
    const canMakeA = a.missingCount === 0 && a.recipeIngs.length > 0
    const canMakeB = b.missingCount === 0 && b.recipeIngs.length > 0
    if (canMakeA && !canMakeB) return -1
    if (canMakeB && !canMakeA) return 1
    if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount
    return haveB - haveA
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
        padding: "6px 13px", borderRadius: 20, fontSize: 11, fontWeight: 700,
        fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em", cursor: "pointer",
        transition: "all 0.12s",
        border: "none",
        backgroundColor: active ? catInfo.color : "#FFFFFF",
        color: active ? "#fff" : "#1a1a1a",
        boxShadow: active ? "none" : "0 1px 3px rgba(0,0,0,0.12)",
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
        .cf-nav { width: 185px; flex-shrink: 0; border-right: 1px solid ${border}; overflow-y: auto; position: sticky; top: 0; height: 100vh; box-sizing: border-box; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .cf-left { width: 280px; flex-shrink: 0; border-right: 1px solid ${border}; padding: 14px 14px; overflow-y: auto; align-self: flex-start; position: sticky; top: 0; max-height: 100vh; box-sizing: border-box; }
        .cf-right { flex: 1; padding: 12px 14px; min-width: 0; overflow-y: auto; }
        .cf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .cf-card { background: ${surface}; border-radius: 14px; overflow: hidden; transition: transform 0.12s, box-shadow 0.12s; display: flex; flex-direction: column; }
        .cf-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.13); }
        .cf-nav::-webkit-scrollbar, .cf-left::-webkit-scrollbar { width: 3px; }
        .cf-nav::-webkit-scrollbar-thumb, .cf-left::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
        @media (max-width: 1000px) { .cf-grid { grid-template-columns: repeat(2,1fr); } .cf-nav { width: 150px; } .cf-left { width: 240px; } }
        @media (max-width: 680px) {
          .cf-body { flex-direction: column; overflow: visible; }
          .cf-nav { width: 100%; display: flex; flex-direction: row; overflow-x: auto; overflow-y: hidden; position: static; max-height: none; border-right: none; border-bottom: 1px solid ${border}; padding: 6px; gap: 4px; }
          .cf-left { width: 100%; position: static; max-height: none; border-right: none; border-bottom: 1px solid ${border}; }
          .cf-grid { grid-template-columns: 1fr 1fr; }
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
                padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
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

        {/* Colonne nav — catégories d'ingrédients */}
        <div className="cf-nav">
          {Object.entries(COCKTAIL_INGREDIENT_CATEGORIES).map(([catKey, catInfo]) => {
            const ings = COCKTAIL_INGREDIENTS.filter(i => i.category === catKey)
            const activeCount = ings.filter(i => selected.includes(i.key)).length
            const isActive = activeCategory === catKey
            return (
              <button key={catKey} onClick={() => setActiveCategory(catKey)} style={{
                width: "100%", flex: 1, padding: "8px 10px", cursor: "pointer", display: "flex",
                alignItems: "center", gap: 7, fontFamily: "Poppins, sans-serif", borderRadius: 10,
                backgroundColor: isActive ? catInfo.bg : catInfo.bg + (isDay ? "55" : "22"),
                border: "none",
                transition: "all 0.15s", boxSizing: "border-box",
              }}>
                <CatIcon catKey={catKey} />
                <span style={{ fontSize: 10, fontWeight: 700, color: catInfo.color, flex: 1, textAlign: "left", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {catInfo.label}
                </span>
                {activeCount > 0 && (
                  <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 10, backgroundColor: catInfo.color, color: "#fff", flexShrink: 0 }}>{activeCount}</span>
                )}
              </button>
            )
          })}
          {selected.length > 0 && (
            <button onClick={clearAll} style={{ width: "100%", padding: "7px 10px", border: `1.5px solid rgba(243,80,30,0.3)`, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 10, color: "#f3501e", backgroundColor: "transparent", marginTop: 4, boxSizing: "border-box" }}>
              × Effacer ({selected.length})
            </button>
          )}
        </div>

        {/* Panneau gauche — sélecteur d'ingrédients */}
        <div className="cf-left" style={{ backgroundColor: COCKTAIL_INGREDIENT_CATEGORIES[activeCategory].bg }}>
          {/* Titre catégorie active */}
          {(() => {
            const catInfo = COCKTAIL_INGREDIENT_CATEGORIES[activeCategory]
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <CatIcon catKey={activeCategory} />
                <span style={{ fontSize: 13, fontWeight: 700, color: catInfo.color, letterSpacing: "-0.04em", fontFamily: "Poppins, sans-serif" }}>{catInfo.label}</span>
              </div>
            )
          })()}

          {/* Recherche */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 11, opacity: 0.3, pointerEvents: "none" }}>🔍</span>
            <input value={searchIng} onChange={e => setSearchIng(e.target.value)}
              placeholder="Rechercher..."
              style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "7px 26px 7px 28px", fontSize: 11, outline: "none", backgroundColor: isDay ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${border}`, color: textMain, fontFamily: "Poppins, sans-serif", fontWeight: 500 }}
              onFocus={e => e.target.style.borderColor = "#d57bff"}
              onBlur={e => e.target.style.borderColor = border}
            />
            {searchIng && (
              <button onClick={() => setSearchIng("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textMuted, fontSize: 13, lineHeight: 1, padding: 2 }}>×</button>
            )}
          </div>

          {/* Pills ingrédients OU résultats de recherche */}
          {searchIng.trim() ? (
            ingSearchResults.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {ingSearchResults.map(ing => <SearchPill key={ing.key} ing={ing} catInfo={COCKTAIL_INGREDIENT_CATEGORIES[ing.category]} />)}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: textMuted, textAlign: "center", padding: "14px 0" }}>aucun résultat</div>
            )
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COCKTAIL_INGREDIENTS.filter(i => i.category === activeCategory).map(ing => (
                <AccordionPill key={ing.key} ing={ing} catInfo={COCKTAIL_INGREDIENT_CATEGORIES[activeCategory]} />
              ))}
            </div>
          )}

          {/* Sélectionnés */}
          {selected.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${border}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Sélectionnés ({selected.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {selected.map(key => {
                  const ing = COCKTAIL_INGREDIENTS.find(i => i.key === key)
                  const cat = COCKTAIL_INGREDIENT_CATEGORIES[ing?.category]
                  return (
                    <div key={key} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 8px 4px 10px", borderRadius: 20, backgroundColor: cat?.color || "#333" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em" }}>{ing?.label || key}</span>
                      <button onClick={() => toggle(key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 13, lineHeight: 1, padding: "0 0 0 2px", opacity: 0.7, display: "flex", alignItems: "center" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
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
                const hasSelection = selected.length > 0
                const haveNone   = hasSelection && totalCount > 0 && haveCount === 0
                const cardBorder = border

                const progressPct   = totalCount > 0 ? (haveCount / totalCount) * 100 : 0
                const progressColor = canMake ? "#22c55e" : haveCount > 0 ? "#f3501e" : (isDay ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)")
                const scoreColor    = canMake ? "#16a34a" : haveCount > 0 ? "#f3501e" : (isDay ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)")
                const isActive      = selectedRecipeId === recipe.id

                return (
                  <div key={recipe.id} className="cf-card"
                    style={{ border: `1.5px solid ${isActive ? "#d57bff" : cardBorder}`, opacity: haveNone ? 0.4 : 1, boxShadow: isActive ? "0 0 0 3px rgba(213,123,255,0.2)" : "none" }}
                  >
                    {/* Zone photo + overlays */}
                    <div style={{ position: "relative", paddingTop: "78%", cursor: "pointer" }}
                      onClick={() => setSelectedRecipeId(isActive ? null : recipe.id)}
                    >
                      {recipe.photo_url
                        ? <img src={recipe.photo_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <div style={{ position: "absolute", inset: 0, backgroundColor: tagInfo?.pillBg || (isDay ? "#e5e7eb" : "#1f2937") }} />
                      }
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.82) 75%, rgba(0,0,0,0.9) 100%)", pointerEvents: "none" }} />

                      {/* Tag pill — haut gauche */}
                      {tagInfo && (
                        <span style={{ position: "absolute", top: 9, left: 9, fontSize: 9.5, fontWeight: 700, padding: "3.5px 9.5px", borderRadius: 20, backgroundColor: tagInfo.pillBg, color: tagInfo.pillText, letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1 }}>
                          {tagInfo.label}
                        </span>
                      )}

                      {/* Badge haut droite — réalisable OU manquants */}
                      {hasSelection && canMake && (
                        <span style={{ position: "absolute", top: 9, right: 9, fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 20, backgroundColor: "#22c55e", color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                          ✓ réalisable
                        </span>
                      )}
                      {hasSelection && !canMake && recipe.missingCount >= 2 && recipe.missingCount <= 3 && haveCount >= 1 && (
                        <span style={{ position: "absolute", top: 9, right: 9, fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: 20, backgroundColor: "#f97316", color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                          {recipe.missingCount} manquants
                        </span>
                      )}

                      {/* Nom + description — bas */}
                      <div style={{ position: "absolute", bottom: 10, left: 11, right: 11 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.05em", lineHeight: 1.2, marginBottom: 3, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
                          {recipe.name}
                        </div>
                        {recipe.description && (
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: "-0.02em", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                            {recipe.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Barre du bas : progress + score */}
                    <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, backgroundColor: surface, cursor: "pointer" }}
                      onClick={() => setSelectedRecipeId(isActive ? null : recipe.id)}
                    >
                      <div style={{ flex: 1, height: 5, borderRadius: 5, backgroundColor: isDay ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                        <div style={{ width: `${progressPct}%`, height: "100%", backgroundColor: progressColor, borderRadius: 5, transition: "width 0.3s ease" }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor, letterSpacing: "-0.02em", flexShrink: 0 }}>
                        {haveCount}/{totalCount}
                      </span>
                      <span style={{ fontSize: 11, color: textMuted, lineHeight: 1, transform: isActive ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
                    </div>

                    {/* Expansion — liste ingrédients */}
                    {isActive && (
                      <div style={{ borderTop: `1px solid ${border}`, backgroundColor: surface }}>
                        <div style={{ padding: "10px 10px 6px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {recipe.recipeIngs.map(key => {
                            const ing = COCKTAIL_INGREDIENTS.find(i => i.key === key)
                            const cat = COCKTAIL_INGREDIENT_CATEGORIES[ing?.category]
                            const have = selected.includes(key)
                            return (
                              <span key={key} style={{
                                padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                                fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em",
                                border: `1.5px solid ${have ? (cat?.color || "#22c55e") : border}`,
                                backgroundColor: have ? (cat?.bg || (isDay ? "#f0fdf4" : "rgba(34,197,94,0.12)")) : "transparent",
                                color: have ? (cat?.color || "#15803d") : textMuted,
                              }}>
                                {ing?.label || key}
                              </span>
                            )
                          })}
                        </div>
                        <div style={{ padding: "6px 10px 10px" }}>
                          <button onClick={e => { e.stopPropagation(); navigate(`/recipes/${recipe.id}`) }} style={{
                            width: "100%", padding: "9px", borderRadius: 10, border: "none", cursor: "pointer",
                            backgroundColor: "#f3501e", color: "#fff",
                            fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "-0.04em",
                          }}>
                            voir la recette →
                          </button>
                        </div>
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

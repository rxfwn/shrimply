import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { computeCostDetails } from "../utils/priceEngine"
import ImageUploadCropper from "./ImageUploadCropper"
import { TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_BORDER } from "../tags"
import { useTheme } from "../context/ThemeContext"

function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

function TagPill({ tag, active, onClick, anyActive = false }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em",
      cursor: "pointer", border: "none",
      backgroundColor: tag.pillBg, color: tag.pillText,
      opacity: anyActive && !active ? 0.35 : 1,
      transform: active ? "scale(1.1)" : "scale(1)",
      boxShadow: active ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
      transition: "all 0.15s",
    }}>
      <img src={`/icons/${tag.icon}.webp`} alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display="none"} />
      {tag.label}
    </button>
  )
}

const UNITS = ["g","kg","ml","cl","L","c. à café","c. à soupe","pincée","poignée","paquet","boîte","tranche","pièce","selon goût"]

export default function RecipeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDay } = useTheme()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [servings, setServings] = useState("")
  const [primaryTag, setPrimaryTag] = useState("")
  const [selectedTags, setSelectedTags] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [steps, setSteps] = useState([])
  const [photoUrl, setPhotoUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bannedPopup, setBannedPopup] = useState(null)
  const [showUnsavedPopup, setShowUnsavedPopup] = useState(false)
  const initialData = useRef(null)
  const initialEstimatedTotal = useRef(null)
  const isDirty = () => {
    if (!initialData.current) return false
    const current = JSON.stringify({ name, description, prepTime: String(prepTime), servings: String(servings), primaryTag, selectedTags, ingredients, steps, photoUrl })
    return current !== initialData.current
  }

  useEffect(() => { fetchRecipe() }, [id])

  const fetchRecipe = async () => {
    const { data: recipe } = await supabase.from("recipes").select("*").eq("id", id).single()
    const { data: ingredientsData } = await supabase.from("ingredients").select("*").eq("recipe_id", id)
    const { data: stepsData } = await supabase.from("steps").select("*").eq("recipe_id", id).order("step_number")
    if (recipe) {
      const ings = ingredientsData?.map(i => ({ ...i })) || [{ name: "", quantity: "", unit: "" }]
      const stps = stepsData?.map(s => ({ ...s })) || [{ description: "" }]
      setName(recipe.name); setDescription(recipe.description || ""); setPrepTime(recipe.prep_time || ""); setServings(recipe.servings || "")
      setPrimaryTag(recipe.primary_tag || ""); setSelectedTags(recipe.tags || []); setPhotoUrl(recipe.photo_url || "")
      setIngredients(ings); setSteps(stps)
      initialData.current = JSON.stringify({ name: recipe.name, description: recipe.description || "", prepTime: String(recipe.prep_time || ""), servings: String(recipe.servings || ""), primaryTag: recipe.primary_tag || "", selectedTags: recipe.tags || [], ingredients: ings, steps: stps, photoUrl: recipe.photo_url || "" })
      initialEstimatedTotal.current = recipe.estimated_total ?? null
    }
    setLoading(false)
  }

  const handleBack = () => { if (isDirty()) setShowUnsavedPopup(true); else navigate(`/recipes/${id}`) }

  const checkBannedWords = async (textsToCheck) => {
    const { data: banned } = await supabase.from("banned_words").select("word")
    if (!banned) return null
    const fullText = textsToCheck.join(" ").toLowerCase()
    for (const { word } of banned) { if (new RegExp(`\\b${word.toLowerCase()}\\b`, "i").test(fullText)) return word }
    return null
  }

  const ingredientNameRefs = useRef([])

  const toggleTag = (v) => setSelectedTags(prev => prev.includes(v) ? prev.filter(t => t !== v) : [...prev, v])
  const addIngredient = () => setIngredients(prev => [...prev, { name: "", quantity: "", unit: "" }])
  const removeIngredient = (i) => setIngredients(prev => prev.filter((_, idx) => idx !== i))
  const updateIngredient = (i, f, v) => setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [f]: v } : ing))

  const handleIngredientKeyDown = (e, i) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    setIngredients(prev => {
      const next = [...prev, { name: "", quantity: "", unit: "" }]
      setTimeout(() => ingredientNameRefs.current[next.length - 1]?.focus(), 0)
      return next
    })
  }
  const addStep = () => setSteps(prev => [...prev, { description: "" }])
  const removeStep = (i) => setSteps(prev => prev.filter((_, idx) => idx !== i))
  const updateStep = (i, v) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, description: v } : s))

  const handleSave = async (thenNavigate = true) => {
    setSaving(true); setShowUnsavedPopup(false)
    const found = await checkBannedWords([name, description, ...ingredients.map(i => i.name), ...steps.map(s => s.description)])
    if (found) { setBannedPopup(found); setSaving(false); return }
    const validIngredients = ingredients.filter(i => i.name.trim())

    // Calcul du prix estimé — uniquement si les ingrédients ont changé
    let estimatedTotal = initialEstimatedTotal.current
    let costDetails = null
    const initialParsed = initialData.current ? JSON.parse(initialData.current) : null
    const ingredientsChanged = !initialParsed || JSON.stringify(validIngredients.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit }))) !== JSON.stringify(initialParsed.ingredients.filter(i => i.name?.trim()).map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })))
    if (validIngredients.length > 0 && (ingredientsChanged || initialEstimatedTotal.current === null)) {
      try {
        const { total, details } = await computeCostDetails(
          validIngredients.map(i => ({ ...i, quantity: parseFloat(i.quantity) || null })),
          parseInt(servings) || null
        )
        const hasAnyMatch = details?.some(d => d.found)
        estimatedTotal = hasAnyMatch ? total : null
        costDetails = details
      } catch (e) {
        // API indisponible → on garde la valeur existante
      }
    }

    // Tag économique automatique (< 3€/personne)
    const ECONOMIC_THRESHOLD = 3
    const autoTags = [...selectedTags]
    if (estimatedTotal !== null && parseInt(servings) > 0) {
      const perServing = estimatedTotal / parseInt(servings)
      if (perServing > 0 && perServing < ECONOMIC_THRESHOLD && !autoTags.includes("economique")) autoTags.push("economique")
      else if (perServing >= ECONOMIC_THRESHOLD) { const idx = autoTags.indexOf("economique"); if (idx !== -1) autoTags.splice(idx, 1) }
    }

    // Tag sans-four automatique (aucune mention du four dans nom, description ou étapes)
    const FOUR_KEYWORDS = ["four", "préchauffer", "préchauffé", "préchauffée", "enfourner", "enfournez", "enfourne", "gratin", "gratiner", "rôtir", "rotir"]
    const allText = [name, description, ...steps.map(s => s.description)].join(" ").toLowerCase()
    const usesFour = FOUR_KEYWORDS.some(kw => allText.includes(kw))
    if (!usesFour) {
      if (!autoTags.includes("sansfour")) autoTags.push("sansfour")
    } else {
      const idx = autoTags.indexOf("sansfour")
      if (idx !== -1) autoTags.splice(idx, 1)
    }

    await supabase.from("recipes").update({ name, description, prep_time: parseInt(prepTime) || null, servings: parseInt(servings) || null, primary_tag: primaryTag || null, tags: autoTags, photo_url: photoUrl || null, estimated_total: estimatedTotal }).eq("id", id)
    await supabase.from("ingredients").delete().eq("recipe_id", id)
    if (validIngredients.length > 0) {
      const rows = validIngredients.map(i => ({ recipe_id: id, name: i.name, quantity: parseFloat(i.quantity) || null, unit: i.unit }))
      const { data: inserted } = await supabase.from("ingredients").insert(rows).select()
      // Mise à jour du prix estimé séparément (ne bloque pas si la colonne n'existe pas encore)
      if (inserted && costDetails) {
        await Promise.allSettled(inserted.map(ing => {
          const detail = costDetails.find(d => d.name.toLowerCase() === ing.name.toLowerCase())
          if (!detail?.found) return Promise.resolve()
          return supabase.from("ingredients").update({ estimated_price: detail.estimated_price }).eq("id", ing.id)
        }))
      }
    }
    await supabase.from("steps").delete().eq("recipe_id", id)
    const validSteps = steps.filter(s => s.description.trim())
    if (validSteps.length > 0) await supabase.from("steps").insert(validSteps.map((s, idx) => ({ recipe_id: id, step_number: idx + 1, description: s.description })))
    setSaving(false); setSuccess(true)
    setTimeout(() => { setSuccess(false); if (thenNavigate) navigate(`/recipes/${id}`) }, 1500)
  }

  const primaryTagInfo = TAGS.find(t => t.value === primaryTag)
  const cardBg = primaryTagInfo?.cardBg || DEFAULT_CARD_BG
  const cardBorder = primaryTagInfo?.cardBorder || DEFAULT_CARD_BORDER
  const cardText = getTextColor(cardBg)

  const btnBase = { fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-0.05em", border: "none", cursor: "pointer", borderRadius: 10, transition: "transform 0.15s" }
  const inputStyle = { width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--input-border)", color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 500, letterSpacing: "-0.05em", boxSizing: "border-box", transition: "border-color 0.15s" }
  const labelStyle = { fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: "Poppins, sans-serif", color: "var(--text-faint)", fontSize: 13 }}>chargement...</div>

  return (
    <div style={{ padding: "24px", backgroundColor: "var(--bg-main)", minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease" }}>

      {/* POPUP NON SAUVEGARDÉ */}
      {showUnsavedPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 16, maxWidth: 380, width: "100%", overflow: "hidden", border: "1px solid var(--border)" }}>
            <div style={{ backgroundColor: "rgba(251,191,36,0.08)", padding: "28px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid rgba(251,191,36,0.12)" }}>
              <div style={{ width: 52, height: 52, backgroundColor: "var(--bg-card-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.05em" }}>modifications non sauvegardées</h2>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)", textAlign: "center", fontWeight: 500 }}>tu as des changements en cours. que veux-tu faire ?</p>
            </div>
            <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => handleSave(true)} disabled={saving}
                style={{ ...btnBase, width: "100%", padding: "12px", backgroundColor: "#f3501e", color: "#ffffff", opacity: saving ? 0.5 : 1 }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = "scale(1.02)" }}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >{saving ? "sauvegarde..." : "💾 sauvegarder et quitter"}</button>
              <button onClick={() => { setShowUnsavedPopup(false); navigate(`/recipes/${id}`) }}
                style={{ ...btnBase, width: "100%", padding: "12px", backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >annuler les modifications</button>
              <button onClick={() => setShowUnsavedPopup(false)}
                style={{ ...btnBase, width: "100%", padding: "8px", backgroundColor: "transparent", color: "var(--text-faint)", fontSize: 12 }}
              >continuer à modifier</button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODÉRATION */}
      {bannedPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 16, maxWidth: 360, width: "100%", overflow: "hidden", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ backgroundColor: "rgba(239,68,68,0.08)", padding: "28px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid rgba(239,68,68,0.12)" }}>
              <div style={{ width: 52, height: 52, backgroundColor: "var(--bg-card-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 12 }}>🚨</div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>contenu bloqué</h2>
            </div>
            <div style={{ padding: "20px 24px 24px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>terme non autorisé :</p>
              <div style={{ display: "inline-block", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "6px 16px", borderRadius: 8, fontWeight: 700, marginBottom: 8 }}>« {bannedPopup} »</div>
              <p style={{ margin: "0 0 16px", fontSize: 11, color: "var(--text-faint)", fontStyle: "italic" }}>(bien essayé 😎)</p>
              <button onClick={() => setBannedPopup(null)}
                style={{ ...btnBase, width: "100%", padding: "11px", backgroundColor: "#f87171", color: "#ffffff" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >j'ai compris</button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, backgroundColor: "#34d399", color: "#064e3b", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          ✅ recette modifiée !
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={handleBack} style={{ ...btnBase, background: "none", color: "var(--text-muted)", fontSize: 12, padding: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-main)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
        >← retour</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.05em", display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/icons/pencil.webp" alt="" style={{ width: 20, height: 20 }} onError={e => e.target.style.display = "none"} />
          modifier la recette
        </h1>
      </div>

      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, paddingBottom: 100, display: "flex", flexDirection: "column", gap: 20, maxWidth: 780, margin: "0 auto" }}>

        <ImageUploadCropper onImageSaved={(url) => setPhotoUrl(url || "")} existingUrl={photoUrl || null} recipeId={id} />

        <div>
          <label style={labelStyle}>nom de la recette *</label>
          <input style={inputStyle} placeholder="ex : pâtes carbonara" value={name} onChange={e => setName(e.target.value)}
            onFocus={e => e.target.style.borderColor = "#f3501e"} onBlur={e => e.target.style.borderColor = "var(--input-border)"} />
        </div>

        <div>
          <label style={labelStyle}>description</label>
          <textarea style={{ ...inputStyle, resize: "none", minHeight: 70 }} placeholder="décris ta recette..." rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="form-time-grid">
          <div>
            <label style={labelStyle}>temps (min)</label>
            <input style={inputStyle} placeholder="ex : 30" type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>portions</label>
            <input style={inputStyle} placeholder="ex : 4" type="number" value={servings} onChange={e => setServings(e.target.value)} />
          </div>
        </div>

        {/* Tag principal */}
        <div>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
            <img src="/icons/paint.webp" alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display="none"} />
            tag principal <span style={{ fontWeight: 400, color: "var(--text-ghost)", textTransform: "none", letterSpacing: "normal" }}>— détermine la couleur de la carte</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {TAGS.map(tag => {
              const isMain = primaryTag === tag.value
              return (
                <button key={tag.value} onClick={() => setPrimaryTag(isMain ? "" : tag.value)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em", border: "none", backgroundColor: tag.pillBg, color: tag.pillText, opacity: primaryTag && !isMain ? 0.35 : 1, transform: isMain ? "scale(1.1)" : "scale(1)", boxShadow: isMain ? "0 2px 8px rgba(0,0,0,0.2)" : "none", transition: "all 0.15s" }}>
                  <img src={`/icons/${tag.icon}.webp`} alt="" style={{ width: 16, height: 16 }} onError={e => e.target.style.display="none"} />
                  {tag.label}
                </button>
              )
            })}
          </div>
          {primaryTag && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 64, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, backgroundColor: cardBg, border: `2px solid ${cardBorder}`, color: cardText }}>carte</div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>aperçu de la couleur</span>
            </div>
          )}
        </div>

        {/* Tags secondaires */}
        <div>
          <label style={labelStyle}>
            tags secondaires <span style={{ fontWeight: 400, color: "var(--text-ghost)", textTransform: "none", letterSpacing: "normal" }}>— optionnels</span>
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TAGS.filter(tag => tag.value !== primaryTag).map(tag => (
              <TagPill key={tag.value} tag={tag} active={selectedTags.includes(tag.value)} anyActive={selectedTags.length > 0} onClick={() => toggleTag(tag.value)} />
            ))}
          </div>
        </div>

        {/* Ingrédients */}
        <div>
          <label style={labelStyle}>ingrédients</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ingredients.map((ing, i) => (
              <div key={i} className="ingredient-row">
                <div className="ing-name">
                  <input ref={el => ingredientNameRefs.current[i] = el}
                    style={{ width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--input-border)", color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 500, boxSizing: "border-box" }}
                    placeholder="ingrédient" value={ing.name} onChange={e => updateIngredient(i, "name", e.target.value)}
                    onKeyDown={e => handleIngredientKeyDown(e, i)} />
                </div>
                <div className="ing-qty">
                  <input style={{ width: "100%", borderRadius: 10, padding: "10px 10px", fontSize: 13, outline: "none", backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--input-border)", color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 500, boxSizing: "border-box" }}
                    placeholder="qté" type="number" value={ing.quantity || ""} onChange={e => updateIngredient(i, "quantity", e.target.value)} />
                </div>
                <div className="ing-unit">
                  <select style={{ width: "100%", borderRadius: 10, padding: "10px 10px", fontSize: 13, outline: "none", backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--input-border)", color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 500, boxSizing: "border-box", appearance: "none" }}
                    value={ing.unit || ""} onChange={e => updateIngredient(i, "unit", e.target.value)}>
                    <option value="" disabled>unité</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                {ingredients.length > 1 && (
                  <button onClick={() => removeIngredient(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)", fontSize: 20, lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-ghost)"}
                  >×</button>
                )}
              </div>
            ))}
            <button onClick={addIngredient} style={{ background: "none", border: "none", cursor: "pointer", color: "#f3501e", fontSize: 13, fontWeight: 700, fontFamily: "Poppins, sans-serif", textAlign: "left", padding: 0, marginTop: 4 }}>
              + ajouter un ingrédient
            </button>
          </div>
        </div>

        {/* Étapes */}
        <div>
          <label style={labelStyle}>étapes</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f3501e", marginTop: 12, width: 20, flexShrink: 0 }}>{i + 1}.</span>
                <textarea style={{ flex: 1, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--input-border)", color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 500, boxSizing: "border-box", resize: "none", minHeight: 70 }}
                  placeholder={`étape ${i + 1}...`} rows={2}
                  value={step.description} onChange={e => updateStep(i, e.target.value)} />
                {steps.length > 1 && (
                  <button onClick={() => removeStep(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)", fontSize: 20, lineHeight: 1, marginTop: 10 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-ghost)"}
                  >×</button>
                )}
              </div>
            ))}
            <button onClick={addStep} style={{ background: "none", border: "none", cursor: "pointer", color: "#f3501e", fontSize: 13, fontWeight: 700, fontFamily: "Poppins, sans-serif", textAlign: "left", padding: 0, marginTop: 4 }}>
              + ajouter une étape
            </button>
          </div>
        </div>

        {/* Boutons sticky */}
        <div style={{ position: "sticky", bottom: 24, zIndex: 40, display: "flex", justifyContent: "center", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 12, backgroundColor: "var(--bg-main)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", padding: "16px 24px", borderRadius: 10, width: "100%", maxWidth: 400, border: "1px solid var(--border)" }}>
            <button onClick={handleBack}
              style={{ ...btnBase, flex: 1, padding: "10px", backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)", borderRadius: 8 }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >annuler</button>
            <button onClick={() => handleSave(true)} disabled={!name || saving}
              style={{ ...btnBase, flex: 1, padding: "10px", backgroundColor: "#f3501e", color: "#ffffff", borderRadius: 8, opacity: !name || saving ? 0.5 : 1 }}
              onMouseEnter={e => { if (name && !saving) e.currentTarget.style.transform = "scale(1.02)" }}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {saving ? "vérification..." : <><img src="/icons/save.webp" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 6 }} onError={e => e.target.style.display = "none"} />sauvegarder</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
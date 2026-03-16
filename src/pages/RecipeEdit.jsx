import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import ImageUploadCropper from "./ImageUploadCropper"
import { TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_TEXT, DEFAULT_CARD_BORDER } from "../tags"

function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

// ── Composant Tag pill ───────────────────────────────────────────────────────
function TagPill({ tag, active, onClick, size = "md" }) {
  const sz = size === "sm" ? "px-2 py-0.5 text-[10px] gap-1" : "px-3 py-1.5 text-xs gap-1.5"
  const iconSz = size === "sm" ? 14 : 18
  return (
    <button onClick={onClick}
      className={`flex items-center rounded-full font-semibold transition-all ${sz} ${
        active 
          ? "ring-2 ring-white/30 scale-105 opacity-100 shadow-sm" // Style quand sélectionné
          : "opacity-50 hover:opacity-80" // Style quand non-sélectionné
      }`}
      style={{ backgroundColor: tag.pillBg }}>
      <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: iconSz, height: iconSz, filter: "none", opacity: 1 }} onError={e => { e.target.style.display="none" }} />
      <span className="pill-label" style={{ color: tag.pillText }}>{tag.label}</span>
    </button>
  )
}

const UNITS = ["g","kg","ml","cl","L","c. à café","c. à soupe","pincée","poignée","paquet","boîte","tranche","pièce"]

export default function RecipeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
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
      setName(recipe.name)
      setDescription(recipe.description || "")
      setPrepTime(recipe.prep_time || "")
      setServings(recipe.servings || "")
      setPrimaryTag(recipe.primary_tag || "")
      setSelectedTags(recipe.tags || [])
      setPhotoUrl(recipe.photo_url || "")
      setIngredients(ings)
      setSteps(stps)
      initialData.current = JSON.stringify({
        name: recipe.name, description: recipe.description || "",
        prepTime: String(recipe.prep_time || ""), servings: String(recipe.servings || ""),
        primaryTag: recipe.primary_tag || "", selectedTags: recipe.tags || [],
        ingredients: ings, steps: stps, photoUrl: recipe.photo_url || "",
      })
    }
    setLoading(false)
  }

  const handleBack = () => {
    if (isDirty()) setShowUnsavedPopup(true)
    else navigate(`/recipes/${id}`)
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

  const toggleTag = (v) => setSelectedTags(prev => prev.includes(v) ? prev.filter(t => t !== v) : [...prev, v])
  const addIngredient = () => setIngredients(prev => [...prev, { name: "", quantity: "", unit: "" }])
  const removeIngredient = (i) => setIngredients(prev => prev.filter((_, idx) => idx !== i))
  const updateIngredient = (i, f, v) => setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [f]: v } : ing))
  const addStep = () => setSteps(prev => [...prev, { description: "" }])
  const removeStep = (i) => setSteps(prev => prev.filter((_, idx) => idx !== i))
  const updateStep = (i, v) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, description: v } : s))

  const handleSave = async (thenNavigate = true) => {
    setSaving(true)
    setShowUnsavedPopup(false)
    const found = await checkBannedWords([name, description, ...ingredients.map(i => i.name), ...steps.map(s => s.description)])
    if (found) { setBannedPopup(found); setSaving(false); return }

    await supabase.from("recipes").update({
      name, description,
      prep_time: parseInt(prepTime) || null,
      servings: parseInt(servings) || null,
      primary_tag: primaryTag || null,
      tags: selectedTags,
      photo_url: photoUrl || null,
    }).eq("id", id)

    await supabase.from("ingredients").delete().eq("recipe_id", id)
    const validIngredients = ingredients.filter(i => i.name.trim())
    if (validIngredients.length > 0) {
      await supabase.from("ingredients").insert(validIngredients.map(i => ({ recipe_id: id, name: i.name, quantity: parseFloat(i.quantity) || null, unit: i.unit })))
    }

    await supabase.from("steps").delete().eq("recipe_id", id)
    const validSteps = steps.filter(s => s.description.trim())
    if (validSteps.length > 0) {
      await supabase.from("steps").insert(validSteps.map((s, idx) => ({ recipe_id: id, step_number: idx + 1, description: s.description })))
    }

    setSaving(false)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); if (thenNavigate) navigate(`/recipes/${id}`) }, 1500)
  }

  const inputClass = "w-full rounded-[10px] px-3 py-2.5 text-sm outline-none transition border border-zinc-700 bg-zinc-800 text-white focus:border-zinc-500"

  // Prévisualisation couleur carte
  const primaryTagInfo = TAGS.find(t => t.value === primaryTag)
  const cardBg = primaryTagInfo?.cardBg || DEFAULT_CARD_BG
  const cardBorder = primaryTagInfo?.cardBorder || DEFAULT_CARD_BORDER
  const cardText = getTextColor(cardBg)

  if (loading) return <div className="p-6 text-zinc-400 text-sm">Chargement...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* POPUP NON SAUVEGARDÉ */}
      {showUnsavedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/70 backdrop-blur-sm">
          <div className="bg-zinc-800 rounded-[10px] shadow-2xl max-w-sm w-full overflow-hidden border border-zinc-700">
            <div className="pt-8 pb-6 px-6 flex flex-col items-center border-b border-zinc-700">
              <div className="w-16 h-16 bg-amber-900/30 rounded-full flex items-center justify-center text-3xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-white text-center">Modifications non sauvegardées</h2>
              <p className="text-sm text-zinc-400 text-center mt-2">Tu as des changements en cours. Que veux-tu faire ?</p>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full bg-[#f3501e] hover:bg-[#e04418] text-white py-3.5 rounded-[10px] text-sm font-bold transition disabled:opacity-50">
                {saving ? "Sauvegarde..." : "💾 Sauvegarder et quitter"}
              </button>
              <button onClick={() => { setShowUnsavedPopup(false); navigate(`/recipes/${id}`) }}
                className="w-full border border-zinc-600 text-zinc-300 py-3.5 rounded-[10px] text-sm font-medium hover:bg-zinc-700 transition">
                Annuler les modifications
              </button>
              <button onClick={() => setShowUnsavedPopup(false)}
                className="w-full text-zinc-500 hover:text-zinc-300 py-2 text-sm transition">
                Continuer à modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODÉRATION */}
      {bannedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/70 backdrop-blur-sm">
          <div className="bg-zinc-800 rounded-[10px] shadow-2xl max-w-sm w-full overflow-hidden border border-red-900/30">
            <div className="bg-red-900/10 pt-8 pb-6 px-6 flex flex-col items-center border-b border-red-900/20">
              <div className="w-16 h-16 bg-zinc-800 shadow-sm rounded-full flex items-center justify-center text-3xl mb-4">🚨</div>
              <h2 className="text-xl font-bold text-white text-center">Contenu bloqué</h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-zinc-300 mb-4">Terme non autorisé :</p>
              <div className="inline-block bg-zinc-900 border border-red-800/50 text-red-400 px-5 py-2.5 rounded-[10px] font-bold mb-4">« {bannedPopup} »</div>
              <p className="text-xs text-zinc-500 italic mb-6">(bien essayé petit malin 😎)</p>
              <button onClick={() => setBannedPopup(null)} className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-[10px] text-sm font-bold transition">J'ai compris</button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-[10px] shadow-lg text-sm font-bold">
          ✅ Recette modifiée !
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="text-zinc-400 hover:text-zinc-200 transition text-sm font-medium">retour</button>
        <h1 className="text-2xl font-bold text-white">✏️ Modifier la recette</h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-[10px] p-6 shadow-sm">
        <div className="flex flex-col gap-5">

          {/* Photo */}
          <ImageUploadCropper onImageSaved={(url) => setPhotoUrl(url || "")} existingUrl={photoUrl || null} recipeId={id} />

          {/* Nom */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Nom de la recette *</label>
            <input className={inputClass} placeholder="Ex: Pâtes carbonara" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Description</label>
            <textarea className={`${inputClass} resize-none`} placeholder="Décris ta recette..." rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Temps + Portions */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Temps (min)</label>
              <input className={inputClass} placeholder="Ex: 30" type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Portions</label>
              <input className={inputClass} placeholder="Ex: 4" type="number" value={servings} onChange={e => setServings(e.target.value)} />
            </div>
          </div>

          {/* Tag principal */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
              🎨 Tag principal <span className="font-normal text-zinc-600 normal-case tracking-normal">— détermine la couleur de la carte</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {TAGS.map(tag => {
                const isMain = primaryTag === tag.value
                return (
                  <button key={tag.value} onClick={() => setPrimaryTag(isMain ? "" : tag.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      isMain 
                        ? "scale-110 opacity-100 shadow-md mx-1" 
                        : (primaryTag !== "" ? "opacity-40 hover:opacity-100 hover:scale-105" : "opacity-100 hover:scale-105")
                    }`}
                    style={{ backgroundColor: tag.pillBg }}>
                    <img src={`/icons/${tag.icon}.png`} alt="" style={{ width: 16, height: 16, filter: "none" }} onError={e => { e.target.style.display="none" }} />
                    <span style={{ color: tag.pillText }}>{tag.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Prévisualisation carte */}
            {primaryTag && (
              <div className="flex items-center gap-3 mt-1">
                <div className="w-16 h-10 rounded-[10px] flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: cardBg, border: `2px solid ${cardBorder}`, color: cardText }}>
                  Carte
                </div>
                <span className="text-xs text-zinc-400">Aperçu de la couleur de ta carte</span>
              </div>
            )}
          </div>

          {/* Tags secondaires */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
              Tags secondaires <span className="font-normal text-zinc-600 normal-case tracking-normal">— optionnels</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TAGS.filter(tag => tag.value !== primaryTag).map(tag => (
                <TagPill 
                  key={tag.value} 
                  tag={tag} 
                  active={selectedTags.includes(tag.value)} 
                  anyActive={selectedTags.length > 0} 
                  onClick={() => toggleTag(tag.value)} 
                />
              ))}
            </div>
          </div>

          {/* Ingrédients */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Ingrédients</label>
            <div className="flex flex-col gap-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input className="flex-[2] rounded-[10px] px-3 py-2.5 text-sm outline-none border border-zinc-700 bg-zinc-800 text-white focus:border-zinc-500"
                    placeholder="Ingrédient" value={ing.name} onChange={e => updateIngredient(i, "name", e.target.value)} />
                  <input className="w-16 rounded-[10px] px-2 py-2.5 text-sm outline-none border border-zinc-700 bg-zinc-800 text-white focus:border-zinc-500"
                    placeholder="Qté" type="number" value={ing.quantity || ""} onChange={e => updateIngredient(i, "quantity", e.target.value)} />
                  <select className="w-28 rounded-[10px] px-2 py-2.5 text-sm outline-none border border-zinc-700 bg-zinc-800 text-white focus:border-zinc-500"
                    value={ing.unit || ""} onChange={e => updateIngredient(i, "unit", e.target.value)}>
                    <option value="" disabled>Unité</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {ingredients.length > 1 && <button onClick={() => removeIngredient(i)} className="text-zinc-500 hover:text-red-400 transition text-lg leading-none">×</button>}
                </div>
              ))}
              <button onClick={addIngredient} className="text-sm text-[#f3501e] hover:text-[#e04418] transition text-left font-bold mt-1">+ Ajouter un ingrédient</button>
            </div>
          </div>

          {/* Étapes */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Étapes</label>
            <div className="flex flex-col gap-2">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs font-black text-[#f3501e] mt-3 w-5 flex-shrink-0">{i + 1}.</span>
                  <textarea
                    className="flex-1 rounded-[10px] px-3 py-2.5 text-sm outline-none border border-zinc-700 bg-zinc-800 text-white focus:border-zinc-500 resize-none"
                    placeholder={`Étape ${i + 1}...`} rows={2}
                    value={step.description} onChange={e => updateStep(i, e.target.value)}
                  />
                  {steps.length > 1 && <button onClick={() => removeStep(i)} className="text-zinc-500 hover:text-red-400 transition text-lg leading-none mt-2">×</button>}
                </div>
              ))}
              <button onClick={addStep} className="text-sm text-[#f3501e] hover:text-[#e04418] transition text-left font-bold mt-1">+ Ajouter une étape</button>
            </div>
          </div>

          {/* Boutons sticky */}
          <div className="sticky bottom-8 z-40 flex justify-center mt-4">
            <div className="flex gap-3 bg-zinc-900/90 backdrop-blur-md px-8 py-3 rounded-[10px] shadow-2xl border border-zinc-700 w-full max-w-sm">
              <button onClick={handleBack}
                className="flex-1 border border-zinc-600 text-zinc-300 px-5 py-2 rounded-[10px] text-sm font-medium hover:bg-zinc-700 transition">
                Annuler
              </button>
              <button onClick={() => handleSave(true)} disabled={!name || saving}
                className="flex-1 bg-[#f3501e] hover:bg-[#e04418] text-white px-6 py-2 rounded-[10px] text-sm font-bold transition disabled:opacity-50 shadow-md">
                {saving ? "Vérification..." : "💾 Sauvegarder"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
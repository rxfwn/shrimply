import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import ImageUploadCropper from "./ImageUploadCropper"

const TAGS = ["🌿 Végé", "🍝 Italien", "🥢 Asiatique", "🇫🇷 Français", "⚡ Rapide", "💪 Protéiné", "🥗 Léger", "🍰 Dessert", "💰 Économique"]

const UNITS = [
  "g", "kg", "ml", "cl", "L",
  "c. à café", "c. à soupe",
  "pincée", "poignée",
  "paquet", "boîte", "tranche", "pièce"
]

export default function RecipeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [servings, setServings] = useState("")
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
    const current = JSON.stringify({
      name, description,
      prepTime: String(prepTime),
      servings: String(servings),
      selectedTags, ingredients, steps, photoUrl
    })
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
      setSelectedTags(recipe.tags || [])
      setPhotoUrl(recipe.photo_url || "")
      setIngredients(ings)
      setSteps(stps)

      initialData.current = JSON.stringify({
        name: recipe.name,
        description: recipe.description || "",
        prepTime: String(recipe.prep_time || ""),
        servings: String(recipe.servings || ""),
        selectedTags: recipe.tags || [],
        ingredients: ings,
        steps: stps,
        photoUrl: recipe.photo_url || "",
      })
    }
    setLoading(false)
  }

  const handleBack = () => {
    if (isDirty()) {
      setShowUnsavedPopup(true)
    } else {
      navigate(`/recipes/${id}`)
    }
  }

  const checkBannedWords = async (textsToCheck) => {
    const { data: banned } = await supabase.from("banned_words").select("word")
    if (!banned) return null
    const fullText = textsToCheck.join(" ").toLowerCase()
    for (const { word } of banned) {
      const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, "i")
      if (regex.test(fullText)) return word
    }
    return null
  }

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const addIngredient = () => setIngredients(prev => [...prev, { name: "", quantity: "", unit: "" }])
  const removeIngredient = (index) => setIngredients(prev => prev.filter((_, i) => i !== index))
  const updateIngredient = (index, field, value) => setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))

  const addStep = () => setSteps(prev => [...prev, { description: "" }])
  const removeStep = (index) => setSteps(prev => prev.filter((_, i) => i !== index))
  const updateStep = (index, value) => setSteps(prev => prev.map((step, i) => i === index ? { ...step, description: value } : step))

  const handleSave = async (thenNavigate = true) => {
    setSaving(true)
    setShowUnsavedPopup(false)

    const textsToCheck = [name, description, ...ingredients.map(i => i.name), ...steps.map(s => s.description)]
    const found = await checkBannedWords(textsToCheck)
    if (found) {
      setBannedPopup(found)
      setSaving(false)
      return
    }

    await supabase.from("recipes").update({
      name,
      description,
      prep_time: parseInt(prepTime) || null,
      servings: parseInt(servings) || null,
      tags: selectedTags,
      photo_url: photoUrl || null,
    }).eq("id", id)

    await supabase.from("ingredients").delete().eq("recipe_id", id)
    const validIngredients = ingredients.filter(i => i.name.trim())
    if (validIngredients.length > 0) {
      await supabase.from("ingredients").insert(
        validIngredients.map(i => ({ recipe_id: id, name: i.name, quantity: parseFloat(i.quantity) || null, unit: i.unit }))
      )
    }

    await supabase.from("steps").delete().eq("recipe_id", id)
    const validSteps = steps.filter(s => s.description.trim())
    if (validSteps.length > 0) {
      await supabase.from("steps").insert(
        validSteps.map((s, index) => ({ recipe_id: id, step_number: index + 1, description: s.description }))
      )
    }

    setSaving(false)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); if (thenNavigate) navigate(`/recipes/${id}`) }, 1500)
  }

  const inputClass = "border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-xl p-3 text-sm outline-none focus:border-brand-orange transition w-full"

  if (loading) return <div className="p-6 text-zinc-400 text-sm">Chargement...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* POPUP MODIFICATIONS NON SAUVEGARDÉES */}
      {showUnsavedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-zinc-100 dark:border-zinc-700">
            <div className="pt-8 pb-6 px-6 flex flex-col items-center border-b border-zinc-100 dark:border-zinc-700">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-3xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white text-center">Modifications non sauvegardées</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mt-2">Tu as des changements en cours. Que veux-tu faire ?</p>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="w-full bg-brand-orange hover:bg-brand-orange/80 text-white py-3.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-md"
              >
                {saving ? "Sauvegarde..." : "💾 Sauvegarder et quitter"}
              </button>
              <button
                onClick={() => { setShowUnsavedPopup(false); navigate(`/recipes/${id}`) }}
                className="w-full border border-gray-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 py-3.5 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
              >
                Annuler les modifications
              </button>
              <button
                onClick={() => setShowUnsavedPopup(false)}
                className="w-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 py-2 text-sm transition"
              >
                Continuer à modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODÉRATION */}
      {bannedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-red-100 dark:border-red-900/30">
            <div className="bg-red-50 dark:bg-red-900/10 pt-8 pb-6 px-6 flex flex-col items-center border-b border-red-100 dark:border-red-900/20">
              <div className="w-16 h-16 bg-white dark:bg-zinc-800 shadow-sm rounded-full flex items-center justify-center text-3xl mb-4">🚨</div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white text-center">Contenu bloqué</h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">Cette recette contient un terme non autorisé :</p>
              <div className="inline-block bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 px-5 py-2.5 rounded-xl font-bold tracking-wide mb-6">« {bannedPopup} »</div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mb-6">(bien essayé petit malin 😎)</p>
              <button onClick={() => setBannedPopup(null)} className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl text-sm font-semibold transition">J'ai compris</button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ Recette modifiée !
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition text-sm font-medium">
          ← Retour
        </button>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-brand-cream">✏️ Modifier la recette</h1>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col gap-5">

          {/* Photo */}
          <ImageUploadCropper
            onImageSaved={(url) => setPhotoUrl(url || "")}
            existingUrl={photoUrl || null}
            recipeId={id}
          />

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

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${selectedTags.includes(tag)
                    ? "bg-brand-orange border-brand-orange text-white"
                    : "bg-white dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 text-zinc-500 hover:border-brand-orange"}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Ingrédients */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Ingrédients</label>
            <div className="flex flex-col gap-2">
              {ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-xl p-2.5 text-sm outline-none focus:border-brand-orange transition flex-[2]"
                    placeholder="Ingrédient" value={ing.name} onChange={e => updateIngredient(index, "name", e.target.value)} />
                  <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-xl p-2.5 text-sm outline-none focus:border-brand-orange transition w-16"
                    placeholder="Qté" type="number" value={ing.quantity || ""} onChange={e => updateIngredient(index, "quantity", e.target.value)} />
                  <select className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-xl p-2.5 text-sm outline-none focus:border-brand-orange transition w-28"
                    value={ing.unit || ""} onChange={e => updateIngredient(index, "unit", e.target.value)}>
                    <option value="" disabled>Unité</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {ingredients.length > 1 && (
                    <button onClick={() => removeIngredient(index)} className="text-zinc-300 hover:text-red-400 transition text-lg leading-none">×</button>
                  )}
                </div>
              ))}
              <button onClick={addIngredient} className="text-sm text-brand-orange hover:text-brand-orange/70 transition text-left font-medium mt-1">+ Ajouter un ingrédient</button>
            </div>
          </div>

          {/* Étapes */}
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Étapes</label>
            <div className="flex flex-col gap-2">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="text-xs font-bold text-brand-orange mt-3 w-5 flex-shrink-0">{index + 1}.</span>
                  <textarea
                    className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-xl p-2.5 text-sm outline-none focus:border-brand-orange transition flex-1 resize-none"
                    placeholder={`Étape ${index + 1}...`} rows={2}
                    value={step.description} onChange={e => updateStep(index, e.target.value)}
                  />
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(index)} className="text-zinc-300 hover:text-red-400 transition text-lg leading-none mt-2">×</button>
                  )}
                </div>
              ))}
              <button onClick={addStep} className="text-sm text-brand-orange hover:text-brand-orange/70 transition text-left font-medium mt-1">+ Ajouter une étape</button>
            </div>
          </div>

          {/* Boutons flottants sticky */}
          <div className="sticky bottom-8 z-40 flex justify-center mt-4">
            <div className="flex gap-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-8 py-3 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-700 w-full max-w-sm">
              <button
                onClick={handleBack}
                className="flex-1 border border-gray-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={!name || saving}
                className="flex-1 bg-brand-orange hover:bg-brand-orange/80 text-white px-6 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-md"
              >
                {saving ? "Vérification..." : "💾 Sauvegarder"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
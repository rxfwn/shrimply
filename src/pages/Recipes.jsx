import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import ImageUploadCropper from "./ImageUploadCropper"

const TAGS = ["🌿 Végé", "🍝 Italien", "🥢 Asiatique", "🇫🇷 Français", "⚡ Rapide", "💪 Protéiné", "🥗 Léger", "🍰 Dessert", "💰 Économique"]

const UNITS = [
  "g", "kg", "ml", "cl", "L",
  "c. à café", "c. à soupe",
  "pincée", "poignée",
  "paquet", "boîte", "tranche", "pièce"
]

const RECIPE_COLORS = [
  { label: "Vert", value: "#22c55e", bg: "bg-green-500" },
  { label: "Rouge", value: "#ef4444", bg: "bg-red-500" },
  { label: "Orange", value: "#f97316", bg: "bg-orange-500" },
  { label: "Bleu", value: "#3b82f6", bg: "bg-blue-500" },
  { label: "Violet", value: "#a855f7", bg: "bg-purple-500" },
  { label: "Rose", value: "#ec4899", bg: "bg-pink-500" },
  { label: "Jaune", value: "#eab308", bg: "bg-yellow-500" },
  { label: "Gris", value: "#6b7280", bg: "bg-gray-500" },
]

export default function Recipes() {
  const navigate = useNavigate()
  const ingredientRefs = useRef([])
  const stepRefs = useRef([])
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [servings, setServings] = useState("")
  const [selectedTags, setSelectedTags] = useState([])
  const [recipeColor, setRecipeColor] = useState("")
  const [ingredients, setIngredients] = useState([{ name: "", quantity: "", unit: "" }])
  const [steps, setSteps] = useState([{ description: "" }])
  const [photoUrl, setPhotoUrl] = useState("")
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const [bannedPopup, setBannedPopup] = useState(null)
  const [duplicating, setDuplicating] = useState(null)
  const [dupError, setDupError] = useState("")
  const [draftRestored, setDraftRestored] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const DRAFT_KEY = "recipe_draft"

  const saveDraft = (data) => localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
  const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (!draft.name && !draft.description && !draft.ingredients?.[0]?.name) return
      setName(draft.name || "")
      setDescription(draft.description || "")
      setPrepTime(draft.prepTime || "")
      setServings(draft.servings || "")
      setSelectedTags(draft.selectedTags || [])
      setRecipeColor(draft.recipeColor || "")
      setIngredients(draft.ingredients?.length ? draft.ingredients : [{ name: "", quantity: "", unit: "" }])
      setSteps(draft.steps?.length ? draft.steps : [{ description: "" }])
      setDraftRestored(true)
      setTimeout(() => setDraftRestored(false), 3000)
    } catch {}
  }

  useEffect(() => { fetchRecipes() }, [])

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    if (data) setRecipes(data)
  }

  const hasShownDraftPopup = useRef(false)

  useEffect(() => {
    if (!showForm) return
    const delay = hasShownDraftPopup.current ? 5000 : 2000
    const timeout = setTimeout(() => {
      const hasContent = name || description || ingredients[0]?.name
      if (!hasContent) return
      saveDraft({ name, description, prepTime, servings, selectedTags, recipeColor, ingredients, steps })
      if (!hasShownDraftPopup.current) {
        hasShownDraftPopup.current = true
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      }
    }, delay)
    return () => clearTimeout(timeout)
  }, [showForm, name, description, prepTime, servings, selectedTags, recipeColor, ingredients, steps])

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

  const handleDuplicate = async (e, recipe) => {
    e.stopPropagation()
    if (duplicating) return
    setDupError("")
    setDuplicating(recipe.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const sourceId = recipe.duplicated_from || recipe.id
      const { count } = await supabase
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("duplicated_from", sourceId)

      if (count >= 3) {
        setDupError(`Max 3 copies de "${recipe.name}" atteint !`)
        setTimeout(() => setDupError(""), 3000)
        setDuplicating(null)
        return
      }

      const { data: ings } = await supabase.from("ingredients").select("*").eq("recipe_id", recipe.id)
      const { data: stps } = await supabase.from("steps").select("*").eq("recipe_id", recipe.id).order("step_number")

      const { data: newRecipe, error } = await supabase.from("recipes").insert({
        user_id: user.id,
        name: `Copie de ${recipe.name}`,
        description: recipe.description,
        prep_time: recipe.prep_time,
        servings: recipe.servings,
        tags: recipe.tags,
        photo_url: recipe.photo_url || null,
        color: recipe.color || null,
        is_public: false,
        duplicated_from: sourceId,
      }).select().single()

      if (error) throw error

      if (ings?.length > 0) {
        await supabase.from("ingredients").insert(
          ings.map(i => ({ recipe_id: newRecipe.id, name: i.name, quantity: i.quantity, unit: i.unit, calories: i.calories }))
        )
      }
      if (stps?.length > 0) {
        await supabase.from("steps").insert(
          stps.map(s => ({ recipe_id: newRecipe.id, step_number: s.step_number, description: s.description }))
        )
      }

      await fetchRecipes()
      setSuccess(`"Copie de ${recipe.name}" créée !`)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setDuplicating(null)
    }
  }

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const addIngredient = () => {
    setIngredients(prev => [...prev, { name: "", quantity: "", unit: "" }])
    setTimeout(() => { ingredientRefs.current[ingredients.length]?.focus() }, 50)
  }

  const removeIngredient = (index) => setIngredients(prev => prev.filter((_, i) => i !== index))

  const updateIngredient = (index, field, value) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
    setErrors(prev => ({ ...prev, [`ing_${index}_${field}`]: false }))
  }

  const addStep = () => {
    setSteps(prev => [...prev, { description: "" }])
    setTimeout(() => { stepRefs.current[steps.length]?.focus() }, 50)
  }

  const removeStep = (index) => setSteps(prev => prev.filter((_, i) => i !== index))

  const updateStep = (index, value) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, description: value } : step))
    setErrors(prev => ({ ...prev, [`step_${index}`]: false }))
  }

  // ── DRAG & DROP ÉTAPES ──────────────────────────────────────────────────────
  const handleDragStart = (index) => {
    dragItem.current = index
  }

  const handleDragEnter = (index) => {
    dragOverItem.current = index
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    const from = dragItem.current
    const to = dragOverItem.current
    if (from === null || to === null || from === to) {
      dragItem.current = null
      dragOverItem.current = null
      setDragOverIndex(null)
      return
    }
    const reordered = [...steps]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setSteps(reordered)
    dragItem.current = null
    dragOverItem.current = null
    setDragOverIndex(null)
  }
  // ───────────────────────────────────────────────────────────────────────────

  const validate = () => {
    const newErrors = {}
    if (!name.trim()) newErrors.name = true
    if (!prepTime) newErrors.prepTime = true
    if (!servings) newErrors.servings = true
    const validIngredients = ingredients.filter(i => i.name.trim())
    if (validIngredients.length === 0) newErrors.noIngredients = true
    ingredients.forEach((ing, i) => {
      if (ing.name.trim()) {
        if (!ing.quantity) newErrors[`ing_${i}_quantity`] = true
        if (!ing.unit.trim()) newErrors[`ing_${i}_unit`] = true
      }
    })
    const validSteps = steps.filter(s => s.description.trim())
    if (validSteps.length === 0) newErrors.noSteps = true
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)

    const textsToCheck = [name, description, ...ingredients.map(i => i.name), ...steps.map(s => s.description)]
    const found = await checkBannedWords(textsToCheck)
    if (found) {
      setBannedPopup(found)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: recipe, error } = await supabase.from("recipes").insert({
      user_id: user.id,
      name,
      description,
      prep_time: parseInt(prepTime),
      servings: parseInt(servings),
      tags: selectedTags,
      color: recipeColor || null,
      is_public: false,
      photo_url: photoUrl || null,
    }).select().single()

    if (!error && recipe) {
      const validIngredients = ingredients.filter(i => i.name.trim())
      await supabase.from("ingredients").insert(
        validIngredients.map(i => ({ recipe_id: recipe.id, name: i.name, quantity: parseFloat(i.quantity), unit: i.unit }))
      )
      const validSteps = steps.filter(s => s.description.trim())
      await supabase.from("steps").insert(
        validSteps.map((s, index) => ({ recipe_id: recipe.id, step_number: index + 1, description: s.description }))
      )

      setSuccess(true)
      setName(""); setDescription(""); setPrepTime(""); setServings("")
      setSelectedTags([]); setRecipeColor(""); setIngredients([{ name: "", quantity: "", unit: "" }])
      setSteps([{ description: "" }]); setErrors({}); setPhotoUrl("")
      clearDraft()
      setShowForm(false)
      fetchRecipes()
      setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  const togglePublic = async (e, recipe) => {
    e.stopPropagation()
    await supabase.from("recipes").update({ is_public: !recipe.is_public }).eq("id", recipe.id)
    fetchRecipes()
  }

  const inputClass = (hasError) =>
    `w-full rounded-xl px-3 py-2.5 text-sm outline-none transition border ${hasError
      ? "border-red-400 bg-red-50 dark:bg-red-900/20"
      : "border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white focus:border-brand-blue"}`

  const resetForm = () => {
    setShowForm(false)
    setErrors({})
    clearDraft()
    hasShownDraftPopup.current = false
    setPhotoUrl("")
    setRecipeColor("")
  }

  return (
    <div className="p-6">

      {/* POPUP MODÉRATION */}
      {bannedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-red-100 dark:border-red-900/30">
            <div className="bg-red-50 dark:bg-red-900/10 pt-8 pb-6 px-6 flex flex-col items-center border-b border-red-100 dark:border-red-900/20">
              <div className="w-16 h-16 bg-white dark:bg-zinc-800 shadow-sm rounded-full flex items-center justify-center text-3xl mb-4 border border-red-100 dark:border-red-800/50">🚨</div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white text-center">Contenu bloqué</h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">Cette recette contient un terme qui ne respecte pas notre charte :</p>
              <div className="inline-block bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 px-5 py-2.5 rounded-xl font-bold tracking-wide mb-6 shadow-inner">« {bannedPopup} »</div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 px-2">Merci de modifier ton contenu pour qu'il reste respectueux.</p>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 italic mb-6">(bien essayé petit malin 😎)</p>
              <button onClick={() => setBannedPopup(null)} className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl text-sm font-semibold transition">J'ai compris</button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      {draftRestored && (
        <div className="fixed top-6 right-6 z-50 bg-blue-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          📝 Brouillon restauré !
        </div>
      )}
      {draftSaved && (name || description || ingredients[0]?.name) && (
        <div className="fixed top-6 right-6 z-50 bg-zinc-800/95 dark:bg-zinc-700/95 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium backdrop-blur-sm w-52">
          <div className="flex items-center gap-2 mb-1.5">
            <span>💾</span><span>Brouillon sauvegardé</span>
          </div>
          <div className="w-full h-1 bg-zinc-600 rounded-full overflow-hidden">
            <div className="h-full bg-brand-orange rounded-full animate-[shrink_2s_linear_forwards]" style={{ width: "100%" }} />
          </div>
        </div>
      )}
      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ {typeof success === "string" ? success : "Recette ajoutée !"}
        </div>
      )}
      {dupError && (
        <div className="fixed top-6 right-6 z-50 bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ⚠️ {dupError}
        </div>
      )}

      {/* ── FORMULAIRE ─────────────────────────────────────────────────────────── */}
      {showForm ? (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-brand-cream">✏️ Nouvelle recette</h1>
            <div className="flex items-center gap-3">
              {localStorage.getItem("recipe_draft") && (
                <button
                  onClick={() => {
                    clearDraft()
                    setName(""); setDescription(""); setPrepTime(""); setServings("")
                    setSelectedTags([]); setRecipeColor(""); setIngredients([{ name: "", quantity: "", unit: "" }])
                    setSteps([{ description: "" }]); setPhotoUrl("")
                  }}
                  className="text-xs text-zinc-400 hover:text-red-400 transition flex items-center gap-1"
                >
                  🗑 Vider le brouillon
                </button>
              )}
              <button
                onClick={() => { setShowForm(false); setErrors({}) }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-medium transition"
              >
                ← Retour
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col gap-5">

              {/* Photo */}
              <ImageUploadCropper
                onImageSaved={(url) => setPhotoUrl(url || "")}
                recipeId={null}
              />

              {/* Nom */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Nom de la recette <span className="text-red-400">*</span></label>
                <input className={inputClass(errors.name)} placeholder="Ex: Pâtes carbonara"
                  value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: false })) }} />
                {errors.name && <p className="text-xs text-red-400 mt-1">Le nom est obligatoire</p>}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Description</label>
                <textarea
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white focus:border-brand-blue resize-none"
                  placeholder="Décris ta recette..." rows={2}
                  value={description} onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Temps + Portions */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Temps (min) <span className="text-red-400">*</span></label>
                  <input className={inputClass(errors.prepTime)} placeholder="Ex: 30" type="number"
                    value={prepTime} onChange={e => { setPrepTime(e.target.value); setErrors(p => ({ ...p, prepTime: false })) }} />
                  {errors.prepTime && <p className="text-xs text-red-400 mt-1">Obligatoire</p>}
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Portions <span className="text-red-400">*</span></label>
                  <input className={inputClass(errors.servings)} placeholder="Ex: 4" type="number"
                    value={servings} onChange={e => { setServings(e.target.value); setErrors(p => ({ ...p, servings: false })) }} />
                  {errors.servings && <p className="text-xs text-red-400 mt-1">Obligatoire</p>}
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

              {/* 🎨 Couleur calendrier */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
                  🎨 Couleur dans le calendrier
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {RECIPE_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setRecipeColor(recipeColor === color.value ? "" : color.value)}
                      title={color.label}
                      className={`w-7 h-7 rounded-full transition-all border-2 ${recipeColor === color.value ? "border-zinc-900 dark:border-white scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                  {recipeColor && (
                    <button
                      onClick={() => setRecipeColor("")}
                      className="text-xs text-zinc-400 hover:text-red-400 transition ml-1"
                    >
                      × Effacer
                    </button>
                  )}
                </div>
                {recipeColor && (
                  <p className="text-xs text-zinc-400 mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: recipeColor }} />
                    Cette couleur apparaîtra dans ton calendrier
                  </p>
                )}
              </div>

              {/* Ingrédients */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Ingrédients <span className="text-red-400">*</span></label>
                {errors.noIngredients && <p className="text-xs text-red-400 mb-2">Au moins un ingrédient est obligatoire</p>}
                <div className="flex flex-col gap-2">
                  {ingredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-[2]">
                        <input
                          ref={el => ingredientRefs.current[index] = el}
                          className={inputClass(false)}
                          placeholder="Ingrédient *"
                          value={ing.name}
                          onChange={e => updateIngredient(index, "name", e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (index === ingredients.length - 1) addIngredient(); else ingredientRefs.current[index + 1]?.focus() } }}
                        />
                      </div>
                      <div className="w-20">
                        <input className={inputClass(errors[`ing_${index}_quantity`])} placeholder="Qté *" type="number" value={ing.quantity}
                          onChange={e => updateIngredient(index, "quantity", e.target.value)} />
                        {errors[`ing_${index}_quantity`] && <p className="text-xs text-red-400 mt-0.5">Requis</p>}
                      </div>
                      <div className="w-28">
                        <select className={inputClass(errors[`ing_${index}_unit`])} value={ing.unit}
                          onChange={e => updateIngredient(index, "unit", e.target.value)}>
                          <option value="" disabled>Unité *</option>
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        {errors[`ing_${index}_unit`] && <p className="text-xs text-red-400 mt-0.5">Requis</p>}
                      </div>
                      {ingredients.length > 1 && (
                        <button onClick={() => removeIngredient(index)} className="text-zinc-300 hover:text-red-400 transition text-lg leading-none mt-2.5">×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addIngredient} className="text-sm text-brand-orange hover:text-brand-orange/70 transition text-left font-medium mt-1">+ Ajouter un ingrédient</button>
                </div>
              </div>

              {/* Étapes — avec drag & drop */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
                  Étapes <span className="text-red-400">*</span>
                  <span className="ml-2 font-normal text-zinc-400 normal-case tracking-normal">— glisse ⠿ pour réordonner</span>
                </label>
                {errors.noSteps && <p className="text-xs text-red-400 mb-2">Au moins une étape est obligatoire</p>}
                <div className="flex flex-col gap-2">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className={`flex gap-2 items-center rounded-xl transition-all ${dragOverIndex === index && dragItem.current !== index ? "bg-brand-orange/10 scale-[1.01]" : ""}`}
                    >
                      {/* Poignée drag */}
                      <span
                        className="text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing text-base flex-shrink-0 select-none"
                        title="Glisser pour réordonner"
                      >⠿</span>
                      <span className="text-xs font-bold text-brand-orange w-5 flex-shrink-0">{index + 1}.</span>
                      <div className="flex-1">
                        <textarea
                          ref={el => stepRefs.current[index] = el}
                          className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition border resize-none overflow-hidden ${errors[`step_${index}`] ? "border-red-400 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white focus:border-brand-blue"}`}
                          placeholder={`Étape ${index + 1}...`}
                          rows={1}
                          value={step.description}
                          onChange={e => {
                            updateStep(index, e.target.value)
                            e.target.style.height = "auto"
                            e.target.style.height = e.target.scrollHeight + "px"
                          }}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (index === steps.length - 1) addStep(); else stepRefs.current[index + 1]?.focus() } }}
                        />
                      </div>
                      {steps.length > 1 && (
                        <button onClick={() => removeStep(index)} className="text-zinc-300 hover:text-red-400 transition text-lg leading-none flex-shrink-0">×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addStep} className="text-sm text-brand-orange hover:text-brand-orange/70 transition text-left font-medium mt-1">+ Ajouter une étape</button>
                </div>
              </div>

              {/* Boutons flottants */}
              <div className="sticky bottom-8 z-40 flex justify-center mt-4">
                <div className="flex gap-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-8 py-3 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-700 w-full max-w-sm">
                  <button
                    onClick={resetForm}
                    className="flex-1 border border-gray-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-brand-orange hover:bg-brand-orange/80 text-white px-6 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 shadow-md"
                  >
                    {loading ? "Vérification..." : "💾 Enregistrer"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

      ) : (

        /* ── LISTE DES RECETTES ──────────────────────────────────────────────── */
        <div className="max-w-5xl">

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-brand-cream mb-4">📖 Mes recettes</h1>

            {/* Recherche + Bouton nouvelle recette */}
            <div className="flex items-center gap-3 mb-3">
              <input
                className="flex-1 max-w-sm border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-orange transition"
                placeholder="🔍 Rechercher une recette..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                onClick={() => { setShowForm(true); loadDraft() }}
                className="bg-brand-orange hover:bg-brand-orange/80 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-md whitespace-nowrap"
              >
                + Nouvelle recette
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter("all")}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${activeFilter === "all" ? "bg-brand-orange border-brand-orange text-white" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-600 text-zinc-500 hover:border-brand-orange"}`}
              >
                Toutes
              </button>
              {TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveFilter(activeFilter === tag ? "all" : tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${activeFilter === tag ? "bg-brand-orange border-brand-orange text-white" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-600 text-zinc-500 hover:border-brand-orange"}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Grille */}
          {(() => {
            const filtered = recipes.filter(r => {
              const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
              const matchFilter = activeFilter === "all" || (r.tags && r.tags.includes(activeFilter))
              return matchSearch && matchFilter
            })

            if (recipes.length === 0) return (
              <div className="text-zinc-400 text-sm">Aucune recette pour l'instant — ajoutes-en une !</div>
            )
            if (filtered.length === 0) return (
              <div className="text-zinc-400 text-sm">Aucune recette ne correspond à ta recherche.</div>
            )

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 justify-items-center">
                {filtered.map(recipe => (
                  <div
                    key={recipe.id}
                    onClick={() => navigate(`/recipes/${recipe.id}`)}
                    className="w-full bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                  >
                    {/* Bande couleur en haut de la carte */}
                    {recipe.color && (
                      <div className="h-1.5 w-full" style={{ backgroundColor: recipe.color }} />
                    )}

                    {/* Photo */}
                    {recipe.photo_url ? (
                      <img src={recipe.photo_url} alt={recipe.name} className="w-full aspect-[4/3] object-cover" />
                    ) : (
                      <div className="w-full aspect-[4/3] bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center">
                        <span className="text-3xl opacity-20">🍽</span>
                      </div>
                    )}

                    {/* Contenu */}
                    <div className="p-3">
                      <h3 className="font-semibold text-zinc-900 dark:text-brand-cream text-sm mb-1 truncate">{recipe.name}</h3>

                      {recipe.duplicated_from && (
                        <p className="text-[10px] text-zinc-400 italic mb-1">📋 Copie</p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                        {recipe.prep_time && <span>⏱ {recipe.prep_time}min</span>}
                        {recipe.servings && <span>🍽 {recipe.servings}p</span>}
                        {recipe.color && (
                          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: recipe.color }} title="Couleur calendrier" />
                        )}
                      </div>

                      {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {recipe.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded-full">{tag}</span>
                          ))}
                          {recipe.tags.length > 2 && <span className="text-[10px] text-zinc-400">+{recipe.tags.length - 2}</span>}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => togglePublic(e, recipe)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition ${recipe.is_public
                            ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-zinc-50 dark:bg-zinc-700 text-zinc-400 border-gray-200 dark:border-zinc-600"}`}>
                          {recipe.is_public ? "🌍" : "🔒"}
                        </button>
                        <button
                          onClick={(e) => handleDuplicate(e, recipe)}
                          disabled={duplicating === recipe.id}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-400 hover:text-brand-orange hover:border-orange-200 transition disabled:opacity-40"
                        >
                          {duplicating === recipe.id ? "⏳" : "📝"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
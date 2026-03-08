import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

const TAGS = ["🌿 Végé", "🍝 Italien", "🥢 Asiatique", "🇫🇷 Français", "⚡ Rapide", "💪 Protéiné", "🥗 Léger", "🍰 Dessert"]

export default function Recipes() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [servings, setServings] = useState("")
  const [selectedTags, setSelectedTags] = useState([])
  const [ingredients, setIngredients] = useState([{ name: "", quantity: "", unit: "" }])
  const [steps, setSteps] = useState([{ description: "" }])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => { fetchRecipes() }, [])

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    if (data) setRecipes(data)
  }

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const addIngredient = () => setIngredients(prev => [...prev, { name: "", quantity: "", unit: "" }])
  const removeIngredient = (index) => setIngredients(prev => prev.filter((_, i) => i !== index))
  const updateIngredient = (index, field, value) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))
    setErrors(prev => ({ ...prev, [`ing_${index}_${field}`]: false }))
  }

  const addStep = () => setSteps(prev => [...prev, { description: "" }])
  const removeStep = (index) => setSteps(prev => prev.filter((_, i) => i !== index))
  const updateStep = (index, value) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, description: value } : step))
    setErrors(prev => ({ ...prev, [`step_${index}`]: false }))
  }

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
    const { data: { user } } = await supabase.auth.getUser()

    const { data: recipe, error } = await supabase.from("recipes").insert({
      user_id: user.id,
      name,
      description,
      prep_time: parseInt(prepTime),
      servings: parseInt(servings),
      tags: selectedTags,
      is_public: false,
    }).select().single()

    if (!error && recipe) {
      const validIngredients = ingredients.filter(i => i.name.trim())
      await supabase.from("ingredients").insert(
        validIngredients.map(i => ({
          recipe_id: recipe.id,
          name: i.name,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
        }))
      )

      const validSteps = steps.filter(s => s.description.trim())
      await supabase.from("steps").insert(
        validSteps.map((s, index) => ({
          recipe_id: recipe.id,
          step_number: index + 1,
          description: s.description,
        }))
      )

      setSuccess(true)
      setName(""); setDescription(""); setPrepTime(""); setServings("")
      setSelectedTags([]); setIngredients([{ name: "", quantity: "", unit: "" }])
      setSteps([{ description: "" }]); setErrors({})
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

  return (
    <div className="p-6 max-w-3xl">

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ Recette ajoutée !
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-brand-cream">📖 Mes recettes</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-brand-orange hover:bg-brand-orange/80 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          + Nouvelle recette
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-brand-cream mb-4">Nouvelle recette</h2>

          <div className="flex flex-col gap-4">

            {/* Nom */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">
                Nom de la recette <span className="text-red-400">*</span>
              </label>
              <input className={inputClass(errors.name)} placeholder="Ex: Pâtes carbonara"
                value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: false })) }} />
              {errors.name && <p className="text-xs text-red-400 mt-1">Le nom est obligatoire</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Description</label>
              <textarea className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white focus:border-brand-blue resize-none"
                placeholder="Décris ta recette..." rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            {/* Temps + Portions */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">
                  Temps (min) <span className="text-red-400">*</span>
                </label>
                <input className={inputClass(errors.prepTime)} placeholder="Ex: 30" type="number"
                  value={prepTime} onChange={e => { setPrepTime(e.target.value); setErrors(p => ({ ...p, prepTime: false })) }} />
                {errors.prepTime && <p className="text-xs text-red-400 mt-1">Obligatoire</p>}
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">
                  Portions <span className="text-red-400">*</span>
                </label>
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

            {/* Ingrédients */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
                Ingrédients <span className="text-red-400">*</span>
              </label>
              {errors.noIngredients && <p className="text-xs text-red-400 mb-2">Au moins un ingrédient est obligatoire</p>}
              <div className="flex flex-col gap-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-[2]">
                      <input
                        className={inputClass(false)}
                        placeholder="Ingrédient *" value={ing.name}
                        onChange={e => updateIngredient(index, "name", e.target.value)} />
                    </div>
                    <div className="w-20">
                      <input
                        className={inputClass(errors[`ing_${index}_quantity`])}
                        placeholder="Qté *" type="number" value={ing.quantity}
                        onChange={e => updateIngredient(index, "quantity", e.target.value)} />
                      {errors[`ing_${index}_quantity`] && <p className="text-xs text-red-400 mt-0.5">Requis</p>}
                    </div>
                    <div className="w-20">
                      <input
                        className={inputClass(errors[`ing_${index}_unit`])}
                        placeholder="Unité *" value={ing.unit}
                        onChange={e => updateIngredient(index, "unit", e.target.value)} />
                      {errors[`ing_${index}_unit`] && <p className="text-xs text-red-400 mt-0.5">Requis</p>}
                    </div>
                    {ingredients.length > 1 && (
                      <button onClick={() => removeIngredient(index)}
                        className="text-zinc-300 hover:text-red-400 transition text-lg leading-none mt-2.5">×</button>
                    )}
                  </div>
                ))}
                <button onClick={addIngredient} className="text-sm text-brand-orange hover:text-brand-orange/70 transition text-left font-medium mt-1">
                  + Ajouter un ingrédient
                </button>
              </div>
            </div>

            {/* Étapes */}
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
                Étapes <span className="text-red-400">*</span>
              </label>
              {errors.noSteps && <p className="text-xs text-red-400 mb-2">Au moins une étape est obligatoire</p>}
              <div className="flex flex-col gap-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <span className="text-xs font-bold text-brand-orange mt-3 w-5 flex-shrink-0">{index + 1}.</span>
                    <div className="flex-1">
                      <textarea
                        className={`w-full rounded-xl px-3 py-2.5 text-sm outline-none transition border resize-none ${errors[`step_${index}`]
                          ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                          : "border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white focus:border-brand-blue"}`}
                        placeholder={`Étape ${index + 1}... *`} rows={2}
                        value={step.description} onChange={e => updateStep(index, e.target.value)} />
                    </div>
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(index)}
                        className="text-zinc-300 hover:text-red-400 transition text-lg leading-none mt-2">×</button>
                    )}
                  </div>
                ))}
                <button onClick={addStep} className="text-sm text-brand-orange hover:text-brand-orange/70 transition text-left font-medium mt-1">
                  + Ajouter une étape
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => { setShowForm(false); setErrors({}) }}
                className="flex-1 border border-gray-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-brand-orange hover:bg-brand-orange/80 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="text-zinc-400 text-sm">Aucune recette pour l'instant — ajoutes-en une !</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {recipes.map(recipe => (
            <div key={recipe.id} onClick={() => navigate(`/recipes/${recipe.id}`)}
              className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition cursor-pointer">
              <h3 className="font-semibold text-zinc-900 dark:text-brand-cream mb-1">{recipe.name}</h3>
              {recipe.description && <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{recipe.description}</p>}
              <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
                {recipe.servings && <span>🍽 {recipe.servings} portions</span>}
              </div>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.tags.map(tag => (
                    <span key={tag} className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
              <button onClick={(e) => togglePublic(e, recipe)}
                className={`text-xs px-2 py-1 rounded-full border transition ${recipe.is_public
                  ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                  : "bg-zinc-50 dark:bg-zinc-700 text-zinc-400 border-gray-200 dark:border-zinc-600 hover:border-brand-orange"}`}>
                {recipe.is_public ? "🌍 Public" : "🔒 Privé"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
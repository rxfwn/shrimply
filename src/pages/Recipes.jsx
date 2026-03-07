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
  const [ingredients, setIngredients] = useState([{ name: "", quantity: "", unit: "", calories: "" }])
  const [steps, setSteps] = useState([{ description: "" }])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => { fetchRecipes() }, [])

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    if (data) setRecipes(data)
  }

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const addIngredient = () => setIngredients(prev => [...prev, { name: "", quantity: "", unit: "", calories: "" }])
  const removeIngredient = (index) => setIngredients(prev => prev.filter((_, i) => i !== index))
  const updateIngredient = (index, field, value) => setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing))

  const addStep = () => setSteps(prev => [...prev, { description: "" }])
  const removeStep = (index) => setSteps(prev => prev.filter((_, i) => i !== index))
  const updateStep = (index, value) => setSteps(prev => prev.map((step, i) => i === index ? { ...step, description: value } : step))

  const handleSubmit = async () => {
    if (!name) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: recipe, error } = await supabase.from("recipes").insert({
      user_id: user.id,
      name,
      description,
      prep_time: parseInt(prepTime) || null,
      servings: parseInt(servings) || null,
      tags: selectedTags,
      is_public: false,
    }).select().single()

    if (!error && recipe) {
      const validIngredients = ingredients.filter(i => i.name.trim())
      if (validIngredients.length > 0) {
        await supabase.from("ingredients").insert(
          validIngredients.map(i => ({
            recipe_id: recipe.id,
            name: i.name,
            quantity: parseFloat(i.quantity) || null,
            unit: i.unit,
            calories: parseInt(i.calories) || null,
          }))
        )
      }

      const validSteps = steps.filter(s => s.description.trim())
      if (validSteps.length > 0) {
        await supabase.from("steps").insert(
          validSteps.map((s, index) => ({
            recipe_id: recipe.id,
            step_number: index + 1,
            description: s.description,
          }))
        )
      }

      setSuccess(true)
      setName(""); setDescription(""); setPrepTime(""); setServings("")
      setSelectedTags([]); setIngredients([{ name: "", quantity: "", unit: "", calories: "" }])
      setSteps([{ description: "" }])
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

  return (
    <div className="p-6 max-w-3xl">

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          ✅ Recette ajoutée avec succès !
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">📖 Mes recettes</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
          + Nouvelle recette
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Nouvelle recette</h2>

          <div className="flex flex-col gap-4">
            <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-3 text-sm outline-none focus:border-orange-400" placeholder="Nom de la recette *" value={name} onChange={e => setName(e.target.value)} />
            <textarea className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-3 text-sm outline-none focus:border-orange-400 resize-none" placeholder="Description (optionnel)" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
            <div className="flex gap-3">
              <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-3 text-sm outline-none focus:border-orange-400 flex-1" placeholder="Temps (min)" type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
              <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-3 text-sm outline-none focus:border-orange-400 flex-1" placeholder="Portions" type="number" value={servings} onChange={e => setServings(e.target.value)} />
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">Tags</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)} className={`text-xs px-3 py-1.5 rounded-full border transition ${selectedTags.includes(tag) ? "bg-orange-500 border-orange-500 text-white" : "bg-white dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 text-zinc-500 hover:border-orange-300"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">Ingrédients</p>
              <div className="flex flex-col gap-2">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 flex-[2]" placeholder="Ingrédient" value={ing.name} onChange={e => updateIngredient(index, "name", e.target.value)} />
                    <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 w-16" placeholder="Qté" type="number" value={ing.quantity} onChange={e => updateIngredient(index, "quantity", e.target.value)} />
                    <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 w-16" placeholder="Unité" value={ing.unit} onChange={e => updateIngredient(index, "unit", e.target.value)} />
                    <input className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 w-20" placeholder="kcal" type="number" value={ing.calories} onChange={e => updateIngredient(index, "calories", e.target.value)} />
                    {ingredients.length > 1 && (
                      <button onClick={() => removeIngredient(index)} className="text-zinc-300 hover:text-red-400 transition text-lg leading-none">×</button>
                    )}
                  </div>
                ))}
                <button onClick={addIngredient} className="text-sm text-orange-500 hover:text-orange-600 transition text-left font-medium mt-1">
                  + Ajouter un ingrédient
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">Étapes de préparation</p>
              <div className="flex flex-col gap-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <span className="text-xs font-bold text-orange-500 mt-3 w-5 flex-shrink-0">{index + 1}.</span>
                    <textarea className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 flex-1 resize-none" placeholder={`Étape ${index + 1}...`} rows={2} value={step.description} onChange={e => updateStep(index, e.target.value)} />
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(index)} className="text-zinc-300 hover:text-red-400 transition text-lg leading-none mt-2">×</button>
                    )}
                  </div>
                ))}
                <button onClick={addStep} className="text-sm text-orange-500 hover:text-orange-600 transition text-left font-medium mt-1">
                  + Ajouter une étape
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-zinc-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={!name || loading} className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50">
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
            <div key={recipe.id} onClick={() => navigate(`/recipes/${recipe.id}`)} className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{recipe.name}</h3>
              {recipe.description && <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{recipe.description}</p>}
              <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
                {recipe.servings && <span>🍽 {recipe.servings} portions</span>}
              </div>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {recipe.tags.map(tag => (
                    <span key={tag} className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
              <button
                onClick={(e) => togglePublic(e, recipe)}
                className={`text-xs px-2 py-1 rounded-full border transition ${recipe.is_public ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100" : "bg-zinc-50 text-zinc-400 border-gray-200 hover:border-orange-300 dark:bg-zinc-700 dark:border-zinc-600"}`}
              >
                {recipe.is_public ? "🌍 Public" : "🔒 Privé"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
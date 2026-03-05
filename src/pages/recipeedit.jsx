import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

const TAGS = ["🌿 Végé", "🍝 Italien", "🥢 Asiatique", "🇫🇷 Français", "⚡ Rapide", "💪 Protéiné", "🥗 Léger", "🍰 Dessert"]

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => { fetchRecipe() }, [id])

  const fetchRecipe = async () => {
    const { data: recipe } = await supabase.from("recipes").select("*").eq("id", id).single()
    const { data: ingredientsData } = await supabase.from("ingredients").select("*").eq("recipe_id", id)
    const { data: stepsData } = await supabase.from("steps").select("*").eq("recipe_id", id).order("step_number")
    if (recipe) {
      setName(recipe.name)
      setDescription(recipe.description || "")
      setPrepTime(recipe.prep_time || "")
      setServings(recipe.servings || "")
      setSelectedTags(recipe.tags || [])
    }
    setIngredients(ingredientsData?.map(i => ({ ...i })) || [{ name: "", quantity: "", unit: "", calories: "" }])
    setSteps(stepsData?.map(s => ({ ...s })) || [{ description: "" }])
    setLoading(false)
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

  const handleSave = async () => {
    setSaving(true)
    await supabase.from("recipes").update({
      name,
      description,
      prep_time: parseInt(prepTime) || null,
      servings: parseInt(servings) || null,
      tags: selectedTags,
    }).eq("id", id)

    await supabase.from("ingredients").delete().eq("recipe_id", id)
    const validIngredients = ingredients.filter(i => i.name.trim())
    if (validIngredients.length > 0) {
      await supabase.from("ingredients").insert(
        validIngredients.map(i => ({
          recipe_id: id,
          name: i.name,
          quantity: parseFloat(i.quantity) || null,
          unit: i.unit,
          calories: parseInt(i.calories) || null,
        }))
      )
    }

    await supabase.from("steps").delete().eq("recipe_id", id)
    const validSteps = steps.filter(s => s.description.trim())
    if (validSteps.length > 0) {
      await supabase.from("steps").insert(
        validSteps.map((s, index) => ({
          recipe_id: id,
          step_number: index + 1,
          description: s.description,
        }))
      )
    }

    setSaving(false)
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      navigate(`/recipes/${id}`)
    }, 1500)
  }

  if (loading) return <div className="p-6 text-zinc-400 text-sm">Chargement...</div>

  return (
    <div className="p-6 max-w-3xl">

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          ✅ Recette modifiée avec succès !
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/recipes/${id}`)} className="text-zinc-400 hover:text-zinc-700 transition text-sm">
          ← Retour
        </button>
        <h1 className="text-2xl font-semibold text-zinc-900">✏️ Modifier la recette</h1>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <input className="border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-orange-400" placeholder="Nom de la recette *" value={name} onChange={e => setName(e.target.value)} />
          <textarea className="border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-orange-400 resize-none" placeholder="Description (optionnel)" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          <div className="flex gap-3">
            <input className="border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-orange-400 flex-1" placeholder="Temps (min)" type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
            <input className="border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-orange-400 flex-1" placeholder="Portions" type="number" value={servings} onChange={e => setServings(e.target.value)} />
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">Tags</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)} className={`text-xs px-3 py-1.5 rounded-full border transition ${selectedTags.includes(tag) ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-gray-200 text-zinc-500 hover:border-orange-300"}`}>
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
                  <input className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 flex-[2]" placeholder="Ingrédient" value={ing.name} onChange={e => updateIngredient(index, "name", e.target.value)} />
                  <input className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 w-16" placeholder="Qté" type="number" value={ing.quantity || ""} onChange={e => updateIngredient(index, "quantity", e.target.value)} />
                  <input className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 w-16" placeholder="Unité" value={ing.unit || ""} onChange={e => updateIngredient(index, "unit", e.target.value)} />
                  <input className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 w-20" placeholder="kcal" type="number" value={ing.calories || ""} onChange={e => updateIngredient(index, "calories", e.target.value)} />
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
                  <textarea className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 flex-1 resize-none" placeholder={`Étape ${index + 1}...`} rows={2} value={step.description} onChange={e => updateStep(index, e.target.value)} />
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
            <button onClick={() => navigate(`/recipes/${id}`)} className="flex-1 border border-gray-200 text-zinc-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Annuler
            </button>
            <button onClick={handleSave} disabled={!name || saving} className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50">
              {saving ? "Enregistrement..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
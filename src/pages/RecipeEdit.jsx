import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

const TAGS = ["🌿 Végé", "🍝 Italien", "🥢 Asiatique", "🇫🇷 Français", "⚡ Rapide", "💪 Protéiné", "🥗 Léger", "🍰 Dessert", "💰 Économique"]

// AJOUT : La liste des unités disponibles
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bannedPopup, setBannedPopup] = useState(null) // mot interdit détecté

  useEffect(() => { fetchRecipe() }, [id])

  const fetchRecipe = async () => {
    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", id).single()
    const { data: ingredientsData, error: ingError } = await supabase.from("ingredients").select("*").eq("recipe_id", id)
    const { data: stepsData, error: stepError } = await supabase.from("steps").select("*").eq("recipe_id", id).order("step_number")
    
    if (recipeError) console.error("Erreur chargement recette:", recipeError)
    if (ingError) console.error("Erreur chargement ingrédients:", ingError)
    if (stepError) console.error("Erreur chargement étapes:", stepError)

    if (recipe) {
      setName(recipe.name)
      setDescription(recipe.description || "")
      setPrepTime(recipe.prep_time || "")
      setServings(recipe.servings || "")
      setSelectedTags(recipe.tags || [])
    }
    setIngredients(ingredientsData?.map(i => ({ ...i })) || [{ name: "", quantity: "", unit: "" }])
    setSteps(stepsData?.map(s => ({ ...s })) || [{ description: "" }])
    setLoading(false)
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

  const handleSave = async () => {
    setSaving(true)

    // Vérification des mots interdits
    const textsToCheck = [
      name,
      description,
      ...ingredients.map(i => i.name),
      ...steps.map(s => s.description)
    ]
    const found = await checkBannedWords(textsToCheck)
    if (found) {
      setBannedPopup(found)
      setSaving(false)
      return
    }

    // 1️⃣ Mise à jour de la recette principale
    const { error: updateError } = await supabase.from("recipes").update({
      name,
      description,
      prep_time: parseInt(prepTime) || null,
      servings: parseInt(servings) || null,
      tags: selectedTags,
    }).eq("id", id)

    if (updateError) {
      console.error("🔥 Erreur MAJ recette :", updateError)
      alert("Erreur lors de la mise à jour de la recette.")
      setSaving(false)
      return
    }

    // 2️⃣ Suppression et recréation des ingrédients
    const { error: deleteIngError } = await supabase.from("ingredients").delete().eq("recipe_id", id)
    if (deleteIngError) console.error("🔥 Erreur suppression anciens ingrédients :", deleteIngError)

    const validIngredients = ingredients.filter(i => i.name.trim())
    if (validIngredients.length > 0) {
      const { error: insertIngError } = await supabase.from("ingredients").insert(
        validIngredients.map(i => ({
          recipe_id: id,
          name: i.name,
          quantity: parseFloat(i.quantity) || null,
          unit: i.unit,
        }))
      )
      if (insertIngError) console.error("🔥 Erreur insertion nouveaux ingrédients :", insertIngError)
    }

    // 3️⃣ Suppression et recréation des étapes
    const { error: deleteStepsError } = await supabase.from("steps").delete().eq("recipe_id", id)
    if (deleteStepsError) console.error("🔥 Erreur suppression anciennes étapes :", deleteStepsError)

    const validSteps = steps.filter(s => s.description.trim())
    if (validSteps.length > 0) {
      const { error: insertStepsError } = await supabase.from("steps").insert(
        validSteps.map((s, index) => ({
          recipe_id: id,
          step_number: index + 1,
          description: s.description,
        }))
      )
      if (insertStepsError) console.error("🔥 Erreur insertion nouvelles étapes :", insertStepsError)
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

      {/* POPUP MODÉRATION */}
      {bannedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-zinc-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-red-100 dark:border-red-900/30 transform transition-all scale-100">
            
            <div className="bg-red-50 dark:bg-red-900/10 pt-8 pb-6 px-6 flex flex-col items-center border-b border-red-100 dark:border-red-900/20">
              <div className="w-16 h-16 bg-white dark:bg-zinc-800 shadow-sm rounded-full flex items-center justify-center text-3xl mb-4 border border-red-100 dark:border-red-800/50">
                🚨
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white text-center">
                Contenu bloqué
              </h2>
            </div>

            <div className="p-6 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
                Cette recette contient un terme qui ne respecte pas notre charte communautaire :
              </p>
              
              <div className="inline-block bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 px-5 py-2.5 rounded-xl font-bold tracking-wide mb-6 shadow-inner">
                « {bannedPopup} »
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 px-2">
                Merci de modifier ton contenu pour qu'il reste respectueux et approprié.
              </p>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 italic mb-6">
                (bien essayé petit malin 😎)
              </p>

              <button
                onClick={() => setBannedPopup(null)}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

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
                  
                  {/* LE NOUVEAU MENU DÉROULANT POUR LES UNITÉS */}
                  <div className="w-24">
                    <select
                      className="border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 w-full bg-white"
                      value={ing.unit || ""}
                      onChange={e => updateIngredient(index, "unit", e.target.value)}
                    >
                      <option value="" disabled>Unité</option>
                      {UNITS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  
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
              {saving ? "Vérification..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
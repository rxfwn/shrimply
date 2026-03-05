import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchRecipe() }, [id])

  const fetchRecipe = async () => {
    const { data: recipeData } = await supabase.from("recipes").select("*").eq("id", id).single()
    const { data: ingredientsData } = await supabase.from("ingredients").select("*").eq("recipe_id", id)
    const { data: stepsData } = await supabase.from("steps").select("*").eq("recipe_id", id).order("step_number")
    setRecipe(recipeData)
    setIngredients(ingredientsData || [])
    setSteps(stepsData || [])
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer cette recette ?")) return
    setDeleting(true)
    await supabase.from("ingredients").delete().eq("recipe_id", id)
    await supabase.from("steps").delete().eq("recipe_id", id)
    await supabase.from("recipes").delete().eq("id", id)
    navigate("/recipes")
  }

  if (loading) return <div className="p-6 text-zinc-400 text-sm">Chargement...</div>
  if (!recipe) return <div className="p-6 text-zinc-400 text-sm">Recette introuvable.</div>

  return (
    <div className="p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/recipes")} className="text-zinc-400 hover:text-zinc-700 transition text-sm">
          ← Retour
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">

        {/* Titre + actions */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{recipe.name}</h1>
            {recipe.description && <p className="text-sm text-zinc-400 mt-1">{recipe.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/recipes/${id}/edit`)}
              className="border border-gray-200 text-zinc-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              ✏️ Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-50"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>

        {/* Infos */}
        <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
          {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
          {recipe.servings && <span>🍽 {recipe.servings} portions</span>}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-5">
            {recipe.tags.map(tag => (
              <span key={tag} className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {/* Ingrédients */}
        {ingredients.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">Ingrédients</h2>
            <div className="flex flex-col gap-2">
              {ingredients.map(ing => (
                <div key={ing.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-zinc-700">{ing.name}</span>
                  <span className="text-sm text-zinc-400">
                    {ing.quantity && `${ing.quantity} ${ing.unit || ""}`}
                    {ing.calories && <span className="ml-2 text-xs">({ing.calories} kcal)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Étapes */}
        {steps.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">Préparation</h2>
            <div className="flex flex-col gap-3">
              {steps.map(step => (
                <div key={step.id} className="flex gap-3">
                  <span className="text-xs font-bold text-orange-500 mt-0.5 w-5 flex-shrink-0">{step.step_number}.</span>
                  <p className="text-sm text-zinc-700 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
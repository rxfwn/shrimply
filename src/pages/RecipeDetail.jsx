import { useState, useEffect, useRef } from "react"
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
  
  const [estimating, setEstimating] = useState(false)
  const [costDetails, setCostDetails] = useState(null)
  const [apiError, setApiError] = useState("") 
  const [cooldown, setCooldown] = useState(0) 
  const estimatingRef = useRef(false)

  useEffect(() => { fetchRecipe() }, [id])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const fetchRecipe = async () => {
    const { data: recipeData } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle()
    const { data: ingredientsData } = await supabase.from("ingredients").select("*").eq("recipe_id", id)
    const { data: stepsData } = await supabase.from("steps").select("*").eq("recipe_id", id).order("step_number")

    setRecipe(recipeData)
    setIngredients(ingredientsData || [])
    setSteps(stepsData || [])
    setLoading(false)

    if (!recipeData || !ingredientsData?.length) return
    await loadCostDetails(recipeData, ingredientsData)
  }

  const loadCostDetails = async (recipeData, ingredientsData) => {
    try {
      const { data: prices } = await supabase.from("ingredient_prices").select("name, price, unit")
      const details = ingredientsData.map(i => {
        const match = prices?.find(p => p.name.toLowerCase() === i.name.toLowerCase())
        const quantity = parseFloat(i.quantity) || 1
        return {
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          estimated_price: match ? match.price * quantity : 0,
          found: !!match
        }
      })

      const total = details.reduce((sum, d) => sum + d.estimated_price, 0)
      const per_serving = recipeData.servings ? total / recipeData.servings : total
      setCostDetails({ total, per_serving, details })
    } catch (e) { console.error(e) }
  }

  const reestimate = async () => {
    if (estimatingRef.current || cooldown > 0) return
    estimatingRef.current = true
    setEstimating(true)
    setApiError("")

    try {
      const { data: prices } = await supabase.from("ingredient_prices").select("name, price, unit")
      const missing = ingredients.filter(i => !prices?.some(p => p.name.toLowerCase() === i.name.toLowerCase()))

      if (missing.length > 0) {
        const prompt = `Estime le prix unitaire en supermarché français pour ces ingrédients : ${missing.map(m => m.name).join(", ")}. Réponds UNIQUEMENT en JSON : [{"name":"...", "price":0.00, "unit":"..."}]`
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            })
          }
        )

        if (!response.ok) {
          if (response.status === 429) {
            setCooldown(60)
            throw new Error("L'IA est saturée. Attend une minute ! ⏳")
          }
          throw new Error("Erreur serveur IA.")
        }

        const data = await response.json()
        const gemini_prices = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text)

        if (gemini_prices.length > 0) {
          await supabase.from("ingredient_prices").upsert(
            gemini_prices.map(p => ({ name: p.name, price: p.price, unit: p.unit })),
            { onConflict: "name" }
          )
        }
        await loadCostDetails(recipe, ingredients)
      }
      setCooldown(60)
    } catch (error) {
      setApiError(error.message)
      setCooldown(60)
    } finally {
      estimatingRef.current = false
      setEstimating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer cette recette ?")) return
    setDeleting(true)
    await supabase.from("recipes").delete().eq("id", id)
    navigate("/recipes")
  }

  if (loading) return <div className="p-6 text-zinc-400 font-medium text-center">Chargement...</div>
  if (!recipe) return <div className="p-6 text-zinc-400 font-medium text-center">Recette introuvable.</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate("/recipes")} className="text-zinc-400 hover:text-zinc-600 mb-6 text-sm flex items-center gap-1 font-medium transition">
        ← Retour
      </button>

      <div className="bg-white dark:bg-zinc-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-zinc-700">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">{recipe.name}</h1>
            <div className="flex gap-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
              {recipe.servings && <span>🍽 {recipe.servings} pers.</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/recipes/${id}/edit`)} className="p-2.5 bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 rounded-xl transition">✏️</button>
            <button onClick={handleDelete} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition">🗑️</button>
          </div>
        </div>

        {/* BUDGET IA */}
        <div className="mb-10 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-2xl p-5 shadow-inner">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">💰 Budget</h2>
            <button 
              onClick={reestimate} 
              disabled={estimating || cooldown > 0}
              className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-sm ${cooldown > 0 ? 'bg-zinc-200 text-zinc-400' : 'bg-green-500 text-white hover:bg-green-600 active:scale-95'}`}
            >
              {estimating ? "⌛ ANALYSE..." : cooldown > 0 ? `⏳ ${cooldown}S` : "🔄 RECALCULER"}
            </button>
          </div>
          
          {apiError && <p className="text-[11px] text-red-500 mb-3 font-medium bg-white/50 dark:bg-black/20 p-2 rounded-lg italic text-center">⚠️ {apiError}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl text-center shadow-sm">
              <p className="text-2xl font-black text-green-600">{costDetails?.total.toFixed(2)}€</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Total</p>
            </div>
            <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl text-center shadow-sm">
              <p className="text-2xl font-black text-green-600">{costDetails?.per_serving.toFixed(2)}€</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Par pers.</p>
            </div>
          </div>
        </div>

        {/* INGRÉDIENTS (Statique, sans hover) */}
        <div className="mb-10">
          <h3 className="font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2 text-lg">
            <span className="text-brand-orange">🛒</span> Ingrédients
          </h3>
          <div className="flex flex-col gap-1">
            {costDetails?.details.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-700/50 text-sm">
                <div className="flex gap-2">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                    {item.name}
                  </span>
                  <span className="text-zinc-400">({item.quantity} {item.unit})</span>
                </div>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {item.found ? `${item.estimated_price.toFixed(2)}€` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ÉTAPES */}
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2 text-lg border-t border-zinc-100 dark:border-zinc-700 pt-8">
            <span className="text-brand-orange">👨‍🍳</span> Préparation
          </h3>
          <div className="space-y-6">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3 items-baseline">
                <span className="flex-shrink-0 text-brand-orange font-black text-base w-6">
                  {i + 1}.
                </span>
                <div className="flex-1">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
import { useState, useEffect } from "react"
import { supabase } from "../supabase"

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date) {
  return date.toISOString().split("T")[0]
}

export default function Shopping() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [success, setSuccess] = useState(false)

  const monday = getMonday(new Date())
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  const weekLabel = `${monday.getDate()} — ${sunday.getDate()} ${sunday.toLocaleString("fr-FR", { month: "long" })} ${sunday.getFullYear()}`

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from("shopping_list")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", formatDate(monday))
      .order("checked")
    if (data) setItems(data)
    setLoading(false)
  }

const handleGenerate = async () => {
  setGenerating(true)
  const { data: { user } } = await supabase.auth.getUser()

  const { data: meals, error: mealsError } = await supabase
    .from("meal_plan")
    .select("recipe_id")
    .eq("user_id", user.id)
    .gte("date", formatDate(monday))
    .lte("date", formatDate(sunday))

  console.log("meals:", meals, "error:", mealsError)

  if (!meals || meals.length === 0) {
    setGenerating(false)
    return alert("Aucun repas planifié cette semaine !")
  }

  const recipeIds = [...new Set(meals.map(m => m.recipe_id))]
  console.log("recipeIds:", recipeIds)

  const { data: ingredients, error: ingError } = await supabase
    .from("ingredients")
    .select("*")
    .in("recipe_id", recipeIds)

  console.log("ingredients:", ingredients, "error:", ingError)

  if (!ingredients || ingredients.length === 0) {
    setGenerating(false)
    return alert("Aucun ingrédient trouvé pour ces recettes !")
  }

  const merged = {}
  ingredients.forEach(ing => {
    const key = ing.name.toLowerCase().trim()
    if (merged[key]) {
      merged[key].quantity = (merged[key].quantity || 0) + (ing.quantity || 0)
    } else {
      merged[key] = { name: ing.name, quantity: ing.quantity, unit: ing.unit }
    }
  })

  await supabase
    .from("shopping_list")
    .delete()
    .eq("user_id", user.id)
    .eq("week_start", formatDate(monday))

  const { error: insertError } = await supabase.from("shopping_list").insert(
    Object.values(merged).map(item => ({
      user_id: user.id,
      name: item.name,
      quantity: item.quantity || null,
      unit: item.unit || null,
      checked: false,
      week_start: formatDate(monday),
    }))
  )

  console.log("insertError:", insertError)

  await fetchItems()
  setGenerating(false)
  setSuccess(true)
  setTimeout(() => setSuccess(false), 3000)
}

  const toggleChecked = async (item) => {
    await supabase
      .from("shopping_list")
      .update({ checked: !item.checked })
      .eq("id", item.id)
    await fetchItems()
  }

  const deleteItem = async (id) => {
    await supabase.from("shopping_list").delete().eq("id", id)
    await fetchItems()
  }

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  return (
    <div className="p-6 max-w-xl">

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ Liste générée avec succès !
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">🛒 Courses</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Semaine du {weekLabel}</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
        >
          {generating ? "Génération..." : "✨ Générer depuis le planning"}
        </button>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-8 text-center">
          <p className="text-zinc-400 text-sm mb-1">Aucun article pour cette semaine</p>
          <p className="text-zinc-300 text-xs">Planifie des repas dans le calendrier puis clique sur "Générer"</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">

          {/* Articles non cochés */}
          {unchecked.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 border-b border-gray-50 dark:border-zinc-700">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">À acheter · {unchecked.length}</span>
              </div>
              {unchecked.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-zinc-700 last:border-0 group">
                  <button
                    onClick={() => toggleChecked(item)}
                    className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-zinc-600 hover:border-orange-400 transition flex-shrink-0"
                  />
                  <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{item.name}</span>
                  {item.quantity && (
                    <span className="text-xs text-zinc-400">{item.quantity} {item.unit || ""}</span>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-zinc-200 dark:text-zinc-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-base leading-none"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Articles cochés */}
          {checked.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm opacity-60">
              <div className="px-4 py-2.5 border-b border-gray-50 dark:border-zinc-700">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Dans le panier · {checked.length}</span>
              </div>
              {checked.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-zinc-700 last:border-0 group">
                  <button
                    onClick={() => toggleChecked(item)}
                    className="w-5 h-5 rounded-full border-2 border-orange-400 bg-orange-400 transition flex-shrink-0 flex items-center justify-center"
                  >
                    <span className="text-white text-xs">✓</span>
                  </button>
                  <span className="flex-1 text-sm text-zinc-400 line-through">{item.name}</span>
                  {item.quantity && (
                    <span className="text-xs text-zinc-300">{item.quantity} {item.unit || ""}</span>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-zinc-200 dark:text-zinc-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-base leading-none"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
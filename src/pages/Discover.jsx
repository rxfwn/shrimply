import { useState, useEffect } from "react"
import { supabase } from "../supabase"

export default function Discover() {
  const [recipes, setRecipes] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [bannedPopup, setBannedPopup] = useState(null) // 1️⃣ AJOUT : État pour le popup de modération

  const TAGS = ["🌿 Végé", "🍝 Italien", "🥢 Asiatique", "🇫🇷 Français", "⚡ Rapide", "💪 Protéiné", "🥗 Léger", "🍰 Dessert", "💰 Économique"]

  useEffect(() => { fetchRecipes() }, [])

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("is_public", true)
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) {
      const userIds = [...new Set(data.map(r => r.user_id))]
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds)

      const profileMap = {}
      profiles?.forEach(p => { profileMap[p.id] = p })

      const recipesWithProfiles = data.map(r => ({
        ...r,
        profiles: profileMap[r.user_id] || null
      }))

      setRecipes(recipesWithProfiles)
    }
    setLoading(false)
  }

  // 2️⃣ AJOUT : Fonction pour vérifier les mots interdits
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

  const handleAddToMyRecipes = async (recipe) => {
    const { data: { user } } = await supabase.auth.getUser()

    // 3️⃣ AJOUT : On récupère d'abord les ingrédients et étapes de la recette pour tout vérifier
    const { data: ingredients } = await supabase.from("ingredients").select("*").eq("recipe_id", recipe.id)
    const { data: steps } = await supabase.from("steps").select("*").eq("recipe_id", recipe.id).order("step_number")

    const textsToCheck = [
      recipe.name,
      recipe.description || "",
      ...(ingredients || []).map(i => i.name),
      ...(steps || []).map(s => s.description)
    ]

    const found = await checkBannedWords(textsToCheck)
    if (found) {
      setBannedPopup(found) // Affiche le popup si la recette originale contient un mot interdit
      return
    }

    // 4️⃣ On insère la recette SEULEMENT SI elle passe la modération
    const { data: newRecipe, error: recipeError } = await supabase.from("recipes").insert({
      user_id: user.id,
      name: recipe.name,
      description: recipe.description,
      prep_time: recipe.prep_time,
      servings: recipe.servings,
      tags: recipe.tags,
      is_public: false, // Elle devient privée chez toi par défaut
    }).select().single()

    if (recipeError) {
      console.error("Erreur lors du clonage de la recette :", recipeError)
      return
    }

    if (newRecipe) {
      if (ingredients?.length > 0) {
        const { error: ingError } = await supabase.from("ingredients").insert(
          ingredients.map(i => ({
            recipe_id: newRecipe.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            calories: i.calories,
          }))
        )
        if (ingError) console.error("Erreur Ingrédients :", ingError)
      }

      if (steps?.length > 0) {
        const { error: stepError } = await supabase.from("steps").insert(
          steps.map(s => ({
            recipe_id: newRecipe.id,
            step_number: s.step_number,
            description: s.description,
          }))
        )
        if (stepError) console.error("Erreur Étapes :", stepError)
      }

      setSuccess(`"${recipe.name}" ajoutée à tes recettes !`)
      setTimeout(() => setSuccess(""), 3000)
    }
  }

  const handleLike = async (recipeId) => {
    const { data: { user } } = await supabase.auth.getUser()
    const existing = await supabase
      .from("recipe_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId)
      .single()

    if (existing.data) {
      await supabase.from("recipe_likes").delete().eq("id", existing.data.id)
    } else {
      await supabase.from("recipe_likes").insert({ user_id: user.id, recipe_id: recipeId })
    }
    await fetchRecipes()
  }

  const filteredRecipes = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || (r.tags && r.tags.includes(filter))
    return matchSearch && matchFilter
  })

  return (
    <div className="p-6">

      {/* 5️⃣ AJOUT : Popup si on tente d'importer une recette avec un mot interdit */}
      {bannedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-red-200 dark:border-red-800">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Importation bloquée</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                Cette recette contient un mot non autorisé par notre charte :
              </p>
              <p className="text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-xl mb-4 inline-block">
                « {bannedPopup} »
              </p>
              <p className="text-xs text-zinc-400 mb-5">
                Tu ne peux pas ajouter cette recette à ton portefeuille. L'auteur a été signalé.
              </p>
              <button
                onClick={() => setBannedPopup(null)}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ {success}
        </div>
      )}

      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">✨ Découvrir</h1>
      <p className="text-sm text-zinc-400 mb-5">Recettes partagées par la communauté</p>

      {/* Recherche + filtres */}
      <div className="flex flex-col gap-3 mb-5">
        <input
          className="w-full max-w-md border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          placeholder="Rechercher une recette..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${filter === "all" ? "bg-orange-500 border-orange-500 text-white" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-600 text-zinc-500 hover:border-orange-300"}`}
          >
            Toutes
          </button>
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setFilter(filter === tag ? "all" : tag)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${filter === tag ? "bg-orange-500 border-orange-500 text-white" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-600 text-zinc-500 hover:border-orange-300"}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm">Chargement...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-8 text-center max-w-md">
          <p className="text-zinc-400 text-sm mb-1">Aucune recette publique pour l'instant</p>
          <p className="text-zinc-300 text-xs">Partage tes recettes pour qu'elles apparaissent ici !</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 max-w-5xl">
          {filteredRecipes.map(recipe => (
            <div key={recipe.id} className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {recipe.profiles?.avatar_url ? (
                    <img src={recipe.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs">👤</span>
                  )}
                </div>
                <span className="text-xs text-zinc-400">{recipe.profiles?.username || "Utilisateur"}</span>
              </div>

              <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 text-sm">{recipe.name}</h3>
              {recipe.description && <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{recipe.description}</p>}

              <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
                {recipe.servings && <span>🍽 {recipe.servings} portions</span>}
              </div>

              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.tags.map(tag => (
                    <span key={tag} className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleAddToMyRecipes(recipe)}
                className="w-full bg-orange-50 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-200 hover:border-orange-500 py-1.5 rounded-lg text-xs font-medium transition"
              >
                + Ajouter à mes recettes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
// ===============================
// MOTEUR DE CONVERSION D'UNITÉS
// ===============================

const UNIT_CONVERSIONS = {

  // poids
  g: { base: "kg", factor: 0.001 },
  gramme: { base: "kg", factor: 0.001 },
  grammes: { base: "kg", factor: 0.001 },

  kg: { base: "kg", factor: 1 },

  mg: { base: "kg", factor: 0.000001 },

  // volume
  ml: { base: "l", factor: 0.001 },
  millilitre: { base: "l", factor: 0.001 },
  millilitres: { base: "l", factor: 0.001 },

  cl: { base: "l", factor: 0.01 },

  l: { base: "l", factor: 1 },
  litre: { base: "l", factor: 1 },
  litres: { base: "l", factor: 1 },

  // cuillères — toutes les variantes de saisie possibles
  "c.à.s": { base: "l", factor: 0.015 },
  "c. à soupe": { base: "l", factor: 0.015 },
  "c.à soupe": { base: "l", factor: 0.015 },
  "càs": { base: "l", factor: 0.015 },
  soupe: { base: "l", factor: 0.015 },
  "cuillère à soupe": { base: "l", factor: 0.015 },
  "cuillères à soupe": { base: "l", factor: 0.015 },
  cuillere: { base: "l", factor: 0.015 },

  "c.à.c": { base: "l", factor: 0.005 },
  "c. à café": { base: "l", factor: 0.005 },
  "c.à café": { base: "l", factor: 0.005 },
  "càc": { base: "l", factor: 0.005 },
  cafe: { base: "l", factor: 0.005 },
  café: { base: "l", factor: 0.005 },
  "cuillère à café": { base: "l", factor: 0.005 },
  "cuillères à café": { base: "l", factor: 0.005 },

  // unités cuisine
  pincée: { base: "kg", factor: 0.0005 },
  pincee: { base: "kg", factor: 0.0005 },

  piece: { base: "piece", factor: 1 },
  pièce: { base: "piece", factor: 1 },
  pièces: { base: "piece", factor: 1 },
  pieces: { base: "piece", factor: 1 },
  unite: { base: "piece", factor: 1 },
  unité: { base: "piece", factor: 1 },
  tranche: { base: "piece", factor: 1 },
  tranches: { base: "piece", factor: 1 },
  botte: { base: "piece", factor: 1 },
  bottes: { base: "piece", factor: 1 },
  tete: { base: "piece", factor: 1 },
  tête: { base: "piece", factor: 1 },
}

function convertUnit(quantity, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return quantity

  const normalizedFrom = fromUnit.toLowerCase().trim()
  const normalizedTo = toUnit.toLowerCase().trim()

  if (normalizedFrom === normalizedTo) return quantity

  const from = UNIT_CONVERSIONS[normalizedFrom]
  const to = UNIT_CONVERSIONS[normalizedTo]

  if (!from || !to) return quantity
  if (from.base !== to.base) return quantity

  const baseQty = quantity * from.factor
  return baseQty / to.factor
}

// Normalise une chaîne pour la comparaison : minuscules, sans accents, sans ponctuation
function normalizeStr(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Mots à ignorer dans le matching
const STOP_WORDS = new Set([
  // qualificatifs
  "frais", "fraiche", "fraiche", "fraiches", "fraiches",
  "vert", "verts", "verte", "vertes",
  "jaune", "jaunes", "rouge", "rouges", "blanc", "blanche",
  "selon", "gout", "gout",
  "bio", "petit", "petite", "grand", "grande",
  "extra", "vierge", "arborio", "guerande",
  // articles / prépositions
  "en", "de", "du", "la", "le", "les", "un", "une", "des", "au", "aux",
  "pour", "avec", "par",
  // contenants — clé du fix
  "sachet", "paquet", "boite", "bouteille", "bocal", "brique",
  "bouquet", "botte", "buche", "pot", "filet", "barquette",
  "boite", "conserve", "tube",
  // variétés spécifiques (ne doivent pas bloquer le match)
  "mache", "iceberg", "romaine", "batavia", "frisee", "roquette",
  "arborio", "basmati", "jasmin", "long", "ronde",
  "guerande", "himalaya", "iode",
  // variantes de conditionnement
  "varietes", "assortiment",
])

// ===============================
// RÈGLES DE CATÉGORIE D'UNITÉ
// Détermine l'unité de vente standard d'un ingrédient
// indépendamment de ce que la recette indique
// ===============================
const CATEGORY_UNIT_RULES = [
  // Légumes entiers → piece
  { keywords: ["salade", "laitue", "mache", "roquette", "epinard", "endive", "cresson", "scarole"], unit: "piece" },
  { keywords: ["tomate", "poivron", "courgette", "aubergine", "concombre", "fenouil", "brocoli", "chou"], unit: "piece" },
  { keywords: ["oignon", "echalote", "poireau", "navet", "betterave", "radis", "carotte", "panais"], unit: "piece" },
  { keywords: ["avocat", "mangue", "citron", "orange", "pamplemousse", "pomme", "poire", "peche", "abricot", "banane"], unit: "piece" },
  // Ail → piece
  { keywords: ["ail"], unit: "piece" },
  // Herbes fraîches → piece (botte)
  { keywords: ["persil", "basilic", "coriandre", "menthe", "ciboulette", "thym", "romarin", "aneth", "estragon", "laurier"], unit: "piece" },
  // Bouillon cube → piece
  { keywords: ["cube", "bouillon"], unit: "piece" },
  // Œufs → piece
  { keywords: ["oeuf", "oeufs"], unit: "piece" },
  // Huiles → l
  { keywords: ["huile"], unit: "l" },
  // Fromages → kg
  { keywords: ["chevre", "feta", "camembert", "brie", "roquefort", "comté", "comte", "parmesan", "gruyere", "fromage"], unit: "kg" },
  // Condiments/sauces → kg
  { keywords: ["pesto", "moutarde", "ketchup", "mayonnaise", "sauce"], unit: "kg" },
  // Féculents → kg
  { keywords: ["riz", "pate", "farine", "semoule", "boulgour", "quinoa", "lentille", "pois"], unit: "kg" },
  // Épices / sel / sucre → kg
  { keywords: ["sel", "poivre", "sucre", "cannelle", "curcuma", "paprika", "cumin", "curry", "epice"], unit: "kg" },
]

function getCategoryUnit(ingredientName) {
  const normalized = normalizeStr(ingredientName)
  for (const rule of CATEGORY_UNIT_RULES) {
    if (rule.keywords.some(k => normalized.includes(k))) {
      return rule.unit
    }
  }
  return null // unité inconnue, on laisse Gemini décider
}

// Stemming léger : retire le 's' final pour gérer pluriels (cubes->cube, légumes->légume)
function stem(word) {
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1)
  return word
}

// Synonymes : ramène certains mots vers un mot canonique avant matching
const SYNONYMS = {
  laitue: "salade",
  mache: "salade",
  roquette: "salade",
  epinard: "salade",
  endive: "salade",
  cresson: "salade",
}

function applySynonyms(words) {
  return words.map(w => SYNONYMS[w] || w)
}

function getMatchWords(name) {
  return applySynonyms(
    normalizeStr(name)
      .split(" ")
      .filter(w => w.length > 1 && !STOP_WORDS.has(w))
      .map(stem)
  )
}

// Trouve le meilleur match dans la liste de prix
// Stratégie : score = nombre de mots de l'ingrédient trouvés dans le nom du prix
// On prend le match avec le score le plus élevé, et en cas d'égalité, le plus court (plus précis)
function findBestMatch(ingredientName, prices) {
  const ingredientWords = getMatchWords(ingredientName)
  if (!ingredientWords.length) return null

  let bestMatch = null
  let bestScore = 0
  let bestNameLen = Infinity

  for (const p of prices) {
    const priceWords = getMatchWords(p.name)
    if (!priceWords.length) continue

    // Mots communs entre recette et prix (après suppression des stopwords des deux côtés)
    const commonWords = ingredientWords.filter(w => priceWords.includes(w))
    const score = commonWords.length

    if (score === 0) continue

    // Couverture dans les deux sens :
    // - tous les mots de la recette sont dans le prix (ex: "riz risotto" dans "paquet riz arborio risotto")
    // - OU tous les mots du prix sont dans la recette (ex: "persil" dans "persil frais")
    const coverageRecipe = score / ingredientWords.length
    const coveragePrice = score / priceWords.length

    if (coverageRecipe === 1 || coveragePrice === 1) {
      const nameLen = priceWords.length
      if (score > bestScore || (score === bestScore && nameLen < bestNameLen)) {
        bestScore = score
        bestMatch = p
        bestNameLen = nameLen
      }
    }
  }

  return bestMatch
}

// Détermine l'unité de base d'un ingrédient dans la recette
// Si l'unité est vide ou "piece/pièce", on retourne "piece"
function getIngredientBaseUnit(unit) {
  if (!unit) return null
  const u = unit.toLowerCase().trim()
  const conv = UNIT_CONVERSIONS[u]
  return conv ? conv.base : null
}

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
  const [checkedSteps, setCheckedSteps] = useState({})

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

  // ===============================
  // CALCULATEUR DE COÛT AMÉLIORÉ
  // ===============================
  const loadCostDetails = async (recipeData, ingredientsData) => {
    try {
      const { data: prices } = await supabase
        .from("ingredient_prices")
        .select("name, price, unit")

      const details = ingredientsData.map(i => {
        const quantity = parseFloat(i.quantity) || 0
        let estimatedPrice = 0
        let found = false

        if (prices?.length) {
          const match = findBestMatch(i.name, prices)

          if (match) {
            const recipeUnit = (i.unit || "").toLowerCase().trim()
            const priceUnit = (match.unit || "").toLowerCase().trim()

            const recipeBase = getIngredientBaseUnit(recipeUnit)
            const priceBase = getIngredientBaseUnit(priceUnit) || (match.unit === "piece" ? "piece" : null)

            if (recipeBase !== null && recipeBase === priceBase) {
              // Unités compatibles : conversion directe
              const convertedQty = convertUnit(quantity, recipeUnit, priceUnit)
              estimatedPrice = convertedQty * match.price
              found = true
            } else if (recipeBase === "l" && priceBase === "kg") {
              // Recette en volume (c. à café/soupe), prix au kg
              // Pour les ingrédients secs mesurés en cuillères (sucre, sel, farine, épices...)
              // Densité approximative : 1 litre ≈ 0.8 kg (sucre/farine), 1.2 kg (sel)
              const DENSITY_KG_PER_L = {
                sucre: 0.85, farine: 0.55, sel: 1.20, poivre: 0.50,
                cannelle: 0.50, curcuma: 0.50, paprika: 0.50, cumin: 0.50,
                curry: 0.50, levure: 0.55, cacao: 0.50, maizena: 0.60,
              }
              const normalized = normalizeStr(i.name)
              const density = Object.entries(DENSITY_KG_PER_L).find(([k]) => normalized.includes(k))?.[1] || 0.80
              const qtyL = convertUnit(quantity, recipeUnit, "l")
              estimatedPrice = qtyL * density * match.price
              found = true
            } else if (recipeBase === "kg" && priceBase === "piece") {
              // Recette en grammes, prix à la pièce (ex: persil en g, botte en piece)
              // On utilise les poids moyens par catégorie
              const PIECE_WEIGHTS = {
                persil: 0.030, basilic: 0.025, coriandre: 0.025, menthe: 0.025, ciboulette: 0.020,
                salade: 0.300, laitue: 0.250, epinard: 0.200, roquette: 0.100, mache: 0.100,
                citron: 0.100, orange: 0.200, tomate: 0.150, oignon: 0.100, echalote: 0.050,
                ail: 0.050, courgette: 0.250, carotte: 0.100, poivron: 0.200,
              }
              const normalized = normalizeStr(i.name)
              const pieceWeightKg = Object.entries(PIECE_WEIGHTS).find(([k]) => normalized.includes(k))?.[1]
              if (pieceWeightKg) {
                const qtyKg = quantity * 0.001
                estimatedPrice = (qtyKg / pieceWeightKg) * match.price
                found = true
              }
            } else if (recipeBase === "piece" || !recipeUnit || recipeBase === null) {
              // Recette à la pièce ou unité inconnue, prix à la pièce
              if (priceBase === "piece") {
                estimatedPrice = quantity * match.price
                found = true
              }
            }
          }
        }

        return {
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          estimated_price: Number(estimatedPrice.toFixed(2)),
          found
        }
      })

      const total = details.reduce((sum, d) => sum + d.estimated_price, 0)
      const per_serving = recipeData.servings ? total / recipeData.servings : total

      setCostDetails({
        total: Number(total.toFixed(2)),
        per_serving: Number(per_serving.toFixed(2)),
        details
      })
    } catch (e) {
      console.error("Erreur calcul budget:", e)
    }
  }

  const reestimate = async () => {
    if (estimatingRef.current || cooldown > 0) return
    estimatingRef.current = true
    setEstimating(true)
    setApiError("")

    try {
      const { data: prices } = await supabase.from("ingredient_prices").select("name, price, unit")
      const missing = ingredients.filter(i => !findBestMatch(i.name, prices || []))

      if (missing.length > 0) {
        // Détermine l'unité attendue via les règles catégorielles, puis crée le hint pour Gemini
        const ingredientsWithHints = missing.map(m => {
          const categoryUnit = getCategoryUnit(m.name)
          if (categoryUnit === "piece") return `${m.name} [vendu à la pièce]`
          if (categoryUnit === "kg") return `${m.name} [vendu au poids]`
          if (categoryUnit === "l") return `${m.name} [vendu au volume]`
          // Fallback : on utilise l'unité de la recette
          const recipeBase = getIngredientBaseUnit((m.unit || "").toLowerCase().trim())
          if (recipeBase === "piece") return `${m.name} [vendu à la pièce]`
          if (recipeBase === "kg") return `${m.name} [vendu au poids]`
          if (recipeBase === "l") return `${m.name} [vendu au volume]`
          return m.name
        })

        const { data: gemini_prices, error: funcError } = await supabase.functions.invoke('estimate-costs', {
          body: { ingredients: ingredientsWithHints }
        })
        if (funcError) throw new Error("Erreur serveur IA.")
        if (gemini_prices?.length > 0) {
          // Remap les noms avec hints vers les vrais noms de la recette
          const nameMap = Object.fromEntries(
            ingredientsWithHints.map((hint, idx) => [hint, missing[idx].name])
          )
          const remapped = gemini_prices.map((p) => ({
            name: nameMap[p.name] || p.name,
            price: p.price,
            unit: p.unit,
          }))
          await supabase.from("ingredient_prices").upsert(
            remapped.map(p => ({ name: p.name, price: p.price, unit: p.unit })),
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
    if (recipe?.photo_url) {
      try {
        const path = recipe.photo_url.split("/recipe-images/")[1]
        if (path) await supabase.storage.from("recipe-images").remove([path])
      } catch (e) { console.error("Erreur suppression photo:", e) }
    }
    await supabase.from("recipes").delete().eq("id", id)
    navigate("/recipes")
  }

  const handlePrint = () => {
    const displayIngredients = costDetails?.details || ingredients.map(i => ({ ...i, found: false, estimated_price: 0 }))

    const tagsHtml = recipe.tags?.length
      ? recipe.tags.map(t => `<span class="tag">${t}</span>`).join("")
      : ""

    const ingredientsHtml = displayIngredients.map(item => `
      <li>
        <span class="ing-name">${item.name}</span>
        <span class="ing-qty">${item.quantity || ""} ${item.unit || ""}</span>
      </li>`).join("")

    const stepsHtml = steps.map((step, i) => `
      <div class="step">
        <div class="step-num">${i + 1}</div>
        <p>${step.description}</p>
      </div>`).join("")

    const budgetHtml = costDetails ? `
      <div class="budget">
        <span class="budget-label">💰 Budget estimé</span>
        <span class="budget-total">${costDetails.total.toFixed(2)}€ total</span>
        <span class="budget-per">— ${costDetails.per_serving.toFixed(2)}€ / pers.</span>
      </div>` : ""

    const photoHtml = recipe.photo_url
      ? `<img src="${recipe.photo_url}" class="photo" alt="${recipe.name}" />`
      : ""

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Recette</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; color: #1a1a1a; background: white; padding: 40px 48px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; gap: 28px; align-items: flex-start; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 2px solid #f97316; }
    .photo { width: 180px; height: 135px; object-fit: cover; border-radius: 12px; flex-shrink: 0; }
    .header-info { flex: 1; }
    h1 { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; line-height: 1.2; }
    .description { font-size: 13px; color: #555; margin-bottom: 12px; font-style: italic; line-height: 1.5; }
    .meta { display: flex; gap: 16px; margin-bottom: 10px; }
    .meta-pill { font-size: 12px; font-family: 'Arial', sans-serif; background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { font-size: 11px; font-family: 'Arial', sans-serif; background: #fff7ed; color: #ea580c; padding: 3px 8px; border-radius: 20px; }
    .budget { display: flex; align-items: center; gap: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 14px; margin-bottom: 28px; font-family: 'Arial', sans-serif; }
    .budget-label { font-size: 12px; font-weight: 700; color: #166534; }
    .budget-total { font-size: 14px; font-weight: 800; color: #16a34a; }
    .budget-per { font-size: 12px; color: #4ade80; }
    .columns { display: grid; grid-template-columns: 1fr 1.6fr; gap: 32px; }
    h2 { font-size: 13px; font-family: 'Arial', sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ea580c; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #fed7aa; }
    ul { list-style: none; }
    ul li { display: flex; justify-content: space-between; align-items: baseline; padding: 7px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
    ul li:last-child { border-bottom: none; }
    .ing-name { color: #333; }
    .ing-qty { color: #888; font-size: 12px; font-family: 'Arial', sans-serif; }
    .step { display: flex; gap: 14px; margin-bottom: 16px; align-items: flex-start; }
    .step-num { flex-shrink: 0; width: 24px; height: 24px; background: #f97316; color: white; border-radius: 50%; font-size: 12px; font-family: 'Arial', sans-serif; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
    .step p { font-size: 13px; line-height: 1.65; color: #333; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-family: 'Arial', sans-serif; font-size: 11px; color: #aaa; }
    @media print { body { padding: 20px 28px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <div class="header">
    ${photoHtml}
    <div class="header-info">
      <h1>${recipe.name}</h1>
      ${recipe.description ? `<p class="description">${recipe.description}</p>` : ""}
      <div class="meta">
        ${recipe.prep_time ? `<span class="meta-pill">⏱ ${recipe.prep_time} min</span>` : ""}
        ${recipe.servings ? `<span class="meta-pill">🍽 ${recipe.servings} pers.</span>` : ""}
        ${ingredients.length ? `<span class="meta-pill">🛒 ${ingredients.length} ingr.</span>` : ""}
      </div>
      ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ""}
    </div>
  </div>
  ${budgetHtml}
  <div class="columns">
    <div>
      <h2>Ingrédients</h2>
      <ul>${ingredientsHtml}</ul>
    </div>
    <div>
      <h2>Préparation</h2>
      ${stepsHtml}
    </div>
  </div>
  <div class="footer"><span>Shrímply 🍤</span></div>
  <script>window.onload = () => { window.print() }<\/script>
</body>
</html>`

    const win = window.open("", "_blank")
    win.document.write(html)
    win.document.close()
  }

  if (loading) return <div className="p-6 text-zinc-400 font-medium text-center">Chargement...</div>
  if (!recipe) return <div className="p-6 text-zinc-400 font-medium text-center">Recette introuvable.</div>

  const displayIngredients = costDetails?.details || ingredients.map(i => ({ ...i, found: false, estimated_price: 0 }))

  return (
    <div className="p-4 md:p-6">
      <button
        onClick={() => navigate("/recipes")}
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mb-4 md:mb-6 text-sm flex items-center gap-1 font-medium transition"
      >
        ← Retour
      </button>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <div className="bg-white dark:bg-zinc-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-700">

          <div className="grid grid-cols-[5fr_4fr] min-h-[340px]">
            <div className="relative overflow-hidden">
              {recipe.photo_url ? (
                <img src={recipe.photo_url} alt={recipe.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center">
                  <span className="text-8xl opacity-15">🍽</span>
                </div>
              )}
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-white dark:to-zinc-800" />
            </div>

            <div className="flex flex-col justify-between p-8 border-l border-gray-100 dark:border-zinc-700">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 pr-3">
                    {recipe.duplicated_from && (
                      <span className="text-[10px] text-zinc-400 italic mb-1 block">📋 Copie</span>
                    )}
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{recipe.name}</h1>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={handlePrint} className="p-2 bg-zinc-50 dark:bg-zinc-700 hover:bg-orange-50 hover:text-orange-500 rounded-xl transition text-base" title="Imprimer">🖨️</button>
                    <button onClick={() => navigate(`/recipes/${id}/edit`)} className="p-2 bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 rounded-xl transition text-base">✏️</button>
                    <button onClick={handleDelete} disabled={deleting} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 rounded-xl transition disabled:opacity-50 text-base">🗑️</button>
                  </div>
                </div>

                {recipe.description && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">{recipe.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {recipe.prep_time && (
                    <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <span>⏱</span><span>{recipe.prep_time} min</span>
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <span>🍽</span><span>{recipe.servings} pers.</span>
                    </div>
                  )}
                  {ingredients.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <span>🛒</span><span>{ingredients.length} ingr.</span>
                    </div>
                  )}
                  {steps.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-3 py-1.5 rounded-full text-xs font-semibold">
                      <span>👨‍🍳</span><span>{steps.length} étapes</span>
                    </div>
                  )}
                </div>

                {recipe.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {recipe.tags.map(tag => (
                      <span key={tag} className="text-[11px] bg-brand-orange/10 text-brand-orange px-2.5 py-1 rounded-full font-medium">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">💰 Budget estimé</span>
                  <button
                    onClick={reestimate}
                    disabled={estimating || cooldown > 0}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${cooldown > 0 ? "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500" : "bg-green-500 text-white hover:bg-green-600"}`}
                  >
                    {estimating ? "⌛ Analyse..." : cooldown > 0 ? `⏳ ${cooldown}s` : "🔄 Recalculer"}
                  </button>
                </div>
                {apiError && <p className="text-[11px] text-red-500 mb-2 italic">{apiError}</p>}
                {costDetails ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-zinc-900/50 p-3 rounded-xl text-center">
                      <p className="text-xl font-black text-green-600">{costDetails.total.toFixed(2)}€</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Total</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900/50 p-3 rounded-xl text-center">
                      <p className="text-xl font-black text-green-600">{costDetails.per_serving.toFixed(2)}€</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">Par pers.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 text-center py-1">Clique sur Recalculer pour estimer le coût</p>
                )}
              </div>
            </div>
          </div>

          {/* Ingrédients + Étapes */}
          <div className="grid grid-cols-[2fr_3fr] border-t border-gray-100 dark:border-zinc-700">

            <div className="p-8 border-r border-gray-100 dark:border-zinc-700">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2 text-base uppercase tracking-wide">
                <span className="w-6 h-6 bg-brand-orange/10 rounded-lg flex items-center justify-center text-sm">🛒</span>
                Ingrédients
              </h3>
              <div className="flex flex-col">
                {displayIngredients.map((item, i) => (
                  <div key={i} className="flex justify-between items-baseline py-2.5 border-b border-zinc-50 dark:border-zinc-700/50 last:border-0">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.name}</span>
                    <div className="flex items-baseline gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs text-zinc-400">{item.quantity} {item.unit}</span>
                      {item.found && <span className="text-xs font-semibold text-green-500 w-10 text-right">{item.estimated_price.toFixed(2)}€</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2 text-base uppercase tracking-wide">
                <span className="w-6 h-6 bg-brand-orange/10 rounded-lg flex items-center justify-center text-sm">👨‍🍳</span>
                Préparation
              </h3>
              <div className="flex flex-col gap-5">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    onClick={() => setCheckedSteps(prev => ({ ...prev, [i]: !prev[i] }))}
                    className={`flex gap-4 cursor-pointer group transition-opacity ${checkedSteps[i] ? "opacity-40" : ""}`}
                  >
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all mt-0.5 ${checkedSteps[i] ? "bg-brand-orange text-white" : "bg-brand-orange/10 text-brand-orange group-hover:bg-brand-orange/20"}`}>
                      {checkedSteps[i] ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className={`text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed ${checkedSteps[i] ? "line-through" : ""}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="block md:hidden">
        <div className="bg-white dark:bg-zinc-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-zinc-700">

          {recipe.photo_url ? (
            <div className="w-full aspect-[4/3] overflow-hidden">
              <img src={recipe.photo_url} alt={recipe.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center">
              <span className="text-7xl opacity-20">🍽</span>
            </div>
          )}

          <div className="p-6">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">{recipe.name}</h1>
                {recipe.description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">{recipe.description}</p>}
                <div className="flex gap-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
                  {recipe.servings && <span>🍽 {recipe.servings} pers.</span>}
                </div>
                {recipe.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {recipe.tags.map(tag => (
                      <span key={tag} className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-4">
                <button onClick={handlePrint} className="p-2.5 bg-zinc-50 dark:bg-zinc-700 hover:bg-orange-50 rounded-xl transition" title="Imprimer">🖨️</button>
                <button onClick={() => navigate(`/recipes/${id}/edit`)} className="p-2.5 bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 rounded-xl transition">✏️</button>
                <button onClick={handleDelete} disabled={deleting} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition disabled:opacity-50">🗑️</button>
              </div>
            </div>

            <div className="mb-10 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 rounded-2xl p-5 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">💰 Budget</h2>
                <button
                  onClick={reestimate}
                  disabled={estimating || cooldown > 0}
                  className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-sm ${cooldown > 0 ? "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500" : "bg-green-500 text-white hover:bg-green-600 active:scale-95"}`}
                >
                  {estimating ? "⌛ ANALYSE..." : cooldown > 0 ? `⏳ ${cooldown}S` : "🔄 RECALCULER"}
                </button>
              </div>
              {apiError && <p className="text-[11px] text-red-500 mb-3 font-medium bg-white/50 dark:bg-black/20 p-2 rounded-lg italic text-center">⚠️ {apiError}</p>}
              {costDetails ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl text-center shadow-sm">
                    <p className="text-2xl font-black text-green-600">{costDetails.total.toFixed(2)}€</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Total</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl text-center shadow-sm">
                    <p className="text-2xl font-black text-green-600">{costDetails.per_serving.toFixed(2)}€</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase mt-1">Par pers.</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 text-center py-2">Clique sur Recalculer pour estimer le coût</p>
              )}
            </div>

            <div className="mb-10">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2 text-lg">
                <span className="text-brand-orange">🛒</span> Ingrédients
              </h3>
              <div className="flex flex-col">
                {displayIngredients.map((item, i) => (
                  <div key={i} className="flex justify-between items-baseline py-3 border-b border-zinc-50 dark:border-zinc-700/50 last:border-0">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.name}</span>
                    <div className="flex items-baseline gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs text-zinc-400">{item.quantity} {item.unit}</span>
                      {item.found && <span className="text-xs font-semibold text-green-500 w-10 text-right">{item.estimated_price.toFixed(2)}€</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2 text-lg border-t border-zinc-100 dark:border-zinc-700 pt-8">
                <span className="text-brand-orange">👨‍🍳</span> Préparation
              </h3>
              <div className="space-y-6">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-baseline">
                    <span className="flex-shrink-0 text-brand-orange font-black text-base w-6">{i + 1}.</span>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
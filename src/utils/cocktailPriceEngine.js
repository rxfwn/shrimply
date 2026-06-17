import { supabase } from "../supabase"
import { COCKTAIL_INGREDIENTS } from "../tags"

function stripAccents(str) {
  return (str || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function normalize(str) {
  return stripAccents((str || "").toLowerCase().trim())
}

// Label → key : exact puis sans accents
const LABEL_TO_KEY = {}
const LABEL_TO_KEY_NORM = {}
COCKTAIL_INGREDIENTS.forEach(i => {
  LABEL_TO_KEY[i.label.toLowerCase()] = i.key
  LABEL_TO_KEY_NORM[normalize(i.label)] = i.key
})

// Noms courants qui diffèrent du label officiel
const EXTRA_ALIASES = {
  "cerise maraschino":     "cerises_marasquin",
  "cerises maraschino":    "cerises_marasquin",
  "cerise marasquin":      "cerises_marasquin",
  "cherry maraschino":     "cerises_marasquin",
  "worcestershire":        "worcestershire",
  "sauce worcestershire":  "worcestershire",
  "citron presse":         "jus_citron",
  "citron presse":         "jus_citron",
}

function labelToKey(label) {
  const lo = (label || "").toLowerCase().trim()
  const nrm = normalize(label)
  return LABEL_TO_KEY[lo] ?? LABEL_TO_KEY_NORM[nrm] ?? EXTRA_ALIASES[lo] ?? EXTRA_ALIASES[nrm] ?? null
}

// Conversion vers centilitres (ou vers "unité" pour les ingrédients au poids/pièce)
// Pour pièce/pincée/tranche : price_cl représente le coût par unité (€/pièce, €/pincée…)
const UNIT_TO_CL = {
  ml: 0.1,
  cl: 1,
  l: 100,
  g: 0.1,
  kg: 100,
  dash: 0.1,
  dashes: 0.1,
  trait: 0.1,
  traits: 0.1,
  "c. à café": 0.5,
  "c. à soupe": 1.5,
  "pièce": 1,
  "tranche": 1,
  "pincée": 1,
  "poignée": 1,
}

function toCl(quantity, unit) {
  const factor = UNIT_TO_CL[(unit || "").toLowerCase().trim()]
  if (!factor) return null
  const qty = parseFloat(quantity)
  if (isNaN(qty) || qty <= 0) return null
  return qty * factor
}

// Calcule le coût d'une liste d'ingrédients cocktail depuis la table cocktail_ingredient_prices
// Retourne { total, per_serving, details } ou { total: null } si aucun prix trouvé
export async function computeCocktailCost(ingredients, servings) {
  const items = (ingredients || []).filter(i => i.name?.trim())
  if (!items.length) return { total: null, per_serving: null, details: [] }

  const keyed = items.map(i => ({ ...i, _key: labelToKey(i.name) }))
  const keys = [...new Set(keyed.map(i => i._key).filter(Boolean))]

  const priceMap = {}
  if (keys.length > 0) {
    const { data } = await supabase
      .from("cocktail_ingredient_prices")
      .select("key, price_cl")
      .in("key", keys)
    ;(data || []).forEach(p => { priceMap[p.key] = Number(p.price_cl) })
  }

  let total = 0
  let foundCount = 0
  const details = keyed.map(ing => {
    const priceCl = ing._key ? priceMap[ing._key] : null
    const cl = toCl(ing.quantity, ing.unit)
    if (priceCl != null && cl != null) {
      const cost = Number((priceCl * cl).toFixed(3))
      total += cost
      foundCount++
      return { name: ing.name, estimated_price: cost, found: true }
    }
    return { name: ing.name, estimated_price: 0, found: false }
  })

  if (foundCount === 0) return { total: null, per_serving: null, details }

  total = Number(total.toFixed(2))
  const svgs = parseInt(servings) || 0
  const per_serving = svgs > 0 ? Number((total / svgs).toFixed(2)) : total
  return { total, per_serving, details }
}

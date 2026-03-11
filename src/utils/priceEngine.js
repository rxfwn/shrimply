// ===============================
// priceEngine.js
// Moteur de calcul de prix partagé — RecipeDetail + Discover
// ===============================

export const UNIT_CONVERSIONS = {
  g: { base: "kg", factor: 0.001 },
  gramme: { base: "kg", factor: 0.001 },
  grammes: { base: "kg", factor: 0.001 },
  kg: { base: "kg", factor: 1 },
  mg: { base: "kg", factor: 0.000001 },
  ml: { base: "l", factor: 0.001 },
  millilitre: { base: "l", factor: 0.001 },
  millilitres: { base: "l", factor: 0.001 },
  cl: { base: "l", factor: 0.01 },
  l: { base: "l", factor: 1 },
  litre: { base: "l", factor: 1 },
  litres: { base: "l", factor: 1 },
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

export function convertUnit(quantity, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return quantity
  const from = fromUnit.toLowerCase().trim()
  const to = toUnit.toLowerCase().trim()
  if (from === to) return quantity
  const f = UNIT_CONVERSIONS[from]
  const t = UNIT_CONVERSIONS[to]
  if (!f || !t || f.base !== t.base) return quantity
  return (quantity * f.factor) / t.factor
}

export function normalizeStr(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const STOP_WORDS = new Set([
  "frais","fraiche","fraiches","vert","verts","verte","vertes",
  "jaune","jaunes","rouge","rouges","blanc","blanche",
  "selon","gout","bio","petit","petite","grand","grande",
  "extra","vierge","arborio","guerande",
  "en","de","du","la","le","les","un","une","des","au","aux","pour","avec","par",
  "sachet","paquet","boite","bouteille","bocal","brique",
  "bouquet","botte","buche","pot","filet","barquette","conserve","tube",
  "mache","iceberg","romaine","batavia","frisee","roquette",
  "arborio","basmati","jasmin","long","ronde",
  "guerande","himalaya","iode","varietes","assortiment",
])

export const CATEGORY_UNIT_RULES = [
  { keywords: ["salade","laitue","mache","roquette","epinard","endive","cresson","scarole"], unit: "piece" },
  { keywords: ["tomate","poivron","courgette","aubergine","concombre","fenouil","brocoli","chou"], unit: "piece" },
  { keywords: ["oignon","echalote","poireau","navet","betterave","radis","carotte","panais"], unit: "piece" },
  { keywords: ["avocat","mangue","citron","orange","pamplemousse","pomme","poire","peche","abricot","banane"], unit: "piece" },
  { keywords: ["ail"], unit: "piece" },
  { keywords: ["persil","basilic","coriandre","menthe","ciboulette","thym","romarin","aneth","estragon","laurier"], unit: "piece" },
  { keywords: ["cube","bouillon"], unit: "piece" },
  { keywords: ["oeuf","oeufs"], unit: "piece" },
  { keywords: ["huile"], unit: "l" },
  { keywords: ["chevre","feta","camembert","brie","roquefort","comte","parmesan","gruyere","fromage"], unit: "kg" },
  { keywords: ["pesto","moutarde","ketchup","mayonnaise","sauce"], unit: "kg" },
  { keywords: ["riz","pate","farine","semoule","boulgour","quinoa","lentille","pois"], unit: "kg" },
  { keywords: ["sel","poivre","sucre","cannelle","curcuma","paprika","cumin","curry","epice"], unit: "kg" },
]

export const DENSITY_KG_PER_L = {
  sucre: 0.85, farine: 0.55, sel: 1.20, poivre: 0.50,
  cannelle: 0.50, curcuma: 0.50, paprika: 0.50, cumin: 0.50,
  curry: 0.50, levure: 0.55, cacao: 0.50, maizena: 0.60,
}

export const PIECE_WEIGHTS = {
  persil: 0.030, basilic: 0.025, coriandre: 0.025, menthe: 0.025, ciboulette: 0.020,
  salade: 0.300, laitue: 0.250, epinard: 0.200, roquette: 0.100, mache: 0.100,
  citron: 0.100, orange: 0.200, tomate: 0.150, oignon: 0.100, echalote: 0.050,
  ail: 0.050, courgette: 0.250, carotte: 0.100, poivron: 0.200,
}

const SYNONYMS = {
  laitue: "salade", mache: "salade", roquette: "salade",
  epinard: "salade", endive: "salade", cresson: "salade",
}

function stem(word) {
  return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word
}

export function getMatchWords(name) {
  return normalizeStr(name)
    .split(" ")
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem)
    .map(w => SYNONYMS[w] || w)
}

export function findBestMatch(ingredientName, prices) {
  const ingredientWords = getMatchWords(ingredientName)
  if (!ingredientWords.length) return null
  let bestMatch = null, bestScore = 0, bestNameLen = Infinity
  for (const p of prices) {
    const priceWords = getMatchWords(p.name)
    if (!priceWords.length) continue
    const common = ingredientWords.filter(w => priceWords.includes(w))
    const score = common.length
    if (score === 0) continue
    const covR = score / ingredientWords.length
    const covP = score / priceWords.length
    if (covR === 1 || covP === 1) {
      const nl = priceWords.length
      if (score > bestScore || (score === bestScore && nl < bestNameLen)) {
        bestScore = score; bestMatch = p; bestNameLen = nl
      }
    }
  }
  return bestMatch
}

export function getIngredientBaseUnit(unit) {
  if (!unit) return null
  const conv = UNIT_CONVERSIONS[unit.toLowerCase().trim()]
  return conv ? conv.base : null
}

export function getCategoryUnit(ingredientName) {
  const normalized = normalizeStr(ingredientName)
  for (const rule of CATEGORY_UNIT_RULES) {
    if (rule.keywords.some(k => normalized.includes(k))) return rule.unit
  }
  return null
}

/**
 * Calcule le prix estimé d'un ingrédient donné un match de prix.
 * Retourne { estimatedPrice, found }
 */
export function calcIngredientPrice(ing, match) {
  const quantity = parseFloat(ing.quantity) || 0
  const recipeUnit = (ing.unit || "").toLowerCase().trim()
  const priceUnit = (match.unit || "").toLowerCase().trim()
  const recipeBase = getIngredientBaseUnit(recipeUnit)
  const priceBase = getIngredientBaseUnit(priceUnit) || (match.unit === "piece" ? "piece" : null)

  if (recipeBase !== null && recipeBase === priceBase) {
    const convertedQty = convertUnit(quantity, recipeUnit, priceUnit)
    return { estimatedPrice: convertedQty * match.price, found: true }
  }

  if (recipeBase === "l" && priceBase === "kg") {
    const normalized = normalizeStr(ing.name)
    const density = Object.entries(DENSITY_KG_PER_L).find(([k]) => normalized.includes(k))?.[1] || 0.80
    const qtyL = convertUnit(quantity, recipeUnit, "l")
    return { estimatedPrice: qtyL * density * match.price, found: true }
  }

  if (recipeBase === "kg" && priceBase === "piece") {
    const normalized = normalizeStr(ing.name)
    const pieceWeightKg = Object.entries(PIECE_WEIGHTS).find(([k]) => normalized.includes(k))?.[1]
    if (pieceWeightKg) {
      const qtyKg = quantity * 0.001
      return { estimatedPrice: (qtyKg / pieceWeightKg) * match.price, found: true }
    }
  }

  if (recipeBase === "piece" || !recipeUnit || recipeBase === null) {
    if (priceBase === "piece") {
      return { estimatedPrice: quantity * match.price, found: true }
    }
  }

  return { estimatedPrice: 0, found: false }
}

/**
 * Calcule le coût total d'une liste d'ingrédients.
 * Retourne { details, total, per_serving }
 */
export function computeCostDetails(ingredientsData, prices, servings) {
  const details = ingredientsData.map(i => {
    const match = findBestMatch(i.name, prices)
    if (!match) return { name: i.name, quantity: i.quantity, unit: i.unit, estimated_price: 0, found: false }
    const { estimatedPrice, found } = calcIngredientPrice(i, match)
    return { name: i.name, quantity: i.quantity, unit: i.unit, estimated_price: Number(estimatedPrice.toFixed(2)), found }
  })

  const total = details.reduce((sum, d) => sum + d.estimated_price, 0)
  const per_serving = servings ? total / servings : total

  return {
    details,
    total: Number(total.toFixed(2)),
    per_serving: Number(per_serving.toFixed(2)),
  }
}
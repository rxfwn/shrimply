// ===============================
// priceEngine.js
// Moteur de calcul de prix partagé — Branché sur l'API Supabase/Gemini
// ===============================

import { supabase } from "../supabase";

const SUPABASE_FUNCTION_URL = "https://mgsnbhqndqnmvzgigoik.supabase.co/functions/v1/estimate-costs";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc25iaHFuZHFubXZ6Z2lnb2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjI0NzQsImV4cCI6MjA4ODI5ODQ3NH0.lcqk6t3lhfZff0q2sf5a2Sv6iMdRJnmhDUj-nHsfw-E";

// Ingrédients à ne jamais estimer — affichés "selon goût"
const SKIP_NAMES = ["sel", "poivre", "sel et poivre", "eau", "sel & poivre", "poivre noir", "fleur de sel", "poivre et sel"]
const SKIP_UNITS_DISPLAY = ["pincée", "selon goût", "selon gout"]

export function shouldSkipIngredient(name, unit) {
  const lower = (name || "").toLowerCase().trim()
  const unitLower = (unit || "").toLowerCase().trim()
  if (SKIP_UNITS_DISPLAY.some(u => unitLower === u || unitLower.startsWith(u))) return true
  return SKIP_NAMES.some(skip => lower === skip || lower.startsWith(skip + " "))
}

// Conversion "c. à soupe" / "c. à café" → ml pour l'API
const UNIT_CONVERSIONS = {
  "c. à soupe": { unit: "ml", factor: 15 },
  "c. à café":  { unit: "ml", factor: 5 },
}

function normalizeIngredientUnit(ing) {
  const conv = UNIT_CONVERSIONS[(ing.unit || "").toLowerCase().trim()]
  if (conv) return { ...ing, quantity: (parseFloat(ing.quantity) || 1) * conv.factor, unit: conv.unit }
  return ing
}

// Convertit le prix normalisé (€/kg, €/L, €/pièce) en coût réel selon la quantité utilisée
function computeIngredientCost(normalizedPrice, normalizedUnit, quantity, ingredientUnit) {
  const qty = parseFloat(quantity);
  if (!normalizedPrice || isNaN(qty) || qty <= 0) return 0;

  const unit = (ingredientUnit || "").toLowerCase().trim();

  if (normalizedUnit === "kg") {
    if (unit === "g")  return normalizedPrice * (qty / 1000);
    if (unit === "kg") return normalizedPrice * qty;
    if (unit === "ml") return normalizedPrice * (qty / 1000); // densité ≈ 1
    if (unit === "cl") return normalizedPrice * (qty / 100);
    if (unit === "l")  return normalizedPrice * qty;
  } else if (normalizedUnit === "l") {
    if (unit === "ml") return normalizedPrice * (qty / 1000);
    if (unit === "cl") return normalizedPrice * (qty / 100);
    if (unit === "l")  return normalizedPrice * qty;
    if (unit === "g")  return normalizedPrice * (qty / 1000); // densité ≈ 1
    if (unit === "kg") return normalizedPrice * qty;
  } else if (normalizedUnit === "piece") {
    // Liquides mesurés en ml/cl/l → prorata sur 1L (ex: huile d'olive 30ml/7€ → 0.21€)
    if (unit === "ml") return normalizedPrice * (qty / 1000);
    if (unit === "cl") return normalizedPrice * (qty / 100);
    if (unit === "l")  return normalizedPrice * qty;
    // Solides mesurés en g → 1 pièce (ex: ciboulette 10g → 1 botte)
    if (unit === "g" || unit === "kg") return normalizedPrice;
    // Pièces → multiplier par la quantité
    return normalizedPrice * qty;
  }

  return normalizedPrice;
}

export async function computeCostDetails(ingredientsData, servings) {
  console.log(`[computeCostDetails] 🌐 ${ingredientsData.length} ingrédient(s)`);

  try {
    const toProcess = ingredientsData.filter(i => !shouldSkipIngredient(i.name, i.unit));

    // ── 1. Chercher les prix en cache (ingredient_price) ──────────────────────
    const names = toProcess.map(i => i.name);
    const { data: cached } = await supabase
      .from("ingredient_price")
      .select("name, price, unit")
      .in("name", names);

    const cacheMap = {};
    (cached || []).forEach(c => { cacheMap[c.name.toLowerCase()] = c; });

    // ── 2. Séparer les ingrédients : en cache vs à envoyer à l'API ────────────
    const needApi = toProcess.filter(i => !cacheMap[i.name.toLowerCase()]);
    const priceMap = {};

    // Appliquer les prix en cache
    toProcess.forEach(ing => {
      const cached = cacheMap[ing.name.toLowerCase()];
      if (!cached) return;
      const normIng = normalizeIngredientUnit(ing);
      const price = computeIngredientCost(cached.price, cached.unit, normIng.quantity, normIng.unit);
      priceMap[ing.name.toLowerCase()] = Number(price.toFixed(2));
      console.log(`[cache] ✅ ${ing.name} → ${priceMap[ing.name.toLowerCase()]}€`);
    });

    // ── 3. Appeler l'API uniquement pour les ingrédients inconnus ─────────────
    if (needApi.length > 0) {
      console.log(`[computeCostDetails] 📡 API pour ${needApi.length} ingrédient(s) non cachés`);
      const normalizedIngredients = needApi.map(normalizeIngredientUnit);

      const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ ingredients: normalizedIngredients }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erreur API ${response.status}: ${text}`);
      }

      const data = await response.json();
      console.log("[computeCostDetails] ✅ Réponse API reçue :", data);

      normalizedIngredients.forEach((normIng, idx) => {
        const ingName = normIng.name.toLowerCase().trim();
        const apiResult = data.prices.find(p => {
          const pName = p.name.toLowerCase().trim();
          return pName === ingName || pName.includes(ingName) || ingName.includes(pName);
        });
        if (apiResult) {
          const price = computeIngredientCost(apiResult.price, apiResult.unit, normIng.quantity, normIng.unit);
          priceMap[needApi[idx].name.toLowerCase()] = Number(price.toFixed(2));
        }
      });
    }

    // ── 4. Reconstruire le tableau complet ────────────────────────────────────
    let total = 0;
    const details = ingredientsData.map(origIng => {
      const key = origIng.name.toLowerCase();
      const price = priceMap[key] ?? 0;
      total += price;
      return {
        name: origIng.name,
        quantity: origIng.quantity,
        unit: origIng.unit,
        estimated_price: price,
        found: key in priceMap,
      };
    });

    const notFound = details.filter(d => !d.found && !shouldSkipIngredient(d.name, d.unit));
    if (notFound.length > 0) {
      console.warn(`[computeCostDetails] ⚠️ ${notFound.length} non trouvé(s):`, notFound.map(d => d.name));
    }

    const per_serving = servings && servings > 0 ? total / servings : total;
    return {
      details,
      total: Number(total.toFixed(2)),
      per_serving: Number(per_serving.toFixed(2)),
    };

  } catch (error) {
    console.error("[computeCostDetails] 🚨 Erreur :", error);
    return {
      details: ingredientsData.map(i => ({ ...i, estimated_price: 0, found: false })),
      total: 0,
      per_serving: 0,
      error: true,
    };
  }
}

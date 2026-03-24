// ===============================
// priceEngine.js
// Moteur de calcul de prix partagé — Branché sur l'API Supabase/Gemini
// ===============================

const SUPABASE_FUNCTION_URL = "https://mgsnbhqndqnmvzgigoik.supabase.co/functions/v1/estimate-costs";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc25iaHFuZHFubXZ6Z2lnb2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjI0NzQsImV4cCI6MjA4ODI5ODQ3NH0.lcqk6t3lhfZff0q2sf5a2Sv6iMdRJnmhDUj-nHsfw-E";

export async function computeCostDetails(ingredientsData, servings) {
  console.log(`[computeCostDetails] 🌐 Demande de prix à l'API pour ${ingredientsData.length} ingrédients...`);

  try {
    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ ingredients: ingredientsData }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erreur API ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log("[computeCostDetails] ✅ Réponse API reçue :", data);

    let total = 0;

    const details = ingredientsData.map(ing => {
      const apiResult = data.prices.find(
        p => p.name.toLowerCase().trim() === ing.name.toLowerCase().trim()
      );

      const price = apiResult ? apiResult.price : 0;
      const found = !!apiResult;

      total += price;

      return {
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        estimated_price: Number(price.toFixed(2)),
        found,
      };
    });

    const notFound = details.filter(d => !d.found);
    if (notFound.length > 0) {
      console.warn(`[computeCostDetails] ⚠️ ${notFound.length} ingrédient(s) non trouvés:`, notFound.map(d => d.name));
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
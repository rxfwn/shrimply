import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_UNITS = ["g", "kg", "ml", "l", "piece"];

const SKIP_NAMES = ["sel", "poivre", "sel et poivre", "eau", "sel & poivre", "poivre noir", "fleur de sel"];

function shouldSkip(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return SKIP_NAMES.some(skip => lower === skip || lower.startsWith(skip + " "));
}

function normalizePrice(product: any) {
  const price = Number(product.product_price);
  const qty = Number(product.package_quantity);
  const unit = (product.package_unit || "").toLowerCase().trim();

  if (!price || !qty || qty === 0) return null;
  if (!VALID_UNITS.includes(unit)) {
    console.warn(`[SKIP] Unité invalide "${unit}" pour "${product.name}"`);
    return null;
  }

  const MAX = { kg: 200, l: 100, piece: 50 };
  let normalized: { name: string; price: number; unit: string } | null = null;

  if (unit === "ml")    normalized = { name: product.name, price: (price / qty) * 1000, unit: "l" };
  else if (unit === "l")  normalized = { name: product.name, price: price / qty, unit: "l" };
  else if (unit === "g")  normalized = { name: product.name, price: (price / qty) * 1000, unit: "kg" };
  else if (unit === "kg") normalized = { name: product.name, price: price / qty, unit: "kg" };
  else if (unit === "piece") normalized = { name: product.name, price: price / qty, unit: "piece" };

  if (!normalized) return null;

  const limit = MAX[normalized.unit as keyof typeof MAX];
  if (limit && normalized.price > limit) {
    console.warn(`[SKIP] Prix aberrant ${normalized.price}${normalized.unit} pour "${product.name}"`);
    return null;
  }

  return { ...normalized, price: Number(normalized.price.toFixed(2)) };
}

async function fetchPricesFromGemini(
  ingredients: { name: string; quantity: number; unit: string }[],
  apiKey: string
): Promise<any[]> {

  const ingredientsList = ingredients
    .map(i => `- ${i.name} (utilisé en recette : ${i.quantity ?? "?"} ${i.unit ?? "?"})`)
    .join("\n");

  const prompt = `Tu es un expert des supermarchés français (Leclerc, Carrefour, Lidl).

Pour chaque ingrédient, donne son conditionnement STANDARD tel qu'il est VENDU en supermarché.
Ignore complètement les quantités de recette — elles sont juste là pour t'aider à identifier le produit.

RÈGLES STRICTES :
1. "name" : Reprends EXACTEMENT le nom fourni.
2. "product_price" : Prix en euros du conditionnement standard. Entre 0.20€ et 15€.
3. "package_quantity" : Quantité numérique du paquet vendu.
4. "package_unit" : OBLIGATOIREMENT l'un de ces 5 choix UNIQUEMENT : "g", "kg", "ml", "l", "piece"
   → JAMAIS "c. à soupe", "cm", "tranche", "botte", "cl", "selon gout", ou toute autre valeur.
   → En cas de doute : utilise "g" avec un grammage standard.

CORRESPONDANCES PAR TYPE DE PRODUIT :
- Viandes/volailles (poulet, bœuf, porc, dinde...) → "g", 500-600g, prix 3-10€
- Poissons/fruits de mer → "g", 300-500g, prix 3-12€
- Légumes entiers (tomate, courgette, poivron, aubergine...) → "piece", qty 1, prix 0.40-1.80€
- Fruits entiers (citron, orange, pomme, banane...) → "piece", qty 1, prix 0.30-1.50€
- Herbes fraîches (basilic, persil, coriandre, ciboulette...) → "piece", qty 1, prix 0.70-1.20€
- Ail (tête, gousse) → "piece", qty 1, prix 0.60-1.20€
- Gingembre frais → "piece", qty 1, prix 0.80€
- Épices sèches (curcuma, paprika, cumin, cannelle...) → "g", 40-50g, prix 1-3€
- Huiles (tournesol, olive, sésame, coco...) → "ml", 750ml, prix 2-7€
- Condiments liquides (sauce soja, vinaigre, nuoc-mâm, worcestershire...) → "ml", 150ml, prix 1.50-3.50€
- Condiments solides (moutarde, pesto, tahini, miso...) → "g", 200g, prix 1.50-4€
- Miel, sirop d'érable, sirop d'agave → "g", 250g, prix 2.50-6€
- Féculents (riz, pâtes, farine, semoule, lentilles...) → "g", 500g, prix 0.80-3€
- Fromages (chèvre, feta, parmesan, gruyère...) → "g", 150-200g, prix 1.50-5€
- Produits laitiers liquides (lait, crème, lait de coco...) → "ml", 500ml, prix 0.80-3€
- Œufs → "piece", qty 1, prix 0.25-0.40€
- Beurre → "g", 250g, prix 1.80-3.50€
- Conserves (tomates pelées, pois chiches, maïs...) → "g", 400g, prix 0.70-2€
- Bouillon cube → "piece", qty 1, prix 0.15-0.30€
- Sucre, fécule, levure → "g", 500g, prix 0.80-2.50€
- Pain, viennoiseries → "piece", qty 1, prix 0.15-1.50€

Ingrédients :
${ingredientsList}

RETOURNE UNIQUEMENT UN TABLEAU JSON VALIDE, sans texte autour, sans markdown :
[{"name":"Nom exact","product_price":1.50,"package_quantity":500,"package_unit":"g"}]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Réponse vide de Gemini.");

  const parsed = JSON.parse(text);
  return parsed.map((p: any) => ({
    ...p,
    name: (p.name || "").replace(/\[.*?\]/g, "").trim(),
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { ingredients } = await req.json();

    if (!ingredients || !Array.isArray(ingredients)) {
      throw new Error("Liste d'ingrédients invalide.");
    }

    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_KEY) throw new Error("Clé API GEMINI_API_KEY manquante.");

    // Séparer les ingrédients à ignorer
    const toFetch = ingredients.filter((i: any) => !shouldSkip(i.name));
    const skipped = ingredients
      .filter((i: any) => shouldSkip(i.name))
      .map((i: any) => ({ name: i.name, skipped: true }));

    if (toFetch.length === 0) {
      return new Response(JSON.stringify({ prices: [], skipped, allFound: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Premier appel Gemini
    let raw = await fetchPricesFromGemini(toFetch, GEMINI_KEY);
    let normalized = raw
      .map(normalizePrice)
      .filter((p): p is NonNullable<ReturnType<typeof normalizePrice>> => p !== null);

    // Retry pour les ingrédients sans prix valide
    const foundNames = new Set(normalized.map(p => p.name.toLowerCase()));
    const missing = toFetch.filter((i: any) => !foundNames.has(i.name.toLowerCase()));

    if (missing.length > 0) {
      console.log(`[RETRY] ${missing.map((i: any) => i.name).join(", ")}`);
      const retryRaw = await fetchPricesFromGemini(missing, GEMINI_KEY);
      const retryNormalized = retryRaw
        .map(normalizePrice)
        .filter((p): p is NonNullable<ReturnType<typeof normalizePrice>> => p !== null);
      normalized = [...normalized, ...retryNormalized];
    }

    const allFound = missing.length === 0 ||
      normalized.length >= toFetch.length;

    return new Response(
      JSON.stringify({ prices: normalized, skipped, allFound }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
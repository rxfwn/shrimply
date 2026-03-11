import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePrice(product: any) {
  const price = Number(product.product_price);
  const qty = Number(product.package_quantity);
  const unit = (product.package_unit || "").toLowerCase().trim();

  if (!price || !qty || !unit || qty === 0) return null;

  const MAX_PRICE_PER_KG = 200;
  const MAX_PRICE_PER_L = 100;
  const MAX_PRICE_PER_PIECE = 25;

  let normalized = null;

  if (unit === "ml") normalized = { name: product.name, price: (price / qty) * 1000, unit: "l" };
  else if (unit === "l") normalized = { name: product.name, price: price / qty, unit: "l" };
  else if (unit === "g") normalized = { name: product.name, price: (price / qty) * 1000, unit: "kg" };
  else if (unit === "kg") normalized = { name: product.name, price: price / qty, unit: "kg" };
  else if (unit === "piece" || unit === "pièce") normalized = { name: product.name, price: price / qty, unit: "piece" };

  if (!normalized) return null;

  if (normalized.unit === "kg" && normalized.price > MAX_PRICE_PER_KG) return null;
  if (normalized.unit === "l" && normalized.price > MAX_PRICE_PER_L) return null;
  if (normalized.unit === "piece" && normalized.price > MAX_PRICE_PER_PIECE) return null;

  return normalized;
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

    const prompt = `
En tant qu'expert des prix de détail en supermarché français (Leclerc, Carrefour, Lidl), donne le prix d'achat réaliste pour chaque ingrédient.

RÈGLES ABSOLUES :
1. "name" : Reprends EXACTEMENT le nom fourni (sans les indications entre crochets).
2. "product_price" : Prix d'UN seul article ou paquet standard, en euros. Maximum 15€.
3. "package_quantity" : Quantité numérique du paquet.
4. "package_unit" : UNIQUEMENT "g", "kg", "ml", "l", ou "piece".

RÈGLES PAR CATÉGORIE (priorité aux indications [entre crochets] dans le nom) :

Si le nom contient [vendu à la pièce] :
→ package_unit: "piece", package_quantity: 1, product_price = prix d'UN exemplaire

Si le nom contient [vendu au poids] :
→ package_unit: "g", choisir un grammage standard (100g, 200g, 500g, 1000g)

Si le nom contient [vendu au volume] :
→ package_unit: "ml" ou "l", choisir un volume standard

Légumes/fruits entiers (salade, tomate, poivron, courgette, aubergine, oignon, citron, orange, avocat, etc.) :
→ package_unit: "piece", package_quantity: 1, product_price entre 0.30 et 2.50

Ail (tête d'ail, ail entier) :
→ package_unit: "piece", package_quantity: 1, product_price entre 0.50 et 1.50

Herbes fraîches (persil, basilic, coriandre, menthe, ciboulette, thym, etc.) :
→ package_unit: "piece", package_quantity: 1, product_price entre 0.50 et 1.20

Condiments et sauces (pesto, moutarde, ketchup, etc.) :
→ package_unit: "g", package_quantity: 190

Fromages en portion (chèvre, feta, camembert, etc.) :
→ package_unit: "g", package_quantity: 150

Bouillon cube ou déshydraté :
→ package_unit: "piece", package_quantity: 1, product_price entre 0.10 et 0.30

Féculents (riz, pâtes, farine, etc.) :
→ package_unit: "g", package_quantity: 500

Épices, sel, poivre :
→ package_unit: "g", package_quantity: 100

Huiles :
→ package_unit: "ml", package_quantity: 750

Ingrédients : ${ingredients.join(", ")}

RETOURNE UNIQUEMENT UN TABLEAU JSON VALIDE, sans texte autour :
[{"name":"Nom exact","product_price":1.50,"package_quantity":500,"package_unit":"g"}]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Gemini API: ${errorText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) throw new Error("Réponse vide de l'IA.");

    const parsed = JSON.parse(textResponse);

    // Nettoyer les noms : retirer les crochets éventuels que Gemini aurait laissés
    const cleaned = parsed.map((p: any) => ({
      ...p,
      name: (p.name || "").replace(/\[.*?\]/g, "").trim(),
    }));

    const normalized = cleaned
      .map((p: any) => normalizePrice(p))
      .filter((p: any) => p !== null)
      .map((p: any) => ({
        name: p.name,
        price: Number(p.price.toFixed(2)),
        unit: p.unit,
      }));

    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
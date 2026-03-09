import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { ingredients } = await req.json()
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY")

    const prompt = `Estime le prix unitaire en supermarché français pour ces ingrédients : ${ingredients.join(", ")}. Réponds UNIQUEMENT en JSON : [{"name":"...", "price":0.00, "unit":"..."}]`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    )

    if (!response.ok) throw new Error("Erreur API Gemini")

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    return new Response(text, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
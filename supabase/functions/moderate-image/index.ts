import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// On définit le type de 'req' comme Request
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()

    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get("GOOGLE_VISION_KEY")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [
              { type: "LABEL_DETECTION", maxResults: 15 },
              { type: "SAFE_SEARCH_DETECTION" }
            ]
          }]
        })
      }
    )

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error: any) { // On précise que error peut être de n'importe quel type
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
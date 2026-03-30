import Stripe from "https://esm.sh/stripe@14"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"))
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders })

  const { user_id } = await req.json()

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user_id)
    .single()

  if (!profile?.stripe_customer_id) {
    console.error("[portal] pas de stripe_customer_id pour user_id:", user_id)
    return new Response(JSON.stringify({ error: "Aucun abonnement trouvé" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  console.log("[portal] customer_id trouvé:", profile.stripe_customer_id?.slice(0, 8) + "...")

  let session
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: "https://www.shrimply.app/settings",
    })
    console.log("[portal] session créée:", JSON.stringify(session))
  } catch (e) {
    console.error("[portal] Stripe error:", e.message)
    return new Response(JSON.stringify({ error: e.message || "Erreur Stripe" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  if (!session?.url) {
    console.error("[portal] session.url manquant:", JSON.stringify(session))
    return new Response(JSON.stringify({ error: "Stripe n'a pas retourné d'URL" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
})

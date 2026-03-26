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
    return new Response(JSON.stringify({ error: "Aucun abonnement trouvé" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: "https://www.shrimply.app/settings",
  })

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
})

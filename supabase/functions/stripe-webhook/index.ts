// supabase/functions/stripe-webhook/index.ts
import Stripe from "https://esm.sh/stripe@14"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"))
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
)

Deno.serve(async (req) => {
  const sig  = req.headers.get("stripe-signature")
  const body = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET"))
  } catch {
    return new Response("Webhook error", { status: 400 })
  }

  const session = event.data.object

  if (event.type === "checkout.session.completed") {
    await supabase.from("profiles").update({
      is_premium: true,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
    }).eq("id", session.metadata.user_id)
  }

  if (event.type === "customer.subscription.deleted") {
    await supabase.from("profiles").update({
      is_premium: false,
      stripe_subscription_id: null,
    }).eq("stripe_customer_id", session.customer)
  }

  return new Response("ok", { status: 200 })
})
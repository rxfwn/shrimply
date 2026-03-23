// supabase/functions/create-checkout-session/index.ts
import Stripe from "https://esm.sh/stripe@14"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"))

Deno.serve(async (req) => {
  const { user_id, email } = await req.json()

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: "price_1TDsQLQCy1XeVBIZ3B31UDXY", quantity: 1 }], // ton Price ID
    success_url: "https://www.shrimply.app/calendar?success=true",
    cancel_url:  "https://www.shrimply.app/pricing",
    metadata: { user_id },
  })

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  })
})
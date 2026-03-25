import Stripe from "https://esm.sh/stripe@14"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"))
const supabase = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
)

async function sendConfirmationEmail(email: string) {
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY")
  if (!RESEND_KEY) return

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: "Shrimply <hello@shrimply.app>",
      to: [email],
      subject: "🎉 Bienvenue dans Shrimply Premium !",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #111111; border-radius: 16px;">
          <img src="https://www.shrimply.app/icons/shrim.webp" alt="Shrimply" style="width: 48px; height: 48px; margin-bottom: 20px;" />
          <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 12px;">Tu es maintenant Premium 🚀</h1>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
            Merci pour ton abonnement ! Tu as maintenant accès à toutes les fonctionnalités Shrimply :
          </p>
          <ul style="color: rgba(255,255,255,0.7); font-size: 13px; line-height: 2; padding-left: 20px; margin: 0 0 28px;">
            <li>Recettes illimitées</li>
            <li>Planification illimitée</li>
            <li>Import de recettes de la communauté</li>
            <li>Profil public &amp; partage</li>
          </ul>
          <a href="https://www.shrimply.app/calendar" style="display: inline-block; background: #f3501e; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 100px; font-size: 14px; font-weight: 700;">
            Accéder à l'app →
          </a>
          <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 28px 0 0;">
            Shrimply · Sans engagement · Annulable à tout moment
          </p>
        </div>
      `,
    }),
  })
}

Deno.serve(async (req) => {
  const sig  = req.headers.get("stripe-signature")
  const body = await req.text()

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET"))
  } catch (err) {
    console.error("Webhook signature error:", err.message)
    return new Response("Webhook error", { status: 400 })
  }

  const session = event.data.object

  if (event.type === "checkout.session.completed") {
    const userId = session.metadata?.user_id
    if (!userId) {
      console.error("Pas de user_id dans les metadata")
      return new Response("Missing user_id", { status: 400 })
    }

    const { error } = await supabase.from("profiles").update({
      is_premium: true,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
    }).eq("id", userId)

    if (error) {
      console.error("Erreur mise à jour profil:", error.message)
      return new Response("DB error", { status: 500 })
    }

    console.log(`✅ Profil ${userId} passé premium`)

    // Email de confirmation (fire & forget)
    if (session.customer_details?.email) {
      sendConfirmationEmail(session.customer_details.email).catch(e =>
        console.warn("Email non envoyé:", e.message)
      )
    }
  }

  if (event.type === "customer.subscription.deleted") {
    await supabase.from("profiles").update({
      is_premium: false,
      stripe_subscription_id: null,
    }).eq("stripe_customer_id", session.customer)

    console.log(`❌ Abonnement annulé pour customer ${session.customer}`)
  }

  return new Response("ok", { status: 200 })
})

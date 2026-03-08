import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const { email, username } = await req.json()

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({
      from: "Shrimply <onboarding@resend.dev>",
      to: email,
      subject: "🦐 Bienvenue sur Shrimply !",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #F97316; font-size: 28px;">🦐 Bienvenue sur Shrimply !</h1>
          <p style="color: #52525B; font-size: 16px; line-height: 1.6;">
            Bonjour ${username || ""},<br><br>
            Ton compte Shrimply a bien été créé avec l'adresse <strong>${email}</strong>.<br><br>
            Tu peux maintenant planifier tes repas, gérer tes recettes et ta liste de courses !
          </p>
          <a href="https://shrimply.vercel.app" style="display: inline-block; background: #F97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Accéder à Shrimply →
          </a>
          <p style="color: #A1A1AA; font-size: 12px; margin-top: 32px;">
            L'équipe Shrimply 🦐
          </p>
        </div>
      `,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
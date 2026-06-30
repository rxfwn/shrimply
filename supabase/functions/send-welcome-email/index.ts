// supabase/functions/send-welcome-email/index.ts
// Envoie l'email de bienvenue Shrimply juste après l'inscription d'un nouvel utilisateur.
// Appelé côté client (Register.jsx) en fire & forget, ne bloque jamais le flux d'inscription.

Deno.serve(async (req) => {
  try {
    const { email, username } = await req.json()
    if (!email) return new Response("Missing email", { status: 400 })

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY")
    if (!RESEND_KEY) return new Response("Resend not configured", { status: 200 })

    const firstName = (username || "").trim()
    const greeting = firstName ? `salut ${firstName} 👋` : "salut 👋"

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: "Shrimply <hello@shrimply.app>",
        to: [email],
        subject: "Bienvenue dans Shrimply 🦐",
        html: `
          <div style="background:#f2ede4;padding:40px 16px;font-family:'DM Sans','Syne',sans-serif;">
            <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid rgba(17,17,17,0.06);">

              <div style="padding:32px 28px 24px;text-align:center;">
                <img src="https://www.shrimply.app/icons/shrim.webp" alt="Shrimply" width="44" height="44" style="width:44px;height:44px;margin-bottom:14px;" />
                <h1 style="font-family:'Syne',sans-serif;font-weight:800;font-size:24px;letter-spacing:-0.03em;color:#111111;margin:0 0 8px;">
                  ${greeting}
                </h1>
                <p style="font-size:14px;color:rgba(17,17,17,0.55);line-height:1.7;margin:0;">
                  bienvenue dans Shrimply. tu viens de récupérer 5h par semaine — promis.
                </p>
              </div>

              <div style="padding:0 28px 28px;">
                <p style="font-size:13px;color:rgba(17,17,17,0.45);font-weight:600;letter-spacing:0.04em;text-transform:uppercase;margin:0 0 16px;">
                  pour bien démarrer
                </p>

                <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:16px;">
                  <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#cfff79;color:#1a3d1a;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;">1</div>
                  <div>
                    <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111111;">ajoute tes recettes</p>
                    <p style="margin:0;font-size:13px;color:rgba(17,17,17,0.5);line-height:1.6;">crée-les ou importe-les depuis la communauté.</p>
                  </div>
                </div>

                <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:16px;">
                  <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#9be7ff;color:#03225c;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;">2</div>
                  <div>
                    <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111111;">planifie ta semaine</p>
                    <p style="margin:0;font-size:13px;color:rgba(17,17,17,0.5);line-height:1.6;">glisse tes recettes sur le calendrier. 5 minutes chrono.</p>
                  </div>
                </div>

                <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:24px;">
                  <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#ffb9e1;color:#510312;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;">3</div>
                  <div>
                    <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111111;">génère ta liste de courses</p>
                    <p style="margin:0;font-size:13px;color:rgba(17,17,17,0.5);line-height:1.6;">automatique, depuis tes repas planifiés. rien à recopier.</p>
                  </div>
                </div>

                <div style="text-align:center;">
                  <a href="https://www.shrimply.app/calendar" style="display:inline-block;background:#f3501e;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:14px;font-weight:700;font-family:'DM Sans',sans-serif;">
                    accéder à mon calendrier →
                  </a>
                </div>
              </div>

              <div style="padding:16px 28px;border-top:1px solid rgba(17,17,17,0.06);text-align:center;">
                <p style="margin:0;font-size:11px;color:rgba(17,17,17,0.35);">
                  Shrimply 🦐 · planification de repas facile
                </p>
              </div>

            </div>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Resend error:", text)
      return new Response("Resend error", { status: 200 }) // ne bloque jamais le signup
    }

    return new Response("ok", { status: 200 })
  } catch (err) {
    console.error("send-welcome-email error:", err.message)
    return new Response("ok", { status: 200 }) // fire & forget — ne jamais faire échouer l'appelant
  }
})

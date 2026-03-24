import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

const TAGS = [
  { label: "végé",        bg: "#cfff79",  text: "#091718", icon: "herb.png"       },
  { label: "poisson",     bg: "#9be7ff",  text: "#03225c", icon: "fih.png"        },
  { label: "viande",      bg: "#ffb9e1",  text: "#510312", icon: "meat.png"       },
  { label: "dessert",     bg: "#ffb9e1",  text: "#510312", icon: "shortcake.png"  },
  { label: "italien",     bg: "#cfff79",  text: "#1a3d1a", icon: "pasta.png"      },
  { label: "asiatique",   bg: "#510312",  text: "#ffffff", icon: "chopsticks.png" },
  { label: "français",    bg: "#03225c",  text: "#ffffff", icon: "cheese.png"     },
  { label: "oriental",    bg: "#510312",  text: "#fe7c3e", icon: "falafel.png"    },
  { label: "économique",  bg: "#00261e",  text: "#3dff8e", icon: "money.png"      },
  { label: "léger",       bg: "#03225c",  text: "#9be7ff", icon: "feather.png"    },
  { label: "rapide",      bg: "#E49300",  text: "#FFF4C7", icon: "eclair.png"     },
  { label: "protéiné",    bg: "#d57bff",  text: "#130b2d", icon: "biceps.png"     },
  { label: "sans-four",   bg: "#130b2d",  text: "#d57bff", icon: "fire.png"       },
  { label: "sans gluten", bg: "#FFF4C7",  text: "#E49300", icon: "ble.png"        },
]

const RECIPE_CARDS = [
  { title: "Bowl Buddha végé",   time: "20", servings: "2", rating: "4,8", primaryTag: { cardText: "#cfff79", cardBg: "#091718", cardBorder: "#b8e860" }, tagDefs: [{ label: "végé", pillBg: "#cfff79", pillText: "#091718", icon: "herb" }, { label: "léger", pillBg: "#03225c", pillText: "#9be7ff", icon: "feather" }], img: "/recipes/bowl-buddha.png" },
  { title: "Saumon teriyaki",    time: "15", servings: "2", rating: "4,6", primaryTag: { cardText: "#9be7ff", cardBg: "#03225c", cardBorder: "#7dd4f0" }, tagDefs: [{ label: "poisson", pillBg: "#9be7ff", pillText: "#03225c", icon: "fih" }, { label: "rapide", pillBg: "#E49300", pillText: "#FFF4C7", icon: "eclair" }], img: "/recipes/saumon.png" },
  { title: "Poulet rôti citron", time: "45", servings: "4", rating: "4,9", primaryTag: { cardText: "#ffb9e1", cardBg: "#510312", cardBorder: "#f0a0cc" }, tagDefs: [{ label: "viande", pillBg: "#ffb9e1", pillText: "#510312", icon: "meat" }], img: "/recipes/poulet.png" },
  { title: "Tarte tatin",        time: "55", servings: "6", rating: "4,7", primaryTag: { cardText: "#ffb9e1", cardBg: "#510312", cardBorder: "#f0a0cc" }, tagDefs: [{ label: "dessert", pillBg: "#ffb9e1", pillText: "#510312", icon: "shortcake" }, { label: "français", pillBg: "#03225c", pillText: "#ffffff", icon: "cheese" }], img: "/recipes/tarte.png" },
  { title: "Risotto parmesan",   time: "30", servings: "2", rating: "4,5", primaryTag: { cardText: "#cfff79", cardBg: "#1a3d1a", cardBorder: "#b8e860" }, tagDefs: [{ label: "italien", pillBg: "#cfff79", pillText: "#1a3d1a", icon: "pasta" }], img: "/recipes/risotto.png" },
  { title: "Ramen maison",       time: "25", servings: "2", rating: "4,8", primaryTag: { cardText: "#510312", cardBg: "#ffffff", cardBorder: "#6b0000" }, tagDefs: [{ label: "asiatique", pillBg: "#510312", pillText: "#ffffff", icon: "chopsticks" }, { label: "rapide", pillBg: "#E49300", pillText: "#FFF4C7", icon: "eclair" }], img: "/recipes/ramen.png" },
]

const FAQ_ITEMS = [
  { q: "C'est quoi exactement Shrimply ?",              a: "Shrimply c'est une app web qui t'aide à planifier tes repas de la semaine et à générer automatiquement ta liste de courses. Tu crées ou importes des recettes, tu les places sur un calendrier, et la liste de courses se remplit toute seule." },
  { q: "Je peux utiliser Shrimply sur mon téléphone ?", a: "Oui ! Shrimply est une PWA — tu peux l'installer sur ton écran d'accueil comme une vraie app. Ta liste de courses se synchronise en temps réel entre ton PC et ton téléphone." },
  { q: "Est-ce que je peux partager mes recettes ?",    a: "Absolument. Tu peux rendre tes recettes publiques et les partager avec toute la communauté. Les autres peuvent les noter et les importer en un clic." },
  { q: "Comment fonctionne la liste de courses auto ?", a: "Quand tu places des recettes sur ton calendrier, Shrimply récupère tous les ingrédients et les regroupe automatiquement par catégorie. Plus besoin de compter ou de noter quoi que ce soit à la main." },
  { q: "Je peux annuler mon abonnement à tout moment ?", a: "Oui, sans engagement ni frais. Tu peux annuler à tout moment depuis ton profil. Tes recettes restent accessibles en mode Free." },
  { q: "Est-ce que ça vaut vraiment 4,99€/mois ?",     a: "Un seul repas commandé en livraison coûte souvent 20-30€. Shrimply t'aide à planifier, éviter le gaspillage et ne plus commander par flemme. La plupart économisent 50 à 100€ par mois." },
]

const Icon = ({ src, size = 28, style = {} }) => (
  <img src={`/icons/${src}`} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, ...style }}
    onError={e => e.target.style.opacity = "0"} />
)

export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root { --cream:#f2ede4; --cream2:#ebe4d8; --white:#ffffff; --dark:#111111; --orange:#f3501e; }
      html { scroll-behavior: smooth; }
      body { background: var(--cream); font-family: 'Instrument Sans', sans-serif; -webkit-font-smoothing: antialiased; }

      @keyframes scrollLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-14px) rotate(2deg); } }
      @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }

      .fade1 { animation: fadeUp .65s .05s cubic-bezier(.16,1,.3,1) both; }
      .fade2 { animation: fadeUp .65s .15s cubic-bezier(.16,1,.3,1) both; }
      .fade3 { animation: fadeUp .65s .28s cubic-bezier(.16,1,.3,1) both; }
      .fade4 { animation: fadeUp .65s .42s cubic-bezier(.16,1,.3,1) both; }

      .tags-run { animation: scrollLeft 38s linear infinite; }
      .float { animation: float 3.8s ease-in-out infinite; display: inline-block; }

      .btn { transition: transform .15s, box-shadow .15s; cursor: pointer; border: none; outline: none; font-family: 'Instrument Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
      .btn:hover { transform: translateY(-2px); }
      .btn:active { transform: scale(0.97) !important; }
      .btn-orange { background: var(--orange); color: #fff; box-shadow: 0 6px 28px rgba(243,80,30,.3); }
      .btn-orange:hover { box-shadow: 0 14px 42px rgba(243,80,30,.48); }
      .btn-dark { background: var(--dark); color: #fff; }
      .btn-ghost-light { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,.35); }
      .btn-ghost-light:hover { background: rgba(255,255,255,.1); }

      .card-hover { transition: transform .2s, box-shadow .2s; }
      .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 50px rgba(0,0,0,.12) !important; }
      .faq-row { transition: background .18s; cursor: pointer; }
      .faq-row:hover { background: var(--cream2) !important; }
      .recipe-card { transition: transform .22s, box-shadow .22s; cursor: pointer; overflow: hidden; }
      .recipe-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(0,0,0,.22) !important; }
      .recipe-card img.recipe-photo { transition: transform .4s; }
      .recipe-card:hover img.recipe-photo { transform: scale(1.06); }

      /* ── MOBILE (défaut) ── */
      .l-nav { padding: 10px 18px !important; }
      .nav-cta-label { display: none; }
      .hero-mobile { display: block !important; }
      .hero-desktop { display: none !important; }
      .sec { padding: 60px 20px !important; }
      .features-pills { flex-direction: column !important; gap: 10px !important; }
      .feature-pill { min-width: unset !important; width: 100% !important; }
      .recipes-row { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
      .how-cols { flex-direction: column !important; gap: 24px !important; }
      .how-phone { display: none !important; }
      .pain-g { grid-template-columns: 1fr !important; }
      .app-screenshot { border-radius: 14px !important; padding: 28px 10px 0 !important; }
      .sub-feat { grid-template-columns: 1fr !important; gap: 10px !important; }
      .pricing-g { grid-template-columns: 1fr !important; gap: 16px !important; }
      .footer-inner { flex-direction: column !important; gap: 8px !important; text-align: center !important; }
      .cta-band { padding: 60px 20px !important; }
      .cta-final { padding: 60px 20px !important; }
      .faq-section { padding: 60px 20px !important; }
      .pain-section { padding: 60px 20px !important; }
      .cta-btns { flex-direction: column !important; align-items: stretch !important; }
      .cta-btn-main { width: 100% !important; text-align: center; }

      /* ── TABLET ── */
      @media (min-width: 600px) {
        .recipes-row { grid-template-columns: repeat(3, 1fr) !important; }
        .features-pills { flex-direction: row !important; flex-wrap: wrap !important; }
        .feature-pill { width: auto !important; }
        .sub-feat { grid-template-columns: repeat(3,1fr) !important; }
        .pricing-g { grid-template-columns: 1fr 1fr !important; }
        .pain-g { grid-template-columns: 1fr 1fr !important; }
        .footer-inner { flex-direction: row !important; }
        .nav-cta-label { display: inline !important; }
      }

      /* ── DESKTOP ── */
      @media (min-width: 900px) {
        .l-nav { padding: 10px 48px !important; }
        .hero-mobile { display: none !important; }
        .hero-desktop { display: block !important; }
        .sec { padding: 80px 60px !important; }
        .recipes-row { grid-template-columns: repeat(6, 1fr) !important; }
        .how-cols { flex-direction: row !important; gap: 60px !important; }
        .how-phone { display: block !important; }
        .pain-g { grid-template-columns: repeat(auto-fill, minmax(280px,1fr)) !important; }
        .app-screenshot { padding: 38px 14px 0 !important; border-radius: 22px !important; }
        .cta-band { padding: 80px 60px !important; }
        .cta-final { padding: 80px 60px !important; }
        .faq-section { padding: 100px 60px !important; }
        .pain-section { padding: 80px 60px !important; }
        .cta-btns { flex-direction: row !important; align-items: center !important; }
        .cta-btn-main { width: auto !important; }
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const syne = { fontFamily: "'Syne', sans-serif" }
  const inst = { fontFamily: "'Instrument Sans', sans-serif" }
  const R = "var(--orange)"
  const D = "var(--dark)"

  const btnO = (x = {}) => ({ padding: "14px 32px", borderRadius: 100, fontSize: 15, fontWeight: 600, letterSpacing: "-.01em", ...x })
  const btnG = (x = {}) => ({ padding: "14px 28px", borderRadius: 100, fontSize: 15, fontWeight: 500, ...x })

  const slabel = { ...inst, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(45,45,45,.38)", marginBottom: 12, display: "block" }
  const bigH = (x = {}) => ({ ...syne, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.05em", color: D, ...x })

  const friction = (
    <p style={{ ...inst, fontSize: 12, color: "#3a9a5c", marginTop: 14, fontWeight: 500 }}>
      ✓ gratuit &nbsp;·&nbsp; ✓ sans carte bancaire &nbsp;·&nbsp; ✓ 30 secondes
    </p>
  )

  const floatingPills = [
    { label: "végé",      icon: "herb.png",      bg: "#cfff79", color: "#091718", top: -18,    left: -72,  rot: -6, delay: "0s",    size: 13 },
    { label: "poisson",   icon: "fih.png",        bg: "#9be7ff", color: "#03225c", bottom: 140, right: -62, rot: 5,  delay: "-.8s",  size: 13 },
    { label: "viande",    icon: "meat.png",       bg: "#ffb9e1", color: "#510312", top: 200,    left: -80,  rot: -4, delay: "-1.6s", size: 13 },
    { label: "rapide",    icon: "eclair.png",     bg: "#E49300", color: "#FFF4C7", top: 80,     right: -70, rot: 7,  delay: "-2.2s", size: 12 },
    { label: "protéiné",  icon: "biceps.png",     bg: "#d57bff", color: "#130b2d", bottom: 260, left: -90,  rot: -3, delay: "-3s",   size: 12 },
    { label: "asiatique", icon: "chopsticks.png", bg: "#510312", color: "#ffffff", bottom: 60,  right: -80, rot: 4,  delay: "-1s",   size: 12 },
  ]

  const statBlocks = [
    { n: "+5h",  l: "libérées / sem.", bg: "#cfff79", textN: "#091718", textL: "#1a3d1a" },
    { n: "100€", l: "éco. / mois",    bg: "#9be7ff", textN: "#03225c", textL: "#005f7a" },
    { n: "0",    l: "oubli courses",  bg: "#ffb9e1", textN: "#510312", textL: "#510312" },
  ]

  const featurePills = [
    { icon: "book.png",     label: "Recettes",     desc: "14 catégories, ton carnet rangé",  bg: "#f3501e", text: "#fff"    },
    { icon: "calendar.png", label: "Planning",     desc: "Glisse, bouclé en 5 min",          bg: "#cfff79", text: "#1a3d1a" },
    { icon: "cart.png",     label: "Courses auto", desc: "Générée, sync mobile",             bg: "#111111", text: "#fff"    },
    { icon: "spark.png",    label: "Découvrir",    desc: "Explore la communauté",            bg: "#d57bff", text: "#130b2d" },
    { icon: "friends.png",  label: "Partage",      desc: "Importe & partage en un clic",     bg: "#FFF4C7", text: "#7a5200" },
  ]

  const painPoints = [
    { icon: "exhausted.png", text: "\"on mange quoi ce soir ?\" encore. tous les jours.",               bg: "#cfff79", border: "#b8e860", textC: "#091718" },
    { icon: "cart.png",      text: "tu fais les courses sans liste. tu oublies toujours quelque chose.", bg: "#9be7ff", border: "#7dd4f0", textC: "#03225c" },
    { icon: "trash.png",     text: "tu jettes de la nourriture. parce que t'avais rien prévu.",          bg: "#ffb9e1", border: "#f0a0cc", textC: "#510312" },
    { icon: "pizza.png",     text: "tu commandes en livraison. par flemme de réfléchir.",                bg: "#FFF4C7", border: "#f0e0a0", textC: "#7a5200" },
    { icon: "brain.png",     text: "la charge mentale des repas t'épuise sans t'en rendre compte.",      bg: "#d57bff", border: "#c060f0", textC: "#130b2d" },
    { icon: "bills.png",     text: "tu dépenses trop en courses. sans jamais savoir pourquoi.",          bg: "#E49300", border: "#cc8000", textC: "#FFF4C7" },
  ]

  return (
    <div style={{ background: "var(--cream)", color: D, minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav className="l-nav" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#111111", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon src="shrim.png" size={22} />
          <span style={{ ...syne, fontSize: 17, fontWeight: 700, color: "#fff" }}>
            Shrim<span style={{ color: R }}>ply</span>
          </span>
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-orange" onClick={() => navigate("/register")} style={btnO({ padding: "9px 16px", fontSize: 13 })}>
            <span className="nav-cta-label">essayer gratuitement</span>
          </button>
          <button className="btn btn-ghost-light" onClick={() => navigate("/login")} style={btnG({ padding: "8px 16px", fontSize: 13 })}>connexion</button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO MOBILE — fond noir + card crème
      ══════════════════════════════════════════ */}
      <div className="hero-mobile" style={{ background: "#111111", paddingTop: 58 }}>
        {/* Section sombre avec téléphone */}
        <div style={{ padding: "28px 20px 0" }}>
          {/* Eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(243,80,30,0.15)", border: "1px solid rgba(243,80,30,0.3)", borderRadius: 100, padding: "5px 12px", marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, background: "#f3501e", borderRadius: "50%" }} />
            <span style={{ ...inst, fontSize: 10, fontWeight: 600, color: "#f3501e", letterSpacing: "0.06em", textTransform: "uppercase" }}>planification intelligente</span>
          </div>

          {/* H1 */}
          <h1 className="fade1" style={{ ...syne, fontSize: 36, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.05em", color: "#ffffff", marginBottom: 14 }}>
            ne réfléchis plus<br />
            à <span style={{ color: "#f3501e" }}>quoi manger.</span>
          </h1>

          {/* Sub */}
          <p className="fade2" style={{ ...inst, fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: 22 }}>
            repas planifiés, courses générées.<br />
            <strong style={{ color: "rgba(255,255,255,0.85)" }}>5 minutes par semaine.</strong>
          </p>

          {/* Stats */}
          <div className="fade3" style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
            {statBlocks.map(g => (
              <div key={g.n} style={{ background: g.bg, borderRadius: 12, padding: "8px 14px", display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ ...syne, fontSize: 20, fontWeight: 800, color: g.textN, letterSpacing: "-.04em" }}>{g.n}</span>
                <span style={{ ...inst, fontSize: 10, color: g.textL, fontWeight: 500 }}>{g.l}</span>
              </div>
            ))}
          </div>

          {/* Téléphone mockup */}
          <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
            <div style={{ width: 200, position: "relative" }}>
              {/* Glow */}
              <div style={{ position: "absolute", top: 20, left: "10%", right: "10%", bottom: 0, background: "rgba(243,80,30,0.2)", filter: "blur(30px)", borderRadius: "50%", zIndex: 0 }} />
              {/* Phone */}
              <div style={{ background: "#1a1a1a", borderRadius: 32, border: "3px solid #2a2a2a", padding: "12px 8px", position: "relative", zIndex: 1 }}>
                <div style={{ width: 60, height: 8, background: "#2a2a2a", borderRadius: 4, margin: "0 auto 8px" }} />
                <div style={{ background: "#f2ede4", borderRadius: 20, overflow: "hidden", padding: "10px 10px 12px" }}>
                  <div style={{ ...inst, fontSize: 9, fontWeight: 700, color: "#111", marginBottom: 8, letterSpacing: "-.02em" }}>semaine du 24 mars</div>
                  {[
                    { bg: "#cfff79", label: "Bowl Buddha" },
                    { bg: "#9be7ff", label: "Saumon teriyaki" },
                    { bg: "#f3501e", label: "Poulet citron" },
                    { bg: "#ffb9e1", label: "Tarte tatin" },
                    { bg: "#cfff79", label: "Risotto" },
                    { bg: "#E49300", label: "Ramen maison" },
                    { bg: "#d57bff", label: "Wrap végé" },
                  ].map((m, i) => (
                    <div key={i} style={{ background: m.bg, borderRadius: 6, padding: "4px 7px", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 6, height: 6, background: "rgba(0,0,0,0.18)", borderRadius: "50%", flexShrink: 0 }} />
                      <span style={{ ...inst, fontSize: 8, fontWeight: 600, color: "rgba(0,0,0,0.55)", overflow: "hidden", whiteSpace: "nowrap" }}>{m.label}</span>
                    </div>
                  ))}
                  <div style={{ background: "#111", borderRadius: 8, padding: "6px 8px", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ ...inst, fontSize: 8, fontWeight: 700, color: "#fff" }}>liste générée ✓</span>
                    <span style={{ ...inst, fontSize: 8, color: "#f3501e", fontWeight: 700 }}>23 items</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card crème CTA */}
        <div style={{ background: "var(--cream)", borderRadius: "24px 24px 0 0", marginTop: -16, padding: "24px 20px 32px", position: "relative", zIndex: 2 }}>
          <button className="btn btn-orange" onClick={() => navigate("/register")}
            style={{ width: "100%", padding: "15px", textAlign: "center", fontSize: 15, fontWeight: 700, borderRadius: 100, letterSpacing: "-.02em", marginBottom: 12 }}>
            commencer — c'est gratuit
          </button>
          <button onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
            style={{ ...inst, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "center", fontSize: 13, color: "rgba(17,17,17,0.45)", fontWeight: 500, padding: "8px 0", marginBottom: 10 }}>
            voir comment ça marche ↓
          </button>
          <p style={{ ...inst, textAlign: "center", fontSize: 11, color: "#3a9a5c", fontWeight: 500 }}>
            ✓ gratuit &nbsp;·&nbsp; ✓ sans carte &nbsp;·&nbsp; ✓ 30 secondes
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          HERO DESKTOP — version originale crème
      ══════════════════════════════════════════ */}
      <div className="hero-desktop">
        <section style={{ padding: "116px 60px 80px", maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div style={{ position: "absolute", top: "5%", right: -120, width: 640, height: 640, borderRadius: "50%", background: "rgba(243,80,30,.12)", filter: "blur(90px)", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ position: "absolute", bottom: "-5%", left: -100, width: 500, height: 500, borderRadius: "50%", background: "rgba(207,255,121,.18)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ position: "absolute", top: "40%", left: "30%", width: 380, height: 380, borderRadius: "50%", background: "rgba(155,231,255,.14)", filter: "blur(70px)", pointerEvents: "none", zIndex: 0 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 56, position: "relative", zIndex: 1 }}>
            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="fade1" style={bigH({ fontSize: "clamp(40px,5.5vw,70px)", marginBottom: 20 })}>
                ne réfléchis plus<br />
                à <span style={{ color: R }}>quoi manger.</span>
              </h1>
              <p className="fade2" style={{ ...inst, fontSize: 17, color: "rgba(45,45,45,.54)", lineHeight: 1.75, maxWidth: 420, marginBottom: 32 }}>
                tes repas planifiés, ta liste de courses générée.{" "}
                <strong style={{ color: D, fontWeight: 600 }}>en 5 minutes par semaine.</strong>
              </p>
              <div className="fade3" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                <button className="btn btn-orange" onClick={() => navigate("/register")} style={btnO({ fontSize: 15, padding: "16px 40px" })}>
                  commencer maintenant — c'est gratuit
                </button>
                <button className="btn btn-dark" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })} style={btnG({ fontSize: 14, padding: "16px 28px", borderRadius: 100 })}>
                  voir comment ça marche
                </button>
              </div>
              <div className="fade3">{friction}</div>
              <div className="fade4" style={{ display: "flex", gap: 10, marginTop: 36, flexWrap: "wrap" }}>
                {statBlocks.map(g => (
                  <div key={g.n} style={{ background: g.bg, borderRadius: 16, padding: "12px 18px", display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ ...syne, fontSize: 26, fontWeight: 800, color: g.textN, letterSpacing: "-.04em" }}>{g.n}</span>
                    <span style={{ ...inst, fontSize: 11, color: g.textL, fontWeight: 500 }}>{g.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone with floating pills */}
            <div style={{ width: 310, flexShrink: 0, position: "relative" }}>
              {floatingPills.map(p => (
                <div key={p.label} className="float" style={{ position: "absolute", top: p.top, bottom: p.bottom, left: p.left, right: p.right, zIndex: 2, animationDelay: p.delay }}>
                  <div style={{ background: p.bg, color: p.color, borderRadius: 100, padding: "7px 14px", fontSize: p.size, fontWeight: 600, ...inst, whiteSpace: "nowrap", transform: `rotate(${p.rot}deg)`, boxShadow: "0 6px 24px rgba(0,0,0,.12)", display: "flex", alignItems: "center", gap: 6 }}>
                    <img src={`/icons/${p.icon}`} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
                    {p.label}
                  </div>
                </div>
              ))}
              <div style={{ position: "absolute", bottom: 70, left: -58, zIndex: 3, background: "var(--white)", borderRadius: 18, padding: "10px 14px", boxShadow: "0 14px 40px rgba(0,0,0,.16)", display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(45,45,45,.06)" }}>
                <div style={{ width: 36, height: 36, background: "rgba(61,255,142,.22)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/icons/cart.png" alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
                </div>
                <div>
                  <div style={{ ...inst, fontSize: 11, fontWeight: 700, color: D }}>Liste générée ✓</div>
                  <div style={{ ...inst, fontSize: 9, color: "rgba(45,45,45,.4)" }}>23 ingrédients · auto</div>
                </div>
              </div>
              <div style={{ borderRadius: 46, position: "relative" }}>
                <div style={{ position: "absolute", bottom: -30, left: "10%", right: "10%", height: 60, background: "rgba(0,0,0,.18)", filter: "blur(28px)", borderRadius: "50%", zIndex: 0 }} />
                <div style={{ borderRadius: 38, overflow: "hidden", position: "relative", zIndex: 1 }}>
                  <img src="/IMG_6506-left.png" alt="Calendrier Shrimply mobile" style={{ width: "100%", display: "block" }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── TAGS SCROLL ── */}
      <div style={{ overflow: "hidden", padding: "20px 0", background: "var(--cream)" }}>
        <div className="tags-run" style={{ display: "flex", gap: 10, width: "max-content", alignItems: "center" }}>
          {[...TAGS, ...TAGS].map((t, i) => (
            <span key={i} style={{ padding: "7px 16px 7px 10px", borderRadius: 100, fontSize: 13, whiteSpace: "nowrap", background: t.bg, color: t.text, flexShrink: 0, letterSpacing: "-.02em", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, ...inst }}>
              <img src={`/icons/${t.icon}`} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section className="sec" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={slabel}>tout ce qu'il te faut</span>
          <h2 style={bigH({ fontSize: "clamp(24px,3vw,38px)" })}>
            une app. <span style={{ color: R }}>tout compris.</span>
          </h2>
        </div>
        <div className="features-pills" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {featurePills.map(f => (
            <div key={f.label} className="feature-pill" style={{ background: f.bg, borderRadius: 20, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 6px 24px rgba(0,0,0,.1)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon src={f.icon} size={22} />
              </div>
              <div>
                <div style={{ ...syne, fontSize: 15, fontWeight: 700, color: f.text, letterSpacing: "-.03em" }}>{f.label}</div>
                <div style={{ ...inst, fontSize: 11, color: f.text, opacity: .65, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── RECETTES ── */}
      <section className="sec" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span style={slabel}>des recettes pour tous les goûts</span>
          <h2 style={bigH({ fontSize: "clamp(28px,4vw,52px)", marginBottom: 10 })}>
            tes favoris, <span style={{ color: R }}>organisés.</span>
          </h2>
          <p style={{ ...inst, fontSize: 14, color: "rgba(45,45,45,.5)", maxWidth: 360, margin: "0 auto", lineHeight: 1.75 }}>
            14 catégories, des milliers de recettes. crée ou importe en un clic.
          </p>
        </div>
        <div className="recipes-row" style={{ display: "grid", gap: 12 }}>
          {RECIPE_CARDS.map(r => (
            <div key={r.title} className="recipe-card" style={{ backgroundColor: r.primaryTag.cardBg, border: `2px solid ${r.primaryTag.cardBorder}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
              <div style={{ width: "100%", aspectRatio: "4/3", position: "relative", overflow: "hidden" }}>
                <img className="recipe-photo" src={r.img} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, opacity: 0.15 }}>🍽</div>
              </div>
              <div style={{ padding: "8px 10px 10px", flex: 1, display: "flex", flexDirection: "column", color: r.primaryTag.cardText }}>
                <h3 style={{ ...syne, fontSize: 12, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.25, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.title}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, opacity: 0.7, marginBottom: 6, ...inst }}>
                  {r.time && <span>⏱ {r.time}min</span>}
                  {r.rating && <span style={{ color: "#E49300" }}>★ {r.rating}</span>}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: "auto" }}>
                  {r.tagDefs.slice(0, 2).map(t => (
                    <span key={t.label} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: t.pillBg, color: t.pillText, borderRadius: 100, padding: "2px 7px", fontSize: 9, fontWeight: 700, ...inst }}>
                      <img src={`/icons/${t.icon}.png`} alt="" style={{ width: 9, height: 9 }} onError={e => e.target.style.display = "none"} />
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button className="btn btn-dark" onClick={() => navigate("/register")} style={btnO({ background: D, color: "#fff", fontSize: 14, padding: "13px 32px" })}>
            voir toutes les recettes →
          </button>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section id="how" className="sec" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={slabel}>comment ça marche</span>
          <h2 style={bigH({ fontSize: "clamp(28px,4vw,54px)" })}>
            3 étapes. <span style={{ color: R }}>c'est vraiment tout.</span>
          </h2>
        </div>
        <div className="how-cols" style={{ display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { n: "01", bg: "#cfff79", border: "#b8e860", textBg: "#1a3d1a", icon: "book.png",     title: "ajoute tes recettes",         desc: "Crée ou importe depuis la communauté. Photos, tags, ingrédients — ton carnet enfin rangé.", pill: { bg: "#1a3d1a", c: "#cfff79", t: "recettes" } },
              { n: "02", bg: "#9be7ff", border: "#7dd4f0", textBg: "#03225c", icon: "calendar.png", title: "planifie ta semaine",           desc: "Glisse tes recettes sur le calendrier. Ta semaine est bouclée en 5 minutes chrono.",        pill: { bg: "#03225c", c: "#9be7ff", t: "planning" } },
              { n: "03", bg: "#ffb9e1", border: "#f0a0cc", textBg: "#510312", icon: "cart.png",     title: "fais tes courses sans stress", desc: "Ta liste est générée automatiquement. Ouvre-la sur ton téléphone au supermarché.",          pill: { bg: "#510312", c: "#ffb9e1", t: "liste auto" } },
            ].map(s => (
              <div key={s.n} className="card-hover" style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 20, padding: "18px 20px", display: "flex", gap: 16, alignItems: "center", boxShadow: "0 4px 18px rgba(0,0,0,.06)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon src={s.icon} size={26} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...inst, fontSize: 10, color: s.textBg, opacity: .5, letterSpacing: ".1em", marginBottom: 2 }}>ÉTAPE {s.n}</div>
                  <h3 style={{ ...syne, fontSize: 15, fontWeight: 700, color: s.textBg, marginBottom: 3, letterSpacing: "-.03em" }}>{s.title}</h3>
                  <p style={{ ...inst, fontSize: 12, color: s.textBg, opacity: .65, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
                <div style={{ background: s.pill.bg, color: s.pill.c, borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 600, ...inst, flexShrink: 0 }}>{s.pill.t}</div>
              </div>
            ))}
          </div>
          <div className="how-phone" style={{ flexShrink: 0, width: 270, position: "relative", marginLeft: 60 }}>
            <img src="/IMG_6506-left.png" alt="App Shrimply" style={{ width: "100%", display: "block", borderRadius: 36 }} />
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="pain-section" style={{ background: "var(--cream2)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span style={slabel}>tu te reconnais ?</span>
            <h2 style={bigH({ fontSize: "clamp(24px,3.5vw,46px)" })}>
              chaque soir, la même question.<br />
              <span style={{ color: R }}>les mêmes galères.</span>
            </h2>
          </div>
          <div className="pain-g" style={{ display: "grid", gap: 12 }}>
            {painPoints.map(p => (
              <div key={p.icon} className="card-hover" style={{ padding: "18px 20px", display: "flex", gap: 14, alignItems: "flex-start", borderRadius: 18, background: p.bg, border: `1.5px solid ${p.border}`, boxShadow: "0 4px 16px rgba(0,0,0,.07)" }}>
                <Icon src={p.icon} size={28} style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ ...inst, fontSize: 13, color: p.textC, lineHeight: 1.7, fontWeight: 500 }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── APP EN VRAI ── */}
      <section className="sec" style={{ background: "var(--white)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <span style={slabel}>l'app en vrai</span>
          <h2 style={bigH({ fontSize: "clamp(28px,4vw,52px)", marginBottom: 10 })}>
            simple. Beau. <span style={{ color: R }}>vraiment utile.</span>
          </h2>
          <p style={{ ...inst, fontSize: 14, color: "rgba(45,45,45,.5)", maxWidth: 360, margin: "0 auto 40px", lineHeight: 1.75 }}>
            planifie ta semaine depuis n'importe où.
          </p>
          <div className="app-screenshot" style={{ background: "#1a1a1a", boxShadow: "0 40px 100px rgba(0,0,0,.18)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 14, left: 20, display: "flex", gap: 6 }}>
              {["#ff5f57","#ffbd2e","#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
            </div>
            <img src="/calendarboth.png" alt="Shrimply sur desktop" style={{ width: "100%", display: "block", borderRadius: "10px 10px 0 0" }} />
          </div>
          <div className="sub-feat" style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {[
              { icon: "calendar.png", title: "planning semaine",  desc: "Vue semaine. Glisse-dépose.",             bg: "#cfff79", textC: "#1a3d1a" },
              { icon: "cart.png",     title: "liste automatique", desc: "Générée depuis tes repas. Sync mobile.",  bg: "#9be7ff", textC: "#03225c" },
              { icon: "phone.png",    title: "PWA installable",   desc: "Comme une vraie app. 0 téléchargement.", bg: "#ffb9e1", textC: "#510312" },
            ].map(f => (
              <div key={f.title} className="card-hover" style={{ background: f.bg, borderRadius: 16, padding: "20px", textAlign: "left", boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(0,0,0,.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Icon src={f.icon} size={22} />
                </div>
                <h3 style={{ ...syne, fontSize: 14, fontWeight: 700, color: f.textC, marginBottom: 4, letterSpacing: "-.03em" }}>{f.title}</h3>
                <p style={{ ...inst, fontSize: 12, color: f.textC, opacity: .65, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANDE ORANGE ── */}
      <section className="cta-band" style={{ background: R, textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ ...syne, fontSize: "clamp(22px,4vw,44px)", fontWeight: 800, color: "#fff", letterSpacing: "-.05em", lineHeight: 1.1, marginBottom: 14 }}>
            le seul planificateur qui génère automatiquement ta liste de courses.
          </h2>
          <p style={{ ...inst, fontSize: 14, color: "rgba(255,255,255,.7)", maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.75 }}>
            pensé pour les gens qui n'ont pas envie de se prendre la tête.
          </p>
          <button className="btn" onClick={() => navigate("/register")} style={{ ...btnO({ background: "#fff", color: "#f3501e", fontSize: 15, padding: "16px 36px", boxShadow: "0 12px 40px rgba(0,0,0,.18)" }), borderRadius: 100, width: "100%", maxWidth: 400 }}>
            commencer maintenant — c'est gratuit
          </button>
          <p style={{ ...inst, fontSize: 12, color: "rgba(255,255,255,.52)", marginTop: 14 }}>✓ gratuit &nbsp;·&nbsp; ✓ sans carte &nbsp;·&nbsp; ✓ 30 secondes</p>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="sec" style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <span style={slabel}>tarifs</span>
        <h2 style={bigH({ fontSize: "clamp(26px,4vw,52px)", marginBottom: 10 })}>
          le prix d'un café par semaine…<br />
          <span style={{ color: R }}>pour un mois sans prise de tête.</span>
        </h2>
        <p style={{ ...inst, fontSize: 14, color: "rgba(45,45,45,.5)", maxWidth: 400, margin: "0 auto 40px", lineHeight: 1.75 }}>
          la plupart économisent <strong style={{ color: D }}>50 à 100€ par mois</strong> — soit 10 à 20x l'abonnement.
        </p>
        <div className="pricing-g" style={{ display: "grid", gap: 16, maxWidth: 780, margin: "0 auto" }}>
          <div className="card-hover" style={{ background: "var(--white)", borderRadius: 24, padding: 28, textAlign: "left", border: "1.5px solid rgba(45,45,45,.09)", boxShadow: "0 6px 28px rgba(0,0,0,.06)" }}>
            <div style={{ ...inst, fontSize: 11, color: "rgba(45,45,45,.38)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>free</div>
            <div style={{ ...inst, fontSize: 12, color: "#2d8a00", fontWeight: 600, marginBottom: 10 }}>Pour découvrir la magie</div>
            <div style={{ ...syne, fontSize: 48, fontWeight: 800, letterSpacing: "-.06em", lineHeight: 1, color: D, marginBottom: 4 }}>0€</div>
            <div style={{ ...inst, fontSize: 12, color: "rgba(45,45,45,.42)", marginBottom: 22 }}>/mois — expérience complète avec des limites</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
              {[["check","1 semaine de planification",false],["check","liste de courses automatique",false],["check","accès recettes communauté",false],["check","jusqu'à 5 recettes",false],["cross","historique illimité",true],["cross","import & partage",true]].map(([c,l,dim]) => (
                <div key={l} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: dim ? "rgba(45,45,45,.28)" : D, fontWeight: dim ? 400 : 500, ...inst }}>
                  <img src={`/icons/${c}.png`} alt={c} style={{ width: 16, height: 16, opacity: dim ? 0.35 : 1 }} />{l}
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/register")} style={{ backgroundColor: "#111111", color: "#ffffff", width: "100%", padding: 13, fontSize: 13, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", ...inst }}>
              commencer gratuitement
            </button>
          </div>
          <div className="card-hover" style={{ background: "#111111", borderRadius: 24, padding: 28, textAlign: "left", border: `2px solid ${R}`, position: "relative", boxShadow: `0 24px 70px rgba(243,80,30,.2)` }}>
            <div style={{ position: "absolute", top: 16, right: 16, background: R, color: "#fff", padding: "4px 12px", borderRadius: 100, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, ...inst }}>
              <img src="/icons/star.png" alt="star" style={{ width: 12, height: 12 }} /> le plus populaire
            </div>
            <div style={{ ...inst, fontSize: 11, color: "rgba(255,255,255,.32)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>premium</div>
            <div style={{ ...inst, fontSize: 12, color: R, fontWeight: 600, marginBottom: 10 }}>Pour ne plus jamais réfléchir</div>
            <div style={{ ...syne, fontSize: 48, fontWeight: 800, letterSpacing: "-.06em", lineHeight: 1, color: "#fff", marginBottom: 4 }}>4,99€</div>
            <div style={{ ...inst, fontSize: 12, color: "rgba(255,255,255,.38)", marginBottom: 22 }}>/mois — moins d'un café par semaine</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
              {["recettes illimitées","planification illimitée","liste de courses auto","import de recettes","partage public + profil","nouvelles features en avant-première"].map(l => (
                <div key={l} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "#fff", fontWeight: 500, ...inst }}>
                  <img src="/icons/check.png" alt="check" style={{ width: 16, height: 16 }} />{l}
                </div>
              ))}
            </div>
            <button className="btn btn-orange" onClick={() => navigate("/register")} style={btnO({ width: "100%", padding: 14, fontSize: 13, borderRadius: 12 })}>
              j'arrête de réfléchir
            </button>
            <p style={{ textAlign: "center", ...inst, fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 10 }}>sans engagement · annulable à tout moment</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section" style={{ background: "var(--cream2)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <span style={slabel}>foire aux questions</span>
          <h2 style={bigH({ fontSize: "clamp(28px,4vw,50px)", marginBottom: 36 })}>t'as des questions ?</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="faq-row" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ borderRadius: 16, overflow: "hidden", textAlign: "left", background: "var(--white)", border: "1px solid rgba(45,45,45,.09)", boxShadow: openFaq === i ? "0 10px 40px rgba(0,0,0,.09)" : "0 3px 12px rgba(0,0,0,.05)" }}>
                <div style={{ padding: "16px 20px", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, color: openFaq === i ? R : D, fontWeight: 500, ...inst }}>
                  {item.q}
                  <span style={{ fontSize: 18, transition: "transform .25s", transform: openFaq === i ? "rotate(180deg)" : "none", flexShrink: 0, color: "rgba(45,45,45,.3)" }}>⌄</span>
                </div>
                {openFaq === i && (
                  <div style={{ padding: "0 20px 18px", ...inst, fontSize: 13, color: "rgba(45,45,45,.56)", lineHeight: 1.8 }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="cta-final" style={{ textAlign: "center", background: "var(--white)" }}>
        <div className="float" style={{ marginBottom: 16 }}>
          <img src="/icons/shrim.png" alt="" style={{ width: 64, height: 64, objectFit: "contain" }} onError={e => e.target.style.opacity = "0"} />
        </div>
        <h2 style={bigH({ fontSize: "clamp(26px,4.5vw,52px)", marginBottom: 10 })}>
          t'as assez réfléchi<br />à <span style={{ color: R }}>quoi manger.</span>
        </h2>
        <p style={{ ...inst, fontSize: 14, color: "rgba(45,45,45,.5)", maxWidth: 300, margin: "0 auto 28px", lineHeight: 1.75 }}>
          planifie ta première semaine en 5 minutes. gratuitement.
        </p>
        <div className="cta-btns" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-orange cta-btn-main" onClick={() => navigate("/register")} style={btnO({ fontSize: 14, padding: "15px 32px" })}>
            commencer — c'est gratuit
          </button>
          <button className="btn btn-dark cta-btn-main" onClick={() => navigate("/login")} style={btnG({ fontSize: 13, padding: "15px 24px", background: D, color: "#fff", borderRadius: 100 })}>
            j'ai déjà un compte
          </button>
        </div>
        {friction}
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "20px 24px", borderTop: "1px solid rgba(45,45,45,.08)", background: "var(--cream)", ...inst, fontSize: 12, color: "rgba(45,45,45,.4)" }}>
        <div className="footer-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Icon src="shrim.png" size={16} />
            <span style={{ ...syne, fontWeight: 700, color: D }}>shrimply</span>
            <span>— fait avec amour <img src="/icons/love.png" alt="❤️" style={{ width: 13, height: 13, objectFit: "contain", verticalAlign: "middle" }} onError={e => e.target.replaceWith(document.createTextNode("❤️"))} /></span>
          </div>
          <span>© 2026 shrimply</span>
        </div>
      </footer>

    </div>
  )
}
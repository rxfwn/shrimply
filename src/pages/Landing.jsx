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
  { title: "Bowl Buddha végé",   time: "20", servings: "2", rating: "4,8", primaryTag: { value: "végé",      cardBg: "#cfff79",  cardText: "#091718", cardBorder: "#b8e860" }, tagDefs: [{ label: "végé", pillBg: "#cfff79", pillText: "#091718", icon: "herb" }, { label: "léger", pillBg: "#03225c", pillText: "#9be7ff", icon: "feather" }],    img: "/recipes/bowl-buddha.jpg"   },
  { title: "Saumon teriyaki",    time: "15", servings: "2", rating: "4,6", primaryTag: { value: "poisson",   cardBg: "#9be7ff",  cardText: "#03225c", cardBorder: "#7dd4f0" }, tagDefs: [{ label: "poisson", pillBg: "#9be7ff", pillText: "#03225c", icon: "fih" }, { label: "rapide", pillBg: "#E49300", pillText: "#FFF4C7", icon: "eclair" }],   img: "/recipes/saumon.jpg"        },
  { title: "Poulet rôti citron", time: "45", servings: "4", rating: "4,9", primaryTag: { value: "viande",    cardBg: "#ffb9e1",  cardText: "#510312", cardBorder: "#f0a0cc" }, tagDefs: [{ label: "viande", pillBg: "#ffb9e1", pillText: "#510312", icon: "meat" }],                                                                              img: "/recipes/poulet.jpg"        },
  { title: "Tarte tatin",        time: "55", servings: "6", rating: "4,7", primaryTag: { value: "dessert",   cardBg: "#ffb9e1",  cardText: "#510312", cardBorder: "#f0a0cc" }, tagDefs: [{ label: "dessert", pillBg: "#ffb9e1", pillText: "#510312", icon: "shortcake" }, { label: "français", pillBg: "#03225c", pillText: "#ffffff", icon: "cheese" }], img: "/recipes/tarte.jpg" },
  { title: "Risotto parmesan",   time: "30", servings: "2", rating: "4,5", primaryTag: { value: "italien",   cardBg: "#cfff79",  cardText: "#1a3d1a", cardBorder: "#b8e860" }, tagDefs: [{ label: "italien", pillBg: "#cfff79", pillText: "#1a3d1a", icon: "pasta" }],                                                                              img: "/recipes/risotto.jpg"       },
  { title: "Ramen maison",       time: "25", servings: "2", rating: "4,8", primaryTag: { value: "asiatique", cardBg: "#510312",  cardText: "#ffffff",  cardBorder: "#6b0000" }, tagDefs: [{ label: "asiatique", pillBg: "#510312", pillText: "#ffffff", icon: "chopsticks" }, { label: "rapide", pillBg: "#E49300", pillText: "#FFF4C7", icon: "eclair" }], img: "/recipes/ramen.jpg" },
]

const FAQ_ITEMS = [
  { q: "C'est quoi exactement Shrimply ?",              a: "Shrimply c'est une app web qui t'aide à planifier tes repas de la semaine et à générer automatiquement ta liste de courses. Tu crées ou importes des recettes, tu les places sur un calendrier, et la liste de courses se remplit toute seule." },
  { q: "Je peux utiliser Shrimply sur mon téléphone ?", a: "Oui ! Shrimply est une PWA — tu peux l'installer sur ton écran d'accueil comme une vraie app. Ta liste de courses se synchronise en temps réel entre ton PC et ton téléphone." },
  { q: "Est-ce que je peux partager mes recettes ?",    a: "Absolument. Tu peux rendre tes recettes publiques et les partager avec toute la communauté. Les autres peuvent les noter et les importer en un clic." },
  { q: "Comment fonctionne la liste de courses auto ?", a: "Quand tu places des recettes sur ton calendrier, Shrimply récupère tous les ingrédients et les regroupe automatiquement par catégorie. Plus besoin de compter ou de noter quoi que ce soit à la main." },
  { q: "Je peux annuler mon abonnement à tout moment ?",a: "Oui, sans engagement ni frais. Tu peux annuler à tout moment depuis ton profil. Tes recettes restent accessibles en mode Free." },
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) navigate("/calendar")
    })

    const style = document.createElement("style")
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --cream:   #f2ede4;
        --cream2:  #ebe4d8;
        --white:   #ffffff;
        --dark:    #111111;
        --orange:  #f3501e;
      }

      body { background: var(--cream); font-family: 'Instrument Sans', sans-serif; }

      @keyframes scrollLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes float      { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-14px) rotate(2deg); } }
      @keyframes fadeUp     { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
      @keyframes wiggle     { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }

      .fade1 { animation: fadeUp .65s .05s cubic-bezier(.16,1,.3,1) both; }
      .fade2 { animation: fadeUp .65s .15s cubic-bezier(.16,1,.3,1) both; }
      .fade3 { animation: fadeUp .65s .28s cubic-bezier(.16,1,.3,1) both; }
      .fade4 { animation: fadeUp .65s .42s cubic-bezier(.16,1,.3,1) both; }
      .fade5 { animation: fadeUp .65s .58s cubic-bezier(.16,1,.3,1) both; }

      .tags-run { animation: scrollLeft 38s linear infinite; }
      .float    { animation: float 3.8s ease-in-out infinite; display: inline-block; }
      .wiggle   { animation: wiggle 2.8s ease-in-out infinite; display: inline-block; }

      .btn { transition: transform .15s, box-shadow .15s; cursor: pointer; border: none; outline: none; font-family: 'Instrument Sans', sans-serif; }
      .btn:hover { transform: translateY(-2px); }
      .btn-orange { background: var(--orange); color: #fff; box-shadow: 0 6px 28px rgba(243,80,30,.3); }
      .btn-orange:hover { box-shadow: 0 14px 42px rgba(243,80,30,.48); }
      .btn-dark   { background: var(--dark); color: #fff; }
      .btn-dark:hover { background: #1a1a1a; }
      .btn-ghost  { background: transparent; color: var(--dark); border: 1.5px solid rgba(45,45,45,.25); }
      .btn-ghost:hover  { background: rgba(45,45,45,.07); }
      .btn-ghost-light  { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,.35); }
      .btn-ghost-light:hover  { background: rgba(255,255,255,.1); }

      .card-hover { transition: transform .2s, box-shadow .2s; }
      .card-hover:hover { transform: translateY(-5px) !important; box-shadow: 0 28px 70px rgba(0,0,0,.14) !important; }

      .faq-row { transition: background .18s; cursor: pointer; }
      .faq-row:hover { background: var(--cream2) !important; }

      .recipe-card { transition: transform .22s, box-shadow .22s; cursor: pointer; overflow: hidden; }
      .recipe-card:hover { transform: translateY(-6px) !important; box-shadow: 0 32px 64px rgba(0,0,0,.28) !important; }
      .recipe-card img.recipe-photo { transition: transform .4s; }
      .recipe-card:hover img.recipe-photo { transform: scale(1.06); }

      @media (max-width: 880px) {
        .hero-cols   { flex-direction: column !important; align-items: center !important; }
        .how-cols    { flex-direction: column !important; }
        .pricing-g   { grid-template-columns: 1fr !important; }
        .feat-g      { grid-template-columns: 1fr 1fr !important; }
        .pain-g      { grid-template-columns: 1fr !important; }
        .cta-btns    { flex-direction: column !important; align-items: stretch !important; }
        .l-nav       { padding: 10px 20px !important; }
        .hero-phone  { width: 240px !important; margin-top: 48px; }
        .hero-h1     { font-size: 40px !important; }
        .sec         { padding: 72px 24px !important; }
        .sub-feat    { grid-template-columns: 1fr !important; }
        .recipes-row { grid-template-columns: 1fr 1fr !important; }
        .features-pills { flex-wrap: wrap !important; }
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
  const bigH = (x = {}) => ({ ...syne, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-.05em", color: D, ...x })

  const friction = (
    <p style={{ ...inst, fontSize: 12, color: "#3a9a5c", marginTop: 14, fontWeight: 500 }}>
      ✓ gratuit &nbsp;·&nbsp; ✓ sans carte bancaire &nbsp;·&nbsp; ✓ 30 secondes
    </p>
  )

  // Floating pills — icon images instead of emojis
  const floatingPills = [
    { label: "végé",      icon: "herb.png",       bg: "#cfff79",  color: "#091718", top: -18,   left: -72,  rot: -6,  delay: "0s",    size: 13 },
    { label: "poisson",   icon: "fih.png",         bg: "#9be7ff",  color: "#03225c", bottom: 140, right: -62, rot: 5,   delay: "-.8s",  size: 13 },
    { label: "viande",    icon: "meat.png",        bg: "#ffb9e1",  color: "#510312", top: 200,   left: -80,  rot: -4,  delay: "-1.6s", size: 13 },
    { label: "rapide",    icon: "eclair.png",      bg: "#E49300",  color: "#FFF4C7", top: 80,    right: -70, rot: 7,   delay: "-2.2s", size: 12 },
    { label: "protéiné",  icon: "biceps.png",      bg: "#d57bff",  color: "#130b2d", bottom: 260, left: -90, rot: -3,  delay: "-3s",   size: 12 },
    { label: "asiatique", icon: "chopsticks.png",  bg: "#510312",  color: "#ffffff", bottom: 60, right: -80, rot: 4,   delay: "-1s",   size: 12 },
  ]

  // Stat blocks reusing tag palette
  const statBlocks = [
    { n: "+5h",  l: "libérées / sem.", bg: "#cfff79",              textN: "#091718", textL: "#1a3d1a"  },
    { n: "100€", l: "éco. / mois",     bg: "#9be7ff",              textN: "#03225c", textL: "#005f7a"  },
    { n: "0",    l: "oubli courses",   bg: "#ffb9e1",              textN: "#510312", textL: "#510312"  },
  ]

  // Features pills row
  const featurePills = [
    { icon: "book.png",     label: "Recettes",     desc: "14 catégories, ton carnet rangé",    bg: "#f3501e",  text: "#fff"    },
    { icon: "calendar.png", label: "Planning",     desc: "Glisse, bouclé en 5 min",             bg: "#cfff79",  text: "#1a3d1a" },
    { icon: "cart.png",     label: "Courses auto", desc: "Générée, sync mobile",                bg: "#111111",  text: "#fff"    },
    { icon: "spark.png",    label: "Découvrir",    desc: "Explore la communauté",               bg: "#d57bff",  text: "#130b2d" },
    { icon: "friends.png",  label: "Partage",      desc: "Importe & partage en un clic",        bg: "#FFF4C7",  text: "#7a5200" },
  ]

  // Pain points with tag colors
  const painPoints = [
    { icon: "exhausted.png", text: "\"on mange quoi ce soir ?\" encore. tous les jours.",                bg: "#cfff79",  border: "#b8e860",  textC: "#091718" },
    { icon: "cart.png",      text: "tu fais les courses sans liste. tu oublies toujours quelque chose.",  bg: "#9be7ff",  border: "#7dd4f0",  textC: "#03225c" },
    { icon: "trash.png",     text: "tu jettes de la nourriture. parce que t'avais rien prévu.",           bg: "#ffb9e1",  border: "#f0a0cc",  textC: "#510312" },
    { icon: "pizza.png",     text: "tu commandes en livraison. par flemme de réfléchir.",                 bg: "#FFF4C7",  border: "#f0e0a0",  textC: "#7a5200" },
    { icon: "brain.png",     text: "la charge mentale des repas t'épuise sans t'en rendre compte.",       bg: "#d57bff",  border: "#c060f0",  textC: "#130b2d" },
    { icon: "bills.png",     text: "tu dépenses trop en courses. sans jamais savoir pourquoi.",           bg: "#E49300",  border: "#cc8000",  textC: "#FFF4C7" },
  ]

  return (
    <div style={{ background: "var(--cream)", color: D, minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav className="l-nav" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 48px",
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
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btn-orange" onClick={() => navigate("/register")} style={btnO({ padding: "9px 22px", fontSize: 13 })}>essayer gratuitement</button>
          <button className="btn btn-ghost-light nav-login" onClick={() => navigate("/login")} style={btnG({ padding: "8px 20px", fontSize: 13 })}>se connecter</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="sec" style={{ padding: "116px 60px 80px", maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "absolute", top: "5%", right: -120, width: 640, height: 640, borderRadius: "50%", background: "rgba(243,80,30,.12)", filter: "blur(90px)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", bottom: "-5%", left: -100, width: 500, height: 500, borderRadius: "50%", background: "rgba(207,255,121,.18)", filter: "blur(80px)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "40%", left: "30%", width: 380, height: 380, borderRadius: "50%", background: "rgba(155,231,255,.14)", filter: "blur(70px)", pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 280, height: 280, borderRadius: "50%", background: "rgba(213,123,255,.10)", filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />

        <div className="hero-cols" style={{ display: "flex", alignItems: "center", gap: 56, position: "relative", zIndex: 1 }}>

          {/* Text side */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="fade1 hero-h1" style={bigH({ fontSize: "clamp(40px,5.5vw,70px)", marginBottom: 20 })}>
              ne réfléchis plus<br />
              à <span style={{ color: R }}>quoi manger.</span>
            </h1>

            <p className="fade2" style={{ ...inst, fontSize: 17, color: "rgba(45,45,45,.54)", lineHeight: 1.75, maxWidth: 420, marginBottom: 32 }}>
              tes repas planifiés, ta liste de courses générée.{" "}
              <strong style={{ color: D, fontWeight: 600 }}>en 5 minutes par semaine.</strong>
            </p>

            <div className="fade3 cta-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
              <button className="btn btn-orange" onClick={() => navigate("/register")} style={btnO({ fontSize: 15, padding: "16px 40px" })}>
                commencer maintenant — c'est gratuit
              </button>
              <button className="btn btn-dark" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })} style={btnG({ fontSize: 14, padding: "16px 28px", borderRadius: 100 })}>
                voir comment ça marche
              </button>
            </div>
            <div className="fade3">{friction}</div>

            {/* Stats — tag palette */}
            <div className="fade4" style={{ display: "flex", gap: 10, marginTop: 36, flexWrap: "wrap" }}>
              {statBlocks.map(g => (
                <div key={g.n} style={{ background: g.bg, borderRadius: 16, padding: "12px 18px", display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ ...syne, fontSize: 26, fontWeight: 800, color: g.textN, letterSpacing: "-.04em" }}>{g.n}</span>
                  <span style={{ ...inst, fontSize: 11, color: g.textL, fontWeight: 500 }}>{g.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup — no background behind device */}
          <div className="hero-phone" style={{ width: 310, flexShrink: 0, position: "relative" }}>
            {floatingPills.map(p => (
              <div key={p.label} className="float" style={{ position: "absolute", top: p.top, bottom: p.bottom, left: p.left, right: p.right, zIndex: 2, animationDelay: p.delay }}>
                <div style={{ background: p.bg, color: p.color, borderRadius: 100, padding: "7px 14px", fontSize: p.size, fontWeight: 600, ...inst, whiteSpace: "nowrap", transform: `rotate(${p.rot}deg)`, boxShadow: "0 6px 24px rgba(0,0,0,.12)", display: "flex", alignItems: "center", gap: 6 }}>
                  <img src={`/icons/${p.icon}`} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
                  {p.label}
                </div>
              </div>
            ))}

            {/* Badge courses */}
            <div style={{ position: "absolute", bottom: 70, left: -58, zIndex: 3, background: "var(--white)", borderRadius: 18, padding: "10px 14px", boxShadow: "0 14px 40px rgba(0,0,0,.16)", display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(45,45,45,.06)" }}>
              <div style={{ width: 36, height: 36, background: "rgba(61,255,142,.22)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src="/icons/cart.png" alt="" style={{ width: 20, height: 20, objectFit: "contain" }} onError={e => e.target.style.opacity = "0"} />
              </div>
              <div>
                <div style={{ ...inst, fontSize: 11, fontWeight: 700, color: D }}>Liste générée ✓</div>
                <div style={{ ...inst, fontSize: 9, color: "rgba(45,45,45,.4)" }}>23 ingrédients · auto</div>
              </div>
            </div>

            {/* Device shell — no background, shadow only behind phone */}
            <div style={{ borderRadius: 46, position: "relative" }}>
              <div style={{
                position: "absolute", bottom: -30, left: "10%", right: "10%", height: 60,
                background: "rgba(0,0,0,.18)", filter: "blur(28px)", borderRadius: "50%", zIndex: 0
              }} />
              <div style={{ borderRadius: 38, overflow: "hidden", position: "relative", zIndex: 1 }}>
                <img src="/IMG_6506-left.png" alt="Calendrier Shrimply mobile" style={{ width: "100%", display: "block" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TAGS SCROLL — no white background ── */}
      <div style={{ overflow: "hidden", padding: "22px 0", background: "var(--cream)" }}>
        <div className="tags-run" style={{ display: "flex", gap: 10, width: "max-content", alignItems: "center" }}>
          {[...TAGS, ...TAGS].map((t, i) => (
            <span key={i} style={{ padding: "7px 16px 7px 10px", borderRadius: 100, fontSize: 13, whiteSpace: "nowrap", background: t.bg, color: t.text, flexShrink: 0, letterSpacing: "-.02em", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 7, ...inst }}>
              <img src={`/icons/${t.icon}`} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES — compact pills row, moved up ── */}
      <section style={{ padding: "64px 60px 0", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={slabel}>tout ce qu'il te faut</span>
          <h2 style={bigH({ fontSize: "clamp(24px,3vw,38px)" })}>
            une app. <span style={{ color: R }}>tout compris.</span>
          </h2>
        </div>
        <div className="features-pills" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {featurePills.map(f => (
            <div key={f.label} style={{ background: f.bg, borderRadius: 20, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, minWidth: 200, flex: "0 1 auto", boxShadow: "0 6px 24px rgba(0,0,0,.1)" }}>
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

      {/* ── RECETTES — card style matching site example ── */}
      <section className="sec" style={{ padding: "80px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <span style={slabel}>des recettes pour tous les goûts</span>
          <h2 style={bigH({ fontSize: "clamp(30px,4vw,52px)", marginBottom: 12 })}>
            tes favoris, <span style={{ color: R }}>organisés.</span>
          </h2>
          <p style={{ ...inst, fontSize: 15, color: "rgba(45,45,45,.5)", maxWidth: 380, margin: "0 auto", lineHeight: 1.75 }}>
            14 catégories, des milliers de recettes. crée ou importe en un clic.
          </p>
        </div>

        <div className="recipes-row" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
          {RECIPE_CARDS.map((r) => {
            const bg = r.primaryTag.cardBg
            const textColor = r.primaryTag.cardText
            const border = r.primaryTag.cardBorder
            const actionBg = textColor === "#ffffff" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)"
            return (
              <div key={r.title} className="recipe-card" style={{
                backgroundColor: bg,
                border: `2px solid ${border}`,
                borderRadius: 16,
                overflow: "hidden",
                display: "flex", flexDirection: "column",
                boxShadow: "0 8px 24px rgba(0,0,0,.14)",
              }}>
                {/* Photo */}
                <div style={{ width: "100%", aspectRatio: "4/3", position: "relative", overflow: "hidden", background: actionBg }}>
                  <img
                    className="recipe-photo"
                    src={r.img}
                    alt={r.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={e => { e.target.style.display = "none" }}
                  />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, opacity: 0.18 }}>🍽</div>
                </div>

                {/* Body */}
                <div style={{ padding: "8px 10px 10px", flex: 1, display: "flex", flexDirection: "column", color: textColor }}>
                  <h3 style={{ ...syne, fontSize: 12, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.25, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.title}</h3>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: textColor, opacity: 0.7, marginBottom: 6, ...inst }}>
                    {r.time && <span>⏱ {r.time}min</span>}
                    {r.servings && <span>🍽 {r.servings}p</span>}
                    {r.rating && <span style={{ color: "#E49300" }}>★ {r.rating}</span>}
                  </div>

                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: "auto" }}>
                    {r.tagDefs.slice(0, 2).map(t => (
                      <span key={t.label} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: t.pillBg, color: t.pillText, borderRadius: 100, padding: "2px 7px", fontSize: 9, fontWeight: 700, ...inst }}>
                        <img src={`/icons/${t.icon}.png`} alt="" style={{ width: 9, height: 9, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 36 }}>
          <button className="btn btn-dark" onClick={() => navigate("/register")} style={btnO({ background: D, color: "#fff", fontSize: 14, padding: "14px 36px" })}>
            voir toutes les recettes →
          </button>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section id="how" className="sec" style={{ padding: "80px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <span style={slabel}>comment ça marche</span>
          <h2 style={bigH({ fontSize: "clamp(30px,4vw,54px)", marginBottom: 0 })}>
            3 étapes. <span style={{ color: R }}>c'est vraiment tout.</span>
          </h2>
        </div>

        <div className="how-cols" style={{ display: "flex", gap: 60, alignItems: "center" }}>
          {/* Steps — tag palette colors */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { n: "01", bg: "#cfff79",  border: "#b8e860",  textBg: "#1a3d1a", icon: "book.png",     title: "ajoute tes recettes",         desc: "Crée ou importe depuis la communauté. Photos, tags, ingrédients — ton carnet enfin rangé.", pill: { bg: "#1a3d1a", c: "#cfff79", t: "recettes" } },
              { n: "02", bg: "#9be7ff",  border: "#7dd4f0",  textBg: "#03225c", icon: "calendar.png", title: "planifie ta semaine",           desc: "Glisse tes recettes sur le calendrier. Ta semaine est bouclée en 5 minutes chrono.",        pill: { bg: "#03225c", c: "#9be7ff", t: "planning" } },
              { n: "03", bg: "#ffb9e1",  border: "#f0a0cc",  textBg: "#510312", icon: "cart.png",     title: "fais tes courses sans stress", desc: "Ta liste est générée automatiquement. Ouvre-la sur ton téléphone au supermarché.",          pill: { bg: "#510312", c: "#ffb9e1", t: "liste auto" } },
            ].map(s => (
              <div key={s.n} className="card-hover" style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 22, padding: "22px 24px", display: "flex", gap: 18, alignItems: "center", boxShadow: "0 4px 18px rgba(0,0,0,.06)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, background: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
                  <Icon src={s.icon} size={28} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...inst, fontSize: 10, color: s.textBg, opacity: .5, letterSpacing: ".1em", marginBottom: 3 }}>ÉTAPE {s.n}</div>
                  <h3 style={{ ...syne, fontSize: 16, fontWeight: 700, color: s.textBg, marginBottom: 4, letterSpacing: "-.03em" }}>{s.title}</h3>
                  <p style={{ ...inst, fontSize: 13, color: s.textBg, opacity: .65, lineHeight: 1.65 }}>{s.desc}</p>
                </div>
                <div style={{ background: s.pill.bg, color: s.pill.c, borderRadius: 100, padding: "4px 14px", fontSize: 11, fontWeight: 600, ...inst, flexShrink: 0 }}>{s.pill.t}</div>
              </div>
            ))}
          </div>

          {/* Phone — no shell background, just the image */}
          <div style={{ flexShrink: 0, width: 270, position: "relative" }}>
            <div style={{
              position: "absolute", bottom: -24, left: "15%", right: "15%", height: 50,
              background: "rgba(0,0,0,.15)", filter: "blur(22px)", borderRadius: "50%", zIndex: 0
            }} />
            <img src="/IMG_6506-left.png" alt="App Shrimply calendrier" style={{ width: "100%", display: "block", borderRadius: 36, position: "relative", zIndex: 1 }} />
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS — cream bg, tag colors ── */}
      <section style={{ background: "var(--cream2)", padding: "80px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={slabel}>tu te reconnais ?</span>
            <h2 style={bigH({ fontSize: "clamp(26px,3.5vw,46px)" })}>
              chaque soir, la même question.<br />
              <span style={{ color: R }}>chaque semaine, les mêmes galères.</span>
            </h2>
          </div>

          <div className="pain-g" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
            {painPoints.map(p => (
              <div key={p.icon} className="card-hover" style={{ padding: "20px 22px", display: "flex", gap: 14, alignItems: "flex-start", borderRadius: 18, background: p.bg, border: `1.5px solid ${p.border}`, boxShadow: "0 4px 16px rgba(0,0,0,.07)" }}>
                <Icon src={p.icon} size={32} style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ ...inst, fontSize: 13, color: p.textC, lineHeight: 1.7, fontWeight: 500 }}>{p.text}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── APP EN VRAI ── */}
      <section className="sec" style={{ padding: "100px 60px", background: "var(--white)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <span style={slabel}>l'app en vrai</span>
          <h2 style={bigH({ fontSize: "clamp(30px,4vw,52px)", marginBottom: 12 })}>
            simple. Beau. <span style={{ color: R }}>vraiment utile.</span>
          </h2>
          <p style={{ ...inst, fontSize: 15, color: "rgba(45,45,45,.5)", maxWidth: 380, margin: "0 auto 52px", lineHeight: 1.75 }}>
            planifie ta semaine depuis n'importe où. Tes recettes, ton calendrier, ta liste.
          </p>

          <div style={{ background: "#1a1a1a", borderRadius: 22, padding: "38px 14px 0", boxShadow: "0 60px 120px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.05)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 14, left: 20, display: "flex", gap: 6 }}>
              {["#ff5f57","#ffbd2e","#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
            </div>
            <img src="/calendarboth.png" alt="Shrimply sur desktop" style={{ width: "100%", display: "block", borderRadius: "12px 12px 0 0" }} />
          </div>

          <div className="sub-feat" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 20 }}>
            {[
              { icon: "calendar.png", title: "planning semaine",  desc: "Vue semaine ou mois. Glisse-dépose.",     bg: "#cfff79", textC: "#1a3d1a" },
              { icon: "cart.png",     title: "liste automatique", desc: "Générée depuis tes repas. Sync mobile.",  bg: "#9be7ff", textC: "#03225c" },
              { icon: "phone.png",    title: "PWA installable",   desc: "Comme une vraie app. 0 téléchargement.", bg: "#ffb9e1", textC: "#510312" },
            ].map(f => (
              <div key={f.title} className="card-hover" style={{ background: f.bg, borderRadius: 18, padding: "22px", textAlign: "left", boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,0,0,.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon src={f.icon} size={24} />
                </div>
                <h3 style={{ ...syne, fontSize: 14, fontWeight: 700, color: f.textC, marginBottom: 6, letterSpacing: "-.03em" }}>{f.title}</h3>
                <p style={{ ...inst, fontSize: 12, color: f.textC, opacity: .65, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANDE ORANGE ── */}
      <section style={{ background: R, padding: "80px 60px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ ...syne, fontSize: "clamp(26px,4vw,48px)", fontWeight: 800, color: "#fff", letterSpacing: "-.05em", lineHeight: 1.1, marginBottom: 14 }}>
            le seul planificateur qui génère automatiquement ta liste de courses.
          </h2>
          <p style={{ ...inst, fontSize: 15, color: "rgba(255,255,255,.7)", maxWidth: 400, margin: "0 auto 36px", lineHeight: 1.75 }}>
            pensé pour les gens qui n'ont pas envie de se prendre la tête.
          </p>
          <button className="btn" onClick={() => navigate("/register")} style={{ ...btnO({ background: "#fff", color: "#f3501e", fontSize: 15, padding: "17px 44px", boxShadow: "0 12px 40px rgba(0,0,0,.18)" }), borderRadius: 100 }}>
            commencer maintenant — c'est gratuit
          </button>
          <p style={{ ...inst, fontSize: 12, color: "rgba(255,255,255,.52)", marginTop: 14 }}>✓ gratuit &nbsp;·&nbsp; ✓ sans carte &nbsp;·&nbsp; ✓ 30 secondes</p>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="sec" style={{ padding: "100px 60px", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <span style={slabel}>tarifs</span>
        <h2 style={bigH({ fontSize: "clamp(30px,4vw,52px)", marginBottom: 12 })}>
          le prix d'un café par semaine…<br />
          <span style={{ color: R }}>pour un mois sans prise de tête.</span>
        </h2>
        <p style={{ ...inst, fontSize: 15, color: "rgba(45,45,45,.5)", maxWidth: 420, margin: "0 auto 52px", lineHeight: 1.75 }}>
          la plupart économisent <strong style={{ color: D }}>50 à 100€ par mois</strong> — soit 10 à 20x l'abonnement.
        </p>

        <div className="pricing-g" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 780, margin: "0 auto" }}>
          {/* Free */}
          <div className="card-hover" style={{ background: "var(--white)", borderRadius: 28, padding: 34, textAlign: "left", border: "1.5px solid rgba(45,45,45,.09)", boxShadow: "0 6px 28px rgba(0,0,0,.06)" }}>
            <div style={{ ...inst, fontSize: 11, color: "rgba(45,45,45,.38)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>free</div>
            <div style={{ ...inst, fontSize: 12, color: "#2d8a00", fontWeight: 600, marginBottom: 12 }}>Pour découvrir la magie</div>
            <div style={{ ...syne, fontSize: 52, fontWeight: 800, letterSpacing: "-.06em", lineHeight: 1, color: D, marginBottom: 6 }}>0€</div>
            <div style={{ ...inst, fontSize: 13, color: "rgba(45,45,45,.42)", marginBottom: 28 }}>/mois — expérience complète avec des limites</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[["check","1 semaine de planification",false],["check","liste de courses automatique",false],["check","accès recettes communauté",false],["check","jusqu'à 5 recettes",false],["cross","historique illimité",true],["cross","import & partage",true]].map(([c,l,dim]) => (
              <div key={l} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: dim ? "rgba(45,45,45,.28)" : D, fontWeight: dim ? 400 : 500, ...inst }}>
              <img src={`icons/${c}.png`} alt={c} style={{ width: 16, height: 16, opacity: dim ? 0.35 : 1 }} />{l}
            </div>
              ))}
            </div>
            <button 
            onClick={() => navigate("/register")} 
            style={{ backgroundColor: "#111111", color: "#ffffff", width: "100%", padding: 13, fontSize: 13, borderRadius: 14,border: "none",cursor: "pointer",fontFamily: "inherit",...inst}}>
            commencer gratuitement
            </button>
            </div>

          {/* Premium */}
          <div className="card-hover" style={{ background: "#111111", borderRadius: 28, padding: 34, textAlign: "left", border: `2px solid ${R}`, position: "relative", boxShadow: `0 24px 70px rgba(243,80,30,.2)` }}>
            <div style={{ position: "absolute", top: 16, right: 16, background: R, color: "#fff", padding: "4px 14px", borderRadius: 100, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, ...inst }}><img src="/icons/star.png" alt="star" style={{ width: 12, height: 12 }} /> le plus populaire
            </div>
            <div style={{ ...inst, fontSize: 11, color: "rgba(255,255,255,.32)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>premium</div>
            <div style={{ ...inst, fontSize: 12, color: R, fontWeight: 600, marginBottom: 12 }}>Pour ne plus jamais réfléchir</div>
            <div style={{ ...syne, fontSize: 52, fontWeight: 800, letterSpacing: "-.06em", lineHeight: 1, color: "#fff", marginBottom: 6 }}>4,99€</div>
            <div style={{ ...inst, fontSize: 13, color: "rgba(255,255,255,.38)", marginBottom: 28 }}>/mois — moins d'un café par semaine</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {["recettes illimitées","planification illimitée","liste de courses auto","import de recettes","partage public + profil","nouvelles features en avant-première"].map(l => (
              <div key={l} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "#fff", fontWeight: 500, ...inst }}>
              <img src="/icons/check.png" alt="check" style={{ width: 16, height: 16 }} />{l}
              </div>
              ))}
            </div>
            <button className="btn btn-orange" onClick={() => navigate("/register")} style={btnO({ width: "100%", padding: 14, fontSize: 13, borderRadius: 14 })}>
              j'arrête de réfléchir
            </button>
            <p style={{ textAlign: "center", ...inst, fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 10 }}>sans engagement · annulable à tout moment</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ background: "var(--cream2)", padding: "100px 60px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <span style={slabel}>foire aux questions</span>
          <h2 style={bigH({ fontSize: "clamp(30px,4vw,50px)", marginBottom: 48 })}>t'as des questions ?</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="faq-row" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ borderRadius: 18, overflow: "hidden", textAlign: "left", background: "var(--white)", border: "1px solid rgba(45,45,45,.09)", boxShadow: openFaq === i ? "0 10px 40px rgba(0,0,0,.09)" : "0 3px 12px rgba(0,0,0,.05)" }}>
                <div style={{ padding: "18px 24px", fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, color: openFaq === i ? R : D, fontWeight: 500, ...inst }}>
                  {item.q}
                  <span style={{ fontSize: 18, transition: "transform .25s", transform: openFaq === i ? "rotate(180deg)" : "none", flexShrink: 0, color: "rgba(45,45,45,.3)" }}>⌄</span>
                </div>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 20px", ...inst, fontSize: 13, color: "rgba(45,45,45,.56)", lineHeight: 1.8 }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "80px 60px", textAlign: "center", background: "var(--white)" }}>
        <div className="float" style={{ marginBottom: 20 }}>
          <img src="/icons/shrim.png" alt="" style={{ width: 72, height: 72, objectFit: "contain" }} onError={e => e.target.style.opacity = "0"} />
        </div>
        <h2 style={bigH({ fontSize: "clamp(28px,4.5vw,52px)", marginBottom: 12 })}>
          t'as assez réfléchi<br />
          à <span style={{ color: R }}>quoi manger.</span>
        </h2>
        <p style={{ ...inst, fontSize: 15, color: "rgba(45,45,45,.5)", maxWidth: 320, margin: "0 auto 32px", lineHeight: 1.75 }}>
          planifie ta première semaine en 5 minutes. gratuitement.
        </p>
        <div className="cta-btns" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-orange" onClick={() => navigate("/register")} style={btnO({ fontSize: 15, padding: "16px 40px" })}>
            commencer maintenant — c'est gratuit
          </button>
          <button className="btn btn-dark" onClick={() => navigate("/login")} style={btnG({ fontSize: 14, padding: "16px 28px", background: D, color: "#fff", borderRadius: 100 })}>
            j'ai déjà un compte
          </button>
        </div>
        {friction}
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(45,45,45,.08)", background: "var(--cream)", ...inst, fontSize: 12, color: "rgba(45,45,45,.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon src="shrim.png" size={18} />
          <span style={{ ...syne, fontWeight: 700, color: D }}>shrimply</span>
          <span>— projet indépendant, fait avec amour <img src="/icons/love.png" alt="❤️" style={{ width: 14, height: 14, objectFit: "contain", verticalAlign: "middle" }} onError={e => e.target.replaceWith(document.createTextNode("❤️"))} /></span>
        </div>
        <span>© 2026 shrimply</span>
      </footer>

    </div>
  )
}
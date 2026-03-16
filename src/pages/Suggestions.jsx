import { useState, useEffect } from "react"
import { supabase } from "../supabase"

const TYPES = [
  { value: "bug", label: "Bug", icon: "🐛", bg: "#2d0a0a", color: "#fca5a5", border: "rgba(239,68,68,0.3)" },
  { value: "feature", label: "Amélioration", icon: "✨", bg: "#0a1a2d", color: "#93c5fd", border: "rgba(59,130,246,0.3)" },
  { value: "idea", label: "Idée", icon: "💡", bg: "#2d2a0a", color: "#fde68a", border: "rgba(234,179,8,0.3)" },
]

const STATUS = {
  open: { label: "ouvert", bg: "#2d2d2d", color: "rgba(255,255,255,0.5)" },
  in_progress: { label: "en cours", bg: "#0a1a2d", color: "#93c5fd" },
  done: { label: "terminé", bg: "#0a2d1a", color: "#6ee7b7" },
  rejected: { label: "refusé", bg: "#2d0a0a", color: "#fca5a5" },
}

const ROADMAP = [
  { icon: "👨‍🍳", title: "Calculateur de portions", desc: "Adapter automatiquement les quantités pour 2, 4 ou 6 personnes." },
  { icon: "🔄", title: "Substituts d'ingrédients", desc: "L'IA propose des alternatives si un ingrédient manque." },
  { icon: "🥦", title: "Recettes avec les ingrédients du frigo", desc: "Trouver des recettes faisables avec ce que tu as déjà." },
  { icon: "🗺️", title: "Voir les drive / magasins proches", desc: "Trouver où acheter les ingrédients près de chez soi." },
]

const inputStyle = {
  width: "100%", borderRadius: 10, padding: "10px 14px",
  fontSize: 13, outline: "none",
  background: "#111111", border: "1.5px solid rgba(255,255,255,0.06)",
  color: "#ffffff", fontFamily: "Poppins, sans-serif", fontWeight: 500,
  letterSpacing: "-0.05em", boxSizing: "border-box",
}

const btnBase = {
  fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13,
  letterSpacing: "-0.05em", border: "none", cursor: "pointer",
  borderRadius: 10, transition: "transform 0.2s ease",
}

export default function Suggestions() {
  const [tickets, setTickets] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState("feature")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    if (data) setTickets(data)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("tickets").insert({ user_id: user.id, type, title, description })
    if (error) { console.error(error); setLoading(false); return }
    setTitle(""); setDescription(""); setType("feature")
    setShowForm(false); setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    await fetchData()
    setLoading(false)
  }

  return (
    <div style={{ padding: "20px 24px", backgroundColor: "#111111", minHeight: "100%", fontFamily: "Poppins, sans-serif" }}>

      {success && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, backgroundColor: "#34d399", color: "#064e3b", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          ✅ ticket envoyé, merci !
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/icons/rainbow.png" alt="" style={{ width: 24, height: 24 }} onError={e => e.target.style.display="none"} />
          suggestions & bugs
        </h1>
        <p className="text-light" style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          consulte la roadmap et soumets tes idées ou signale un bug
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* COLONNE GAUCHE — Roadmap */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🗺️ roadmap
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ROADMAP.map((item, i) => (
              <div key={i} style={{ backgroundColor: "#091718", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{item.title}</h3>
                  <p className="text-light" style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{item.desc}</p>
                </div>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, backgroundColor: "#2d2d2d", color: "rgba(255,255,255,0.4)", padding: "3px 10px", borderRadius: 20 }}>à venir</span>
              </div>
            ))}
          </div>
        </div>

        {/* COLONNE DROITE — Soumettre */}
        <div style={{ width: 340, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              🎫 soumettre
            </h2>
            <button onClick={() => setShowForm(!showForm)}
              style={{ ...btnBase, padding: "7px 14px", backgroundColor: "#f3501e", color: "#ffffff", fontSize: 12 }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
            >+ nouveau ticket</button>
          </div>

          {/* Formulaire */}
          {showForm && (
            <div style={{ backgroundColor: "#091718", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>nouveau ticket</h3>

              {/* Types */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                      fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em",
                      border: `1.5px solid ${type === t.value ? t.border : "rgba(255,255,255,0.08)"}`,
                      backgroundColor: type === t.value ? t.bg : "transparent",
                      color: type === t.value ? t.color : "rgba(255,255,255,0.4)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <input
                style={inputStyle}
                placeholder="titre court et clair *"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />

              <textarea
                style={{ ...inputStyle, resize: "none", minHeight: 90 }}
                placeholder="décris le problème ou l'idée *"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowForm(false)}
                  style={{ ...btnBase, flex: 1, padding: "10px", backgroundColor: "#2d2d2d", color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
                >annuler</button>
                <button onClick={handleSubmit} disabled={!title || !description || loading}
                  style={{ ...btnBase, flex: 1, padding: "10px", backgroundColor: "#f3501e", color: "#ffffff", opacity: !title || !description || loading ? 0.4 : 1, cursor: !title || !description ? "not-allowed" : "pointer" }}
                  onMouseEnter={e => { if (title && description) e.currentTarget.style.transform = "scale(1.03)" }}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                  onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
                >{loading ? "envoi..." : "envoyer"}</button>
              </div>
            </div>
          )}

          {/* Tickets */}
          {tickets.length > 0 ? (
            <div>
              <p className="text-light" style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                tes tickets ({tickets.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tickets.map(ticket => {
                  const typeInfo = TYPES.find(t => t.value === ticket.type)
                  const statusInfo = STATUS[ticket.status] || STATUS.open
                  return (
                    <div key={ticket.id} style={{ backgroundColor: "#091718", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, backgroundColor: typeInfo?.bg, color: typeInfo?.color, border: `1px solid ${typeInfo?.border}` }}>
                          {typeInfo?.icon} {typeInfo?.label}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{ticket.title}</h3>
                      <p className="text-light" style={{ margin: "0 0 6px", fontSize: 12, color: "rgba(255,255,255,0.4)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {ticket.description}
                      </p>
                      <span className="text-light" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                        {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : !showForm && (
            <div style={{ backgroundColor: "#091718", borderRadius: 12, padding: 32, textAlign: "center", border: "1.5px dashed rgba(255,255,255,0.08)" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
                aucun ticket soumis
              </p>
              <button onClick={() => setShowForm(true)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#f3501e", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "-0.05em" }}>
                soumettre une idée ou un bug →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
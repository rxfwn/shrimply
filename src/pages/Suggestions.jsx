import { useState, useEffect } from "react"
import { supabase } from "../supabase"

const TYPES = [
  { value: "bug", label: "🐛 Bug", color: "bg-red-100 text-red-600 border-red-200" },
  { value: "feature", label: "✨ Amélioration", color: "bg-blue-100 text-blue-600 border-blue-200" },
  { value: "idea", label: "💡 Idée", color: "bg-yellow-100 text-yellow-600 border-yellow-200" },
]

const STATUS = {
  open: { label: "Ouvert", color: "bg-zinc-100 text-zinc-500" },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-600" },
  done: { label: "Terminé", color: "bg-green-100 text-green-600" },
  rejected: { label: "Refusé", color: "bg-red-100 text-red-400" },
}

const ROADMAP = [
  { icon: "🖨️", title: "Bouton \"Imprimer la recette\"", desc: "Pour avoir sa recette sous les yeux en cuisine." },
  { icon: "📝", title: "Envoyer la liste dans ses notes / TODO", desc: "Pour ne rien oublier lors des courses." },
  { icon: "👨‍🍳", title: "Calculateur de portions", desc: "Ajuste automatiquement les quantités pour 2, 4, 6 personnes… comme Marmiton !" },
  { icon: "💰", title: "Calcul du coût de la recette", desc: "Estimation automatique du prix avec l'aide de l'IA." },
  { icon: "📸", title: "Ajouter des photos aux recettes", desc: "Pour rendre la cuisine plus visuelle et inspirante." },
  { icon: "🥦", title: "Chercher les recettes avec ce qu'il y a dans le frigo", desc: "Fini le gaspillage, cuisine avec ce que tu as !" },
  { icon: "❤️", title: "Favoris et collections", desc: "Crée ta propre bibliothèque de recettes préférées." },
  { icon: "📤", title: "Partager sa recette", desc: "Avec ses amis ou sur les réseaux sociaux." },
  { icon: "🔄", title: "Substituts d'ingrédients", desc: "Propose des alternatives si tu n'as pas tout sous la main." },
]

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

    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (data) setTickets(data)
  }

  const handleSubmit = async () => {
  if (!title.trim() || !description.trim()) return
  setLoading(true)
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from("tickets").insert({
    user_id: user.id,
    type,
    title,
    description,
  })

  if (error) {
    console.error("Erreur ticket:", error)
    setLoading(false)
    return
  }

  setTitle(""); setDescription(""); setType("feature")
  setShowForm(false)
  setSuccess(true)
  setTimeout(() => setSuccess(false), 3000)
  await fetchData()
  setLoading(false)
}

  return (
    <div className="p-6 h-full">

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ Ticket envoyé, merci !
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-brand-cream">🌈 Suggestions & bugs</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Consulte la roadmap et soumets tes idées ou signale un bug !</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* COLONNE GAUCHE — Roadmap */}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-3">🗺️ Roadmap</h2>
          <div className="flex flex-col gap-3">
            {ROADMAP.map((item, i) => (
              <div key={i} className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-brand-cream">{item.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
                </div>
                <span className="flex-shrink-0 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-400 px-2 py-1 rounded-full">À venir</span>
              </div>
            ))}
          </div>
        </div>

        {/* COLONNE DROITE — Soumettre */}
        <div style={{ width: "360px", flexShrink: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">🎫 Soumettre</h2>
            <button onClick={() => setShowForm(!showForm)}
              className="bg-brand-orange hover:bg-brand-orange/80 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition">
              + Nouveau ticket
            </button>
          </div>

          {/* Formulaire */}
          {showForm && (
            <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-4 mb-4 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-brand-cream mb-3">Nouveau ticket</h3>

              <div className="flex gap-1.5 mb-3 flex-wrap">
                {TYPES.map(t => (
                  <button key={t.value} onClick={() => setType(t.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${type === t.value ? t.color : "bg-white dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 text-zinc-400"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <input
                className="w-full rounded-xl px-3 py-2 text-sm outline-none transition border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white focus:border-brand-blue mb-2"
                placeholder="Titre court et clair *"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />

              <textarea
                className="w-full rounded-xl px-3 py-2 text-sm outline-none transition border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white focus:border-brand-blue resize-none mb-3"
                placeholder="Décris le problème ou l'idée *"
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />

              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 py-2 rounded-xl text-xs font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition">
                  Annuler
                </button>
                <button onClick={handleSubmit} disabled={!title || !description || loading}
                  className="flex-1 bg-brand-orange hover:bg-brand-orange/80 text-white py-2 rounded-xl text-xs font-medium transition disabled:opacity-50">
                  {loading ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </div>
          )}

          {/* Tickets soumis par l'utilisateur */}
          {tickets.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-2">Tes tickets envoyés ({tickets.length})</p>
              <div className="flex flex-col gap-2">
                {tickets.map(ticket => {
                  const typeInfo = TYPES.find(t => t.value === ticket.type)
                  const statusInfo = STATUS[ticket.status] || STATUS.open
                  return (
                    <div key={ticket.id} className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-3 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${typeInfo?.color}`}>{typeInfo?.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      <h3 className="text-xs font-semibold text-zinc-900 dark:text-brand-cream mb-0.5">{ticket.title}</h3>
                      <p className="text-xs text-zinc-400 line-clamp-2">{ticket.description}</p>
                      <span className="text-xs text-zinc-300 mt-1 block">
                        {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Aucun ticket — message discret */}
          {tickets.length === 0 && !showForm && (
            <div className="bg-white dark:bg-zinc-800 border border-dashed border-gray-200 dark:border-zinc-700 rounded-2xl p-6 text-center">
              <p className="text-zinc-400 text-sm">Tu n'as pas encore soumis de ticket</p>
              <button onClick={() => setShowForm(true)}
                className="mt-2 text-xs text-brand-orange hover:underline">
                Soumettre une idée ou un bug →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from "react"
import { supabase } from "../supabase"

const CATEGORIES = ["🥩 Viandes", "🐟 Poissons", "🥛 Laitages", "🥦 Légumes", "🍎 Fruits", "🧀 Fromages", "🥚 Œufs", "🧂 Épicerie", "🧊 Surgelés", "🍺 Boissons"]

function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  return diff
}

function ExpiryBadge({ days }) {
  if (days === null) return null
  if (days < 0) return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Expiré</span>
  if (days === 0) return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Expire aujourd'hui</span>
  if (days <= 2) return <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Expire dans {days}j</span>
  if (days <= 5) return <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full font-medium">Expire dans {days}j</span>
  return <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">{days}j restants</span>
}

export default function Fridge() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from("fridge")
      .select("*")
      .eq("user_id", user.id)
      .order("expiry_date", { ascending: true, nullsFirst: false })
    if (data) setItems(data)
  }

  const handleSubmit = async () => {
    if (!name) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("fridge").insert({
      user_id: user.id,
      name,
      quantity: parseFloat(quantity) || null,
      unit: unit || null,
      expiry_date: expiryDate || null,
      category: category || null,
    })
    setName(""); setQuantity(""); setUnit(""); setExpiryDate(""); setCategory("")
    setShowForm(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    await fetchItems()
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await supabase.from("fridge").delete().eq("id", id)
    await fetchItems()
  }

  const expiringSoon = items.filter(i => {
    const days = getDaysUntilExpiry(i.expiry_date)
    return days !== null && days <= 3
  })

  const byCategory = items.reduce((acc, item) => {
    const cat = item.category || "🗂 Autres"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-2xl">

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          ✅ Article ajouté !
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">🧊 Mon frigo</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition"
        >
          + Ajouter
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-5 mb-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Nouvel article</h2>
          <div className="flex flex-col gap-3">
            <input
              className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400"
              placeholder="Nom de l'aliment *"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 flex-1"
                placeholder="Quantité"
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
              <input
                className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400 flex-1"
                placeholder="Unité (g, ml, pcs...)"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              />
            </div>
            <input
              className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400"
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
            />
            <select
              className="border border-gray-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white rounded-lg p-2.5 text-sm outline-none focus:border-orange-400"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">Catégorie (optionnel)</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 text-zinc-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name || loading}
                className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition disabled:opacity-50"
              >
                {loading ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerte expiration */}
      {expiringSoon.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-orange-700 mb-2">⚠️ Expire bientôt</p>
          <div className="flex flex-col gap-1">
            {expiringSoon.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm text-orange-700">{item.name}</span>
                <ExpiryBadge days={getDaysUntilExpiry(item.expiry_date)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste par catégorie */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl p-8 text-center">
          <p className="text-zinc-400 text-sm">Ton frigo est vide — ajoute des aliments !</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(byCategory).map(([cat, catItems]) => (
            <div key={cat} className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 border-b border-gray-50 dark:border-zinc-700">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{cat} · {catItems.length}</span>
              </div>
              {catItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-zinc-700 last:border-0 group">
                  <div className="flex-1">
                    <span className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">{item.name}</span>
                    {item.quantity && (
                      <span className="text-xs text-zinc-400 ml-2">{item.quantity} {item.unit || ""}</span>
                    )}
                  </div>
                  <ExpiryBadge days={getDaysUntilExpiry(item.expiry_date)} />
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-zinc-200 dark:text-zinc-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-base leading-none ml-2"
                  >×</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
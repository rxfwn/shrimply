import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabase"

// ===============================
// CATÉGORIES & MOTS-CLÉS
// ===============================
const CATEGORIES = [
  { id: "legumes_fruits", label: "Fruits & Légumes", icon: "🥦" },
  { id: "viandes_poissons", label: "Viandes & Poissons", icon: "🥩" },
  { id: "frais", label: "Frais", icon: "🧀" },
  { id: "epicerie", label: "Épicerie", icon: "🥫" },
  { id: "boulangerie", label: "Boulangerie & Sucré", icon: "🧁" },
  { id: "hygiene", label: "Hygiène & Entretien", icon: "🧴" },
  { id: "autres", label: "Autres", icon: "🛒" },
]

const CATEGORY_KEYWORDS = {
  legumes_fruits: [
    "tomate", "carotte", "oignon", "ail", "poireau", "courgette", "aubergine",
    "poivron", "concombre", "salade", "laitue", "epinard", "brocoli", "chou",
    "fenouil", "navet", "betterave", "radis", "panais", "patate", "pomme de terre",
    "avocat", "citron", "orange", "pomme", "poire", "banane", "fraise", "framboise",
    "mangue", "ananas", "peche", "abricot", "cerise", "raisin", "melon", "pasteque",
    "pamplemousse", "kiwi", "figue", "myrtille", "mache", "roquette", "basilic",
    "persil", "coriandre", "menthe", "ciboulette", "thym", "romarin", "aneth",
    "echalote", "gingembre", "champignon", "artichaut", "asperge", "endive",
  ],
  viandes_poissons: [
    "poulet", "boeuf", "porc", "veau", "agneau", "dinde", "canard", "lapin",
    "saumon", "thon", "cabillaud", "truite", "sardine", "crevette", "moule",
    "huitre", "homard", "calmar", "merlan", "sole", "dorade", "bar", "lieu",
    "jambon", "lardons", "bacon", "chorizo", "saucisse", "merguez", "steak",
    "escalope", "filet", "cuisse", "blanc", "viande", "poisson",
  ],
  frais: [
    "lait", "creme", "beurre", "fromage", "yaourt", "oeuf", "oeufs",
    "feta", "chevre", "camembert", "brie", "roquefort", "comte", "parmesan",
    "gruyere", "mozzarella", "ricotta", "mascarpone", "emmental", "raclette",
    "creme fraiche", "fromage blanc", "skyr", "kefir", "lait fermente",
    "charcuterie", "pate de campagne", "rillette", "terrine",
  ],
  epicerie: [
    "riz", "pate", "farine", "semoule", "boulgour", "quinoa", "lentille",
    "pois chiche", "haricot", "huile", "vinaigre", "sauce", "tomate concassee",
    "conserve", "boite", "bouillon", "moutarde", "ketchup", "mayonnaise",
    "sel", "poivre", "epice", "curry", "cumin", "paprika", "curcuma",
    "cannelle", "noix de muscade", "herbe", "laurier", "origan", "pesto",
    "cafe", "the", "infusion", "chocolat", "cacao", "sucre", "miel",
    "confiture", "cereale", "muesli", "granola", "chips", "biscuit apero",
    "eau", "jus", "sirop", "soda", "biere", "vin", "alcool",
  ],
  boulangerie: [
    "pain", "baguette", "brioche", "croissant", "pain de mie", "bun",
    "farine", "levure", "sucre glace", "vanille", "poudre d amande",
    "gateau", "tarte", "cake", "muffin", "cookie", "biscuit", "chocolat noir",
    "praline", "noisette", "amande", "noix", "raisin sec", "cranberry",
  ],
  hygiene: [
    "savon", "shampoing", "gel douche", "dentifrice", "brosse", "rasoir",
    "coton", "serviette hygienique", "tampon", "couche", "lingette",
    "lessive", "liquide vaisselle", "eponge", "papier toilette", "sopalin",
    "sac poubelle", "film plastique", "papier aluminium", "essuie tout",
  ],
}

function normalizeStr(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function assignCategory(name) {
  const normalized = normalizeStr(name)
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => normalized.includes(normalizeStr(k)))) return catId
  }
  return "autres"
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date) {
  return date.toISOString().split("T")[0]
}

// ===============================
// MODAL AJOUT
// ===============================
function AddItemModal({ onClose, onAdd }) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    await onAdd({ name: name.trim(), quantity: quantity || null, unit: unit || null })
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-700">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Ajouter un article</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Nom *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Ex : Tomates cerises"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Quantité</label>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Ex : 500"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1 block">Unité</label>
              <input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Ex : g, ml, pièce"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          {name.trim() && (
            <p className="text-xs text-zinc-400 italic">
              Sera classé dans : <span className="font-semibold text-orange-500">
                {CATEGORIES.find(c => c.id === assignCategory(name))?.icon}{" "}
                {CATEGORIES.find(c => c.id === assignCategory(name))?.label}
              </span>
            </p>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={!name.trim() || submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition disabled:opacity-50">
            {submitting ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===============================
// CARTE CATÉGORIE avec drag & drop
// ===============================
function CategoryCard({ cat, onToggle, onDelete, onMoveItem, allCategories, onDragOver, onDrop, isDragTarget }) {
  const [dragOverItem, setDragOverItem] = useState(null)

  const handleDragStart = (e, item) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("itemId", item.id)
    e.dataTransfer.setData("fromCat", cat.id)
  }

  return (
    <div
      className={`bg-white dark:bg-zinc-800 border rounded-2xl overflow-hidden shadow-sm transition-all ${
        isDragTarget
          ? "border-orange-400 ring-2 ring-orange-200 dark:ring-orange-900/40"
          : "border-gray-100 dark:border-zinc-700"
      }`}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={e => {
        e.preventDefault()
        const itemId = e.dataTransfer.getData("itemId")
        const fromCat = e.dataTransfer.getData("fromCat")
        if (fromCat !== cat.id) onDrop(itemId, cat.id)
        setDragOverItem(null)
      }}
    >
      {/* En-tête */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-50 dark:border-zinc-700/60">
        <span className="text-base">{cat.icon}</span>
        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex-1">{cat.label}</span>
        <span className="text-[11px] font-bold text-white bg-orange-400 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{cat.items.length}</span>
      </div>

      {/* Items */}
      {cat.items.map(item => (
        <div
          key={item.id}
          draggable
          onDragStart={e => handleDragStart(e, item)}
          onDragEnter={() => setDragOverItem(item.id)}
          onDragLeave={() => setDragOverItem(null)}
          className={`flex items-center gap-2 px-3 py-2.5 border-b border-zinc-50 dark:border-zinc-700/40 last:border-0 group transition-colors cursor-grab active:cursor-grabbing select-none
            ${dragOverItem === item.id ? "bg-orange-50 dark:bg-orange-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-700/30"}`}
        >
          {/* Drag handle */}
          <span className="text-zinc-300 dark:text-zinc-600 text-xs opacity-0 group-hover:opacity-100 transition">⠿</span>

          {/* Checkbox */}
          <button
            onClick={() => onToggle(item)}
            className="w-[18px] h-[18px] rounded-full border-2 border-gray-200 dark:border-zinc-600 hover:border-orange-400 hover:bg-orange-50 transition flex-shrink-0"
          />

          {/* Nom */}
          <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200 leading-tight min-w-0 truncate">{item.name}</span>

          {/* Quantité */}
          {item.quantity && (
            <span className="text-[11px] text-zinc-400 font-medium flex-shrink-0">{item.quantity}{item.unit ? ` ${item.unit}` : ""}</span>
          )}

          {/* Supprimer */}
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition text-lg leading-none opacity-0 group-hover:opacity-100 flex-shrink-0"
          >×</button>
        </div>
      ))}
    </div>
  )
}

// ===============================
// COMPOSANT PRINCIPAL
// ===============================
export default function Shopping() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [dragTargetCat, setDragTargetCat] = useState(null)

  const monday = getMonday(new Date())
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const weekLabel = `${monday.getDate()} — ${sunday.getDate()} ${sunday.toLocaleString("fr-FR", { month: "long" })} ${sunday.getFullYear()}`

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from("shopping_list").select("*")
      .eq("user_id", user.id)
      .eq("week_start", formatDate(monday))
      .order("checked")
    if (data) setItems(data)
    setLoading(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: meals } = await supabase
      .from("meal_plan").select("recipe_id")
      .eq("user_id", user.id)
      .gte("date", formatDate(monday))
      .lte("date", formatDate(sunday))

    if (!meals || meals.length === 0) {
      setGenerating(false)
      return alert("Aucun repas planifié cette semaine !")
    }

    const recipeCount = {}
    meals.forEach(m => { recipeCount[m.recipe_id] = (recipeCount[m.recipe_id] || 0) + 1 })
    const recipeIds = Object.keys(recipeCount)

    const { data: ingredients } = await supabase
      .from("ingredients").select("*").in("recipe_id", recipeIds)

    if (!ingredients || ingredients.length === 0) {
      setGenerating(false)
      return alert("Aucun ingrédient trouvé pour ces recettes !")
    }

    const merged = {}
    ingredients.forEach(ing => {
      const key = ing.name.toLowerCase().trim()
      const occurrences = recipeCount[ing.recipe_id] || 1
      const totalQty = (ing.quantity || 0) * occurrences
      if (merged[key]) merged[key].quantity = (merged[key].quantity || 0) + totalQty
      else merged[key] = { name: ing.name, quantity: totalQty, unit: ing.unit }
    })

    await supabase.from("shopping_list").delete()
      .eq("user_id", user.id).eq("week_start", formatDate(monday))

    await supabase.from("shopping_list").insert(
      Object.values(merged).map(item => ({
        user_id: user.id,
        name: item.name,
        quantity: item.quantity || null,
        unit: item.unit || null,
        checked: false,
        week_start: formatDate(monday),
        category: assignCategory(item.name),
      }))
    )

    await fetchItems()
    setGenerating(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleAddItem = async ({ name, quantity, unit }) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("shopping_list").insert({
      user_id: user.id, name,
      quantity: quantity ? parseFloat(quantity) : null,
      unit: unit || null,
      checked: false,
      week_start: formatDate(monday),
      category: assignCategory(name),
    })
    await fetchItems()
  }

  const toggleChecked = async (item) => {
    // Optimistic update instantané
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
    await supabase.from("shopping_list").update({ checked: !item.checked }).eq("id", item.id)
  }

  const deleteItem = async (id) => {
    await supabase.from("shopping_list").delete().eq("id", id)
    await fetchItems()
  }

  const moveItem = async (itemId, newCategory) => {
    await supabase.from("shopping_list").update({ category: newCategory }).eq("id", itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, category: newCategory } : i))
    setDragTargetCat(null)
  }

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: unchecked.filter(i => (i.category || assignCategory(i.name)) === cat.id)
  })).filter(cat => cat.items.length > 0)

  const totalItems = items.length

  return (
    <div className="p-4 md:p-6">

      {showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />
      )}

      {success && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold">
          ✅ Liste générée !
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">🛒 Courses</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Semaine du {weekLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"
          >+ Ajouter</button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50"
          >{generating ? "⌛ Génération..." : "✨ Générer"}</button>
        </div>
      </div>

      {loading ? (
        <div className="text-zinc-400 text-sm">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl p-10 text-center max-w-sm">
          <p className="text-3xl mb-3">🛍️</p>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Aucun article cette semaine</p>
          <p className="text-zinc-400 text-xs">Génère depuis ton planning ou ajoute des articles manuellement.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Masonry CSS columns — cards à hauteur naturelle */}
          {grouped.length > 0 && (
            <div
              onDragEnd={() => setDragTargetCat(null)}
              style={{ columnCount: "auto", columnWidth: "280px", columnGap: "16px" }}
            >
              {grouped.map(cat => (
                <div key={cat.id} style={{ breakInside: "avoid", marginBottom: "16px" }}>
                  <CategoryCard
                    cat={cat}
                    onToggle={toggleChecked}
                    onDelete={deleteItem}
                    onMoveItem={moveItem}
                    allCategories={CATEGORIES}
                    isDragTarget={dragTargetCat === cat.id}
                    onDragOver={() => setDragTargetCat(cat.id)}
                    onDrop={moveItem}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Articles cochés */}
          {checked.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm opacity-70">
              <div className="px-4 py-3 border-b border-gray-50 dark:border-zinc-700 flex items-center gap-2">
                <span>✅</span>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex-1">Dans le panier</span>
                <span className="text-[11px] font-bold text-white bg-zinc-300 dark:bg-zinc-600 rounded-full w-5 h-5 flex items-center justify-center">{checked.length}</span>
              </div>
              <div style={{ columnCount: "auto", columnWidth: "280px" }}>
                {checked.map(item => (
                  <div key={item.id} style={{ breakInside: "avoid" }} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-50 dark:border-zinc-700/40 group hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors">
                    <button onClick={() => toggleChecked(item)} className="w-[18px] h-[18px] rounded-full border-2 border-orange-300 bg-orange-400 flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </button>
                    <span className="flex-1 text-sm text-zinc-400 line-through">{item.name}</span>
                    {item.quantity && <span className="text-[11px] text-zinc-300">{item.quantity}{item.unit ? ` ${item.unit}` : ""}</span>}
                    <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-400 transition text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"

const CATEGORIES = [
  { id: "legumes_fruits", label: "Fruits & Légumes", icon: "/icons/herb.webp" },
  { id: "viandes_poissons", label: "Viandes & Poissons", icon: "/icons/meat.webp" },
  { id: "frais", label: "Frais", icon: "/icons/cheese.webp" },
  { id: "epicerie", label: "Épicerie", icon: "/icons/falafel.webp" },
  { id: "boulangerie", label: "Boulangerie & Sucré", icon: "/icons/shortcake.webp" },
  { id: "hygiene", label: "Hygiène & Entretien", icon: "/icons/feather.webp" },
  { id: "autres", label: "Autres", icon: "/icons/kart.webp" },
]

const CATEGORY_KEYWORDS = {
  legumes_fruits: ["tomate","carotte","oignon","ail","poireau","courgette","aubergine","poivron","concombre","salade","laitue","epinard","brocoli","chou","fenouil","navet","betterave","radis","panais","patate","pomme de terre","avocat","citron","orange","pomme","poire","banane","fraise","framboise","mangue","ananas","peche","abricot","cerise","raisin","melon","pasteque","pamplemousse","kiwi","figue","myrtille","mache","roquette","basilic","persil","coriandre","menthe","ciboulette","thym","romarin","aneth","echalote","gingembre","champignon","artichaut","asperge","endive"],
  viandes_poissons: ["poulet","boeuf","porc","veau","agneau","dinde","canard","lapin","saumon","thon","cabillaud","truite","sardine","crevette","moule","huitre","homard","calmar","merlan","sole","dorade","bar","lieu","jambon","lardons","bacon","chorizo","saucisse","merguez","steak","escalope","filet","cuisse","blanc","viande","poisson"],
  frais: ["lait","creme","beurre","fromage","yaourt","oeuf","oeufs","feta","chevre","camembert","brie","roquefort","comte","parmesan","gruyere","mozzarella","ricotta","mascarpone","emmental","raclette","creme fraiche","fromage blanc","skyr","kefir","charcuterie","pate de campagne","rillette","terrine"],
  epicerie: ["riz","pate","farine","semoule","boulgour","quinoa","lentille","pois chiche","haricot","huile","vinaigre","sauce","tomate concassee","conserve","boite","bouillon","moutarde","ketchup","mayonnaise","sel","poivre","epice","curry","cumin","paprika","curcuma","cannelle","noix de muscade","herbe","laurier","origan","pesto","cafe","the","infusion","chocolat","cacao","sucre","miel","confiture","cereale","muesli","granola","chips","biscuit apero","eau","jus","sirop","soda","biere","vin","alcool"],
  boulangerie: ["pain","baguette","brioche","croissant","pain de mie","bun","farine","levure","sucre glace","vanille","poudre d amande","gateau","tarte","cake","muffin","cookie","biscuit","chocolat noir","praline","noisette","amande","noix","raisin sec","cranberry"],
  hygiene: ["savon","shampoing","gel douche","dentifrice","brosse","rasoir","coton","serviette hygienique","tampon","couche","lingette","lessive","liquide vaisselle","eponge","papier toilette","sopalin","sac poubelle","film plastique","papier aluminium","essuie tout"],
}

function normalizeStr(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
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

function AddItemModal({ onClose, onAdd, isDay }) {
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const surface = isDay ? "#FFFFFF" : "#091718"
  const surfaceBorder = isDay ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)"
  const divider = isDay ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)"
  const textPrimary = isDay ? "#111111" : "#ffffff"
  const closeColor = isDay ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)"
  const cancelBg = isDay ? "#EDE8DF" : "#2d2d2d"
  const cancelColor = isDay ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)"

  const inputStyle = {
    width: "100%", borderRadius: 10, padding: "10px 14px",
    fontSize: 13, outline: "none",
    background: isDay ? "#F5F0E8" : "#111111",
    border: isDay ? "1.5px solid rgba(0,0,0,0.07)" : "none",
    color: isDay ? "#111111" : "#666666",
    fontFamily: "Poppins, sans-serif", fontWeight: 500,
    letterSpacing: "-0.05em", boxSizing: "border-box",
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    await onAdd({ name: name.trim(), quantity: quantity || null, unit: unit || null })
    setSubmitting(false)
    onClose()
  }

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
      <div style={{ backgroundColor: surface, borderRadius: 16, width: "100%", maxWidth: 400, border: surfaceBorder }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: divider }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>ajouter un article</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: closeColor, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="ex : tomates cerises" style={inputStyle} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="quantité" style={inputStyle} />
            <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="unité" style={inputStyle} />
          </div>
          {name.trim() && (
            <p style={{ margin: 0, fontSize: 11, color: isDay ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)", fontWeight: 500 }}>
              classé dans : <span style={{ color: "#d57bff" }}>
                {CATEGORIES.find(c => c.id === assignCategory(name))?.label}
              </span>
            </p>
          )}
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "12px", borderRadius: 10, backgroundColor: cancelBg, border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, color: cancelColor, letterSpacing: "-0.05em" }}>
            annuler
          </button>
          <button onClick={handleSubmit} disabled={!name.trim() || submitting}
            style={{ flex: 1, padding: "12px", borderRadius: 10, backgroundColor: "#d57bff", border: "none", cursor: !name.trim() ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, color: "#ffffff", letterSpacing: "-0.05em", opacity: !name.trim() ? 0.4 : 1, transition: "transform 0.2s ease" }}
            onMouseEnter={e => { if (name.trim()) e.currentTarget.style.transform = "scale(1.03)" }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
            onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)" }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1.03)" }}
          >
            {submitting ? "ajout..." : "ajouter"}
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryCard({ cat, onToggle, onDelete, isDragTarget, onDragOver, onDrop, isDay }) {
  const [dragOverItem, setDragOverItem] = useState(null)

  const surface = isDay ? "#FFFFFF" : "#091718"
  const surfaceBorder = isDragTarget
    ? "1.5px solid #d57bff"
    : isDay ? "1.5px solid rgba(0,0,0,0.07)" : "1.5px solid rgba(255,255,255,0.06)"
  const divider = isDay ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)"
  const rowDivider = isDay ? "1px solid rgba(0,0,0,0.04)" : "1px solid rgba(255,255,255,0.04)"
  const headerLabel = isDay ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)"
  const textPrimary = isDay ? "#111111" : "#ffffff"
  const textQty = isDay ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)"
  const deleteBtnColor = isDay ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"
  const checkBorderColor = isDay ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"

  const handleDragStart = (e, item) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("itemId", item.id)
    e.dataTransfer.setData("fromCat", cat.id)
  }

  return (
    <div
      style={{ backgroundColor: surface, borderRadius: 12, overflow: "hidden", border: surfaceBorder, transition: "border-color 0.15s", marginBottom: 12, breakInside: "avoid" }}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={e => {
        e.preventDefault()
        const itemId = e.dataTransfer.getData("itemId")
        const fromCat = e.dataTransfer.getData("fromCat")
        if (fromCat !== cat.id) onDrop(itemId, cat.id)
        setDragOverItem(null)
      }}
    >
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: divider }}>
        <img src={cat.icon} alt="" style={{ width: 16, height: 16 }} onError={e => e.target.style.display = "none"} />
        <span style={{ fontSize: 11, fontWeight: 700, color: headerLabel, textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 }}>{cat.label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#130b2d", backgroundColor: "#d57bff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{cat.items.length}</span>
      </div>
      {cat.items.map(item => (
        <div key={item.id} draggable onDragStart={e => handleDragStart(e, item)} onDragEnter={() => setDragOverItem(item.id)} onDragLeave={() => setDragOverItem(null)}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: rowDivider, backgroundColor: dragOverItem === item.id ? "rgba(213,123,255,0.08)" : "transparent", cursor: "grab", transition: "background-color 0.1s" }}>
          <button onClick={() => onToggle(item)}
            style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${checkBorderColor}`, background: "none", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#d57bff"}
            onMouseLeave={e => e.currentTarget.style.borderColor = checkBorderColor}
          />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
          {item.quantity && <span style={{ fontSize: 11, color: textQty, fontWeight: 500, flexShrink: 0 }}>{item.quantity}{item.unit ? ` ${item.unit}` : ""}</span>}
          <button onClick={() => onDelete(item.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: deleteBtnColor, fontSize: 18, lineHeight: 1, flexShrink: 0, padding: 0, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
            onMouseLeave={e => e.currentTarget.style.color = deleteBtnColor}
          >×</button>
        </div>
      ))}
    </div>
  )
}

export default function Shopping() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [dragTargetCat, setDragTargetCat] = useState(null)
  const { isDay } = useTheme()

  const bg = isDay ? "#F5F0E8" : "#111111"
  const surface = isDay ? "#FFFFFF" : "#091718"
  const surfaceBorder = isDay ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(255,255,255,0.06)"
  const divider = isDay ? "1px solid rgba(0,0,0,0.06)" : "1px solid rgba(255,255,255,0.06)"
  const rowDivider = isDay ? "1px solid rgba(0,0,0,0.04)" : "1px solid rgba(255,255,255,0.04)"
  const textPrimary = isDay ? "#111111" : "#ffffff"
  const textMuted = isDay ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)"
  const textFaint = isDay ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"
  const textChecked = isDay ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"
  const checkedBadgeBg = isDay ? "#EDE8DF" : "#2d2d2d"
  const deleteBtnColor = isDay ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"

  const monday = getMonday(new Date())
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const weekLabel = `${monday.getDate()} — ${sunday.getDate()} ${sunday.toLocaleString("fr-FR", { month: "long" })} ${sunday.getFullYear()}`

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from("shopping_list").select("*").eq("user_id", user.id).eq("week_start", formatDate(monday)).order("checked")
    if (data) setItems(data)
    setLoading(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: meals } = await supabase.from("meal_plan").select("recipe_id").eq("user_id", user.id).gte("date", formatDate(monday)).lte("date", formatDate(sunday))
    if (!meals || meals.length === 0) { setGenerating(false); return alert("Aucun repas planifié cette semaine !") }
    const recipeCount = {}
    meals.forEach(m => { recipeCount[m.recipe_id] = (recipeCount[m.recipe_id] || 0) + 1 })
    const recipeIds = Object.keys(recipeCount)
    const { data: ingredients } = await supabase.from("ingredients").select("*").in("recipe_id", recipeIds)
    if (!ingredients || ingredients.length === 0) { setGenerating(false); return alert("Aucun ingrédient trouvé !") }
    const merged = {}
    ingredients.forEach(ing => {
      const key = ing.name.toLowerCase().trim()
      const occurrences = recipeCount[ing.recipe_id] || 1
      const totalQty = (ing.quantity || 0) * occurrences
      if (merged[key]) merged[key].quantity = (merged[key].quantity || 0) + totalQty
      else merged[key] = { name: ing.name, quantity: totalQty, unit: ing.unit }
    })
    await supabase.from("shopping_list").delete().eq("user_id", user.id).eq("week_start", formatDate(monday))
    await supabase.from("shopping_list").insert(Object.values(merged).map(item => ({
      user_id: user.id, name: item.name, quantity: item.quantity || null,
      unit: item.unit || null, checked: false, week_start: formatDate(monday),
      category: assignCategory(item.name),
    })))
    await fetchItems()
    setGenerating(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleAddItem = async ({ name, quantity, unit }) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("shopping_list").insert({
      user_id: user.id, name, quantity: quantity ? parseFloat(quantity) : null,
      unit: unit || null, checked: false, week_start: formatDate(monday), category: assignCategory(name),
    })
    await fetchItems()
  }

  const toggleChecked = async (item) => {
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
  const grouped = CATEGORIES.map(cat => ({ ...cat, items: unchecked.filter(i => (i.category || assignCategory(i.name)) === cat.id) })).filter(cat => cat.items.length > 0)

  return (
    <div style={{ padding: "20px 24px", backgroundColor: bg, minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.3s ease" }}>

      {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onAdd={handleAddItem} isDay={isDay} />}

      {success && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 50, backgroundColor: "#34d399", color: "#064e3b", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          ✅ liste générée !
        </div>
      )}

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/icons/kart.webp" alt="" style={{ width: 22, height: 22 }} />
            courses
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: textMuted }}>semaine du {weekLabel}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddModal(true)}
            style={{ padding: "8px 14px", borderRadius: 10, backgroundColor: "#d57bff", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, color: "#130b2d", letterSpacing: "-0.05em", transition: "transform 0.2s ease" }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
          >+ ajouter</button>
          <button onClick={handleGenerate} disabled={generating}
            id="btn-generate-shopping"
            style={{ padding: "8px 14px", borderRadius: 10, backgroundColor: "#cfff79", border: "none", cursor: generating ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, color: "#1a3d1a", letterSpacing: "-0.05em", opacity: generating ? 0.5 : 1, transition: "transform 0.2s ease", display: "flex", alignItems: "center", gap: 6 }}
            onMouseEnter={e => { if (!generating) e.currentTarget.style.transform = "scale(1.03)" }}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
          >
            {generating ? "génération..." : <><img src="/icons/spark.webp" alt="" style={{ width: 14, height: 14 }} />générer</>}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: textMuted, fontSize: 13 }}>chargement...</div>
      ) : items.length === 0 ? (
        /* ── ÉTAT VIDE — centré horizontalement et verticalement ── */
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ backgroundColor: surface, borderRadius: 16, padding: "40px 32px", textAlign: "center", maxWidth: 360, width: "100%", border: surfaceBorder }}>
            <img src="/icons/kart.webp" alt="" style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.4 }} />
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: textPrimary }}>aucun article cette semaine</p>
            <p style={{ margin: 0, fontSize: 12, color: textMuted, fontWeight: 500, lineHeight: 1.6 }}>génère depuis ton planning ou ajoute des articles manuellement.</p>
          </div>
        </div>
      ) : (
        <div onDragEnd={() => setDragTargetCat(null)}>
          {grouped.length > 0 && (
            <div style={{ columnCount: "auto", columnWidth: 280, columnGap: 12 }}>
              {grouped.map(cat => (
                <CategoryCard key={cat.id} cat={cat} onToggle={toggleChecked} onDelete={deleteItem}
                  isDragTarget={dragTargetCat === cat.id} onDragOver={() => setDragTargetCat(cat.id)}
                  onDrop={moveItem} isDay={isDay} />
              ))}
            </div>
          )}

          {/* ARTICLES COCHÉS */}
          {checked.length > 0 && (
            <div style={{ backgroundColor: surface, borderRadius: 12, overflow: "hidden", border: surfaceBorder, marginTop: 12, opacity: 0.6 }}>
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: divider }}>
                <img src="/icons/check.webp" alt="" style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: isDay ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 }}>dans le panier</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: textPrimary, backgroundColor: checkedBadgeBg, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{checked.length}</span>
              </div>
              {checked.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: rowDivider }}>
                  <button onClick={() => toggleChecked(item)}
                    style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #d57bff", backgroundColor: "#d57bff", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#ffffff", fontSize: 10, fontWeight: 700 }}>✓</span>
                  </button>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: textChecked, textDecoration: "line-through" }}>{item.name}</span>
                  {item.quantity && <span style={{ fontSize: 11, color: textFaint, fontWeight: 500 }}>{item.quantity}{item.unit ? ` ${item.unit}` : ""}</span>}
                  <button onClick={() => deleteItem(item.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: deleteBtnColor, fontSize: 18, lineHeight: 1, padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = deleteBtnColor}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
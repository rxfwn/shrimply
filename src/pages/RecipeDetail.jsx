import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { TAGS } from "../tags"
import { computeCostDetails, shouldSkipIngredient } from "../utils/priceEngine"
import { useTheme } from "../context/ThemeContext"

const S = {
  btn: { fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "-0.05em", border: "none", cursor: "pointer", borderRadius: 10, transition: "transform 0.15s, opacity 0.15s" },
  pill: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "4px 10px", borderRadius: 40,
    fontSize: 11, fontWeight: 700,
    fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em",
    border: "1.5px solid transparent",
    lineHeight: 1.2,
  },
}

const MIN_SERVINGS = 1
const MAX_SERVINGS = 35
const COOLDOWN_SECONDS = 120

function hasValidQuantity(ingredient) {
  const qty = parseFloat(ingredient.quantity)
  return ingredient.quantity && !isNaN(qty) && qty > 0
}

function scaleQuantity(qty, baseServings, currentServings) {
  if (!qty || !baseServings || baseServings === 0) return qty
  const scaled = (parseFloat(qty) * currentServings) / baseServings
  if (scaled < 10) return Math.round(scaled * 10) / 10
  return Math.round(scaled)
}

function formatQuantity(value) {
  if (value === null || value === undefined || value === "") return ""
  const num = parseFloat(value)
  if (isNaN(num)) return value
  if (num < 10) return (Math.round(num * 10) / 10).toString().replace(".", ",")
  return Math.round(num).toString()
}

function ServingStepper({ servings, onChange, baseServings }) {
  const atMin = servings <= MIN_SERVINGS
  const atMax = servings >= MAX_SERVINGS
  const changed = servings !== baseServings
  const PURPLE = "#CE80FF"

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ display: "inline-flex", alignItems: "center", border: "1.5px solid #D5CEC3", borderRadius: 40, backgroundColor: "var(--bg-card-2)", height: 30, overflow: "hidden" }}>
        <button onClick={() => !atMin && onChange(servings - 1)} disabled={atMin}
          style={{ ...S.btn, width: 30, height: "100%", borderRadius: 0, background: "none", fontSize: 20, fontWeight: 300, color: atMin ? "var(--text-ghost)" : PURPLE, cursor: atMin ? "not-allowed" : "pointer", flexShrink: 0, lineHeight: 1 }}
        >−</button>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 10px", borderLeft: "1px solid #D5CEC3", borderRight: "1px solid #D5CEC3" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: PURPLE, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em" }}>{servings}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#111111", fontFamily: "Poppins, sans-serif" }}>personne{servings > 1 ? "s" : ""}</span>
        </div>
        <button onClick={() => !atMax && onChange(servings + 1)} disabled={atMax}
          style={{ ...S.btn, width: 30, height: "100%", borderRadius: 0, background: "none", fontSize: 20, fontWeight: 300, color: atMax ? "var(--text-ghost)" : PURPLE, cursor: atMax ? "not-allowed" : "pointer", flexShrink: 0, lineHeight: 1 }}
        >+</button>
      </div>
      {changed && (
        <button onClick={() => onChange(baseServings)}
          style={{ ...S.btn, background: "none", border: "none", fontSize: 10, color: "var(--text-faint)", padding: 0, cursor: "pointer", textDecoration: "underline", fontFamily: "Poppins, sans-serif" }}
        >réinitialiser ({baseServings})</button>
      )}
    </div>
  )
}

function StarRating({ recipeId, initialRating }) {
  const [rating, setRating] = useState(initialRating || 0)
  const [hovered, setHovered] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(initialRating === 0)

  const handleRate = async (star) => {
    if (saving) return
    setSaving(true)
    const newRating = rating === star ? 0 : star
    setRating(newRating)
    setEditing(newRating === 0)
    try { await supabase.from("recipes").update({ rating: newRating }).eq("id", recipeId) }
    catch (e) { console.error("Erreur notation:", e) }
    finally { setSaving(false) }
  }

  if (!editing && rating > 0) {
    return (
      <button onClick={() => setEditing(true)} title="Modifier la note"
        style={{ ...S.pill, backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--border)", color: "var(--text-main)", cursor: "pointer" }}
      >
        <span style={{ fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center" }}>★</span>
        <span style={{ fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center" }}>{rating},0</span>
      </button>
    )
  }

  const displayed = hovered || rating
  return (
    <div style={{ ...S.pill, backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--border)", gap: 2, paddingLeft: 8, paddingRight: 8 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} onClick={() => handleRate(star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0 1px", fontSize: 14, lineHeight: 1, color: star <= displayed ? "var(--text-main)" : "var(--border)", transition: "transform 0.1s", transform: star <= displayed ? "scale(1.1)" : "scale(1)" }}
        >★</button>
      ))}
    </div>
  )
}

function DeleteConfirmModal({ onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 32px", maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", fontFamily: "Poppins, sans-serif", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/icons/trash.png" alt="" style={{ width: 24, height: 24, opacity: 0.7 }} onError={e => e.target.style.display = "none"} />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.04em" }}>Supprimer la recette ?</h2>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Cette action est irréversible. La recette et toutes ses données seront définitivement supprimées.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel}
            style={{ ...S.btn, padding: "8px 18px", fontSize: 12, backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)", borderRadius: 8 }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >Annuler</button>
          <button onClick={onConfirm}
            style={{ ...S.btn, padding: "8px 18px", fontSize: 12, backgroundColor: "#ef4444", color: "#fff", borderRadius: 8 }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >Supprimer</button>
        </div>
      </div>
    </div>
  )
}

function CopyToast({ visible }) {
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.25s ease, transform 0.25s ease",
      zIndex: 2000, pointerEvents: "none",
      backgroundColor: "var(--text-main)", color: "var(--bg-main)",
      fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12,
      letterSpacing: "-0.04em", padding: "10px 20px",
      borderRadius: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 14 }}>🔗</span> lien copié !
    </div>
  )
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDay } = useTheme()

  const [recipe, setRecipe] = useState(null)
  const [ingredients, setIngredients] = useState([])
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [checkedSteps, setCheckedSteps] = useState({})
  const [estimating, setEstimating] = useState(false)
  const [costDetails, setCostDetails] = useState(null)
  const [apiError, setApiError] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const estimatingRef = useRef(false)
  const [copied, setCopied] = useState(false)
  const [currentServings, setCurrentServings] = useState(null)

  const handleShare = async () => {
    const url = window.location.href
    try { await navigator.clipboard.writeText(url) } catch {
      const input = document.createElement("input")
      input.value = url; document.body.appendChild(input); input.select()
      document.execCommand("copy"); document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  useEffect(() => { fetchRecipe() }, [id])
  useEffect(() => {
    if (cooldown > 0) { const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t) }
  }, [cooldown])

  const fetchRecipe = async () => {
    const { data: recipeData } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle()
    const { data: ingredientsData } = await supabase.from("ingredients").select("*").eq("recipe_id", id)
    const { data: stepsData } = await supabase.from("steps").select("*").eq("recipe_id", id).order("step_number")
    setRecipe(recipeData); setIngredients(ingredientsData || []); setSteps(stepsData || [])
    setLoading(false)
    if (recipeData?.servings) setCurrentServings(parseInt(recipeData.servings))
    // Lit les prix stockés en DB — pas d'appel API
    if (ingredientsData?.some(i => i.estimated_price != null)) {
      const details = ingredientsData.map(i => ({
        name: i.name, quantity: i.quantity, unit: i.unit,
        estimated_price: i.estimated_price ?? 0,
        found: i.estimated_price != null && i.estimated_price > 0,
      }))
      const total = details.reduce((s, d) => s + d.estimated_price, 0)
      const per_serving = recipeData?.servings > 0 ? total / recipeData.servings : total
      setCostDetails({ details, total: Number(total.toFixed(2)), per_serving: Number(per_serving.toFixed(2)) })

      // Tag économique automatique au chargement
      if (recipeData?.servings > 0 && per_serving > 0) {
        const currentTags = recipeData.tags || []
        const hasTag = currentTags.includes("economique")
        if (per_serving < 3 && !hasTag) {
          const newTags = [...currentTags, "economique"]
          supabase.from("recipes").update({ tags: newTags }).eq("id", recipeData.id)
          setRecipe(r => ({ ...r, tags: newTags }))
        } else if (per_serving >= 3 && hasTag) {
          const newTags = currentTags.filter(t => t !== "economique")
          supabase.from("recipes").update({ tags: newTags }).eq("id", recipeData.id)
          setRecipe(r => ({ ...r, tags: newTags }))
        }
      }
    }
  }

  const getEstimableIngredients = (list) => list.filter(i => hasValidQuantity(i) && !shouldSkipIngredient(i.name, i.unit))


const handleEstimate = async () => {
  if (estimatingRef.current || cooldown > 0) return
  estimatingRef.current = true; setEstimating(true); setApiError("")
  try {
    const result = await computeCostDetails(ingredients, recipe.servings)
    setCostDetails(result)
    setCooldown(COOLDOWN_SECONDS)
    // Sauvegarde les prix par ingrédient en DB
    await Promise.all(result.details.map(detail => {
      const ing = ingredients.find(i => i.name.toLowerCase() === detail.name.toLowerCase())
      if (!ing?.id) return Promise.resolve()
      return supabase.from("ingredients").update({ estimated_price: detail.found ? detail.estimated_price : null }).eq("id", ing.id)
    }))
    // Tag économique automatique
    const ECONOMIC_THRESHOLD = 3
    if (recipe?.servings > 0) {
      const perServing = result.total / recipe.servings
      const currentTags = recipe.tags || []
      const newTags = [...currentTags]
      if (perServing > 0 && perServing < ECONOMIC_THRESHOLD && !newTags.includes("economique")) newTags.push("economique")
      else if (perServing >= ECONOMIC_THRESHOLD) { const idx = newTags.indexOf("economique"); if (idx !== -1) newTags.splice(idx, 1) }
      await supabase.from("recipes").update({ estimated_total: result.total, tags: newTags }).eq("id", id)
      setRecipe(r => ({ ...r, tags: newTags, estimated_total: result.total }))
    } else {
      await supabase.from("recipes").update({ estimated_total: result.total }).eq("id", id)
    }
  } catch (error) {
    setApiError(error.message)
    setCooldown(COOLDOWN_SECONDS)
  } finally {
    estimatingRef.current = false; setEstimating(false)
  }
}

  const handleDelete = async () => {
    setDeleting(true); setShowDeleteModal(false)
    if (recipe?.photo_url) {
      try { const path = recipe.photo_url.split("/recipe-images/")[1]; if (path) await supabase.storage.from("recipe-images").remove([path]) } catch {}
    }
    await supabase.from("recipes").delete().eq("id", id)
    navigate("/recipes")
  }

  const handlePrint = () => {
    const baseServings = recipe?.servings || 1
    const displayIngredients = costDetails?.details || ingredients.map(i => ({ ...i, found: false, estimated_price: 0 }))
    const scaledIngredients = displayIngredients.map(item => ({ ...item, quantity: scaleQuantity(item.quantity, baseServings, currentServings || baseServings) }))
    const ingredientsHtml = scaledIngredients.map(item => `<li><span>${item.name}</span><span>${formatQuantity(item.quantity)} ${item.unit || ""}</span></li>`).join("")
    const stepsHtml = steps.map((step, i) => `<div class="step"><div class="step-num">${i + 1}</div><p>${step.description}</p></div>`).join("")
    const scaledCost = costDetails ? (costDetails.total * (currentServings || baseServings) / baseServings) : null
    const budgetHtml = scaledCost ? `<div class="budget"><span>💰 ${scaledCost.toFixed(2)}€ total — ${(scaledCost / (currentServings || baseServings)).toFixed(2)}€ / pers.</span></div>` : ""
    const servingsNote = (currentServings && currentServings !== baseServings) ? `<p style="font-size:12px;color:#888;margin-bottom:12px">Recette adaptée pour ${currentServings} personne${currentServings > 1 ? "s" : ""} (base : ${baseServings})</p>` : ""
    const photoHtml = recipe.photo_url ? `<img src="${recipe.photo_url}" class="photo" alt="${recipe.name}" />` : ""
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>${recipe.name}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Georgia',serif;color:#1a1a1a;background:white;padding:40px 48px;max-width:800px;margin:0 auto}.header{display:flex;gap:28px;margin-bottom:28px;padding-bottom:24px;border-bottom:2px solid #f97316}.photo{width:180px;height:135px;object-fit:cover;border-radius:12px;flex-shrink:0}h1{font-size:28px;font-weight:700;margin-bottom:8px}.budget{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-bottom:28px;font-size:13px;color:#166534;font-weight:700}.columns{display:grid;grid-template-columns:1fr 1.6fr;gap:32px}h2{font-size:13px;font-weight:700;text-transform:uppercase;color:#ea580c;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #fed7aa}ul{list-style:none}ul li{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f5f5f5;font-size:13px}.step{display:flex;gap:14px;margin-bottom:16px}.step-num{flex-shrink:0;width:24px;height:24px;background:#f97316;color:white;border-radius:50%;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}.step p{font-size:13px;line-height:1.65;color:#333}.footer{margin-top:36px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:11px;color:#aaa}@media print{body{padding:20px 28px}}</style></head><body><div class="header">${photoHtml}<div><h1>${recipe.name}</h1></div></div>${servingsNote}${budgetHtml}<div class="columns"><div><h2>Ingrédients</h2><ul>${ingredientsHtml}</ul></div><div><h2>Préparation</h2>${stepsHtml}</div></div><div class="footer">Shrímply 🍤</div><script>window.onload=()=>{window.print()}<\/script></body></html>`
    const win = window.open("", "_blank"); win.document.write(html); win.document.close()
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: "Poppins, sans-serif", color: "var(--text-faint)", fontSize: 13 }}>chargement...</div>
  if (!recipe) return <div style={{ padding: 40, textAlign: "center", fontFamily: "Poppins, sans-serif", color: "var(--text-faint)", fontSize: 13 }}>recette introuvable.</div>

  const baseServings = parseInt(recipe.servings) || 1
  const activeServings = currentServings ?? baseServings
  const displayIngredients = costDetails?.details || ingredients.map(i => ({ ...i, found: false, estimated_price: 0 }))

  const scaledIngredients = displayIngredients
    .slice()
    .sort((a, b) => {
      const aSkip = shouldSkipIngredient(a.name, a.unit) ? 1 : 0
      const bSkip = shouldSkipIngredient(b.name, b.unit) ? 1 : 0
      return aSkip - bSkip
    })
    .map(item => ({
    ...item,
    quantity: item.quantity != null ? scaleQuantity(item.quantity, baseServings, activeServings) : item.quantity,
    estimated_price: item.found ? (item.estimated_price * activeServings / baseServings) : 0,
  }))

  const scaledTotal = costDetails ? costDetails.total * activeServings / baseServings : null
  const scaledPerServing = costDetails ? costDetails.per_serving : null

  const estimableIngredients = getEstimableIngredients(ingredients)
  const allPricesFound =
    estimableIngredients.length > 0 &&
    costDetails?.details?.filter(d => estimableIngredients.some(e => e.name === d.name)).every(d => d.found)

  const canEstimate = !estimating && cooldown === 0 && !allPricesFound

  const allTagValues = [...new Set([recipe.primary_tag, ...(recipe.tags || [])])].filter(Boolean)
  const validTags = allTagValues.filter(tv => TAGS.some(t => t.value === tv))

  const ActionBtn = ({ onClick, disabled, imgSrc, alt, danger }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ ...S.btn, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: danger ? "rgba(239,68,68,0.12)" : isDay ? "#EDE8DF" : "rgba(255,255,255,0.08)", opacity: disabled ? 0.4 : 1, flexShrink: 0, borderRadius: 6, padding: 0 }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = "scale(1.1)" }}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1.1)"}
    >
      <img src={imgSrc} alt={alt} style={{ width: 15, height: 15, objectFit: "contain" }} onError={e => e.target.style.display = "none"} />
    </button>
  )

  const btnLabel = estimating ? "analyse..." : allPricesFound ? "✅ complet" : cooldown > 0 ? `⏳ ${cooldown}s` : "calculer"
  const btnBg = allPricesFound ? "var(--bg-card-2)" : cooldown > 0 ? "var(--bg-card-2)" : "#22C55E"
  const btnColor = allPricesFound ? "var(--text-faint)" : cooldown > 0 ? "var(--text-faint)" : "#ffffff"

  return (
    <div style={{ padding: "16px", backgroundColor: "var(--bg-main)", minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease" }}>

      <CopyToast visible={copied} />
      {showDeleteModal && <DeleteConfirmModal onConfirm={handleDelete} onCancel={() => setShowDeleteModal(false)} />}

      <style>{`
        .hero-card {
          display: flex; align-items: stretch;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 14px; overflow: hidden; margin-bottom: 12px;
          height: 260px;
        }
        .hero-photo { width: 50%; flex-shrink: 0; object-fit: cover; display: block; height: 100%; }
        .hero-placeholder { width: 50%; flex-shrink: 0; height: 100%; background: var(--bg-card-2); display: flex; align-items: center; justify-content: center; font-size: 52px; opacity: 0.12; }
        .hero-right { flex: 1; min-width: 0; padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; }
        .budget-bar { display: flex; align-items: center; gap: 8px; background: var(--bg-card-2); border-radius: 40px; padding: 7px 12px; }
        .budget-chip { display: flex; align-items: center; gap: 6px; background: ${isDay ? "#E8E1D5" : "rgba(255,255,255,0.1)"}; border-radius: 40px; padding: 5px 12px; }
        @media (max-width: 640px) {
          .hero-card { height: auto; flex-direction: column; }
          .hero-photo { width: 100%; height: 200px; }
          .hero-placeholder { width: 100%; height: 130px; }
          .hero-right { padding: 12px 14px !important; }
          .budget-bar { flex-wrap: wrap; border-radius: 12px; padding: 8px 10px; row-gap: 6px; }
          .budget-chip { padding: 4px 8px; }
          .budget-chip span:first-child { font-size: 12px !important; }
          .budget-calc-btn { width: 100%; justify-content: center; border-radius: 8px !important; }
        }
      `}</style>

      <button onClick={() => navigate("/recipes")}
        style={{ ...S.btn, backgroundColor: "#1a1033", color: "#CE80FF", fontSize: 13, padding: "10px 20px", marginBottom: 14, display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 12 }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >retour</button>

      <div className="hero-card">
        {recipe.photo_url
          ? <img src={recipe.photo_url} alt={recipe.name} className="hero-photo" />
          : <div className="hero-placeholder">🍽</div>
        }

        <div className="hero-right">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {recipe.duplicated_from && <span style={{ fontSize: 10, color: "var(--text-faint)", fontStyle: "italic", display: "block", marginBottom: 2 }}>📋 copie</span>}
                <h1 style={{ margin: "0 0 5px", fontSize: 18, fontWeight: 700, color: "var(--text-main)", lineHeight: 1.2, letterSpacing: "-0.05em" }}>{recipe.name}</h1>
                {recipe.description && (
                  <p style={{ margin: 0, fontSize: 11, color: isDay ? "#111111" : "var(--text-muted)", lineHeight: 1.45, fontWeight: 400, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{recipe.description}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <ActionBtn onClick={handleShare} imgSrc="/icons/chain.webp" alt="Partager" />
                <ActionBtn onClick={handlePrint} imgSrc="/icons/printer.webp" alt="Imprimer" />
                <ActionBtn onClick={() => navigate(`/recipes/${id}/edit`)} imgSrc="/icons/pencil.webp" alt="Modifier" />
                <ActionBtn onClick={() => setShowDeleteModal(true)} disabled={deleting} imgSrc="/icons/trash.webp" alt="Supprimer" danger />
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
              <StarRating recipeId={id} initialRating={recipe.rating || 0} />
              {recipe.prep_time && (
                <span style={{ ...S.pill, backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--border)", color: "var(--text-muted)" }}>
                  ⏱ {recipe.prep_time} min
                </span>
              )}
              {validTags.map(tv => {
                const ti = TAGS.find(t => t.value === tv)
                return (
                  <span key={tv} style={{ ...S.pill, backgroundColor: ti.pillBg, color: ti.pillText }}>
                    <img src={`/icons/${ti.icon}.webp`} alt="" style={{ width: 11, height: 11 }} onError={e => e.target.style.display = "none"} />
                    {ti.label}
                  </span>
                )
              })}
            </div>
          </div>

          <div>
            <div className="budget-bar">
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <img src="/icons/money.webp" alt="" style={{ width: 18, height: 18 }} onError={e => e.target.style.display = "none"} />
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main)", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em" }}>budget</span>
              </div>

              {scaledTotal != null ? (
                <>
                  <div className="budget-chip">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#22C55E", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em" }}>{scaledTotal.toFixed(2)}€</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "Poppins, sans-serif" }}>total</span>
                  </div>
                  <div className="budget-chip">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#22C55E", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em" }}>{scaledPerServing != null ? scaledPerServing.toFixed(2) : "—"}€</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "Poppins, sans-serif" }}>/personne</span>
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "Poppins, sans-serif", fontStyle: "italic" }}>
                  {estimableIngredients.length === 0 ? "aucun ingrédient estimable" : ""}
                </span>
              )}

              <div style={{ flex: 1 }} />

              <button onClick={handleEstimate} disabled={!canEstimate}
                className="budget-calc-btn"
                style={{ ...S.btn, padding: "7px 16px", fontSize: 12, backgroundColor: btnBg, color: btnColor, cursor: canEstimate ? "pointer" : "not-allowed", opacity: estimating ? 0.6 : 1, borderRadius: 40, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                onMouseEnter={e => { if (canEstimate) e.currentTarget.style.transform = "scale(1.04)" }}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <img src="/icons/calc.png" alt="" style={{ width: 13, height: 13, filter: allPricesFound || cooldown > 0 ? "none" : "brightness(10)" }} onError={e => e.target.style.display = "none"} />
                {btnLabel}
              </button>
            </div>
            {apiError && <p style={{ fontSize: 10, color: "#f87171", margin: "5px 0 0", fontStyle: "italic", fontFamily: "Poppins, sans-serif" }}>⚠️ {apiError}</p>}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>

        <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <img src="/icons/cart.png" alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display = "none"} />
              <span style={{ fontSize: 11, fontWeight: 700, color: isDay ? "#111111" : "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "Poppins, sans-serif" }}>ingrédients</span>
            </div>
            {baseServings > 0 && <ServingStepper servings={activeServings} onChange={setCurrentServings} baseServings={baseServings} />}
          </div>

          {activeServings !== baseServings && (
            <div style={{ marginBottom: 10, padding: "5px 10px", borderRadius: 7, backgroundColor: "rgba(206,128,255,0.08)", border: "1px solid rgba(206,128,255,0.2)", fontSize: 11, color: "#CE80FF", fontWeight: 600, fontFamily: "Poppins, sans-serif" }}>
              ✨ quantités adaptées pour {activeServings} personne{activeServings > 1 ? "s" : ""}
            </div>
          )}

          {scaledIngredients.map((item, i) => {
            const isScaled = activeServings !== baseServings
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderBottom: i < scaledIngredients.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 500 }}>{item.name}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: isScaled ? 800 : 500, color: isScaled ? "#CE80FF" : "var(--text-muted)", transition: "color 0.2s, font-weight 0.2s" }}>
                    {formatQuantity(item.quantity)} {item.unit}
                  </span>
                  {item.found && <span style={{ fontSize: 11, fontWeight: 700, color: "#22C55E" }}>{item.estimated_price.toFixed(2)}€</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <img src="/icons/chef.png" alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display = "none"} />
            <span style={{ fontSize: 11, fontWeight: 700, color: isDay ? "#111111" : "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "Poppins, sans-serif" }}>préparation</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map((step, i) => (
              <div key={i} onClick={() => setCheckedSteps(prev => ({ ...prev, [i]: !prev[i] }))}
                style={{ display: "flex", gap: 12, cursor: "pointer", opacity: checkedSteps[i] ? 0.35 : 1, transition: "opacity 0.2s" }}>
                <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, marginTop: 1, backgroundColor: checkedSteps[i] ? "#22C55E" : "var(--bg-card-2)", color: checkedSteps[i] ? "#fff" : "var(--text-muted)", transition: "all 0.2s" }}>
                  {checkedSteps[i] ? "✓" : i + 1}
                </div>
                <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.6, color: "var(--text-main)", fontWeight: 500, textDecoration: checkedSteps[i] ? "line-through" : "none" }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
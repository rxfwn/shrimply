import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { TAGS } from "../tags"
import { findBestMatch, computeCostDetails, getCategoryUnit, getIngredientBaseUnit } from "../utils/priceEngine"
import { useTheme } from "../context/ThemeContext"

function getTextColor(hex) {
  if (!hex) return "#ffffff"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

const S = {
  btn: { fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "-0.05em", border: "none", cursor: "pointer", borderRadius: 10, transition: "transform 0.15s, opacity 0.15s" },
  pill: { display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em" },
}

const MIN_SERVINGS = 1
const MAX_SERVINGS = 35

function scaleQuantity(qty, baseServings, currentServings) {
  if (!qty || !baseServings || baseServings === 0) return qty
  const scaled = (parseFloat(qty) * currentServings) / baseServings
  // Smart rounding: keep 1 decimal for small values, integer for bigger
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

// Serving stepper component
function ServingStepper({ servings, onChange, baseServings }) {
  const atMin = servings <= MIN_SERVINGS
  const atMax = servings >= MAX_SERVINGS
  const changed = servings !== baseServings

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        display: "inline-flex", alignItems: "center",
        border: "1.5px solid var(--border)",
        borderRadius: 40, overflow: "hidden",
        backgroundColor: "var(--bg-card-2)",
        height: 38,
      }}>
        <button
          onClick={() => !atMin && onChange(servings - 1)}
          disabled={atMin}
          style={{
            ...S.btn,
            width: 38, height: "100%", borderRadius: 0,
            background: "none", fontSize: 18, fontWeight: 300,
            color: atMin ? "var(--text-ghost)" : "#f3501e",
            cursor: atMin ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >−</button>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 14px", minWidth: 110, justifyContent: "center",
          borderLeft: "1.5px solid var(--border)",
          borderRight: "1.5px solid var(--border)",
        }}>
          <span style={{
            fontSize: 14, fontWeight: 800,
            color: "#f3501e",
            fontFamily: "Poppins, sans-serif",
            letterSpacing: "-0.05em",
            minWidth: 20, textAlign: "center",
          }}>{servings}</span>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: "var(--text-muted)",
            fontFamily: "Poppins, sans-serif",
          }}>personne{servings > 1 ? "s" : ""}</span>
        </div>

        <button
          onClick={() => !atMax && onChange(servings + 1)}
          disabled={atMax}
          style={{
            ...S.btn,
            width: 38, height: "100%", borderRadius: 0,
            background: "none", fontSize: 18, fontWeight: 300,
            color: atMax ? "var(--text-ghost)" : "#f3501e",
            cursor: atMax ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >+</button>
      </div>

      {changed && (
        <button
          onClick={() => onChange(baseServings)}
          style={{
            ...S.btn,
            background: "none", border: "none",
            fontSize: 10, color: "var(--text-faint)",
            padding: 0, textAlign: "center",
            cursor: "pointer", textDecoration: "underline",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          réinitialiser ({baseServings} pers.)
        </button>
      )}
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
  const [checkedSteps, setCheckedSteps] = useState({})
  const [estimating, setEstimating] = useState(false)
  const [costDetails, setCostDetails] = useState(null)
  const [apiError, setApiError] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const estimatingRef = useRef(false)
  const [copied, setCopied] = useState(false)

  // Serving calculator state
  const [currentServings, setCurrentServings] = useState(null) // null until recipe loaded

  const handleShare = async () => {
    const url = window.location.href
    try { await navigator.clipboard.writeText(url) } catch {
      const input = document.createElement("input")
      input.value = url; document.body.appendChild(input); input.select()
      document.execCommand("copy"); document.body.removeChild(input)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => { fetchRecipe() }, [id])
  useEffect(() => {
    if (cooldown > 0) { const t = setTimeout(() => setCooldown(cooldown - 1), 1000); return () => clearTimeout(t) }
  }, [cooldown])

  const fetchRecipe = async () => {
    const { data: recipeData } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle()
    const { data: ingredientsData } = await supabase.from("ingredients").select("*").eq("recipe_id", id)
    const { data: stepsData } = await supabase.from("steps").select("*").eq("recipe_id", id).order("step_number")
    setRecipe(recipeData); setIngredients(ingredientsData || []); setSteps(stepsData || []); setLoading(false)
    // Init serving calculator with recipe's base servings
    if (recipeData?.servings) setCurrentServings(parseInt(recipeData.servings))
    if (!recipeData || !ingredientsData?.length) return
    await loadCostDetails(recipeData, ingredientsData)
  }

  const loadCostDetails = async (recipeData, ingredientsData) => {
    try {
      const { data: prices } = await supabase.from("ingredient_prices").select("name, price, unit")
      setCostDetails(computeCostDetails(ingredientsData, prices || [], recipeData.servings))
    } catch (e) { console.error("Erreur calcul budget:", e) }
  }

  const reestimate = async () => {
    if (estimatingRef.current || cooldown > 0) return
    estimatingRef.current = true; setEstimating(true); setApiError("")
    try {
      const { data: prices } = await supabase.from("ingredient_prices").select("name, price, unit")
      const missing = ingredients.filter(i => !findBestMatch(i.name, prices || []))
      if (missing.length > 0) {
        const ingredientsWithHints = missing.map(m => {
          const cu = getCategoryUnit(m.name)
          if (cu === "piece") return `${m.name} [vendu à la pièce]`
          if (cu === "kg") return `${m.name} [vendu au poids]`
          if (cu === "l") return `${m.name} [vendu au volume]`
          const rb = getIngredientBaseUnit((m.unit || "").toLowerCase().trim())
          if (rb === "piece") return `${m.name} [vendu à la pièce]`
          if (rb === "kg") return `${m.name} [vendu au poids]`
          if (rb === "l") return `${m.name} [vendu au volume]`
          return m.name
        })
        const { data: gemini_prices, error: funcError } = await supabase.functions.invoke("estimate-costs", { body: { ingredients: ingredientsWithHints } })
        if (funcError) throw new Error("Erreur serveur IA.")
        if (gemini_prices?.length > 0) {
          const nameMap = Object.fromEntries(ingredientsWithHints.map((h, idx) => [h, missing[idx].name]))
          await supabase.from("ingredient_prices").upsert(gemini_prices.map(p => ({ name: nameMap[p.name] || p.name, price: p.price, unit: p.unit })), { onConflict: "name" })
        }
        await loadCostDetails(recipe, ingredients)
      }
      setCooldown(60)
    } catch (error) { setApiError(error.message); setCooldown(60) }
    finally { estimatingRef.current = false; setEstimating(false) }
  }

  const handleDelete = async () => {
    if (!confirm("Supprimer cette recette ?")) return
    setDeleting(true)
    if (recipe?.photo_url) {
      try { const path = recipe.photo_url.split("/recipe-images/")[1]; if (path) await supabase.storage.from("recipe-images").remove([path]) } catch {}
    }
    await supabase.from("recipes").delete().eq("id", id)
    navigate("/recipes")
  }

  const handlePrint = () => {
    const baseServings = recipe?.servings || 1
    const displayIngredients = costDetails?.details || ingredients.map(i => ({ ...i, found: false, estimated_price: 0 }))
    const scaledIngredients = displayIngredients.map(item => ({
      ...item,
      quantity: scaleQuantity(item.quantity, baseServings, currentServings || baseServings),
    }))
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

  // Scale ingredients and cost for current servings
  const scaledIngredients = displayIngredients.map(item => ({
    ...item,
    quantity: item.quantity != null ? scaleQuantity(item.quantity, baseServings, activeServings) : item.quantity,
    estimated_price: item.found ? (item.estimated_price * activeServings / baseServings) : 0,
  }))

  const scaledTotal = costDetails ? costDetails.total * activeServings / baseServings : null
  const scaledPerServing = costDetails ? costDetails.per_serving : null // per serving stays the same

  const allPricesFound = costDetails?.details?.length > 0 && costDetails.details.every(i => i.found)
  const allTagValues = [...new Set([recipe.primary_tag, ...(recipe.tags || [])])].filter(Boolean)
  const validTags = allTagValues.filter(tv => TAGS.some(t => t.value === tv))

  const ActionBtn = ({ onClick, disabled, children, danger }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ ...S.btn, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: danger ? "rgba(239,68,68,0.12)" : isDay ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)", color: danger ? "#f87171" : "var(--text-muted)", fontSize: 15, opacity: disabled ? 0.4 : 1, flexShrink: 0 }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = "scale(1.1)" }}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1.1)"}
    >{children}</button>
  )

  return (
    <div style={{ padding: "16px", backgroundColor: "var(--bg-main)", minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease" }}>
      <style>{`
        .hero-block { display: flex; align-items: stretch; }
        .hero-img { width: 45%; flex-shrink: 0; object-fit: cover; display: block; }
        .hero-img-placeholder { width: 45%; flex-shrink: 0; background: var(--bg-card-2); display: flex; align-items: center; justify-content: center; font-size: 40px; opacity: 0.15; }
        .hero-right { flex: 1; padding: 16px 18px; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; }
        @media (max-width: 600px) {
          .hero-block { flex-direction: column; }
          .hero-img { width: 100%; height: 200px; }
          .hero-img-placeholder { width: 100%; height: 140px; }
          .hero-right { padding: 12px 14px; }
        }
        .qty-changed { 
          color: #f3501e !important;
          font-weight: 800 !important;
          transition: color 0.2s;
        }
      `}</style>

      <button onClick={() => navigate("/recipes")}
        style={{ ...S.btn, background: "none", color: "var(--text-faint)", fontSize: 12, padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--text-main)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}
      >← retour</button>

      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", marginBottom: 12 }} className="hero-block">
        {recipe.photo_url ? <img src={recipe.photo_url} alt={recipe.name} className="hero-img" /> : <div className="hero-img-placeholder">🍽</div>}
        <div className="hero-right">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {recipe.duplicated_from && <span style={{ fontSize: 10, color: "var(--text-faint)", fontStyle: "italic", display: "block", marginBottom: 3 }}>📋 copie</span>}
                <h1 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "var(--text-main)", lineHeight: 1.25, letterSpacing: "-0.04em" }}>{recipe.name}</h1>
                {recipe.description && <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45, fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{recipe.description}</p>}
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <ActionBtn onClick={handleShare}>{copied ? <span style={{ fontSize: 9 }}>✓</span> : "🔗"}</ActionBtn>
                <ActionBtn onClick={handlePrint}>🖨️</ActionBtn>
                <ActionBtn onClick={() => navigate(`/recipes/${id}/edit`)}>✏️</ActionBtn>
                <ActionBtn onClick={handleDelete} disabled={deleting} danger>🗑️</ActionBtn>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {recipe.prep_time && <span style={{ ...S.pill, padding: "4px 10px", fontSize: 11, backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)" }}>⏱ {recipe.prep_time} min</span>}
              {validTags.slice(0, 3).map(tv => {
                const ti = TAGS.find(t => t.value === tv)
                return <span key={tv} style={{ ...S.pill, padding: "4px 10px", fontSize: 11, backgroundColor: ti.pillBg, color: ti.pillText }}><img src={`/icons/${ti.icon}.png`} alt="" style={{ width: 11, height: 11 }} onError={e => e.target.style.display="none"} />{ti.label}</span>
              })}
            </div>
          </div>
          <div style={{ marginTop: 12, backgroundColor: isDay ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: costDetails ? 8 : 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "Poppins, sans-serif" }}>💰 budget</span>
              <button onClick={reestimate} disabled={estimating || cooldown > 0 || allPricesFound}
                style={{ ...S.btn, padding: "5px 14px", fontSize: 11, backgroundColor: allPricesFound ? "var(--bg-card-2)" : cooldown > 0 ? "var(--bg-card-2)" : "#34d399", color: allPricesFound ? "var(--text-faint)" : cooldown > 0 ? "var(--text-faint)" : "#064e3b", cursor: allPricesFound || cooldown > 0 ? "not-allowed" : "pointer", opacity: estimating ? 0.6 : 1 }}
                onMouseEnter={e => { if (!allPricesFound && !cooldown && !estimating) e.currentTarget.style.transform = "scale(1.04)" }}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {estimating ? "⌛ analyse..." : allPricesFound ? "✅ complet" : cooldown > 0 ? `⏳ ${cooldown}s` : "🔄 recalculer"}
              </button>
            </div>
            {apiError && <p style={{ fontSize: 11, color: "#f87171", margin: "0 0 6px", fontStyle: "italic" }}>⚠️ {apiError}</p>}
            {scaledTotal != null ? (
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "total", value: `${scaledTotal.toFixed(2)}€` },
                  { label: "/ pers.", value: `${scaledPerServing.toFixed(2)}€` }
                ].map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: isDay ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px", textAlign: "center", flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#34d399", letterSpacing: "-0.04em" }}>{value}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 9, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-faint)", fontWeight: 500 }}>clique sur recalculer pour estimer</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {/* INGREDIENTS PANEL */}
        <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "Poppins, sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
              🛒 ingrédients
            </div>

            {/* SERVING STEPPER */}
            {baseServings > 0 && (
              <ServingStepper
                servings={activeServings}
                onChange={setCurrentServings}
                baseServings={baseServings}
              />
            )}
          </div>

          {activeServings !== baseServings && (
            <div style={{
              marginBottom: 12, padding: "6px 12px", borderRadius: 8,
              backgroundColor: "rgba(243,80,30,0.07)",
              border: "1px solid rgba(243,80,30,0.15)",
              fontSize: 11, color: "#f3501e", fontWeight: 600,
              fontFamily: "Poppins, sans-serif",
            }}>
              ✨ quantités adaptées pour {activeServings} personne{activeServings > 1 ? "s" : ""}
            </div>
          )}

          {scaledIngredients.map((item, i) => {
            const isScaled = activeServings !== baseServings
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: i < scaledIngredients.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--text-main)", fontWeight: 500 }}>{item.name}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{
                    fontSize: 11, fontWeight: isScaled ? 800 : 500,
                    color: isScaled ? "#f3501e" : "var(--text-muted)",
                    transition: "color 0.2s, font-weight 0.2s",
                  }}>
                    {formatQuantity(item.quantity)} {item.unit}
                  </span>
                  {item.found && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399" }}>
                      {item.estimated_price.toFixed(2)}€
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* STEPS PANEL */}
        <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border)", padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "Poppins, sans-serif", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>👨‍🍳 préparation</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((step, i) => (
              <div key={i} onClick={() => setCheckedSteps(prev => ({ ...prev, [i]: !prev[i] }))}
                style={{ display: "flex", gap: 14, cursor: "pointer", opacity: checkedSteps[i] ? 0.35 : 1, transition: "opacity 0.2s" }}>
                <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, marginTop: 2, backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)", transition: "all 0.2s" }}>
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
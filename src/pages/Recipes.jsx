import { TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_BORDER } from "../tags"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { computeCostDetails } from "../utils/priceEngine"
import ImageUploadCropper from "./ImageUploadCropper"
import { useTheme } from "../context/ThemeContext"
import { usePremium } from "../hooks/usePremium"
import UpgradePopup from "../components/Upgradepopup"

const UNITS = ["g","kg","ml","cl","L","c. à café","c. à soupe","pincée","poignée","paquet","boîte","tranche","pièce","selon goût"]

// ── Bloque tout sauf chiffres pour entiers (temps, portions) ──
function handleIntegerKeyDown(e) {
  const allowed = ["Backspace","Delete","Tab","Enter","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"]
  if (allowed.includes(e.key)) return
  if (!/^\d$/.test(e.key)) e.preventDefault()
}

// ── Bloque tout sauf chiffres + virgule/point pour décimaux (quantités) ──
function handleNumericKeyDown(e) {
  const allowed = ["Backspace","Delete","Tab","Enter","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"]
  if (allowed.includes(e.key)) return
  if ((e.key === "." || e.key === ",") && !e.currentTarget.value.includes(".") && !e.currentTarget.value.includes(",")) return
  if (!/^\d$/.test(e.key)) e.preventDefault()
}

function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

function TagPill({ tag, active, onClick, size = "md", anyActive = false }) {
  const iconSz = size === "sm" ? 14 : 18
  const padding = size === "sm" ? "2px 8px" : "6px 12px"
  const fontSize = size === "sm" ? 10 : 12
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: size === "sm" ? 4 : 6,
      padding, borderRadius: 20, fontSize, fontWeight: 700,
      fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em",
      cursor: "pointer", border: "none",
      backgroundColor: tag.pillBg, color: tag.pillText,
      opacity: anyActive && !active ? 0.35 : 1,
      transform: active ? "scale(1.1)" : "scale(1)",
      boxShadow: active ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
      transition: "all 0.2s ease",
    }}>
      <img src={`/icons/${tag.icon}.webp`} alt="" style={{ width: iconSz, height: iconSz }} onError={e => e.target.style.display="none"} />
      {tag.label}
    </button>
  )
}

function DraftToast({ type, visible }) {
  const configs = {
    saved:    { bg: "#5BC8F5", text: "#0a3d52", icon: "/icons/save.webp",  msg: "brouillon sauvegardé" },
    restored: { bg: "#A8E063", text: "#1a3a00", icon: "/icons/memo.webp",  msg: "brouillon restauré"  },
    cleared:  { bg: "#f3501e", text: "#ffffff",  icon: "/icons/trash.webp", msg: "brouillon supprimé"  },
  }
  const c = configs[type] || configs.saved
  return (
    <>
      <style>{`@keyframes slideBar { from { width: 100% } to { width: 0% } }`}</style>
      <div style={{
        position: "fixed", top: 20, right: 16,
        transform: `translateX(${visible ? 0 : 120}%)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease, transform 0.3s ease",
        zIndex: 200, pointerEvents: "none",
        backgroundColor: c.bg, borderRadius: 12,
        padding: "14px 20px 12px", minWidth: 240,
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        fontFamily: "Poppins, sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <img src={c.icon} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} onError={e => e.target.style.display="none"} />
          <span style={{ fontSize: 15, fontWeight: 800, color: c.text, letterSpacing: "-0.04em" }}>{c.msg}</span>
        </div>
        <div style={{ width: "100%", height: 5, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 4, overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
          {visible && <div style={{ height: "100%", backgroundColor: c.text, borderRadius: 4, opacity: 0.5, animation: "slideBar 2.2s linear forwards", transformOrigin: "right" }} />}
        </div>
      </div>
    </>
  )
}

export default function Recipes() {
  const navigate = useNavigate()
  const { isDay } = useTheme()
  const { isPremium } = usePremium()
  const ingredientRefs = useRef([])
  const stepRefs = useRef([])
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)
  const hasShownDraftPopup = useRef(false)
  const autoSaveTimer = useRef(null)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [servings, setServings] = useState("")
  const [selectedTags, setSelectedTags] = useState([])
  const [primaryTag, setPrimaryTag] = useState("")
  const [recipeColor, setRecipeColor] = useState("")
  const [ingredients, setIngredients] = useState([{ name: "", quantity: "", unit: "" }])
  const [steps, setSteps] = useState([{ description: "" }])
  const [photoUrl, setPhotoUrl] = useState("")
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const [bannedPopup, setBannedPopup] = useState(null)
  const [duplicating, setDuplicating] = useState(null)
  const [dupError, setDupError] = useState("")
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [search, setSearch] = useState("")
  const [tagPopup, setTagPopup] = useState(null)
  const [activeFilter, setActiveFilter] = useState("")
  const [toast, setToast] = useState({ type: "saved", visible: false })
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)

  const showToast = (type) => {
    setToast({ type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200)
  }

  const DRAFT_KEY = "recipe_draft"
  const saveDraft = (data) => localStorage.setItem(DRAFT_KEY, JSON.stringify(data))

  const clearDraftAndReset = () => {
    localStorage.removeItem(DRAFT_KEY)
    setName(""); setDescription(""); setPrepTime(""); setServings("")
    setSelectedTags([]); setPrimaryTag(""); setRecipeColor("")
    setIngredients([{name:"",quantity:"",unit:""}]); setSteps([{description:""}]); setPhotoUrl("")
    hasShownDraftPopup.current = false
    showToast("cleared")
  }

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (!d.name && !d.description && !d.ingredients?.[0]?.name) return
      setName(d.name||""); setDescription(d.description||""); setPrepTime(d.prepTime||""); setServings(d.servings||"")
      setSelectedTags(d.selectedTags||[]); setPrimaryTag(d.primaryTag||""); setRecipeColor(d.recipeColor||"")
      setIngredients(d.ingredients?.length ? d.ingredients : [{ name:"",quantity:"",unit:"" }])
      setSteps(d.steps?.length ? d.steps : [{ description:"" }])
      showToast("restored")
    } catch {}
  }

  useEffect(() => { fetchRecipes() }, [])

  const fetchRecipes = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return
      const { data, error } = await supabase.from("recipes").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      if (error) return
      if (data) setRecipes(data)
    } catch {}
  }

  useEffect(() => {
    if (!showForm) return
    if (!(name || description || ingredients[0]?.name)) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveDraft({ name, description, prepTime, servings, selectedTags, primaryTag, recipeColor, ingredients, steps })
      if (!hasShownDraftPopup.current) {
        hasShownDraftPopup.current = true
        showToast("saved")
      }
    }, 2000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [showForm, name, description, prepTime, servings, selectedTags, recipeColor, ingredients, steps])

  const checkBannedWords = async (texts) => {
    const { data: banned } = await supabase.from("banned_words").select("word")
    if (!banned) return null
    const fullText = texts.join(" ").toLowerCase()
    for (const { word } of banned) { if (new RegExp(`\\b${word.toLowerCase()}\\b`,"i").test(fullText)) return word }
    return null
  }

  const handleDuplicate = async (e, recipe) => {
    e.stopPropagation()
    if (duplicating) return
    setDupError(""); setDuplicating(recipe.id)
    try {
      const { data:{user} } = await supabase.auth.getUser()
      const sourceId = recipe.duplicated_from || recipe.id
      const { count } = await supabase.from("recipes").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("duplicated_from",sourceId)
      if (count>=3) { setDupError(`Max 3 copies de "${recipe.name}" !`); setTimeout(()=>setDupError(""),3000); setDuplicating(null); return }
      const { data:ings } = await supabase.from("ingredients").select("*").eq("recipe_id",recipe.id)
      const { data:stps } = await supabase.from("steps").select("*").eq("recipe_id",recipe.id).order("step_number")
      const { data:newR, error } = await supabase.from("recipes").insert({ user_id:user.id, name:`Copie de ${recipe.name}`, description:recipe.description, prep_time:recipe.prep_time, servings:recipe.servings, tags:recipe.tags, photo_url:recipe.photo_url||null, is_public:false, duplicated_from:sourceId }).select().single()
      if (error) throw error
      if (ings?.length>0) await supabase.from("ingredients").insert(ings.map(i=>({recipe_id:newR.id,name:i.name,quantity:i.quantity,unit:i.unit,calories:i.calories})))
      if (stps?.length>0) await supabase.from("steps").insert(stps.map(s=>({recipe_id:newR.id,step_number:s.step_number,description:s.description})))
      await fetchRecipes(); setSuccess(`"Copie de ${recipe.name}" créée !`); setTimeout(()=>setSuccess(false),3000)
    } catch(err){console.error(err)} finally{setDuplicating(null)}
  }

  const toggleTag = (v) => setSelectedTags(p => p.includes(v) ? p.filter(t=>t!==v) : [...p,v])
  const addIngredient = () => { setIngredients(p=>[...p,{name:"",quantity:"",unit:""}]); setTimeout(()=>{ingredientRefs.current[ingredients.length]?.focus()},50) }
  const removeIngredient = (i) => setIngredients(p=>p.filter((_,idx)=>idx!==i))
  const updateIngredient = (i,f,v) => { setIngredients(p=>p.map((ing,idx)=>idx===i?{...ing,[f]:v}:ing)); setErrors(p=>({...p,[`ing_${i}_${f}`]:false})) }
  const addStep = () => { setSteps(p=>[...p,{description:""}]); setTimeout(()=>{stepRefs.current[steps.length]?.focus()},50) }
  const removeStep = (i) => setSteps(p=>p.filter((_,idx)=>idx!==i))
  const updateStep = (i,v) => { setSteps(p=>p.map((s,idx)=>idx===i?{...s,description:v}:s)); setErrors(p=>({...p,[`step_${i}`]:false})) }
  const handleDragStart = (i) => { dragItem.current=i }
  const handleDragEnter = (i) => { dragOverItem.current=i; setDragOverIndex(i) }
  const handleDragEnd = () => {
    const from=dragItem.current, to=dragOverItem.current
    if(from===null||to===null||from===to){dragItem.current=null;dragOverItem.current=null;setDragOverIndex(null);return}
    const r=[...steps]; const [m]=r.splice(from,1); r.splice(to,0,m); setSteps(r)
    dragItem.current=null; dragOverItem.current=null; setDragOverIndex(null)
  }

  const validate = () => {
    const e={}
    if (!name.trim()) e.name=true
    if (!prepTime) e.prepTime=true
    if (!servings) e.servings=true
    if (!primaryTag) e.primaryTag=true
    if (ingredients.filter(i=>i.name.trim()).length===0) e.noIngredients=true
    ingredients.forEach((ing,i)=>{ if(ing.name.trim()){if(!ing.quantity)e[`ing_${i}_quantity`]=true;if(!ing.unit.trim())e[`ing_${i}_unit`]=true} })
    if (steps.filter(s=>s.description.trim()).length===0) e.noSteps=true
    setErrors(e); return Object.keys(e).length===0
  }

  // ── handleSubmit : calcule estimated_total avant l'INSERT ──
  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    const found = await checkBannedWords([name, description, ...ingredients.map(i => i.name), ...steps.map(s => s.description)])
    if (found) { setBannedPopup(found); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()

    // Calcul du prix estimé (ne bloque pas la création si l'API est down)
    const validIngredients = ingredients.filter(i => i.name.trim())
    let estimatedTotal = null
    let costDetails = null
    if (validIngredients.length > 0) {
      try {
        const { total, details } = await computeCostDetails(
          validIngredients.map(i => ({ ...i, quantity: parseFloat(i.quantity) })),
          parseInt(servings)
        )
        const hasAnyMatch = details?.some(d => d.found)
        estimatedTotal = hasAnyMatch ? total : null
        costDetails = details
      } catch (e) {
        // API indisponible en local → null, pas grave
      }
    }

    // Tag économique automatique (< 3€/personne)
    const ECONOMIC_THRESHOLD = 3
    const autoTags = [...selectedTags]
    if (estimatedTotal !== null && parseInt(servings) > 0) {
      const perServing = estimatedTotal / parseInt(servings)
      if (perServing > 0 && perServing < ECONOMIC_THRESHOLD && !autoTags.includes("economique")) autoTags.push("economique")
      else if (perServing >= ECONOMIC_THRESHOLD) autoTags.splice(autoTags.indexOf("economique"), 1)
    }

    const { data: recipe, error } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id, name, description,
        prep_time: parseInt(prepTime), servings: parseInt(servings),
        tags: autoTags, primary_tag: primaryTag || null,
        color: recipeColor || null, is_public: false,
        photo_url: photoUrl || null,
        estimated_total: estimatedTotal,
      })
      .select().single()

    if (!error && recipe) {
      const rows = validIngredients.map(i => ({ recipe_id: recipe.id, name: i.name, quantity: parseFloat(i.quantity), unit: i.unit }))
      const { data: inserted } = await supabase.from("ingredients").insert(rows).select()
      if (inserted && costDetails) {
        await Promise.allSettled(inserted.map(ing => {
          const detail = costDetails.find(d => d.name.toLowerCase() === ing.name.toLowerCase())
          if (!detail?.found) return Promise.resolve()
          return supabase.from("ingredients").update({ estimated_price: detail.estimated_price }).eq("id", ing.id)
        }))
      }
      await supabase.from("steps").insert(steps.filter(s => s.description.trim()).map((s, idx) => ({ recipe_id: recipe.id, step_number: idx + 1, description: s.description })))
      setSuccess(true); setName(""); setDescription(""); setPrepTime(""); setServings("")
      setSelectedTags([]); setPrimaryTag(""); setRecipeColor("")
      setIngredients([{name:"",quantity:"",unit:""}]); setSteps([{description:""}]); setErrors({}); setPhotoUrl("")
      localStorage.removeItem(DRAFT_KEY); hasShownDraftPopup.current = false
      setShowForm(false); fetchRecipes(); setTimeout(() => setSuccess(false), 3000)
    }
    setLoading(false)
  }

  const togglePublic = async (e, recipe) => {
    e.stopPropagation()
    if (recipe.imported_from) return
    if (!isPremium) {
      setShowUpgradePopup(true)
      return
    }
    await supabase.from("recipes").update({is_public:!recipe.is_public}).eq("id",recipe.id)
    fetchRecipes()
  }

  const handleNewRecipe = () => {
    if (!isPremium && recipes.length >= 5) {
      setShowUpgradePopup(true)
      return
    }
    setShowForm(true)
    loadDraft()
  }

  const resetForm = () => { setShowForm(false); setErrors({}); hasShownDraftPopup.current=false; setPhotoUrl(""); setRecipeColor("") }

  const filtered = recipes.filter(r => {
  const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
  const matchFilter = activeFilter === "all" || activeFilter === "" || 
    r.primary_tag === activeFilter || 
    (r.tags && r.tags.includes(activeFilter))
  return matchSearch && matchFilter
  })

  const btnBase = {
    fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13,
    letterSpacing: "-0.05em", border: "none", cursor: "pointer",
    borderRadius: 10, transition: "transform 0.2s ease",
  }

  const inputStyle = (err) => ({
    width: "100%", borderRadius: 10, padding: "10px 14px",
    fontSize: 13, outline: "none",
    background: err ? "rgba(239,68,68,0.08)" : "var(--bg-card-2)",
    border: err ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid var(--input-border)",
    color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 500,
    letterSpacing: "-0.05em", boxSizing: "border-box", transition: "border-color 0.15s",
  })

  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: "var(--text-faint)",
    textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6,
  }

  return (
    <div style={{ padding: "20px 24px", backgroundColor: "var(--bg-main)", minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease" }}>

      <DraftToast type={toast.type} visible={toast.visible} />

      {showUpgradePopup && (
        <UpgradePopup
          onClose={() => setShowUpgradePopup(false)}
          message={
            !isPremium && recipes.length >= 5
              ? "Tu as atteint la limite de 5 recettes. Passe premium pour en créer sans limite."
              : "Le partage public est réservé aux membres premium."
          }
        />
      )}

      {bannedPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 16, maxWidth: 360, width: "100%", overflow: "hidden", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ backgroundColor: "rgba(239,68,68,0.08)", padding: "32px 24px 24px", display: "flex", flexDirection: "column", alignItems: "center", borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
              <div style={{ width: 56, height: 56, backgroundColor: "var(--bg-card-2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 12 }}>🚨</div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>contenu bloqué</h2>
            </div>
            <div style={{ padding: 24, textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>terme non autorisé :</p>
              <div style={{ display: "inline-block", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "8px 20px", borderRadius: 10, fontWeight: 700, marginBottom: 20 }}>« {bannedPopup} »</div>
              <button onClick={() => setBannedPopup(null)} style={{ ...btnBase, width: "100%", padding: "12px", backgroundColor: "#f87171", color: "#ffffff" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >j'ai compris</button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, backgroundColor: "#34d399", color: "#064e3b", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
          ✅ {typeof success==="string" ? success : "recette ajoutée !"}
        </div>
      )}
      {dupError && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, backgroundColor: "#f87171", color: "#ffffff", padding: "12px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}>⚠️ {dupError}</div>
      )}

      {showForm ? (
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 10 }}>
              <img src="/icons/pencil.webp" alt="" style={{ width: 24, height: 24 }} />
              nouvelle recette
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {localStorage.getItem(DRAFT_KEY) && (
                <button onClick={clearDraftAndReset} style={{ fontSize: 12, color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>
                  vider le brouillon
                </button>
              )}
              <button onClick={() => { setShowForm(false); setErrors({}) }} style={{ fontSize: 13, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700 }}>
                retour
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 20, border: "1px solid var(--border)" }}>
            <ImageUploadCropper onImageSaved={(url) => setPhotoUrl(url||"")} recipeId={null} />

            <div>
              <label style={labelStyle}>nom <span style={{ color: "#d57bff" }}>*</span></label>
              <input style={inputStyle(errors.name)} placeholder="ex : pâtes carbonara" value={name} spellCheck="true"
                onChange={e => { setName(e.target.value); setErrors(p=>({...p,name:false})) }}
                onFocus={e => e.target.style.borderColor = "#d57bff"}
                onBlur={e => e.target.style.borderColor = errors.name ? "rgba(239,68,68,0.5)" : "var(--input-border)"} />
              {errors.name && <p style={{ fontSize: 11, color: "#f87171", margin: "4px 0 0 4px", fontWeight: 500 }}>obligatoire</p>}
            </div>

            <div>
              <label style={labelStyle}>description</label>
              <textarea style={{ ...inputStyle(false), resize: "none", minHeight: 70 }} placeholder="décris ta recette..." rows={2} value={description} spellCheck="true"
                onChange={e => setDescription(e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>temps (min) <span style={{ color: "#d57bff" }}>*</span></label>
                <input style={inputStyle(errors.prepTime)} placeholder="ex : 30" type="text" inputMode="numeric" value={prepTime}
                  onKeyDown={handleIntegerKeyDown}
                  onChange={e => { setPrepTime(e.target.value.replace(/[^0-9]/g, "")); setErrors(p=>({...p,prepTime:false})) }} />
                {errors.prepTime && <p style={{ fontSize: 11, color: "#f87171", margin: "4px 0 0 4px", fontWeight: 500 }}>obligatoire</p>}
              </div>
              <div>
                <label style={labelStyle}>portions <span style={{ color: "#d57bff" }}>*</span></label>
                <input style={inputStyle(errors.servings)} placeholder="ex : 4" type="text" inputMode="numeric" value={servings}
                  onKeyDown={handleIntegerKeyDown}
                  onChange={e => { setServings(e.target.value.replace(/[^0-9]/g, "")); setErrors(p=>({...p,servings:false})) }} />
                {errors.servings && <p style={{ fontSize: 11, color: "#f87171", margin: "4px 0 0 4px", fontWeight: 500 }}>obligatoire</p>}
              </div>
            </div>

            {/* Tag principal — OBLIGATOIRE */}
            <div>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
                <img src="/icons/paint.webp" alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display="none"} />
                tag principal <span style={{ color: "#d57bff" }}>*</span>{" "}
                <span style={{ fontWeight: 400, color: "var(--text-ghost)", textTransform: "none", letterSpacing: "normal" }}>— détermine la couleur de la carte</span>
              </label>
              {errors.primaryTag && (
                <p style={{ fontSize: 11, color: "#f87171", margin: "0 0 8px 4px", fontWeight: 500 }}>obligatoire — choisis un tag principal</p>
              )}
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                padding: errors.primaryTag ? "10px" : "2px",
                borderRadius: 10,
                border: errors.primaryTag ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid transparent",
                transition: "border-color 0.15s",
              }}>
                {TAGS.map(tag => {
                  const isMain = primaryTag === tag.key
                  return (
                    <button key={tag.key}
                      onClick={() => { setPrimaryTag(isMain ? "" : tag.key); setErrors(p=>({...p,primaryTag:false})) }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                        borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em",
                        border: "none",
                        backgroundColor: tag.pillBg,
                        color: tag.pillText,
                        opacity: primaryTag && !isMain ? 0.35 : 1,
                        transform: isMain ? "scale(1.1)" : "scale(1)",
                        boxShadow: isMain ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                        transition: "all 0.15s",
                      }}>
                      <img src={`/icons/${tag.icon}.webp`} alt="" style={{ width: 16, height: 16 }} onError={e => e.target.style.display="none"} />
                      {tag.label}
                    </button>
                  )
                })}
              </div>
              {primaryTag && (() => {
                const t = TAGS.find(t => t.value === primaryTag)
                return t ? (
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, backgroundColor: t.cardBg, color: getTextColor(t.cardBg), fontSize: 11, fontWeight: 700 }}>
                    <img src={`/icons/${t.icon}.webp`} alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display="none"} />
                    couleur : {t.label}
                  </div>
                ) : null
              })()}
            </div>

            {/* Tags secondaires */}
            <div>
              <label style={labelStyle}>
                tags secondaires <span style={{ fontWeight: 400, color: "var(--text-ghost)", textTransform: "none", letterSpacing: "normal" }}>— optionnels</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TAGS.filter(tag => tag.key !== primaryTag).map(tag => (
                  <TagPill key={tag.key} tag={tag} active={selectedTags.includes(tag.key)}
                    anyActive={selectedTags.length > 0} onClick={() => toggleTag(tag.key)} />
                ))}
              </div>
            </div>

            {/* Ingrédients */}
            <div>
              <label style={labelStyle}>ingrédients <span style={{ color: "#d57bff" }}>*</span></label>
              {errors.noIngredients && <p style={{ fontSize: 11, color: "#f87171", margin: "0 0 8px 4px", fontWeight: 500 }}>au moins un ingrédient requis</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ingredients.map((ing, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ flex: 2 }}>
                      <input ref={el => ingredientRefs.current[i]=el} style={inputStyle(false)} placeholder="ingrédient *" value={ing.name} spellCheck="true"
                        onChange={e => updateIngredient(i,"name",e.target.value)}
                        onKeyDown={e => { if(e.key==="Enter"){e.preventDefault();if(i===ingredients.length-1)addIngredient();else ingredientRefs.current[i+1]?.focus()} }} />
                    </div>
                    <div style={{ width: 80 }}>
                      <input style={inputStyle(errors[`ing_${i}_quantity`])} placeholder="qté *"
                        type="text" inputMode="decimal" value={ing.quantity}
                        onKeyDown={handleNumericKeyDown}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9.,]/g, "")
                          if (v === "" || parseFloat(v.replace(",", ".")) >= 0) updateIngredient(i,"quantity",v)
                        }} />
                    </div>
                    <div style={{ width: 110 }}>
                      <select style={{ ...inputStyle(errors[`ing_${i}_unit`]), appearance: "none", color: ing.unit ? "var(--text-main)" : "var(--text-muted)" }}
                        value={ing.unit} onChange={e => updateIngredient(i,"unit",e.target.value)}>
                        <option value="" disabled>unité *</option>
                        {UNITS.map(u => <option key={u} value={u} style={{ backgroundColor: "var(--bg-card-2)", color: "var(--text-main)" }}>{u}</option>)}
                      </select>
                    </div>
                    {ingredients.length > 1 && (
                      <button onClick={() => removeIngredient(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)", fontSize: 20, lineHeight: 1, paddingTop: 10 }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-ghost)"}
                      >×</button>
                    )}
                  </div>
                ))}
                <button onClick={addIngredient} style={{ background: "none", border: "none", cursor: "pointer", color: "#d57bff", fontSize: 13, fontWeight: 700, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em", textAlign: "left", padding: 0, marginTop: 4 }}>
                  + ajouter un ingrédient
                </button>
              </div>
            </div>

            {/* Étapes */}
            <div>
              <label style={labelStyle}>
                étapes <span style={{ color: "#d57bff" }}>*</span>{" "}
                <span style={{ fontWeight: 400, color: "var(--text-ghost)", textTransform: "none", letterSpacing: "normal" }}>— glisse ⠿ pour réordonner</span>
              </label>
              {errors.noSteps && <p style={{ fontSize: 11, color: "#f87171", margin: "0 0 8px 4px", fontWeight: 500 }}>au moins une étape requise</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {steps.map((step, i) => (
                  <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragEnter={() => handleDragEnter(i)} onDragEnd={handleDragEnd} onDragOver={e => e.preventDefault()}
                    style={{ display: "flex", gap: 8, alignItems: "center", borderRadius: 10, padding: "4px 0", backgroundColor: dragOverIndex===i && dragItem.current!==i ? "rgba(243,80,30,0.06)" : "transparent", transition: "background 0.15s" }}>
                    <span style={{ color: "var(--text-ghost)", cursor: "grab", fontSize: 16, flexShrink: 0, userSelect: "none" }}>⠿</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#d57bff", width: 20, flexShrink: 0 }}>{i+1}.</span>
                    <div style={{ flex: 1 }}>
                      <textarea ref={el => stepRefs.current[i]=el}
                        style={{ ...inputStyle(errors[`step_${i}`]), resize: "none", overflow: "hidden", minHeight: 42 }}
                        placeholder={`étape ${i+1}...`} rows={1} value={step.description} spellCheck="true"
                        onChange={e => { updateStep(i,e.target.value); e.target.style.height="auto"; e.target.style.height=e.target.scrollHeight+"px" }}
                        onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(i===steps.length-1)addStep();else stepRefs.current[i+1]?.focus()} }} />
                    </div>
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-ghost)", fontSize: 20, lineHeight: 1, flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-ghost)"}
                      >×</button>
                    )}
                  </div>
                ))}
                <button onClick={addStep} style={{ background: "none", border: "none", cursor: "pointer", color: "#d57bff", fontSize: 13, fontWeight: 700, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em", textAlign: "left", padding: 0, marginTop: 4 }}>
                  + ajouter une étape
                </button>
              </div>
            </div>

            {/* Boutons sticky */}
            <div style={{ position: "sticky", bottom: 24, zIndex: 40, display: "flex", justifyContent: "center", marginTop: 8 }}>
              <div style={{ display: "flex", gap: 14, backgroundColor: "var(--bg-main)", boxShadow: "0 4px 20px rgba(0,0,0,0.2)", padding: "16px 24px", borderRadius: 10, width: "100%", maxWidth: 400, border: "1px solid var(--border)" }}>
                <button onClick={resetForm}
                  style={{ ...btnBase, flex: 1, padding: "10px", backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)", borderRadius: 6 }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >annuler</button>
                <button onClick={handleSubmit} disabled={loading}
                  style={{ ...btnBase, flex: 1, padding: "10px", backgroundColor: "#d57bff", color: "#1d1138", borderRadius: 6, opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "scale(1.03)" }}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  {loading ? "enregistrement..." : <><img src="/icons/save.webp" alt="" style={{ width: 14, height: 14 }} />enregistrer</>}
                </button>
              </div>
            </div>
          </div>
        </div>

      ) : (
        <div style={{ maxWidth: 1200 }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/icons/book.webp" alt="" style={{ width: 24, height: 24 }} />
              mes recettes
              {!isPremium && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", marginLeft: 4 }}>
                  ({recipes.length}/5)
                </span>
              )}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
                <img src="/icons/loupe.webp" alt="" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, pointerEvents: "none" }} />
                <input
                  style={{ width: "100%", backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px 9px 36px", fontSize: 13, color: "var(--text-main)", outline: "none", fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "-0.05em", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  placeholder="rechercher une recette..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  onFocus={e => e.target.style.borderColor = "#d57bff"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>
              <button
                onClick={handleNewRecipe}
                id="btn-new-recipe"
                style={{ ...btnBase, padding: "9px 16px", backgroundColor: !isPremium && recipes.length >= 5 ? "var(--bg-card-2)" : "#d57bff", color: !isPremium && recipes.length >= 5 ? "var(--text-muted)" : "#130b2d", whiteSpace: "nowrap" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {!isPremium && recipes.length >= 5 ? "🔒 nouvelle recette" : "+ nouvelle recette"}
              </button>
            </div>

            <div style={{ paddingBottom: 8 }}>
              <style>{`
                .filters-recipes { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
                .filters-recipes-mobile { display: flex; gap: 8px; align-items: center; overflow-x: auto; padding-bottom: 4px; }
                @media (min-width: 768px) { .filters-recipes-mobile { display: none; } }
                @media (max-width: 767px) { .filters-recipes { display: none; } }
              `}</style>
              {["filters-recipes", "filters-recipes-mobile"].map(cls => (
                <div key={cls} className={cls}>
                  <button onClick={() => setActiveFilter(activeFilter === "all" ? "" : "all")}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em", backgroundColor: "#fe7c3e", color: "#510312", flexShrink: 0, opacity: activeFilter === "all" ? 1 : activeFilter !== "" ? 0.35 : 1, transform: activeFilter === "all" ? "scale(1.1)" : "scale(1)", transition: "all 0.2s ease" }}>
                    <img src="/icons/book.webp" alt="" style={{ width: 16, height: 16 }} onError={e => e.target.style.display="none"} />
                    toutes
                  </button>
                  {TAGS.map(tag => (
                    <div key={tag.key} style={{ flexShrink: 0 }}>
                      <TagPill tag={tag} active={activeFilter === tag.key} anyActive={activeFilter !== ""}
                        onClick={() => setActiveFilter(activeFilter === tag.key ? "" : tag.key)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {recipes.length === 0 ? (
            <div style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", marginTop: 40 }}>aucune recette — ajoutes-en une !</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", marginTop: 40 }}>aucune recette ne correspond.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {filtered.map(recipe => {
                const primaryTagInfo = TAGS.find(t => t.value === recipe.primary_tag || t.key === recipe.primary_tag || t.label === recipe.primary_tag)
                const bg = primaryTagInfo?.cardBg || DEFAULT_CARD_BG
                const border = primaryTagInfo?.cardBorder || DEFAULT_CARD_BORDER
                const textColor = primaryTagInfo?.cardText || getTextColor(bg)
                const actionBg = primaryTagInfo?.actionBg || (textColor==="#ffffff" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.09)")
                const actionText = primaryTagInfo?.actionText || textColor
                return (
                  <div key={recipe.id} onClick={() => navigate(`/recipes/${recipe.id}`)}
                    style={{ backgroundColor: bg, border: `3px solid ${border}`, borderRadius: 16, overflow: "visible", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s", position: "relative" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)" }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
                  >
                    {recipe.photo_url
                      ? <img src={recipe.photo_url} alt={recipe.name} style={{ display: "block", width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: "13px 13px 0 0" }} />
                      : <div style={{ width: "100%", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: bg, fontSize: 40, borderRadius: "13px 13px 0 0" }}>🍽</div>
                    }
                    <div style={{ padding: "8px 12px 12px", color: textColor }}>
                      <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{recipe.name}</h3>
                      {recipe.duplicated_from && <p style={{ margin: "0 0 4px", fontSize: 10, fontStyle: "italic", opacity: 0.7 }}>📋 copie</p>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 8 }}>
                        {recipe.prep_time && <span>⏱ {recipe.prep_time}min</span>}
                        {recipe.servings && <span>🍽 {recipe.servings}p</span>}
                        {recipe.rating > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: 3, backgroundColor: actionBg, color: primaryTagInfo?.pillText || textColor, padding: "2px 7px", borderRadius: 20, fontWeight: 700, fontSize: 10 }}>
                            ★ {Number(recipe.rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const allT = [...new Set([recipe.primary_tag, ...(recipe.tags || [])])].filter(Boolean)
                        const validT = allT.filter(tv => TAGS.some(t => t.value === tv))
                        if (validT.length === 0) return null
                        return (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                            {validT.slice(0, 2).map(tv => {
                              const ti = TAGS.find(t => t.value === tv)
                              return (
                                <span key={tv} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, backgroundColor: ti.pillBg, color: ti.pillText }}>
                                  <img src={`/icons/${ti.icon}.webp`} alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display="none"} />
                                  {ti.label}
                                </span>
                              )
                            })}
                            {validT.length > 2 && (
                              <span
                                style={{ fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", color: textColor + "80", cursor: "default", position: "relative" }}
                                onMouseEnter={() => setTagPopup(recipe.id)}
                                onMouseLeave={() => setTagPopup(null)}
                              >
                                +{validT.length - 2}
                                {tagPopup === recipe.id && (
                                  <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", minWidth: 120, pointerEvents: "none", opacity: 1 }}>
                                    {validT.slice(2).map(tv => {
                                      const ti = TAGS.find(t => t.value === tv)
                                      return ti ? (
                                        <span key={tv} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, backgroundColor: ti.pillBg, color: ti.pillText, whiteSpace: "nowrap" }}>
                                          <img src={`/icons/${ti.icon}.webp`} alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display="none"} />
                                          {ti.label}
                                        </span>
                                      ) : null
                                    })}
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      <div style={{ display: "flex", gap: 6 }}>
                        {recipe.imported_from ? (
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, backgroundColor: primaryTagInfo?.pillBg || "rgba(0,0,0,0.55)", color: primaryTagInfo?.pillText || "#ffffff", fontFamily: "Poppins, sans-serif", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <img src="/icons/globe.webp" alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display = "none"} />
                          importée
                          </span>
                        ) : (
                          <button onClick={e => togglePublic(e, recipe)}
                          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, backgroundColor: actionBg, color: actionText, border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", display: "flex", alignItems: "center" }}>
                          <img src={recipe.is_public ? "/icons/planet.webp" : "/icons/lock.webp"} alt="" style={{ width: 12, height: 12 }} onError={e => e.target.style.display = "none"} />
                          </button>
                        )}
                        <button onClick={e => handleDuplicate(e, recipe)} disabled={duplicating===recipe.id}
                        style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, backgroundColor: actionBg, color: actionText, border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", opacity: duplicating===recipe.id ? 0.4 : 1, display: "flex", alignItems: "center" }}>
                        <img src={duplicating===recipe.id ? "/icons/hourglass.webp" : "/icons/memo.webp"} alt="" style={{ width: 12, height: 12 }} onError={e => e.target.style.display = "none"} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
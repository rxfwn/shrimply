import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_BORDER } from "../tags"

const MEAL_TYPES = ["Matin", "Midi", "Soir"]
const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

const MEAL_ICONS = {
  Matin: "/icons/sun.png",
  Midi: "/icons/clock.png",
  Soir: "/icons/moon.png",
}

function getWeekDays(startDate) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []
  let startDow = firstDay.getDay()
  if (startDow === 0) startDow = 7
  for (let i = 1; i < startDow; i++) days.push(null)
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
  return days
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getTodayLocal() {
  return formatDate(new Date())
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])
  return isMobile
}

function getRecipeCardBg(recipe) {
  if (!recipe) return null
  const tag = TAGS.find(t => t.value === recipe.primary_tag || t.key === recipe.primary_tag)
  return tag?.cardBg || null
}

function getRecipeCardBorder(recipe) {
  if (!recipe) return DEFAULT_CARD_BORDER
  const tag = TAGS.find(t => t.value === recipe.primary_tag || t.key === recipe.primary_tag)
  return tag?.cardBorder || DEFAULT_CARD_BORDER
}

function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

function RecipeCard({ recipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { type: "recipe", recipe }
  })
  const cardBg = getRecipeCardBg(recipe)
  const cardBorder = getRecipeCardBorder(recipe)
  const textColor = getTextColor(cardBg)

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  } : {}

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: cardBg,
        borderRadius: 10,
        padding: "8px 10px",
        marginBottom: 6,
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: `1.5px solid ${cardBorder}`,
        transition: "border-color 0.15s",
      }}
      {...listeners}
      {...attributes}
    >
      {recipe.photo_url ? (
        <img src={recipe.photo_url} alt={recipe.name}
          style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.15)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🍽</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{recipe.name}</div>
        {recipe.prep_time && <div style={{ fontSize: 10, color: textColor, opacity: 0.6 }}>⏱ {recipe.prep_time} min</div>}
      </div>
      <span style={{ color: textColor, opacity: 0.4, fontSize: 14 }}>⠿</span>
    </div>
  )
}

// ─── VUE SEMAINE : photo EN HAUT, titre + infos EN DESSOUS ───────────────────
function MealSlot({ date, mealType, meal, onRemove, isToday, isMobile, onMobileTap }) {
  const slotId = `slot-${date}-${mealType}`
  const { setNodeRef, isOver } = useDroppable({ id: slotId, data: { date, mealType } })
  const slotHeight = isMobile ? 90 : 120

  const mealCardBg = meal ? (getRecipeCardBg(meal.recipes) || "#1a1a1a") : null
  const mealCardBorder = meal ? getRecipeCardBorder(meal.recipes) : null
  const mealTextColor = mealCardBg ? getTextColor(mealCardBg) : "#ffffff"

  if (isMobile) {
    return (
      <div
        onClick={() => !meal && onMobileTap(date, mealType)}
        style={{
          height: slotHeight,
          backgroundColor: meal ? mealCardBg : "#2d2d2d",
          borderRadius: 10,
          overflow: "hidden",
          border: isToday && meal ? "1.5px solid #d57bff" : `1.5px solid ${mealCardBorder || "transparent"}`,
          cursor: meal ? "default" : "pointer",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {meal ? (
          <>
            {meal.recipes?.photo_url && (
              <img src={meal.recipes.photo_url} alt={meal.recipes.name}
                style={{ width: "100%", height: 52, objectFit: "cover", display: "block", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, padding: "4px 6px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: mealTextColor, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.3 }}>
                {meal.recipes?.name}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onRemove(meal.id) }}
                style={{ fontSize: 9, color: mealTextColor, opacity: 0.5, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                × sup
              </button>
            </div>
          </>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/icons/plus.png" alt="+" style={{ width: 14, height: 14, opacity: 0.2 }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        height: slotHeight,
        backgroundColor: meal ? mealCardBg : isOver ? "#111111" : "#2d2d2d",
        borderRadius: 10,
        overflow: "hidden",
        border: isToday && meal
          ? "1.5px solid #d57bff"
          : isOver
          ? "1.5px solid #d57bff"
          : meal && mealCardBorder
          ? `1.5px solid ${mealCardBorder}`
          : "1.5px solid transparent",
        transition: "all 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {meal ? (
        <>
          {/* Photo en haut */}
          {meal.recipes?.photo_url && (
            <img
              src={meal.recipes.photo_url}
              alt={meal.recipes.name}
              style={{ width: "100%", height: 60, objectFit: "cover", display: "block", flexShrink: 0 }}
            />
          )}
          {/* Titre + infos en dessous */}
          <div style={{ flex: 1, padding: "6px 8px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: mealTextColor, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.3 }}>
              {meal.recipes?.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {meal.recipes?.prep_time && (
                <span style={{ fontSize: 10, color: mealTextColor, opacity: 0.6 }}>⏱ {meal.recipes.prep_time}m</span>
              )}
              <button
                onClick={() => onRemove(meal.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: mealTextColor, opacity: 0.4, fontSize: 16, lineHeight: 1, marginLeft: "auto", padding: 0 }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1" }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.4" }}
              >×</button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/icons/plus.png" alt="+" style={{ width: 24, height: 24, opacity:0.4, userSelect: "none", pointerEvents: "none"}} />
        </div>
      )}
    </div>
  )
}

// ─── VUE MOIS : slot individuel droppable pour chaque repas ──────────────────
function MonthMealSlot({ dateStr, mealType, meal, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${dateStr}-${mealType}`,
    data: { date: dateStr, mealType }
  })
  const cardBg = meal ? (getRecipeCardBg(meal.recipes) || "#1a1a1a") : null
  const cardBorder = meal ? getRecipeCardBorder(meal.recipes) : null
  const textColor = cardBg ? getTextColor(cardBg) : "#ffffff"
  const tagInfo = meal ? TAGS.find(t => t.value === meal.recipes?.primary_tag || t.key === meal.recipes?.primary_tag) : null

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minHeight: 0,
        backgroundColor: meal ? cardBg : isOver ? "rgba(243,80,30,0.12)" : "rgba(255,255,255,0.03)",
        border: meal
          ? `1px solid ${cardBorder || "rgba(255,255,255,0.06)"}`
          : isOver ? "1px solid #d57bff" : "1px solid transparent",
        borderRadius: 5,
        display: "flex",
        alignItems: "center",
        padding: "0 5px",
        gap: 3,
        overflow: "hidden",
        transition: "all 0.15s",
      }}
    >
      {meal ? (
        <>
          {tagInfo && (
            <img src={`/icons/${tagInfo.icon}.png`} alt=""
              style={{ width: 9, height: 9, flexShrink: 0, opacity: 0.8 }}
              onError={e => e.target.style.display = "none"} />
          )}
          <span style={{
            fontSize: 9, fontWeight: 700, color: textColor,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1, lineHeight: 1,
          }}>
            {meal.recipes?.name}
          </span>
          <button
            onClick={() => onRemove(meal.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: textColor, opacity: 0.25, fontSize: 11, lineHeight: 1, flexShrink: 0, padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.25"}
          >×</button>
        </>
      ) : (
        <img src={MEAL_ICONS[mealType]} alt={mealType}
          style={{ width: 8, height: 8, opacity: isOver ? 0.8 : 0.15, transition: "opacity 0.15s" }}
          onError={e => e.target.style.display = "none"} />
      )}
    </div>
  )
}

// ─── VUE MOIS : case jour avec 3 slots calés en hauteur ──────────────────────
function MonthDayCell({ date, meals, onRemove, isToday }) {
  const dateStr = formatDate(date)
  const getMealForType = (type) => meals.find(m => m.meal_type === type)

  return (
    <div style={{
      height: 110,
      backgroundColor: "#2d2d2d",
      borderRadius: 10,
      border: isToday ? "1.5px solid #d57bff" : "1.5px solid transparent",
      display: "flex",
      flexDirection: "column",
      padding: "4px 5px 5px",
      gap: 3,
      overflow: "hidden",
    }}>
      {/* Numéro du jour */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          width: 18, height: 18, borderRadius: "50%",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          backgroundColor: isToday ? "#d57bff" : "transparent",
          color: isToday ? "#130b2d" : "rgba(255,255,255,0.45)",
        }}>
          {date.getDate()}
        </div>
      </div>

      {/* 3 slots égaux en hauteur */}
      {MEAL_TYPES.map(type => (
        <MonthMealSlot
          key={type}
          dateStr={dateStr}
          mealType={type}
          meal={getMealForType(type)}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

function MobileRecipeModal({ recipes, onSelect, onClose }) {
  const [search, setSearch] = useState("")
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ backgroundColor: "#091718", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "75vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#ffffff" }}>choisir une recette</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>×</button>
          </div>
          <input
            style={{ width: "100%", backgroundColor: "#2d2d2d", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ffffff", outline: "none", boxSizing: "border-box" }}
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(recipe => (
            <button key={recipe.id} onClick={() => onSelect(recipe)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, backgroundColor: "#2d2d2d", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
              {recipe.photo_url ? (
                <img src={recipe.photo_url} alt={recipe.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#1a1a1a", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipe.name}</p>
                {recipe.prep_time && <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>⏱ {recipe.prep_time} min</p>}
              </div>
              <img src="/icons/plus.png" alt="+" style={{ width: 16, height: 16 }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Calendar() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [view, setView] = useState("week")
  const [monday, setMonday] = useState(getMonday(new Date()))
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [mealPlan, setMealPlan] = useState([])
  const [recipes, setRecipes] = useState([])
  const [search, setSearch] = useState("")
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [mobileModal, setMobileModal] = useState(null)
  const [showBalancePopup, setShowBalancePopup] = useState(false)

  const days = getWeekDays(monday)
  const today = getTodayLocal()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { fetchData() }, [monday, currentMonth, currentYear, view])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    let startDate, endDate
    if (view === "week") {
      startDate = formatDate(monday)
      endDate = formatDate(days[6])
    } else {
      startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`
      const lastDay = new Date(currentYear, currentMonth + 1, 0)
      endDate = formatDate(lastDay)
    }
    const { data: planData } = await supabase.from("meal_plan").select("*, recipes(name, prep_time, tags, primary_tag, photo_url)").eq("user_id", user.id).gte("date", startDate).lte("date", endDate)
    const { data: recipesData } = await supabase.from("recipes").select("*").eq("user_id", user.id)
    if (planData) setMealPlan(planData)
    if (recipesData) setRecipes(recipesData)
  }

  const getMeal = (date, mealType) => mealPlan.find(m => m.date === formatDate(date) && m.meal_type === mealType)
  const getMealsForDay = (date) => mealPlan.filter(m => m.date === formatDate(date))

  const handleDragStart = (event) => {
    const { data } = event.active
    if (data.current?.type === "recipe") setActiveRecipe(data.current.recipe)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveRecipe(null)
    if (!over) return
    const recipeData = active.data.current?.recipe
    const slotData = over.data.current
    if (!recipeData || !slotData) return
    const existing = mealPlan.find(m => m.date === slotData.date && m.meal_type === slotData.mealType)
    if (existing) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("meal_plan").insert({ user_id: user.id, recipe_id: recipeData.id, date: slotData.date, meal_type: slotData.mealType })
    await fetchData()
  }

  const handleRemoveMeal = async (mealId) => {
    await supabase.from("meal_plan").delete().eq("id", mealId)
    await fetchData()
  }

  const handleMobileTap = (date, mealType) => setMobileModal({ date, mealType })

  const handleMobileSelect = async (recipe) => {
    if (!mobileModal) return
    const existing = mealPlan.find(m => m.date === mobileModal.date && m.meal_type === mobileModal.mealType)
    if (existing) { setMobileModal(null); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("meal_plan").insert({ user_id: user.id, recipe_id: recipe.id, date: mobileModal.date, meal_type: mobileModal.mealType })
    setMobileModal(null)
    await fetchData()
  }

  const prevPeriod = () => {
    if (view === "week") { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d) }
    else { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }
  }

  const nextPeriod = () => {
    if (view === "week") { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d) }
    else { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }
  }

  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  const weekLabel = `${days[0].getDate()} — ${days[6].getDate()} ${days[6].toLocaleString("fr-FR", { month: "long" })} ${days[6].getFullYear()}`
  const monthLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`
  const monthDays = getMonthDays(currentYear, currentMonth)

  const toggleBtnStyle = (active) => ({ 
    padding: "6px 24px",
    borderRadius: 10,
    fontSize: 12,
    border: "none",
    cursor: "pointer",
    fontFamily: "Poppins, sans-serif",
    fontWeight: 700,
    letterSpacing: "-0.05em",
    transition: "all 0.2s ease",
    backgroundColor: active ? "#4c4c4c" : "transparent",
    color: active ? "#ffffff" : "rgba(255,255,255,0.45)",
    whiteSpace: "nowrap",
  })

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      {mobileModal && (
        <MobileRecipeModal recipes={recipes} onSelect={handleMobileSelect} onClose={() => setMobileModal(null)} />
      )}

      {showBalancePopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ backgroundColor: "#091718", borderRadius: 16, padding: 32, maxWidth: 360, width: "100%", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
            <img src="/icons/salad.png" alt="" style={{ width: 48, height: 48, marginBottom: 16 }} />
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#ffffff" }}>bientôt disponible !</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500, lineHeight: 1.6 }}>
              la fonctionnalité d'équilibrage automatique de ton planning est en cours de développement
            </p>
            <button 
              onClick={() => setShowBalancePopup(false)}
              style={{ width: "100%", padding: "12px", borderRadius: 10, backgroundColor: "#d57bff", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-0.05em", color: "#130b2d", transition: "transform 0.2s ease" }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
            >ok, j'attends !</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", height: "100%", overflow: "hidden", backgroundColor: "#111111" }}>

        {/* MAIN */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px" : "20px 20px 20px 24px" }}>

          {/* HEADER */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src="/icons/calendar.png" alt="" style={{ width: 22, height: 22 }} />
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#ffffff" }}>mon planning</h1>
              </div>

              <div style={{ display: "flex", backgroundColor: "#2d2d2d", borderRadius: 10, gap: 2 }}>
                <button className="text-light" onClick={() => setView("week")} style={toggleBtnStyle(view === "week")}>semaine</button>
                <button className="text-light" onClick={() => setView("month")} style={toggleBtnStyle(view === "month")}>mois</button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={prevPeriod}
                  style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#2d2d2d", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/icons/left.png" alt="" style={{ width: 18, height: 18 }} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", minWidth: 160, textAlign: "center" }}>
                  {view === "week" ? weekLabel : monthLabel}
                </span>
                <button onClick={nextPeriod}
                  style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#2d2d2d", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/icons/right.png" alt="" style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowBalancePopup(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, backgroundColor: "#d57bff", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "-0.05em", color: "#130b2d", transition: "transform 0.2s ease" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
              >
                <img src="/icons/salad.png" alt="" style={{ width: 16, height: 16 }} />
                équilibrer
              </button>

              <button onClick={() => navigate("/shopping")}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, backgroundColor: "#cfff79", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "-0.05em", color: "#1a3d1a", transition: "transform 0.2s ease" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
              >
                <img src="/icons/cart.png" alt="" style={{ width: 16, height: 16 }} />
                courses
              </button>
            </div>
          </div>

          {/* VUE SEMAINE */}
          {view === "week" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "20px repeat(7, 1fr)" : "32px repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                <div />
                {days.map((day, i) => (
                  <div key={i} style={{ textAlign: "center", padding: "4px 0" }}>
                    <div className="text-light" style={{ fontSize: 12, color: "#ffffff", letterSpacing: "0.05em" }}>
                      {isMobile ? DAY_NAMES[i][0] : DAY_NAMES[i]}
                    </div>
                    <div style={{
                      fontSize: isMobile ? 11 : 16, fontWeight: 700,
                      width: isMobile ? 20 : 28, height: isMobile ? 20 : 28,
                      borderRadius: "50%", margin: "2px auto 0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backgroundColor: formatDate(day) === today ? "#170d32" : "transparent",
                      color: "#ffffff",
                    }}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "20px repeat(7, 1fr)" : "32px repeat(7, 1fr)", gap: 4 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {MEAL_TYPES.map(type => (
                    <div key={type} style={{ height: isMobile ? 90 : 120, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
                      <img src={MEAL_ICONS[type]} alt={type} style={{ width: isMobile ? 14 : 18, height: isMobile ? 14 : 18 }} />
                    </div>
                  ))}
                </div>
                {days.map((day, dayIndex) => (
                  <div key={dayIndex} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {MEAL_TYPES.map(mealType => (
                      <MealSlot key={mealType} date={formatDate(day)} mealType={mealType}
                        meal={getMeal(day, mealType)} onRemove={handleRemoveMeal}
                        isToday={formatDate(day) === today} isMobile={isMobile} onMobileTap={handleMobileTap} />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* VUE MOIS */}
          {view === "month" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 5 }}>
                {DAY_NAMES.map(day => (
                  <div key={day} style={{ textAlign: "center", fontSize: 10, color: "#ffffff", letterSpacing: "0.05em", padding: "4px 0" }}>
                    {isMobile ? day[0] : day.slice(0, 3)}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "110px", gap: 5 }}>
                {monthDays.map((day, i) => (
                  day
                    ? <MonthDayCell key={i} date={day} meals={getMealsForDay(day)} onRemove={handleRemoveMeal} isToday={formatDate(day) === today} />
                    : <div key={i} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* SIDEBAR RECETTES */}
        {!isMobile && (
          <div style={{ width: 240, borderLeft: "1px solid rgba(255,255,255,0.06)", backgroundColor: "#2d2d2d", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "16px 12px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <img src="/icons/book.png" alt="" style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>mes recettes</span>
              </div>
              <input
                className="text-light" style={{ width: "100%", backgroundColor: "#1a1a1a", border: "none", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#ffffff", outline: "none", boxSizing: "border-box", fontFamily: "Poppins, sans-serif", fontWeight: 500, letterSpacing: "-0.05em" }}
                placeholder="rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {filteredRecipes.length === 0
                ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 16 }}>Aucune recette</div>
                : filteredRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)
              }
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", margin: 0 }}>⠿ glisse une recette sur un créneau</p>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeRecipe && (
          <div style={{ backgroundColor: getRecipeCardBg(activeRecipe), border: `1.5px solid ${getRecipeCardBorder(activeRecipe)}`, borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, width: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            {activeRecipe.photo_url ? (
              <img src={activeRecipe.photo_url} alt={activeRecipe.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🍽</div>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, color: getTextColor(getRecipeCardBg(activeRecipe)), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeRecipe.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
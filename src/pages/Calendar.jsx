import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { ALL_TAGS, DEFAULT_CARD_BG, DEFAULT_CARD_BORDER } from "../tags"
import { useTheme } from "../context/ThemeContext"
import { getTextColor } from "../utils/ui"
import { usePremium } from "../hooks/usePremium"
import UpgradePopup from "../components/Upgradepopup"

const MEAL_TYPES = ["Matin", "Midi", "Soir"]
const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
const DAY_COLORS = ["#FFB9E1", "#9BE7FF", "#CFFF79", "#FE7C3E", "#9BE7FF", "#d57bff", "#f3501e"]
const DAY_TEXT_COLORS = ["#510312", "#03225C", "#091718", "#510312", "#03225C", "#130b2d", "#ffffff"]
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

const MEAL_ICONS = {
  Matin: "/icons/sun.webp",
  Midi: "/icons/clock.webp",
  Soir: "/icons/moon.webp",
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
  const tag = ALL_TAGS.find(t => t.value === recipe.primary_tag || t.key === recipe.primary_tag)
  return tag?.cardBg || null
}

function getRecipeCardBorder(recipe) {
  if (!recipe) return DEFAULT_CARD_BORDER
  const tag = ALL_TAGS.find(t => t.value === recipe.primary_tag || t.key === recipe.primary_tag)
  return tag?.cardBorder || DEFAULT_CARD_BORDER
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
    <div ref={setNodeRef} style={{ ...style, backgroundColor: cardBg || "var(--bg-card-2)", borderRadius: 10, padding: "10px 12px", marginBottom: 6, cursor: "grab", display: "flex", alignItems: "center", gap: 10, border: `1.5px solid ${cardBorder}`, transition: "border-color 0.15s" }} {...listeners} {...attributes}>
      {recipe.photo_url
        ? <img src={recipe.photo_url} alt={recipe.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.15)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽</div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.04em" }}>{recipe.name}</div>
        {recipe.prep_time && (
          <div style={{ fontSize: 10, color: textColor, opacity: 0.6, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
            <img src="/icons/clock.webp" alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display = "none"} />
            {recipe.prep_time} min
          </div>
        )}
      </div>
      <span style={{ color: textColor, opacity: 0.3, fontSize: 13, letterSpacing: "0.12em" }}>⠿</span>
    </div>
  )
}

function MealSlot({ date, mealType, meals, onRemove, onAdd, isDay }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${date}-${mealType}`, data: { date, mealType } })
  const cellBg = isOver ? (isDay ? "rgba(213,123,255,0.08)" : "#26162e") : (isDay ? "#F5F0E8" : "#2d2d2d")
  const borderColor = isOver ? "#d57bff" : isDay ? "rgba(0,0,0,0.07)" : "transparent"
  const subSlotBg = isDay ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)"

  // 3 slots par défaut ; si les 3 sont remplies on en ajoute jusqu'à 10 max
  const slotsToShow = meals.length >= 3 ? Math.min(10, meals.length + 1) : 3

  return (
    <div ref={setNodeRef} style={{
      borderRadius: 10, border: `1.5px solid ${borderColor}`,
      backgroundColor: cellBg, transition: "all 0.15s",
      padding: 5, display: "flex", flexDirection: "column", gap: 3,
    }}>
      {Array.from({ length: slotsToShow }).map((_, idx) => {
        const meal = meals[idx]
        if (meal) {
          const cardBg = getRecipeCardBg(meal.recipes) || (isDay ? "#EDE8DF" : "#2d2d2d")
          const cardBorder = getRecipeCardBorder(meal.recipes)
          const textColor = getTextColor(cardBg)
          return (
            <div key={meal.id} style={{
              backgroundColor: cardBg, borderRadius: 7, border: `1px solid ${cardBorder}`,
              height: 30, minHeight: 30, maxHeight: 30, display: "flex", alignItems: "center", gap: 6, padding: "0 7px", flexShrink: 0, overflow: "hidden",
            }}>
              {meal.recipes?.photo_url && (
                <img src={meal.recipes.photo_url} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 10, fontWeight: 700, color: textColor, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.03em" }}>
                {meal.recipes?.name}
              </span>
              <button onClick={() => onRemove(meal.id)} style={{ background: "none", border: "none", cursor: "pointer", color: textColor, opacity: 0.35, fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.style.opacity = "0.35"}
              >×</button>
            </div>
          )
        }
        return (
          <div key={`empty-${idx}`} onClick={() => onAdd(date, mealType)} style={{
            backgroundColor: subSlotBg, borderRadius: 7,
            height: 30, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, transition: "opacity 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.6"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <span style={{ fontSize: 13, fontWeight: 400, fontFamily: "Poppins, sans-serif", color: isDay ? "#111" : "#fff", opacity: 0.18, userSelect: "none", lineHeight: 1 }}>
              +
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MonthMealSlot({ dateStr, mealType, meal, onRemove, isDay }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${dateStr}-${mealType}`, data: { date: dateStr, mealType } })
  const cardBg = meal ? (getRecipeCardBg(meal.recipes) || "var(--bg-card)") : null
  const cardBorder = meal ? getRecipeCardBorder(meal.recipes) : null
  const textColor = cardBg ? getTextColor(cardBg) : "var(--text-main)"
  const tagInfo = meal ? ALL_TAGS.find(t => t.value === meal.recipes?.primary_tag || t.key === meal.recipes?.primary_tag) : null

  return (
    <div ref={setNodeRef} style={{ flex: 1, minHeight: 0, backgroundColor: meal ? cardBg : isOver ? "rgba(243,80,30,0.12)" : isDay ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.03)", border: meal ? `1px solid ${cardBorder || "var(--border)"}` : isOver ? "1px solid #d57bff" : "1px solid transparent", borderRadius: 5, display: "flex", alignItems: "center", padding: "0 5px", gap: 3, overflow: "hidden", transition: "all 0.15s" }}>
      {meal ? (
        <>
          {tagInfo && <img src={`/icons/${tagInfo.icon}.webp`} alt="" style={{ width: 9, height: 9, flexShrink: 0, opacity: 0.8 }} onError={e => e.target.style.display = "none"} />}
          <span style={{ fontSize: 9, fontWeight: 700, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, lineHeight: 1 }}>{meal.recipes?.name}</span>
          <button onClick={() => onRemove(meal.id)} style={{ background: "none", border: "none", cursor: "pointer", color: textColor, opacity: 0.25, fontSize: 11, lineHeight: 1, flexShrink: 0, padding: 0 }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.25"}>×</button>
        </>
      ) : (
        <img src={MEAL_ICONS[mealType]} alt={mealType} style={{ width: 8, height: 8, opacity: isOver ? 0.8 : 0.15, transition: "opacity 0.15s" }} onError={e => e.target.style.display = "none"} />
      )}
    </div>
  )
}

function MonthDayCell({ date, meals, onRemove, isToday, isDay }) {
  const dateStr = formatDate(date)
  const getMealForType = (type) => meals.find(m => m.meal_type === type)
  return (
    <div style={{ height: 110, backgroundColor: isDay ? "#F5F0E8" : "#2d2d2d", borderRadius: 10, border: isToday ? "1.5px solid #d57bff" : `1.5px solid ${isDay ? "rgba(0,0,0,0.07)" : "transparent"}`, display: "flex", flexDirection: "column", padding: "4px 5px 5px", gap: 3, overflow: "hidden" }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: isToday ? "#d57bff" : "transparent", color: isToday ? "#ffffff" : isDay ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)" }}>{date.getDate()}</div>
      </div>
      {MEAL_TYPES.map(type => <MonthMealSlot key={type} dateStr={dateStr} mealType={type} meal={getMealForType(type)} onRemove={onRemove} isDay={isDay} />)}
    </div>
  )
}

function MobileMealSlot({ dateStr, mealType, meal, onRemove, handleMobileTap, isDay }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${dateStr}-${mealType}`, data: { date: dateStr, mealType } })
  const cardBg = meal ? (getRecipeCardBg(meal.recipes) || (isDay ? "#EDE8DF" : "#4c4c4c")) : (isDay ? "#EDE8DF" : "#4c4c4c")
  const cardBorder = meal ? getRecipeCardBorder(meal.recipes) : null
  const textColor = cardBg ? getTextColor(cardBg) : (isDay ? "#111111" : "#ffffff")
  return (
    <div ref={setNodeRef} onClick={() => !meal && handleMobileTap(dateStr, mealType)} style={{ height: 20, backgroundColor: meal ? cardBg : isOver ? "rgba(243,80,30,0.12)" : cardBg, borderRadius: 3, border: meal && cardBorder ? `1px solid ${cardBorder}` : isOver ? "1px solid #d57bff" : "1px solid transparent", display: "flex", alignItems: "center", padding: "0 4px", gap: 3, overflow: "hidden", cursor: meal ? "default" : "pointer", transition: "all 0.15s", flexShrink: 0 }}>
      {meal ? (
        <>
          <span style={{ fontSize: 10, fontWeight: 700, color: textColor, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.07em", lineHeight: "9px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{meal.recipes?.name}</span>
          <button onClick={(e) => { e.stopPropagation(); onRemove(meal.id) }} style={{ background: "none", border: "none", cursor: "pointer", color: textColor, opacity: 0.25, fontSize: 14, lineHeight: 1, flexShrink: 0, padding: 0 }}>×</button>
        </>
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/icons/plus.webp" alt="+" style={{ width: 12, height: 12, opacity: isOver ? 0.8 : 0.15, transition: "opacity 0.15s" }} />
        </div>
      )}
    </div>
  )
}

function MobileMonthDayCell({ date, meals, onRemove, isToday, handleMobileTap, isDay }) {
  const dateStr = formatDate(date)
  const dayOfWeek = date.getDay()
  const dayName = DAY_NAMES[dayOfWeek === 0 ? 6 : dayOfWeek - 1]
  const getMealForType = (type) => meals.find(m => m.meal_type === type)
  return (
    <div style={{ height: 105, backgroundColor: isDay ? "#F5F0E8" : "#2d2d2d", borderRadius: 10, border: isToday ? "1.5px solid #d57bff" : `1.5px solid ${isDay ? "rgba(0,0,0,0.07)" : "transparent"}`, display: "flex", flexDirection: "column", padding: "4px 7px 5px", gap: 4, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 1, flexShrink: 0 }}>
        <span style={{ paddingTop: 5, fontSize: 14, color: isDay ? "#111111" : "#ffffff", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.07em", lineHeight: "9px" }}>{date.getDate()}</span>
        <span className="text-light" style={{ paddingLeft: 3, fontSize: 13, fontWeight: 700, color: isDay ? "#111111" : "#ffffff", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.07em", lineHeight: "9px" }}>{dayName}</span>
      </div>
      {MEAL_TYPES.map(type => <MobileMealSlot key={type} dateStr={dateStr} mealType={type} meal={getMealForType(type)} onRemove={onRemove} handleMobileTap={handleMobileTap} isDay={isDay} />)}
    </div>
  )
}

function MobileRecipeModal({ recipes, onSelect, onClose, isDay }) {
  const [search, setSearch] = useState("")
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end" }}>
      <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "75vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>choisir une recette</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer" }}>×</button>
          </div>
          <input style={{ width: "100%", backgroundColor: "var(--bg-card-2)", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--text-main)", outline: "none", boxSizing: "border-box" }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(recipe => {
            const tagInfo = ALL_TAGS.find(t => t.value === recipe.primary_tag || t.key === recipe.primary_tag)
            const cardBg = tagInfo?.cardBg || (isDay ? "var(--bg-card-2)" : "#2d2d2d")
            const cardBorder = tagInfo?.cardBorder || "var(--border)"
            const textColor = tagInfo ? getTextColor(tagInfo.cardBg) : "var(--text-main)"
            const mutedColor = tagInfo ? (getTextColor(tagInfo.cardBg) === "#ffffff" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)") : "var(--text-muted)"
            return (
              <button key={recipe.id} onClick={() => onSelect(recipe)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, backgroundColor: cardBg, border: `1.5px solid ${cardBorder}`, borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "transform 0.1s" }} onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"} onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}>
                {recipe.photo_url ? <img src={recipe.photo_url} alt={recipe.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, backgroundColor: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🍽</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.04em" }}>{recipe.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    {recipe.prep_time && <p style={{ margin: 0, fontSize: 11, color: mutedColor, fontFamily: "Poppins, sans-serif" }}>⏱ {recipe.prep_time} min</p>}
                    {tagInfo && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: tagInfo.pillText, backgroundColor: tagInfo.pillBg, padding: "1px 7px", borderRadius: 20, fontFamily: "Poppins, sans-serif" }}><img src={`/icons/${tagInfo.icon}.webp`} alt="" style={{ width: 9, height: 9 }} onError={e => e.target.style.display = "none"} />{tagInfo.label}</span>}
                  </div>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: tagInfo ? tagInfo.pillBg : "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <img src="/icons/plus.webp" alt="+" style={{ width: 16, height: 16, filter: tagInfo ? (getTextColor(tagInfo.pillBg) === "#ffffff" ? "invert(1)" : "invert(0)") : "none" }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Calendar() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isDay } = useTheme()
  const { isPremium } = usePremium()

  const [view, setView] = useState("week")
  const [monday, setMonday] = useState(getMonday(new Date()))
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [mealPlan, setMealPlan] = useState([])
  const [recipes, setRecipes] = useState([])
  const [search, setSearch] = useState("")
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [addModal, setAddModal] = useState(null)
  const [showUpgradePopup, setShowUpgradePopup] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState("")

  const currentMonday = getMonday(new Date())
  const days = getWeekDays(monday)
  const today = getTodayLocal()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const isCurrentWeek = formatDate(monday) === formatDate(currentMonday)

  // eslint-disable-next-line react-hooks/immutability, react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [monday, currentMonth, currentYear, view])

  const fetchData = async () => {
    try {
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
    } catch (err) {
      console.error("fetchData error", err)
    }
  }

  const getMeal = (date, mealType) => mealPlan.find(m => m.date === formatDate(date) && m.meal_type === mealType)
  const getMealsForDay = (date) => mealPlan.filter(m => m.date === formatDate(date))
  const getMealsForSlot = (dateStr, mealType) => mealPlan.filter(m => m.date === dateStr && m.meal_type === mealType)

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
    const alreadyThere = mealPlan.some(m => m.date === slotData.date && m.meal_type === slotData.mealType && m.recipe_id === recipeData.id)
    if (alreadyThere) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("meal_plan").insert({ user_id: user.id, recipe_id: recipeData.id, date: slotData.date, meal_type: slotData.mealType })
    await fetchData()
  }

  const handleRemoveMeal = async (mealId) => {
    await supabase.from("meal_plan").delete().eq("id", mealId)
    await fetchData()
  }

  const handleMobileTap = (date, mealType) => setAddModal({ date, mealType })

  const handleMobileSelect = async (recipe) => {
    if (!addModal) return
    const alreadyThere = mealPlan.some(m => m.date === addModal.date && m.meal_type === addModal.mealType && m.recipe_id === recipe.id)
    if (alreadyThere) { setAddModal(null); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("meal_plan").insert({ user_id: user.id, recipe_id: recipe.id, date: addModal.date, meal_type: addModal.mealType })
    setAddModal(null)
    await fetchData()
  }

  const triggerUpgrade = (reason) => { setUpgradeReason(reason); setShowUpgradePopup(true) }

  const prevPeriod = () => {
    if (view === "week") {
      if (!isPremium && isCurrentWeek) { triggerUpgrade("navigation"); return }
      const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d)
    } else {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
      else setCurrentMonth(m => m - 1)
    }
  }

  const nextPeriod = () => {
    if (view === "week") {
      if (!isPremium && isCurrentWeek) { triggerUpgrade("navigation"); return }
      const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d)
    } else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
      else setCurrentMonth(m => m + 1)
    }
  }

  const handleViewChange = (newView) => {
    if (newView === "month" && !isPremium) { triggerUpgrade("month"); return }
    setView(newView)
  }

  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  const weekLabel = `${days[0].getDate()} — ${days[6].getDate()} ${days[6].toLocaleString("fr-FR", { month: "long" })} ${days[6].getFullYear()}`
  const monthLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`
  const monthDays = getMonthDays(currentYear, currentMonth)

  const handlePrint = () => {
    const origin = window.location.origin
    const hexToRgba = (hex, alpha) => {
      if (!hex || !hex.startsWith("#")) return hex
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r},${g},${b},${alpha})`
    }
    const getTagInfo = (recipe) => ALL_TAGS.find(t => t.value === recipe?.primary_tag || t.key === recipe?.primary_tag)
    const mealCard = (recipe) => {
      const cardBg = getRecipeCardBg(recipe) || DEFAULT_CARD_BG
      const cardBorder = getRecipeCardBorder(recipe)
      const tagInfo = getTagInfo(recipe)
      const icon = tagInfo ? `<img class="icon" src="${origin}/icons/${tagInfo.icon}.webp" onerror="this.style.display='none'" />` : ""
      return { bg: hexToRgba(cardBg, 0.12), border: hexToRgba(cardBorder, 0.40), color: "#111111", icon }
    }

    let title, bodyHtml
    if (view === "week") {
      title = `mon planning — semaine du ${weekLabel}`

      const headHtml = days.map((d, i) => `
        <div class="day-head" style="background:${hexToRgba(DAY_COLORS[i], 0.12)};color:#111111;border:1.5px solid ${hexToRgba(DAY_COLORS[i], 0.35)}">
          ${DAY_NAMES[i]}<div class="num">${d.getDate()}</div>
        </div>`).join("")

      const rowsHtml = MEAL_TYPES.map(mealType => {
        const label = `<div class="meal-label"><img src="${origin}${MEAL_ICONS[mealType]}" onerror="this.style.display='none'" />${mealType}</div>`
        const cells = days.map(d => {
          const recipe = getMeal(d, mealType)?.recipes
          if (!recipe) return `<div class="cell empty"></div>`
          const { bg, border, color, icon } = mealCard(recipe)
          return `<div class="cell" style="background:${bg};color:${color};border-color:${border}">
            ${icon}
            <div class="name">${recipe.name}</div>
            ${recipe.prep_time ? `<div class="time">⏱ ${recipe.prep_time} min</div>` : ""}
          </div>`
        }).join("")
        return `${label}${cells}`
      }).join("")

      bodyHtml = `<div class="week-grid"><div></div>${headHtml}${rowsHtml}</div>`
    } else {
      const weeks = []
      for (let i = 0; i < monthDays.length; i += 7) weeks.push(monthDays.slice(i, i + 7))
      title = `mon planning — ${monthLabel}`

      const headHtml = DAY_NAMES.map((d, i) => `<div class="month-head" style="background:${hexToRgba(DAY_COLORS[i], 0.12)};color:#111111;border:1.5px solid ${hexToRgba(DAY_COLORS[i], 0.35)}">${d.slice(0, 3)}</div>`).join("")

      const cellsHtml = weeks.map(week => week.map(day => {
        if (!day) return `<div class="month-cell empty"></div>`
        const isToday = formatDate(day) === today
        const pills = MEAL_TYPES.map(type => {
          const recipe = getMeal(day, type)?.recipes
          if (!recipe) return ""
          const { bg, border, color, icon } = mealCard(recipe)
          return `<div class="meal-pill" style="background:${bg};color:${color};border-color:${border}">${icon}<span>${recipe.name}</span></div>`
        }).join("")
        return `<div class="month-cell ${isToday ? "today" : ""}"><div class="day-num ${isToday ? "today" : ""}">${day.getDate()}</div>${pills}</div>`
      }).join("")).join("")

      bodyHtml = `<div class="month-grid">${headHtml}${cellsHtml}</div>`
    }

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: landscape; margin: 12mm; }
        body { font-family: 'Poppins', sans-serif; margin: 0; padding: 24px; color: #111111; background: #ffffff; }
        .brand { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 6px; }
        .brand img { width: 18px; height: 18px; }
        .brand .accent { color: #f3501e; }
        h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.04em; margin: 0 0 18px; text-transform: capitalize; display: flex; align-items: center; gap: 8px; }
        h1 img { width: 22px; height: 22px; }
        .week-grid { display: grid; grid-template-columns: 64px repeat(7, 1fr); gap: 6px; }
        .day-head { border-radius: 10px; padding: 8px 4px; text-align: center; font-weight: 700; font-size: 11px; letter-spacing: -0.03em; text-transform: capitalize; }
        .day-head .num { font-size: 15px; margin-top: 2px; }
        .meal-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #999999; padding: 0 4px; text-transform: capitalize; }
        .meal-label img { width: 14px; height: 14px; }
        .cell { border-radius: 10px; padding: 8px; min-height: 64px; display: flex; flex-direction: column; justify-content: center; gap: 4px; border: 1.5px solid transparent; }
        .cell.empty { background: #f7f7f7; border: 1.5px dashed #e0e0e0; }
        .cell .icon { width: 13px; height: 13px; opacity: 0.85; }
        .cell .name { font-size: 11px; font-weight: 700; line-height: 1.3; letter-spacing: -0.02em; }
        .cell .time { font-size: 10px; opacity: 0.65; font-weight: 600; }
        .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .month-head { text-align: center; font-size: 10px; font-weight: 700; padding: 6px 0; border-radius: 8px; text-transform: capitalize; }
        .month-cell { border-radius: 10px; background: #f7f7f7; border: 1.5px solid #eeeeee; padding: 6px; min-height: 92px; display: flex; flex-direction: column; gap: 3px; }
        .month-cell.today { border: 1.5px solid rgba(213,123,255,0.5); }
        .month-cell.empty { background: transparent; border: none; }
        .day-num { font-size: 11px; font-weight: 700; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #777777; margin-bottom: 2px; }
        .day-num.today { background: rgba(213,123,255,0.20); color: #8833cc; }
        .meal-pill { display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; padding: 3px 6px; border-radius: 6px; border: 1px solid transparent; letter-spacing: -0.02em; }
        .meal-pill img { width: 9px; height: 9px; flex-shrink: 0; }
        .meal-pill span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      </style></head><body>
      <div class="brand"><img src="${origin}/icons/shrim.webp" onerror="this.style.display='none'" /><span>Shrim<span class="accent">ply</span></span></div>
      <h1><img src="${origin}/icons/calendar.webp" onerror="this.style.display='none'" />${title}</h1>
      ${bodyHtml}
      </body></html>`

    const win = window.open("", "_blank")
    win.document.write(html)
    win.document.close()
    win.focus()
    let printed = false
    const doPrint = () => { if (printed) return; printed = true; win.print(); win.close() }
    win.onload = doPrint
    setTimeout(doPrint, 1000)
  }

  const toggleBtnStyle = (active) => ({
    padding: "6px 16px", borderRadius: 6, fontSize: 12, border: "none", cursor: "pointer",
    fontFamily: "Poppins, sans-serif", fontWeight: 700, letterSpacing: "-0.05em",
    transition: "all 0.2s ease",
    backgroundColor: active ? (isDay ? "#111111" : "#4C4C4C") : "transparent",
    color: active ? "#ffffff" : "var(--text-muted)",
    whiteSpace: "nowrap",
  })

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      {addModal && <MobileRecipeModal recipes={recipes} onSelect={handleMobileSelect} onClose={() => setAddModal(null)} isDay={isDay} />}

      {showUpgradePopup && (
        <UpgradePopup
          onClose={() => setShowUpgradePopup(false)}
          message={
            upgradeReason === "month"
              ? "La vue mois est réservée aux membres premium. En version gratuite, tu as accès à la semaine en cours."
              : "La navigation entre semaines est réservée aux membres premium. En version gratuite, tu as accès à la semaine en cours."
          }
        />
      )}

      <div style={{ display: "flex", height: "100%", overflow: "hidden", backgroundColor: "var(--bg-main)", transition: "background-color 0.25s ease" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px" : "20px 20px 20px 24px" }}>

          {/* HEADER */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>

            {/* Titre + toggle vue */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <img src="/icons/calendar.webp" alt="" style={{ width: 22, height: 22 }} />
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>mon planning</h1>
              <div style={{ display: "flex", backgroundColor: "var(--bg-card-2)", borderRadius: 10, padding: 3, gap: 2 }}>
                <button className="text-light" onClick={() => handleViewChange("week")} style={toggleBtnStyle(view === "week")}>semaine</button>
                <button className="text-light" onClick={() => handleViewChange("month")} style={{ ...toggleBtnStyle(view === "month"), opacity: !isPremium ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}>
                  mois
                  {!isPremium && <img src="/icons/lock.webp" alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display = "none"} />}
                </button>
              </div>
              <button onClick={handlePrint} title="imprimer le planning" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer", backgroundColor: "var(--bg-card-2)", color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "-0.05em", transition: "transform 0.2s ease" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}>
                <img src="/icons/printer.webp" alt="" style={{ width: 16, height: 16 }} onError={e => e.target.style.display = "none"} />
                imprimer
              </button>
            </div>

            {/* Navigation date — flèches collées à la date */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <button onClick={prevPeriod} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "var(--bg-card-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: !isPremium && isCurrentWeek ? 0.4 : 1 }}>
                <img src="/icons/left.webp" alt="" style={{ width: 18, height: 18 }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", textAlign: "center", whiteSpace: "nowrap" }}>
                {view === "week" ? weekLabel : monthLabel}
                {!isPremium && view === "week" && isCurrentWeek && (
                  <span className="text-light" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 10, color: "var(--text-muted)", marginTop: 2, width: "100%" }}>
                    semaine en cours · navigation Premium
                    <img src="/icons/lock.webp" alt="" style={{ width: 10, height: 10 }} onError={e => e.target.style.display = "none"} />
                  </span>
                )}
              </span>
              <button onClick={nextPeriod} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "var(--bg-card-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: !isPremium && isCurrentWeek ? 0.4 : 1 }}>
                <img src="/icons/right.webp" alt="" style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Boutons action */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button id="btn-go-shopping" onClick={() => navigate("/shopping")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", borderRadius: 10, backgroundColor: "#cfff79", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-0.05em", color: "#1a3d1a", transition: "transform 0.2s ease" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"} onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}>
                <img src="/icons/cart.webp" alt="" style={{ width: 16, height: 16 }} />
                courses
              </button>
            </div>
          </div>

          {/* VUE SEMAINE */}
          {view === "week" && (
            <>
              {!isMobile && (
                <div style={{ display: "grid", gridTemplateColumns: "36px repeat(7, minmax(0, 1fr))", gap: "10px 8px" }}>
                  {/* En-tête : coin vide + 7 jours */}
                  <div />
                  {days.map((day, i) => {
                    const isToday = formatDate(day) === today
                    return (
                      <div key={i} style={{ textAlign: "center", paddingBottom: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 5 }}>
                          {DAY_NAMES[i].slice(0, 3)}
                        </div>
                        <div style={{
                          fontSize: 17, fontWeight: 700, width: 30, height: 30, borderRadius: "50%",
                          margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center",
                          backgroundColor: isToday ? "#d57bff" : "transparent",
                          color: isToday ? "#fff" : "var(--text-main)",
                        }}>{day.getDate()}</div>
                      </div>
                    )
                  })}

                  {/* 3 lignes : icône + 7 créneaux */}
                  {MEAL_TYPES.flatMap(type => [
                    <div key={`icon-${type}`} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={MEAL_ICONS[type]} alt={type} style={{ width: 18, height: 18, opacity: 0.45 }} />
                    </div>,
                    ...days.map((day, i) => {
                      const dateStr = formatDate(day)
                      return (
                        <MealSlot key={`${type}-${i}`} date={dateStr} mealType={type}
                          meals={getMealsForSlot(dateStr, type)}
                          onRemove={handleRemoveMeal} onAdd={handleMobileTap}
                          isToday={formatDate(day) === today} isDay={isDay} />
                      )
                    })
                  ])}
                </div>
              )}

              {isMobile && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", marginLeft: 30, gap: 6, marginBottom: 2 }}>
                    {MEAL_TYPES.map(type => (
                      <div key={type} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={MEAL_ICONS[type]} alt={type} style={{ width: 16, height: 16, opacity: 0.6 }} />
                      </div>
                    ))}
                  </div>
                  {days.map((day, i) => {
                    const dayColor = DAY_COLORS[i]
                    const dayTextColor = DAY_TEXT_COLORS[i]
                    const isToday = formatDate(day) === today
                    const dateStr = formatDate(day)
                    return (
                      <div key={i} style={{ display: "flex", borderRadius: 10, overflow: "hidden", height: 108, border: isToday ? `1.5px solid ${dayColor}` : "1.5px solid transparent" }}>
                        <div style={{ width: 28, backgroundColor: dayColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, borderRadius: "8px 0 0 8px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: dayTextColor, fontFamily: "Poppins, sans-serif", letterSpacing: "-0.05em", writingMode: "vertical-rl", transform: "rotate(180deg)", textTransform: "uppercase" }}>{DAY_NAMES[i]}</span>
                        </div>
                        <div style={{ flex: 1, backgroundColor: isDay ? "#EDE8DF" : "#2d2d2d", display: "flex", gap: 5, padding: "5px 5px 5px 6px", borderRadius: "0 8px 8px 0" }}>
                          {MEAL_TYPES.map(mealType => {
                            const slotMeals = getMealsForSlot(dateStr, mealType)
                            const firstMeal = slotMeals[0]
                            const extra = slotMeals.length - 1
                            const mealCardBg = firstMeal ? (getRecipeCardBg(firstMeal.recipes) || (isDay ? "#EDE8DF" : "#1a1a1a")) : null
                            const mealCardBorder = firstMeal ? getRecipeCardBorder(firstMeal.recipes) : null
                            const mealTextColor = mealCardBg ? getTextColor(mealCardBg) : (isDay ? "#111111" : "#ffffff")
                            return (
                              <div key={mealType} onClick={() => handleMobileTap(dateStr, mealType)} style={{ flex: 1, backgroundColor: firstMeal ? mealCardBg : (isDay ? "#D8D3CB" : "#4c4c4c"), borderRadius: 6, overflow: "hidden", border: firstMeal && mealCardBorder ? `1px solid ${mealCardBorder}` : "1px solid transparent", cursor: "pointer", display: "flex", flexDirection: "column", position: "relative" }}>
                                {firstMeal ? (
                                  <>
                                    {firstMeal.recipes?.photo_url && <img src={firstMeal.recipes.photo_url} alt={firstMeal.recipes.name} style={{ width: "100%", height: 54, objectFit: "cover", display: "block", flexShrink: 0 }} />}
                                    <div style={{ flex: 1, padding: "3px 5px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 0 }}>
                                      <div style={{ fontSize: 9, fontWeight: 700, color: mealTextColor, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.3 }}>{firstMeal.recipes?.name}</div>
                                      <button onClick={(e) => { e.stopPropagation(); handleRemoveMeal(firstMeal.id) }} style={{ fontSize: 9, color: mealTextColor, opacity: 0.4, background: "none", border: "none", cursor: "pointer", textAlign: "right", padding: 0 }}>×</button>
                                    </div>
                                    {extra > 0 && (
                                      <div style={{ position: "absolute", top: 3, right: 3, backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 8, fontWeight: 700, borderRadius: 6, padding: "1px 4px" }}>+{extra}</div>
                                    )}
                                  </>
                                ) : (
                                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src="/icons/plus.webp" alt="+" style={{ width: 22, height: 22, opacity: 0.35, userSelect: "none", pointerEvents: "none" }} />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* VUE MOIS */}
          {view === "month" && (
            <>
              {!isMobile ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 5 }}>
                    {DAY_NAMES.map(day => <div key={day} style={{ textAlign: "center", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0" }}>{day.slice(0, 3)}</div>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "110px", gap: 5 }}>
                    {monthDays.map((day, i) => day ? <MonthDayCell key={i} date={day} meals={getMealsForDay(day)} onRemove={handleRemoveMeal} isToday={formatDate(day) === today} isDay={isDay} /> : <div key={i} />)}
                  </div>
                </>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                  {monthDays.map((day, i) => day ? <MobileMonthDayCell key={i} date={day} meals={getMealsForDay(day)} onRemove={handleRemoveMeal} isToday={formatDate(day) === today} handleMobileTap={handleMobileTap} isDay={isDay} /> : <div key={i} />)}
                </div>
              )}
            </>
          )}
        </div>

        {/* SIDEBAR desktop */}
        {!isMobile && (
          <div id="calendar-recipe-list" style={{ width: 240, borderLeft: "1px solid var(--border)", backgroundColor: "var(--bg-card)", display: "flex", flexDirection: "column", flexShrink: 0, transition: "background-color 0.25s ease" }}>
            <div style={{ padding: "16px 12px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <img src="/icons/book.webp" alt="" style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>mes recettes</span>
              </div>
              <input style={{ width: "100%", backgroundColor: "var(--bg-card-2)", border: "none", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--text-main)", outline: "none", boxSizing: "border-box", fontFamily: "Poppins, sans-serif", fontWeight: 500, letterSpacing: "-0.05em" }} placeholder="rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {filteredRecipes.length === 0
                ? <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center", marginTop: 16 }}>Aucune recette</div>
                : filteredRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)
              }
            </div>
            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
              <p className="text-light" style={{ fontSize: 11, color: "var(--text-ghost)", textAlign: "center", margin: 0 }}>⠿ glisse une recette sur un créneau</p>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeRecipe && (
          <div style={{ backgroundColor: getRecipeCardBg(activeRecipe), border: `1.5px solid ${getRecipeCardBorder(activeRecipe)}`, borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, width: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            {activeRecipe.photo_url ? <img src={activeRecipe.photo_url} alt={activeRecipe.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} /> : <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🍽</div>}
            <span style={{ fontSize: 11, fontWeight: 700, color: getTextColor(getRecipeCardBg(activeRecipe)), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeRecipe.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
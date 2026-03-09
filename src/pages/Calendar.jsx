import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"

const MEAL_TYPES = ["Matin", "Midi", "Soir"]
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

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
  return date.toISOString().split("T")[0]
}

// Détection mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])
  return isMobile
}

// --- DRAG & DROP (desktop uniquement) ---
function RecipeCard({ recipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { type: "recipe", recipe }
  })
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  } : {}
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-zinc-50 mb-1.5 cursor-grab active:cursor-grabbing hover:border-orange-300 hover:bg-orange-50 transition">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-zinc-800 truncate">{recipe.name}</div>
        {recipe.prep_time && <div className="text-xs text-zinc-400">⏱ {recipe.prep_time} min</div>}
      </div>
      <span className="text-zinc-300 text-sm">⠿</span>
    </div>
  )
}

function MealSlot({ date, mealType, meal, onRemove, isToday, isMobile, onMobileTap }) {
  const slotId = `slot-${date}-${mealType}`
  const { setNodeRef, isOver } = useDroppable({ id: slotId, data: { date, mealType } })

  const mealColors = {
    "Matin": "bg-amber-50 border-amber-200",
    "Midi": "bg-blue-50 border-blue-200",
    "Soir": "bg-purple-50 border-purple-200",
  }
  const textColors = { "Matin": "text-amber-700", "Midi": "text-blue-700", "Soir": "text-purple-700" }
  const timeColors = { "Matin": "text-amber-400", "Midi": "text-blue-400", "Soir": "text-purple-400" }

  // Version mobile — tap pour ouvrir modal
  if (isMobile) {
    return (
      <div
        onClick={() => !meal && onMobileTap(date, mealType)}
        style={{ height: "60px" }}
        className={`rounded-lg border transition relative overflow-hidden
          ${meal ? `${mealColors[mealType]} ${isToday ? "ring-2 ring-brand-orange" : ""}` : "border-dashed border-gray-200 bg-white active:bg-orange-50"}`}
      >
        {meal ? (
          <div className="p-1.5 h-full flex flex-col justify-between">
            <div className={`text-xs font-semibold line-clamp-2 leading-tight ${textColors[mealType]}`}>
              {meal.recipes?.name}
            </div>
            <button onClick={(e) => { e.stopPropagation(); onRemove(meal.id) }}
              className={`${timeColors[mealType]} text-xs self-end opacity-60`}>× sup</button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-gray-300 text-xl">+</span>
          </div>
        )}
      </div>
    )
  }

  // Version desktop — drag & drop
  return (
    <div ref={setNodeRef} style={{ height: "76px" }}
      className={`rounded-lg border transition relative overflow-hidden shadow-sm
        ${meal
          ? `${mealColors[mealType]} ${isToday ? "ring-2 ring-brand-orange" : ""}`
          : isOver ? "border-brand-orange bg-brand-orange/5 border-dashed" : "border-dashed border-gray-200 bg-white hover:border-brand-orange/40"}`}
    >
      {meal ? (
        <div className="p-2 h-full flex flex-col justify-between">
          <div className={`text-xs font-semibold line-clamp-2 leading-tight ${textColors[mealType]}`}>
            {meal.recipes?.name}
          </div>
          <div className="flex items-center justify-between">
            {meal.recipes?.prep_time && <span className={`text-xs ${timeColors[mealType]}`}>⏱ {meal.recipes.prep_time}m</span>}
            <button onClick={() => onRemove(meal.id)}
              className={`${timeColors[mealType]} hover:text-red-400 transition text-base leading-none ml-auto opacity-50 hover:opacity-100`}>×</button>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <span className={`text-lg ${isOver ? "text-brand-orange" : "text-gray-200"}`}>+</span>
        </div>
      )}
    </div>
  )
}

function MonthDayCell({ date, meals, onRemove, isToday }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${formatDate(date)}-Midi`,
    data: { date: formatDate(date), mealType: "Midi" }
  })
  return (
    <div ref={setNodeRef}
      className={`min-h-24 border rounded-lg p-1.5 transition
        ${isToday ? "border-orange-400 bg-orange-50" : isOver ? "border-orange-300 bg-orange-50" : "border-gray-100 bg-white hover:border-orange-200"}`}
    >
      <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full
        ${isToday ? "bg-orange-500 text-white" : "text-zinc-500"}`}>
        {date.getDate()}
      </div>
      {meals.map(meal => (
        <div key={meal.id} className="flex items-center gap-1 bg-orange-100 rounded px-1 py-0.5 mb-0.5 group">
          <span className="text-xs text-orange-700 truncate flex-1">{meal.recipes?.name}</span>
          <button onClick={() => onRemove(meal.id)} className="text-orange-300 hover:text-red-400 transition opacity-0 group-hover:opacity-100 text-xs leading-none">×</button>
        </div>
      ))}
    </div>
  )
}

// --- MODAL MOBILE pour choisir une recette ---
function MobileRecipeModal({ recipes, onSelect, onClose }) {
  const [search, setSearch] = useState("")
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white dark:bg-zinc-800 rounded-t-3xl w-full max-h-[75vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Choisir une recette</h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
          </div>
          <input
            className="w-full bg-zinc-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-orange"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-400 text-center mt-4">Aucune recette trouvée</p>
          ) : filtered.map(recipe => (
            <button key={recipe.id} onClick={() => onSelect(recipe)}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-700 hover:border-brand-orange hover:bg-orange-50 transition text-left">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-white truncate">{recipe.name}</p>
                {recipe.prep_time && <p className="text-xs text-zinc-400">⏱ {recipe.prep_time} min</p>}
              </div>
              <span className="text-brand-orange text-lg">+</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- COMPOSANT PRINCIPAL ---
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

  // Modal mobile
  const [mobileModal, setMobileModal] = useState(null) // { date, mealType }

  const days = getWeekDays(monday)
  const today = formatDate(new Date())
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
    const { data: planData } = await supabase
      .from("meal_plan").select("*, recipes(name, prep_time, tags)")
      .eq("user_id", user.id).gte("date", startDate).lte("date", endDate)
    const { data: recipesData } = await supabase.from("recipes").select("*").eq("user_id", user.id)
    if (planData) setMealPlan(planData)
    if (recipesData) setRecipes(recipesData)
  }

  const handleAutoFill = async () => {
    if (loadingIA || cooldown > 0 || recipes.length === 0) return
    setLoadingIA(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const emptySlots = []
      days.forEach(day => {
        const dateStr = formatDate(day)
        MEAL_TYPES.forEach(type => {
          const exists = mealPlan.find(m => m.date === dateStr && m.meal_type === type)
          if (!exists) emptySlots.push({ date: dateStr, type })
        })
      })
      if (emptySlots.length === 0) { alert("Ton planning est déjà plein ! ✨"); setLoadingIA(false); return }
      const prompt = `J'ai ces recettes : ${recipes.map(r => r.name).join(", ")}. 
      Remplis ces créneaux vides : ${emptySlots.map(s => `${s.date} (${s.type})`).join(", ")}.
      Propose un planning équilibré (varie les recettes).
      Réponds UNIQUEMENT un JSON : [{"date": "YYYY-MM-DD", "meal_type": "Matin/Midi/Soir", "recipe_name": "..."}]`
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }) }
      )
      if (response.status === 429) { setCooldown(60); throw new Error("L'IA est fatiguée, attends une minute ! ⏳") }
      const resJson = await response.json()
      const suggestions = JSON.parse(resJson.candidates[0].content.parts[0].text)
      const inserts = suggestions.map(s => {
        const recipe = recipes.find(r => r.name === s.recipe_name)
        if (!recipe) return null
        return { user_id: user.id, recipe_id: recipe.id, date: s.date, meal_type: s.meal_type }
      }).filter(Boolean)
      if (inserts.length > 0) { await supabase.from("meal_plan").insert(inserts); await fetchData() }
      setCooldown(60)
    } catch (err) { console.error(err); alert(err.message) }
    finally { setLoadingIA(false) }
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

  // Tap sur une case vide en mobile → ouvre la modal
  const handleMobileTap = (date, mealType) => {
    setMobileModal({ date, mealType })
  }

  // Sélection d'une recette depuis la modal mobile
  const handleMobileSelect = async (recipe) => {
    if (!mobileModal) return
    const existing = mealPlan.find(m => m.date === mobileModal.date && m.meal_type === mobileModal.mealType)
    if (existing) { setMobileModal(null); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("meal_plan").insert({
      user_id: user.id,
      recipe_id: recipe.id,
      date: mobileModal.date,
      meal_type: mobileModal.mealType,
    })
    setMobileModal(null)
    await fetchData()
  }

  const prevPeriod = () => {
    if (view === "week") { const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d) }
    else {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
      else setCurrentMonth(m => m - 1)
    }
  }

  const nextPeriod = () => {
    if (view === "week") { const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d) }
    else {
      if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
      else setCurrentMonth(m => m + 1)
    }
  }

  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
  const weekLabel = `${days[0].getDate()} — ${days[6].getDate()} ${days[6].toLocaleString("fr-FR", { month: "long" })} ${days[6].getFullYear()}`
  const monthLabel = `${MONTH_NAMES[currentMonth]} ${currentYear}`
  const monthDays = getMonthDays(currentYear, currentMonth)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      {/* MODAL MOBILE */}
      {mobileModal && (
        <MobileRecipeModal
          recipes={recipes}
          onSelect={handleMobileSelect}
          onClose={() => setMobileModal(null)}
        />
      )}

      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "0.75rem" : "1.25rem" }}>

          {/* HEADER */}
          <div className={`flex ${isMobile ? "flex-col gap-2" : "items-center justify-between"} mb-4`}>
            <div className={`flex items-center ${isMobile ? "justify-between" : "gap-3"}`}>
              {!isMobile && <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Mon planning</h1>}

              <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                <button onClick={() => setView("week")} className={`px-3 py-1 rounded-md text-xs font-medium transition ${view === "week" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>Semaine</button>
                <button onClick={() => setView("month")} className={`px-3 py-1 rounded-md text-xs font-medium transition ${view === "month" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>Mois</button>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={prevPeriod} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-zinc-400 hover:border-orange-400 hover:text-orange-500 transition text-xs">◀</button>
                <span className={`text-xs font-medium text-zinc-700 dark:text-zinc-300 px-1 text-center ${isMobile ? "min-w-28" : "min-w-48"}`}>
                  {view === "week" ? (isMobile ? `${days[0].getDate()}–${days[6].getDate()} ${days[6].toLocaleString("fr-FR", { month: "short" })}` : weekLabel) : monthLabel}
                </span>
                <button onClick={nextPeriod} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-zinc-400 hover:border-orange-400 hover:text-orange-500 transition text-xs">▶</button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleAutoFill} disabled={loadingIA || cooldown > 0}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition
                  ${cooldown > 0 ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" : "bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white"}`}>
                {loadingIA ? "🪄..." : cooldown > 0 ? `⏳ ${cooldown}s` : "💡 Équilibrer"}
              </button>
              <button onClick={() => navigate("/shopping")} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-600 transition">
                🛒 Courses
              </button>
            </div>
          </div>

          {/* VUE SEMAINE */}
          {view === "week" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "32px repeat(7, 1fr)" : "56px repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
                <div></div>
                {days.map((day, i) => (
                  <div key={i} className="text-center py-1">
                    <div className="text-xs uppercase tracking-wide text-zinc-400 font-medium">{isMobile ? DAY_NAMES[i][0] : DAY_NAMES[i]}</div>
                    <div className={`${isMobile ? "text-xs" : "text-base"} font-semibold mt-0.5 ${formatDate(day) === today ? "bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs" : "text-zinc-800 dark:text-zinc-200"}`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "32px repeat(7, 1fr)" : "56px repeat(7, 1fr)", gap: "4px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {MEAL_TYPES.map(type => (
                    <div key={type} style={{ height: isMobile ? "60px" : "76px" }}
                      className="flex items-center justify-end pr-1 text-zinc-400 font-medium"
                      style={{ fontSize: isMobile ? "8px" : "12px", height: isMobile ? "60px" : "76px" }}>
                      {isMobile ? type[0] : type}
                    </div>
                  ))}
                </div>
                {days.map((day, dayIndex) => (
                  <div key={dayIndex} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {MEAL_TYPES.map(mealType => (
                      <MealSlot
                        key={mealType}
                        date={formatDate(day)}
                        mealType={mealType}
                        meal={getMeal(day, mealType)}
                        onRemove={handleRemoveMeal}
                        isToday={formatDate(day) === today}
                        isMobile={isMobile}
                        onMobileTap={handleMobileTap}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* VUE MOIS */}
          {view === "month" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px", marginBottom: "5px" }}>
                {DAY_NAMES.map(day => (
                  <div key={day} className="text-center text-xs uppercase tracking-wide text-zinc-400 font-medium py-1">
                    {isMobile ? day[0] : day}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px" }}>
                {monthDays.map((day, i) => (
                  day ? <MonthDayCell key={i} date={day} meals={getMealsForDay(day)} onRemove={handleRemoveMeal} isToday={formatDate(day) === today} />
                    : <div key={i} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* SIDEBAR RECETTES — desktop uniquement */}
        {!isMobile && (
          <div style={{ width: "240px", borderLeft: "1px solid #EBEBEB", background: "white", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div className="p-3 border-b border-gray-100">
              <div className="text-sm font-semibold text-zinc-900 mb-2">📖 Mes recettes</div>
              <input className="w-full bg-zinc-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-400"
                placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
              {filteredRecipes.length === 0
                ? <div className="text-xs text-zinc-400 text-center mt-4">Aucune recette trouvée</div>
                : filteredRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
            </div>
            <div className="p-3 border-t border-gray-100">
              <p className="text-xs text-zinc-400 text-center">⠿ Glisse une recette sur un créneau</p>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeRecipe && (
          <div className="bg-white border border-orange-400 rounded-lg p-2 shadow-lg text-xs font-medium text-zinc-800 w-48">
            {activeRecipe.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"

const MEAL_TYPES = ["Matin", "Midi", "Soir"]
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

// --- FONCTIONS UTILITAIRES ---
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
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
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
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }
  return days
}

function formatDate(date) {
  return date.toISOString().split("T")[0]
}

// --- COMPOSANTS DRAG & DROP ---
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
      className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-zinc-50 mb-1.5 cursor-grab active:cursor-grabbing hover:border-orange-300 hover:bg-orange-50 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-zinc-800 truncate">{recipe.name}</div>
        {recipe.prep_time && <div className="text-xs text-zinc-400">⏱ {recipe.prep_time} min</div>}
      </div>
      <span className="text-zinc-300 text-sm">⠿</span>
    </div>
  )
}

function MealSlot({ date, mealType, meal, onRemove, isToday, compact }) {
  const slotId = `slot-${date}-${mealType}`
  const { setNodeRef, isOver } = useDroppable({ id: slotId, data: { date, mealType } })
  if (compact) {
    return (
      <div ref={setNodeRef}
        className={`rounded px-1 py-0.5 text-xs truncate mb-0.5 transition
          ${meal ? "bg-orange-100 text-orange-700" : isOver ? "bg-orange-50 border border-dashed border-orange-300" : "bg-transparent"}`}
      >
        {meal ? meal.recipes?.name : ""}
      </div>
    )
  }
  return (
    <div ref={setNodeRef} style={{ height: "76px" }}
      className={`rounded-lg border transition relative overflow-hidden
        ${meal ? `bg-white shadow-sm ${isToday ? "border-orange-200 bg-orange-50" : "border-gray-100"}` : isOver ? "border-orange-400 bg-orange-50 border-dashed" : "border-dashed border-gray-200 bg-white hover:border-orange-300"}`}
    >
      {meal ? (
        <div className="p-2 h-full flex flex-col justify-between">
          <div className="text-xs font-semibold text-zinc-800 line-clamp-2 leading-tight">{meal.recipes?.name}</div>
          <div className="flex items-center justify-between">
            {meal.recipes?.prep_time && <span className="text-xs text-zinc-400">⏱ {meal.recipes.prep_time}m</span>}
            <button onClick={() => onRemove(meal.id)} className="text-zinc-300 hover:text-red-400 transition text-base leading-none ml-auto">×</button>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <span className={`text-lg ${isOver ? "text-orange-400" : "text-gray-200"}`}>+</span>
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
      {isOver && meals.length === 0 && (
        <div className="text-xs text-orange-400 text-center mt-2">+</div>
      )}
    </div>
  )
}

// --- COMPOSANT PRINCIPAL ---
export default function Calendar() {
  const navigate = useNavigate()
  const [view, setView] = useState("week")
  const [monday, setMonday] = useState(getMonday(new Date()))
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [mealPlan, setMealPlan] = useState([])
  const [recipes, setRecipes] = useState([])
  const [search, setSearch] = useState("")
  const [activeRecipe, setActiveRecipe] = useState(null)
  
  // États IA
  const [loadingIA, setLoadingIA] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  const days = getWeekDays(monday)
  const today = formatDate(new Date())
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { fetchData() }, [monday, currentMonth, currentYear, view])

  // Timer pour le cooldown
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
      .from("meal_plan")
      .select("*, recipes(name, prep_time, tags)")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)

    const { data: recipesData } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)

    if (planData) setMealPlan(planData)
    if (recipesData) setRecipes(recipesData)
  }

  // --- LOGIQUE IA PLANNING ---
  const handleAutoFill = async () => {
    if (loadingIA || cooldown > 0 || recipes.length === 0) return
    setLoadingIA(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // On identifie les slots vides pour la semaine en cours
      const emptySlots = []
      days.forEach(day => {
        const dateStr = formatDate(day)
        MEAL_TYPES.forEach(type => {
          const exists = mealPlan.find(m => m.date === dateStr && m.meal_type === type)
          if (!exists) emptySlots.push({ date: dateStr, type })
        })
      })

      if (emptySlots.length === 0) {
        alert("Ton planning est déjà plein ! ✨")
        setLoadingIA(false)
        return
      }

      const prompt = `J'ai ces recettes : ${recipes.map(r => r.name).join(", ")}. 
      Remplis ces créneaux vides : ${emptySlots.map(s => `${s.date} (${s.type})`).join(", ")}.
      Propose un planning équilibré (varie les recettes).
      Réponds UNIQUEMENT un JSON : [{"date": "YYYY-MM-DD", "meal_type": "Matin/Midi/Soir", "recipe_name": "..."}]`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      )

      if (response.status === 429) {
        setCooldown(60)
        throw new Error("L'IA est un peu fatiguée. Attends une minute ! ⏳")
      }

      const resJson = await response.json()
      const suggestions = JSON.parse(resJson.candidates[0].content.parts[0].text)

      // Insertion dans Supabase
      const inserts = suggestions.map(s => {
        const recipe = recipes.find(r => r.name === s.recipe_name)
        if (!recipe) return null
        return {
          user_id: user.id,
          recipe_id: recipe.id,
          date: s.date,
          meal_type: s.meal_type
        }
      }).filter(Boolean)

      if (inserts.length > 0) {
        await supabase.from("meal_plan").insert(inserts)
        await fetchData()
      }
      
      setCooldown(60)
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setLoadingIA(false)
    }
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
    await supabase.from("meal_plan").insert({
      user_id: user.id,
      recipe_id: recipeData.id,
      date: slotData.date,
      meal_type: slotData.mealType,
    })
    await fetchData()
  }

  const handleRemoveMeal = async (mealId) => {
    await supabase.from("meal_plan").delete().eq("id", mealId)
    await fetchData()
  }

  const prevPeriod = () => {
    if (view === "week") {
      const d = new Date(monday); d.setDate(d.getDate() - 7); setMonday(d)
    } else {
      if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
      else setCurrentMonth(m => m - 1)
    }
  }

  const nextPeriod = () => {
    if (view === "week") {
      const d = new Date(monday); d.setDate(d.getDate() + 7); setMonday(d)
    } else {
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
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Mon planning</h1>

              <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                <button onClick={() => setView("week")} className={`px-3 py-1 rounded-md text-xs font-medium transition ${view === "week" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>Semaine</button>
                <button onClick={() => setView("month")} className={`px-3 py-1 rounded-md text-xs font-medium transition ${view === "month" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600"}`}>Mois</button>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={prevPeriod} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-zinc-400 hover:border-orange-400 hover:text-orange-500 transition text-xs">◀</button>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 px-2 min-w-48 text-center">{view === "week" ? weekLabel : monthLabel}</span>
                <button onClick={nextPeriod} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-zinc-400 hover:border-orange-400 hover:text-orange-500 transition text-xs">▶</button>
              </div>
            </div>

            <div className="flex gap-2">
              {/* BOUTON IA MAGIQUE */}
              <button 
                onClick={handleAutoFill}
                disabled={loadingIA || cooldown > 0}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition shadow-sm
                  ${cooldown > 0 ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white'}`}
              >
                {loadingIA ? "🪄..." : cooldown > 0 ? `⏳ ${cooldown}s` : "💡 Équilibrer"}
              </button>

              <button onClick={() => navigate("/shopping")} className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition">
                🛒 Courses
              </button>
            </div>
          </div>

          {view === "week" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", gap: "5px", marginBottom: "5px" }}>
                <div></div>
                {days.map((day, i) => (
                  <div key={i} className="text-center py-1">
                    <div className="text-xs uppercase tracking-wide text-zinc-400 font-medium">{DAY_NAMES[i]}</div>
                    <div className={`text-base font-semibold mt-0.5 ${formatDate(day) === today ? "bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>{day.getDate()}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", gap: "5px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {MEAL_TYPES.map(type => (
                    <div key={type} style={{ height: "76px" }} className="flex items-center justify-end pr-2 text-xs text-zinc-400 font-medium">{type}</div>
                  ))}
                </div>
                {days.map((day, dayIndex) => (
                  <div key={dayIndex} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {MEAL_TYPES.map(mealType => (
                      <MealSlot key={mealType} date={formatDate(day)} mealType={mealType} meal={getMeal(day, mealType)} onRemove={handleRemoveMeal} isToday={formatDate(day) === today} />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {view === "month" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px", marginBottom: "5px" }}>
                {DAY_NAMES.map(day => (
                  <div key={day} className="text-center text-xs uppercase tracking-wide text-zinc-400 font-medium py-1">{day}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px" }}>
                {monthDays.map((day, i) => (
                  day ? (
                    <MonthDayCell key={i} date={day} meals={getMealsForDay(day)} onRemove={handleRemoveMeal} isToday={formatDate(day) === today} />
                  ) : (
                    <div key={i} />
                  )
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ width: "240px", borderLeft: "1px solid #EBEBEB", background: "white", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div className="p-3 border-b border-gray-100">
            <div className="text-sm font-semibold text-zinc-900 mb-2">📖 Mes recettes</div>
            <input className="w-full bg-zinc-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-400" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
            {filteredRecipes.length === 0 ? <div className="text-xs text-zinc-400 text-center mt-4">Aucune recette trouvée</div> : filteredRecipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
          <div className="p-3 border-t border-gray-100">
            <p className="text-xs text-zinc-400 text-center">⠿ Glisse une recette sur un créneau</p>
          </div>
        </div>
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
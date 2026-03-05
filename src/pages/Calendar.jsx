import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"

const MEAL_TYPES = ["Matin", "Midi", "Soir"]
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

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

function formatDate(date) {
  return date.toISOString().split("T")[0]
}

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
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
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

function MealSlot({ date, mealType, meal, onRemove, isToday }) {
  const slotId = `slot-${date}-${mealType}`
  const { setNodeRef, isOver } = useDroppable({ id: slotId, data: { date, mealType } })

  return (
    <div
      ref={setNodeRef}
      style={{ height: "76px" }}
      className={`rounded-lg border transition relative overflow-hidden
        ${meal
          ? `bg-white shadow-sm ${isToday ? "border-orange-200 bg-orange-50" : "border-gray-100"}`
          : isOver
            ? "border-orange-400 bg-orange-50 border-dashed"
            : "border-dashed border-gray-200 bg-white hover:border-orange-300"
        }`}
    >
      {meal ? (
        <div className="p-2 h-full flex flex-col justify-between">
          <div className="text-xs font-semibold text-zinc-800 line-clamp-2 leading-tight">
            {meal.recipes?.name}
          </div>
          <div className="flex items-center justify-between">
            {meal.recipes?.prep_time && (
              <span className="text-xs text-zinc-400">⏱ {meal.recipes.prep_time}m</span>
            )}
            <button
              onClick={() => onRemove(meal.id)}
              className="text-zinc-300 hover:text-red-400 transition text-base leading-none ml-auto"
            >×</button>
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

export default function Calendar() {
  const navigate = useNavigate()
  const [monday, setMonday] = useState(getMonday(new Date()))
  const [mealPlan, setMealPlan] = useState([])
  const [recipes, setRecipes] = useState([])
  const [search, setSearch] = useState("")
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [loading, setLoading] = useState(false)

  const days = getWeekDays(monday)
  const today = formatDate(new Date())

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }
  }))

  useEffect(() => { fetchData() }, [monday])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const startDate = formatDate(monday)
    const endDate = formatDate(days[6])

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

  const getMeal = (date, mealType) => {
    return mealPlan.find(m => m.date === formatDate(date) && m.meal_type === mealType)
  }

  const handleDragStart = (event) => {
    const { data } = event.active
    if (data.current?.type === "recipe") {
      setActiveRecipe(data.current.recipe)
    }
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

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from("meal_plan").insert({
      user_id: user.id,
      recipe_id: recipeData.id,
      date: slotData.date,
      meal_type: slotData.mealType,
    })
    await fetchData()
    setLoading(false)
  }

  const handleRemoveMeal = async (mealId) => {
    await supabase.from("meal_plan").delete().eq("id", mealId)
    await fetchData()
  }

  const prevWeek = () => {
    const d = new Date(monday)
    d.setDate(d.getDate() - 7)
    setMonday(d)
  }

  const nextWeek = () => {
    const d = new Date(monday)
    d.setDate(d.getDate() + 7)
    setMonday(d)
  }

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const weekLabel = `${days[0].getDate()} — ${days[6].getDate()} ${days[6].toLocaleString("fr-FR", { month: "long" })} ${days[6].getFullYear()}`

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        {/* CALENDRIER */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>

          {/* Topbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Mon planning</h1>
              <div className="flex items-center gap-1">
                <button onClick={prevWeek} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-zinc-400 hover:border-orange-400 hover:text-orange-500 transition text-xs">◀</button>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 px-2 min-w-48 text-center">{weekLabel}</span>
                <button onClick={nextWeek} className="w-7 h-7 border border-gray-200 rounded-lg flex items-center justify-center text-zinc-400 hover:border-orange-400 hover:text-orange-500 transition text-xs">▶</button>
              </div>
            </div>
            <button
              onClick={() => navigate("/shopping")}
              className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition"
            >
              🛒 Courses
            </button>
          </div>

          {/* Jours header */}
          <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", gap: "5px", marginBottom: "5px" }}>
            <div></div>
            {days.map((day, i) => (
              <div key={i} className="text-center py-1">
                <div className="text-xs uppercase tracking-wide text-zinc-400 font-medium">{DAY_NAMES[i]}</div>
                <div className={`text-base font-semibold mt-0.5 ${formatDate(day) === today ? "bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto text-sm" : "text-zinc-800 dark:text-zinc-200"}`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Grille */}
          <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", gap: "5px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {MEAL_TYPES.map(type => (
                <div key={type} style={{ height: "76px" }} className="flex items-center justify-end pr-2 text-xs text-zinc-400 font-medium">
                  {type}
                </div>
              ))}
            </div>

            {days.map((day, dayIndex) => (
              <div key={dayIndex} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {MEAL_TYPES.map(mealType => (
                  <MealSlot
                    key={mealType}
                    date={formatDate(day)}
                    mealType={mealType}
                    meal={getMeal(day, mealType)}
                    onRemove={handleRemoveMeal}
                    isToday={formatDate(day) === today}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* PANEL RECETTES */}
        <div style={{ width: "240px", borderLeft: "1px solid #EBEBEB", background: "white", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div className="p-3 border-b border-gray-100">
            <div className="text-sm font-semibold text-zinc-900 mb-2">📖 Mes recettes</div>
            <input
              className="w-full bg-zinc-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange-400"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
            {filteredRecipes.length === 0 ? (
              <div className="text-xs text-zinc-400 text-center mt-4">Aucune recette trouvée</div>
            ) : (
              filteredRecipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-100">
            <p className="text-xs text-zinc-400 text-center">⠿ Glisse une recette sur un créneau</p>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
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
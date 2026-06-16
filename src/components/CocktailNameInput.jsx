import { useState, useRef, useEffect } from "react"
import { COCKTAIL_INGREDIENTS, COCKTAIL_INGREDIENT_CATEGORIES } from "../tags"

export default function CocktailNameInput({ value, onChange, placeholder = "ex : Rhum blanc, Ginger beer..." }) {
  const [query, setQuery] = useState(value || "")
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Sync quand value change de l'extérieur
  useEffect(() => { setQuery(value || "") }, [value])

  const match = COCKTAIL_INGREDIENTS.find(i => i.label.toLowerCase() === (value || "").toLowerCase())
  const cat = match ? COCKTAIL_INGREDIENT_CATEGORIES[match.category] : null

  const filtered = query.trim().length === 0
    ? []
    : COCKTAIL_INGREDIENTS.filter(i => i.label.toLowerCase().includes(query.toLowerCase())).slice(0, 10)

  const select = (ing) => {
    onChange(ing.label)
    setQuery(ing.label)
    setOpen(false)
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  useEffect(() => {
    const handler = (e) => {
      if (!listRef.current?.contains(e.target) && e.target !== inputRef.current) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          placeholder={placeholder}
          style={{
            width: "100%", borderRadius: 10, padding: "10px 14px",
            paddingLeft: cat ? "10px" : "14px",
            fontSize: 13, outline: "none",
            backgroundColor: cat ? cat.bg : "var(--bg-card-2)",
            border: `1.5px solid ${cat ? cat.color : "var(--input-border)"}`,
            color: cat ? cat.color : "var(--text-main)",
            fontFamily: "Poppins, sans-serif", fontWeight: cat ? 700 : 500,
            letterSpacing: "-0.03em", boxSizing: "border-box",
            transition: "all 0.15s",
          }}
          onFocusCapture={e => { if (!cat) e.target.style.borderColor = "#d57bff" }}
          onBlur={e => { if (!cat) e.target.style.borderColor = "var(--input-border)" }}
        />
        {cat && (
          <span style={{
            position: "absolute", right: 10, fontSize: 9, fontWeight: 700,
            color: cat.color, opacity: 0.7, fontFamily: "Poppins, sans-serif",
            textTransform: "uppercase", letterSpacing: "0.04em", pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            {cat.label}
          </span>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div ref={listRef} style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, maxHeight: 260, overflowY: "auto",
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        }}>
          {filtered.map(ing => {
            const c = COCKTAIL_INGREDIENT_CATEGORIES[ing.category]
            return (
              <button key={ing.key} onMouseDown={() => select(ing)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 14px", border: "none", background: "none",
                  cursor: "pointer", textAlign: "left", transition: "background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card-2)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{
                  fontSize: 9, padding: "2px 8px", borderRadius: 10, flexShrink: 0,
                  backgroundColor: c?.bg, color: c?.color,
                  fontWeight: 700, fontFamily: "Poppins, sans-serif",
                  textTransform: "uppercase", letterSpacing: "0.03em",
                }}>
                  {c?.label}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: "var(--text-main)",
                  fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em",
                }}>
                  {ing.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

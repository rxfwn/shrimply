import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"
import { lookupIngredientPrices, computeItemCost } from "../utils/priceEngine"

const MONTH_NAMES = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]

function formatMonthLabel(yyyymm) {
  const [y, m] = yyyymm.split("-")
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`
}

function formatMonthShort(yyyymm) {
  const [, m] = yyyymm.split("-")
  return MONTH_NAMES[parseInt(m) - 1].slice(0, 3)
}

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export default function Nutrition() {
  const { isDay } = useTheme()
  const [monthlyData, setMonthlyData] = useState([])
  const [loading, setLoading] = useState(true)

  const bg = isDay ? "#F5F0E8" : "#111111"
  const surface = isDay ? "#FFFFFF" : "#091718"
  const surfaceBorder = isDay ? "1.5px solid rgba(0,0,0,0.07)" : "1.5px solid rgba(255,255,255,0.06)"
  const textPrimary = isDay ? "#111111" : "#ffffff"
  const textMuted = isDay ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)"
  const textFaint = isDay ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"
  const barBg = isDay ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"

  useEffect(() => { fetchBudgetData() }, [])

  const fetchBudgetData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const since = new Date()
      since.setMonth(since.getMonth() - 5)
      since.setDate(1)
      const sinceStr = since.toISOString().split("T")[0]

      const { data: items } = await supabase
        .from("shopping_list")
        .select("name, quantity, unit, week_start")
        .eq("user_id", user.id)
        .gte("week_start", sinceStr)

      if (!items || items.length === 0) { setMonthlyData([]); setLoading(false); return }

      // Lookup de tous les prix en une seule requête cache
      const cacheMap = await lookupIngredientPrices(items)

      // Grouper par mois et sommer
      const byMonth = {}
      items.forEach(item => {
        const month = item.week_start.slice(0, 7)
        if (!byMonth[month]) byMonth[month] = 0
        byMonth[month] += computeItemCost(item, cacheMap)
      })

      // Remplir les 6 derniers mois (y compris ceux à 0)
      const result = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        result.push({ month: key, total: Number((byMonth[key] || 0).toFixed(2)) })
      }

      setMonthlyData(result)
    } catch (e) {
      console.error(e)
      setMonthlyData([])
    }
    setLoading(false)
  }

  const currentMonth = getCurrentMonth()
  const maxTotal = Math.max(...monthlyData.map(d => d.total), 1)
  const totalThisMonth = monthlyData.find(d => d.month === currentMonth)?.total || 0
  const totalLast6 = monthlyData.reduce((s, d) => s + d.total, 0)
  const hasAnyData = monthlyData.some(d => d.total > 0)

  return (
    <div style={{ padding: "20px 24px", backgroundColor: bg, minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: textPrimary, letterSpacing: "-0.05em", display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/icons/chart.webp" alt="" style={{ width: 22, height: 22 }} onError={e => e.target.style.display = "none"} />
          budget courses
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 12, color: textMuted }}>estimation basée sur les prix de tes ingrédients</p>

        {loading ? (
          <div style={{ fontSize: 13, color: textMuted }}>chargement...</div>
        ) : !hasAnyData ? (
          <div style={{ backgroundColor: surface, borderRadius: 16, padding: "40px 32px", textAlign: "center", border: surfaceBorder }}>
            <img src="/icons/kart.webp" alt="" style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.35 }} onError={e => e.target.style.display = "none"} />
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: textPrimary }}>aucune donnée pour l'instant</p>
            <p style={{ margin: 0, fontSize: 12, color: textMuted, lineHeight: 1.6 }}>génère ta liste de courses depuis le planning pour voir ton budget apparaître ici.</p>
          </div>
        ) : (
          <>
            {/* Cartes résumé */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div style={{ backgroundColor: surface, borderRadius: 14, padding: "16px 20px", border: surfaceBorder }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>ce mois-ci</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#f3501e", letterSpacing: "-0.05em", lineHeight: 1 }}>
                  {totalThisMonth > 0 ? `≈ ${totalThisMonth.toFixed(0)}€` : "—"}
                </p>
              </div>
              <div style={{ backgroundColor: surface, borderRadius: 14, padding: "16px 20px", border: surfaceBorder }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>6 derniers mois</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: textPrimary, letterSpacing: "-0.05em", lineHeight: 1 }}>
                  {totalLast6 > 0 ? `≈ ${totalLast6.toFixed(0)}€` : "—"}
                </p>
              </div>
            </div>

            {/* Graphique barres */}
            <div style={{ backgroundColor: surface, borderRadius: 16, padding: "20px 20px 16px", border: surfaceBorder }}>
              <p style={{ margin: "0 0 20px", fontSize: 12, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>dépenses par mois</p>

              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                {monthlyData.map(({ month, total }) => {
                  const isCurrent = month === currentMonth
                  const barH = total > 0 ? Math.max(6, (total / maxTotal) * 120) : 0
                  return (
                    <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                      {/* Montant au-dessus de la barre */}
                      <span style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? "#f3501e" : textMuted, letterSpacing: "-0.03em", minHeight: 14, display: "flex", alignItems: "center" }}>
                        {total > 0 ? `${total.toFixed(0)}€` : ""}
                      </span>
                      {/* Fond de barre */}
                      <div style={{ width: "100%", height: 120, backgroundColor: barBg, borderRadius: 6, position: "relative", overflow: "hidden" }}>
                        {/* Barre remplie */}
                        {total > 0 && (
                          <div style={{
                            position: "absolute", bottom: 0, left: 0, right: 0,
                            height: barH,
                            backgroundColor: isCurrent ? "#f3501e" : isDay ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)",
                            borderRadius: 6,
                            transition: "height 0.4s ease",
                          }} />
                        )}
                      </div>
                      {/* Label mois */}
                      <span style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? textPrimary : textFaint, letterSpacing: "-0.02em" }}>
                        {formatMonthShort(month)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <p style={{ margin: "12px 0 0", fontSize: 11, color: textFaint, textAlign: "center" }}>
              estimation uniquement — basée sur les prix moyens des ingrédients
            </p>
          </>
        )}
      </div>
    </div>
  )
}

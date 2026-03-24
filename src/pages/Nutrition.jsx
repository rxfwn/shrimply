export default function Nutrition() {
  return (
    <div style={{ padding: "20px 24px", backgroundColor: "var(--bg-main)", minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.05em", display: "flex", alignItems: "center", gap: 8 }}>
        <img src="/icons/chart.webp" alt="" style={{ width: 22, height: 22 }} onError={e => e.target.style.display = "none"} />
        bilan nutrition
      </h1>
      <h2 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 500, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.03em" }}>
        page en construction
        <img src="/icons/build.webp" alt="" style={{ width: 18, height: 18 }} onError={e => e.target.style.display = "none"} />
      </h2>
      <img src="/shrimdev.jpeg" alt="" style={{ width: "100%", maxWidth: 600, height: "auto", borderRadius: 16, display: "block" }} />
    </div>
  )
}
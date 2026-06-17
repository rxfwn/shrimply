import { useEffect } from "react"

export default function Nutrition() {
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://tenor.com/embed.js"
    script.async = true
    document.body.appendChild(script)
    return () => document.body.removeChild(script)
  }, [])

  return (
    <div style={{ padding: "20px 24px", backgroundColor: "var(--bg-main)", minHeight: "100%", fontFamily: "Poppins, sans-serif", transition: "background-color 0.25s ease", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 500, textAlign: "center" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.05em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <img src="/icons/chart.webp" alt="" style={{ width: 22, height: 22 }} onError={e => e.target.style.display = "none"} />
          bilan nutrition
        </h1>
        <p style={{ margin: "0 0 32px", fontSize: 13, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "-0.03em" }}>bientôt disponible 🦐</p>
        <div
          className="tenor-gif-embed"
          data-postid="4233398845107206413"
          data-share-method="host"
          data-aspect-ratio="1"
          data-width="100%"
        />
      </div>
    </div>
  )
}

import { useEffect, useRef } from "react"

export default function Toast({ visible, message, duration = 3000 }) {
  const barRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!visible) return
    if (animRef.current) animRef.current.cancel()
    if (!barRef.current) return
    animRef.current = barRef.current.animate(
      [{ width: "100%" }, { width: "0%" }],
      { duration, easing: "linear", fill: "forwards" }
    )
    return () => animRef.current?.cancel()
  }, [visible, duration])

  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 2000,
      transform: `translateY(${visible ? 0 : -12}px)`,
      opacity: visible ? 1 : 0,
      transition: "opacity 0.22s ease, transform 0.22s ease",
      pointerEvents: visible ? "auto" : "none",
      backgroundColor: "#4ade80",
      borderRadius: 18,
      overflow: "hidden",
      minWidth: 230,
      maxWidth: 320,
      boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
      fontFamily: "Poppins, sans-serif",
    }}>
      {/* Contenu */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px 10px" }}>
        <img src="/icons/check.webp" alt="" style={{ width: 30, height: 30, flexShrink: 0 }}
          onError={e => { e.target.style.display = "none" }}
        />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#052e16", letterSpacing: "-0.04em", lineHeight: 1.2 }}>
          {message}
        </span>
      </div>
      {/* Barre de progression */}
      <div style={{ margin: "0 14px 12px", height: 5, backgroundColor: "rgba(0,0,0,0.12)", borderRadius: 4, overflow: "hidden" }}>
        <div ref={barRef} style={{ height: "100%", width: "100%", backgroundColor: "#052e16", borderRadius: 4 }} />
      </div>
    </div>
  )
}

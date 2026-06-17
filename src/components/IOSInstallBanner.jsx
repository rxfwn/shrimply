import { useState } from "react"

export default function IOSInstallBanner() {
  const [show, setShow] = useState(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (!isIOS) return false
    if (window.navigator.standalone === true) return false
    if (localStorage.getItem("ios_banner_dismissed")) return false
    return true
  })

  if (!show) return null

  const dismiss = () => {
    localStorage.setItem("ios_banner_dismissed", "1")
    setShow(false)
  }

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 3000,
      backgroundColor: "#091718",
      borderTop: "1px solid rgba(255,255,255,0.12)",
      padding: "14px 16px 28px",
      display: "flex", alignItems: "flex-start", gap: 12,
      fontFamily: "Poppins, sans-serif",
      boxShadow: "0 -8px 32px rgba(0,0,0,0.45)",
    }}>
      <img src="/icons/shrim.webp" alt="" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.04em" }}>
          installe Shrimply sur ton iPhone
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
          appuie sur{" "}
          <span style={{ display: "inline-block", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 4, padding: "1px 7px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            ⎙ partager
          </span>{" "}
          dans ton navigateur, puis{" "}
          <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
            "Sur l'écran d'accueil"
          </span>
        </p>
      </div>
      <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 20, lineHeight: 1, padding: "4px 2px", flexShrink: 0, marginTop: 2 }}>
        ✕
      </button>
    </div>
  )
}

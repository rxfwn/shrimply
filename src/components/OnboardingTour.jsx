import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../supabase"

const isMobile = () => window.innerWidth < 768

// ── Hook rect ──
function useElementRect(targetId) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    if (!targetId) return
    const update = () => {
      const el = document.getElementById(targetId)
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right })
        } else setRect(null)
      } else setRect(null)
    }
    update()
    const t = setInterval(update, 200)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update)
    return () => { clearInterval(t); window.removeEventListener("resize", update); window.removeEventListener("scroll", update) }
  }, [targetId])
  return rect
}

// ── Spotlight ──
function SpotlightOverlay({ targetId, children, onSkip, PAD = 8 }) {
  const rect = useElementRect(targetId)

  if (!rect) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
        <style>{`
          @keyframes bubbleIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
          @keyframes cardIn { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        `}</style>
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, zIndex: 10002 }}>
          <div style={{ pointerEvents: "auto", display: "inline-block" }}>{children}</div>
        </div>
        {onSkip && (
          <button onClick={onSkip} style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, color: "rgba(255,255,255,0.4)",
            fontFamily: "Poppins, sans-serif", fontWeight: 600, letterSpacing: "-0.03em",
            zIndex: 10003, pointerEvents: "auto",
          }}>passer le tutoriel</button>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
      <style>{`
        @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 4px rgba(243,80,30,0.2)} 50%{box-shadow:0 0 0 8px rgba(243,80,30,0.05)} }
        @keyframes bubbleIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD), backgroundColor: "rgba(0,0,0,0.72)", pointerEvents: "auto" }} />
      <div style={{ position: "absolute", top: rect.bottom + PAD, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.72)", pointerEvents: "auto" }} />
      <div style={{ position: "absolute", top: rect.top - PAD, left: 0, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2, backgroundColor: "rgba(0,0,0,0.72)", pointerEvents: "auto" }} />
      <div style={{ position: "absolute", top: rect.top - PAD, left: rect.left + rect.width + PAD, right: 0, height: rect.height + PAD * 2, backgroundColor: "rgba(0,0,0,0.72)", pointerEvents: "auto" }} />
      <div style={{
        position: "absolute",
        top: rect.top - PAD, left: rect.left - PAD,
        width: rect.width + PAD * 2, height: rect.height + PAD * 2,
        borderRadius: 12, pointerEvents: "none",
        border: "2.5px solid #f3501e",
        animation: "pulseRing 1.5s ease-in-out infinite",
      }} />
      <div style={{ pointerEvents: "none", position: "absolute", inset: 0, zIndex: 10002 }}>
        <div style={{ pointerEvents: "auto", display: "inline-block" }}>{children}</div>
      </div>
      {onSkip && (
        <button onClick={onSkip} style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: "rgba(255,255,255,0.4)",
          fontFamily: "Poppins, sans-serif", fontWeight: 600, letterSpacing: "-0.03em",
          zIndex: 10003, pointerEvents: "auto",
        }}>passer le tutoriel</button>
      )}
    </div>
  )
}

// ── Bulle positionnée ──
function Bubble({ targetId, text, action, actionLabel, position = "bottom", fallbackCenter = false }) {
  const rect = useElementRect(targetId)
  const BUBBLE_W = Math.min(280, window.innerWidth - 32)
  let top, left

  if (!rect || fallbackCenter) {
    top = window.innerHeight / 2 - 80
    left = window.innerWidth / 2 - BUBBLE_W / 2
  } else {
    if (position === "bottom") { top = rect.bottom + 16; left = rect.left + rect.width / 2 - BUBBLE_W / 2 }
    else if (position === "top") { top = rect.top - 160; left = rect.left + rect.width / 2 - BUBBLE_W / 2 }
    else if (position === "left") { top = rect.top; left = rect.left - BUBBLE_W - 16 }
    else if (position === "right") { top = rect.top; left = rect.right + 16 }
  }

  left = Math.max(12, Math.min(left, window.innerWidth - BUBBLE_W - 12))
  top = Math.max(12, Math.min(top, window.innerHeight - 200))

  return (
    <div style={{
      position: "fixed", top, left, width: BUBBLE_W,
      backgroundColor: "#1a2e1a",
      borderRadius: 16, padding: "16px 18px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      fontFamily: "Poppins, sans-serif",
      animation: "bubbleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      zIndex: 10004,
    }}>
      <p style={{ margin: action ? "0 0 12px" : 0, fontSize: 13, fontWeight: 700, color: "#ffffff", lineHeight: 1.5, letterSpacing: "-0.03em", textAlign: "center" }}>
        {text}
      </p>
      {action && (
        <button onClick={action} style={{
          width: "100%", padding: "10px", borderRadius: 10,
          backgroundColor: "#cfff79", color: "#091718", border: "none", cursor: "pointer",
          fontSize: 12, fontWeight: 800, fontFamily: "Poppins, sans-serif",
          letterSpacing: "-0.04em", transition: "transform 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >{actionLabel || "continuer"}</button>
      )}
    </div>
  )
}

// ── Bulle flottante centrée sur le contenu principal (hors sidebar) ──
function FloatingBubble({ text, onDismiss }) {
  // La sidebar fait ~208px sur desktop, 0 sur mobile
  const sidebarW = window.innerWidth >= 768 ? 208 : 0
  const contentW = window.innerWidth - sidebarW
  const left = sidebarW + contentW / 2

  return (
    <>
      <style>{`@keyframes floatIn{from{opacity:0;transform:translateX(-50%) scale(0.9)}to{opacity:1;transform:translateX(-50%) scale(1)}}`}</style>
      <div style={{
        position: "fixed",
        top: "40%",
        left: left,
        transform: "translateX(-50%)",
        backgroundColor: "#1a2e1a",
        borderRadius: 16, padding: "20px 24px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        fontFamily: "Poppins, sans-serif",
        animation: "floatIn 0.3s ease",
        zIndex: 9998, maxWidth: 300, width: "calc(90% - 208px)", textAlign: "center",
        pointerEvents: "auto",
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.5, letterSpacing: "-0.03em" }}>
          {text}
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
          Attention à bien remplir toutes les cases obligatoires !
        </p>
        {onDismiss && (
          <button onClick={onDismiss} style={{
            width: "100%", padding: "9px", borderRadius: 10,
            backgroundColor: "#cfff79", color: "#091718", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 800, fontFamily: "Poppins, sans-serif",
            letterSpacing: "-0.04em",
          }}>ok !</button>
        )}
      </div>
    </>
  )
}

// ── Toast confirmation courses ──
function ConfirmationBubble({ text }) {
  return (
    <>
      <style>{`@keyframes floatIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <div style={{
        position: "fixed",
        bottom: 80, left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#cfff79",
        borderRadius: 16, padding: "16px 24px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        fontFamily: "Poppins, sans-serif",
        animation: "floatIn 0.3s ease",
        zIndex: 9998, maxWidth: 340, width: "90%", textAlign: "center",
        pointerEvents: "none",
      }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#091718", lineHeight: 1.5, letterSpacing: "-0.03em" }}>
          {text}
        </p>
      </div>
    </>
  )
}

// ── Card modale ──
function ModalCard({ img, emoji, title, text, actionLabel, onAction, onSkip, step, total }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "Poppins, sans-serif",
    }}>
      <style>{`@keyframes cardIn{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div style={{
        backgroundColor: "#1a2e1a", borderRadius: 20,
        maxWidth: 340, width: "100%",
        padding: "32px 28px 28px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        animation: "cardIn 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 2, flex: 1,
              backgroundColor: i < step ? "#cfff79" : "rgba(255,255,255,0.15)",
              transition: "background-color 0.3s",
            }} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {img
            ? <img src={img} alt="" style={{ width: 64, height: 64, objectFit: "contain", marginBottom: 16 }} onError={e => e.target.style.display = "none"} />
            : <div style={{ fontSize: 44, marginBottom: 16 }}>{emoji}</div>
          }
          <h2 style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.05em" }}>{title}</h2>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, fontWeight: 500 }}>{text}</p>
        </div>

        <button onClick={onAction} style={{
          width: "100%", padding: "13px", borderRadius: 12,
          backgroundColor: "#cfff79", color: "#091718", border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 800, fontFamily: "Poppins, sans-serif",
          letterSpacing: "-0.04em", marginBottom: onSkip ? 10 : 0,
          transition: "transform 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >{actionLabel}</button>

        {onSkip && (
          <button onClick={onSkip} style={{
            width: "100%", background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "Poppins, sans-serif",
            fontWeight: 600, letterSpacing: "-0.03em", padding: "6px 0",
          }}>passer le tutoriel</button>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ──
export default function OnboardingTour({ userId, onComplete }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [formOpened, setFormOpened] = useState(false)
  const [bubbleDismissed, setBubbleDismissed] = useState(false)
  const [initialRecipeCount, setInitialRecipeCount] = useState(null)
  const [shoppingGenerated, setShoppingGenerated] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const initialMealCount = useRef(null)

  const TOTAL = 7

  // ── Étape 4 : mémorise le count initial puis poll les nouveaux drops ──
  useEffect(() => {
    if (step !== 4) return
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
    const getWeekRange = () => {
      const today = new Date()
      const mon = new Date(today); mon.setDate(today.getDate() - (today.getDay() || 7) + 1)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return { mon: fmt(mon), sun: fmt(sun) }
    }
    let baseline = null
    let interval

    const getCount = async () => {
      const { mon, sun } = getWeekRange()
      const { count } = await supabase.from("meal_plan")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("date", mon)
        .lte("date", sun)
      return count ?? 0
    }

    // 1. D'abord snapshot le count actuel
    getCount().then(count => {
      baseline = count
      // 2. Puis démarre le polling
      interval = setInterval(async () => {
        const current = await getCount()
        if (current > baseline) {
          clearInterval(interval)
          setTimeout(() => setStep(5), 600)
        }
      }, 800)
    })

    // Drag detection
    const onDown = () => setIsDragging(true)
    const onUp = () => setTimeout(() => setIsDragging(false), 400)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("pointerup", onUp)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("pointerup", onUp)
    }
  }, [step, userId])

  // ── Étape 3 → 4 : détecte la navigation vers /calendar ──
  useEffect(() => {
    if (step === 3 && location.pathname === "/calendar") {
      setTimeout(() => setStep(4), 300)
    }
  }, [step, location.pathname])

  // ── Clic btn-new-recipe ──
  useEffect(() => {
    if (step !== 2) return
    const btn = document.getElementById("btn-new-recipe")
    if (!btn) return
    const handler = () => setFormOpened(true)
    btn.addEventListener("click", handler)
    return () => btn.removeEventListener("click", handler)
  }, [step])

  // ── Mémorise nb recettes étape 2 ──
  useEffect(() => {
    if (step !== 2) return
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("user_id", userId)
      .then(({ count }) => setInitialRecipeCount(count ?? 0))
  }, [step, userId])

  // ── Polling nouvelle recette ──
  useEffect(() => {
    if (step !== 2 || initialRecipeCount === null) return
    const interval = setInterval(async () => {
      const { count } = await supabase.from("recipes").select("id", { count: "exact", head: true }).eq("user_id", userId)
      if (count > initialRecipeCount) {
        clearInterval(interval)
        setFormOpened(false)
        setStep(3)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [step, userId, initialRecipeCount])

  // ── Étape 5 → 6 : détecte clic sur btn-go-shopping ──
  useEffect(() => {
    if (step !== 5) return
    const tryAttach = () => {
      const btn = document.getElementById("btn-go-shopping")
      if (!btn) return false
      const handler = () => goTo("/shopping", 6)
      btn.addEventListener("click", handler)
      return () => btn.removeEventListener("click", handler)
    }
    let cleanup
    const t = setInterval(() => {
      const c = tryAttach()
      if (c) { cleanup = c; clearInterval(t) }
    }, 300)
    return () => { clearInterval(t); cleanup && cleanup() }
  }, [step])

  // ── Clic btn-generate-shopping ──
  useEffect(() => {
    if (step !== 6) return
    let cleanup
    const t = setInterval(() => {
      const btn = document.getElementById("btn-generate-shopping")
      if (!btn) return
      clearInterval(t)
      const handler = () => {
        setShoppingGenerated(true)
        setTimeout(() => setStep(7), 2000)
      }
      btn.addEventListener("click", handler)
      cleanup = () => btn.removeEventListener("click", handler)
    }, 300)
    return () => { clearInterval(t); cleanup && cleanup() }
  }, [step])

  const complete = async () => {
    await supabase.from("profiles").update({ onboarded: true }).eq("id", userId)
    onComplete()
  }

  const goTo = (path, nextStep, delay = 500) => {
    setNavigating(true)
    navigate(path)
    setTimeout(() => { setNavigating(false); setStep(nextStep) }, delay)
  }

  if (navigating) return null

  // ── Étape 0 : bienvenue ──
  if (step === 0) {
    return (
      <ModalCard
        img="/icons/shrim.png"
        title="bienvenue sur Shrimply !"
        text="découvre l'app en quelques étapes, en moins de 2 minutes."
        actionLabel="c'est parti !"
        onAction={() => { navigate("/recipes"); setTimeout(() => setStep(1), 500) }}
        onSkip={complete}
        step={1} total={TOTAL}
      />
    )
  }

  // ── Étape 1 : spotlight nav "mes recettes" ──
  if (step === 1) {
    return (
      <SpotlightOverlay targetId="nav-recipes" onSkip={complete} PAD={6}>
        <Bubble
          targetId="nav-recipes"
          text="Ici se trouvent toutes tes recettes. Pour l'instant, c'est vide."
          position={isMobile() ? "bottom" : "right"}
          fallbackCenter={isMobile()}
          action={() => { navigate("/recipes"); setTimeout(() => setStep(2), 500) }}
          actionLabel="créer ma première recette !"
        />
      </SpotlightOverlay>
    )
  }

  // ── Étape 2a : spotlight btn-new-recipe ──
  if (step === 2 && location.pathname === "/recipes" && !formOpened) {
    return (
      <SpotlightOverlay targetId="btn-new-recipe" onSkip={complete}>
        <Bubble
          targetId="btn-new-recipe"
          text="Clique ici pour créer ta première recette !"
          position="bottom"
        />
      </SpotlightOverlay>
    )
  }

  // ── Étape 2b : formulaire ouvert → bulle centrée ──
  if (step === 2 && formOpened) {
    if (bubbleDismissed) return null
    return (
      <FloatingBubble
        text="Remplis le formulaire et enregistre ta recette. On continuera ensuite !"
        onDismiss={() => setBubbleDismissed(true)}
      />
    )
  }

  // ── Étape 3 : spotlight nav "calendrier" — l'utilisateur clique lui-même ──
  if (step === 3 && location.pathname !== "/calendar") {
    return (
      <SpotlightOverlay targetId="nav-calendar" onSkip={complete} PAD={6}>
        <Bubble
          targetId="nav-calendar"
          text="Ta recette est prête ! Clique sur Calendrier pour planifier tes repas de la semaine."
          position={isMobile() ? "bottom" : "right"}
          fallbackCenter={isMobile()}
        />
      </SpotlightOverlay>
    )
  }

  // ── Étape 4 : spotlight liste recettes calendrier ──
  if (step === 4 && location.pathname === "/calendar") {
    if (isDragging) return null
    return (
      <SpotlightOverlay targetId="calendar-recipe-list" onSkip={complete}>
        <Bubble
          targetId="calendar-recipe-list"
          text={isMobile()
            ? "Tes recettes sont ici ! Appuie sur un créneau du calendrier pour assigner une recette."
            : "Tes recettes sont dans cette liste. Glisse-en une sur un créneau du calendrier pour planifier ton repas !"
          }
          position={isMobile() ? "bottom" : "left"}
        />
      </SpotlightOverlay>
    )
  }

  // ── Étape 5 : spotlight btn-go-shopping ──
  if (step === 5 && location.pathname === "/calendar") {
    return (
      <SpotlightOverlay targetId="btn-go-shopping" onSkip={complete}>
        <Bubble
          targetId="btn-go-shopping"
          text="Maintenant clique sur ce bouton pour générer ta liste de courses depuis ton planning !"
          position="bottom"
        />
      </SpotlightOverlay>
    )
  }

  // ── Étape 6 : spotlight btn-generate-shopping ──
  if (step === 6 && location.pathname === "/shopping") {
    if (shoppingGenerated) {
      return (
        <ConfirmationBubble text="Ta liste de courses a été générée et triée pour les plats planifiés à la semaine !" />
      )
    }
    return (
      <SpotlightOverlay targetId="btn-generate-shopping" onSkip={complete}>
        <Bubble
          targetId="btn-generate-shopping"
          text="Clique sur ce bouton pour générer automatiquement ta liste de courses depuis ton planning !"
          position="bottom"
        />
      </SpotlightOverlay>
    )
  }

  // ── Étape 7 : découvrir ──
  if (step === 7) {
    return (
      <ModalCard
        emoji="✨"
        title="Découvre la communauté"
        text="Pas d'inspi ? Explore les recettes partagées par d'autres utilisateurs et ajoute-les directement à tes recettes."
        actionLabel="explorer"
        onAction={() => { navigate("/discover"); complete() }}
        onSkip={complete}
        step={7} total={TOTAL}
      />
    )
  }

  return null
}
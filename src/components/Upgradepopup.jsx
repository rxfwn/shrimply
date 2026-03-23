import { supabase } from "../supabase"

export default function Upgradepopup({ onClose, message }) {
  const handleUpgrade = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, email: user.email }),
      }
    )
    const { url } = await res.json()
    window.location.href = url
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 320,
          backgroundColor: "#091718",
          borderRadius: 20,
          padding: "28px 24px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Icône shrimp */}
        <img
          src="/icons/shrim.png"
          alt=""
          style={{ width: 36, height: 36, objectFit: "contain", marginBottom: 16 }}
          onError={e => e.target.style.display = "none"}
        />

        {/* Titre */}
        <p style={{
          margin: "0 0 16px",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 700,
          fontSize: 16,
          lineHeight: 1.2,
          textAlign: "center",
          letterSpacing: "-0.05em",
          color: "#ffffff",
        }}>
          fonctionnalité premium
        </p>

        {/* Message */}
        <p style={{
          margin: "0 0 28px",
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: 12,
          lineHeight: 1.6,
          textAlign: "center",
          letterSpacing: "-0.03em",
          color: "rgba(255,255,255,0.7)",
        }}>
          {message}
        </p>

        {/* Bouton premium */}
        <button
          onClick={handleUpgrade}
          style={{
            width: "100%",
            height: 42,
            backgroundColor: "#CFFF79",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "-0.05em",
            color: "#091718",
            marginBottom: 12,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          passer premium — 4,99€/mois
        </button>

        {/* Pas maintenant */}
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: 11,
            letterSpacing: "-0.05em",
            color: "rgba(255,255,255,0.45)",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}
        >
          pas maintenant
        </button>
      </div>
    </div>
  )
}
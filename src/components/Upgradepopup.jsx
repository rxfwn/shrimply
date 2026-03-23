import { supabase } from "../supabase"

export default function UpgradePopup({ onClose, message }) {
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
          position: "relative",
          width: 160,
          height: 165,
          backgroundColor: "#091718",
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Icône shrimp */}
        <img
          src="/icons/shrim.png"
          alt=""
          style={{ width: 16, height: 16, marginTop: 11, objectFit: "contain" }}
          onError={e => e.target.style.display = "none"}
        />

        {/* Titre */}
        <p style={{
          margin: "8px 0 0",
          width: 126,
          fontFamily: "Poppins, sans-serif",
          fontWeight: 700,
          fontSize: 9,
          lineHeight: "9px",
          textAlign: "center",
          letterSpacing: "-0.07em",
          color: "#ffffff",
        }}>
          fonctionnalité premium
        </p>

        {/* Message */}
        <p style={{
          margin: "16px 0 0",
          width: 126,
          fontFamily: "Poppins, sans-serif",
          fontWeight: 400,
          fontSize: 7,
          lineHeight: "9px",
          textAlign: "center",
          letterSpacing: "-0.07em",
          color: "#ffffff",
        }}>
          {message}
        </p>

        {/* Bouton premium */}
        <button
          onClick={handleUpgrade}
          style={{
            position: "absolute",
            left: 12,
            top: 110,
            width: 136,
            height: 21,
            backgroundColor: "#CFFF79",
            borderRadius: 5,
            border: "none",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 700,
            fontSize: 7,
            lineHeight: "9px",
            textAlign: "center",
            letterSpacing: "-0.07em",
            color: "#091718",
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
            position: "absolute",
            top: 137,
            width: 126,
            left: "calc(50% - 63px)",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 400,
            fontSize: 6,
            lineHeight: "9px",
            textAlign: "center",
            letterSpacing: "-0.07em",
            color: "#ffffff",
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: 0.6,
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
        >
          pas maintenant
        </button>
      </div>
    </div>
  )
}
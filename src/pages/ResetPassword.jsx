import { useState } from "react"
import { supabase } from "../supabase"
import { Link } from "react-router-dom"

export default function ResetPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleReset = async () => {
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password/confirm",
    })
    if (error) { setError("Erreur, vérifie ton email"); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }

  const inputStyle = {
    width: "100%", borderRadius: "12px", padding: "14px 16px",
    fontSize: "14px", outline: "none", background: "#111111",
    border: "0px solid rgba(255,255,255,0.08)", color: "#666666",
    fontFamily: "Poppins, sans-serif", fontWeight: 500,
    letterSpacing: "-0.05em", transition: "border-color 0.2s", boxSizing: "border-box",
  }

  const btnBaseStyle = {
    width: "100%", padding: "14px", borderRadius: "12px",
    fontSize: "14px", fontWeight: 700, letterSpacing: "-0.05em",
    fontFamily: "Poppins, sans-serif", border: "none", cursor: "pointer",
    transition: "transform 0.2s ease",
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "#111111", fontFamily: "Poppins, sans-serif", fontWeight: 700,
      letterSpacing: "-0.05em", padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
            <img src="/icons/shrim.png" alt="Shrimply" style={{ width: 40, height: 40 }} />
            <span style={{ fontSize: "28px", color: "#ffffff", fontWeight: 700 }}>
              Shrim<span style={{ color: "#f3501e" }}>ply</span>
            </span>
          </div>
          <p className="text-light" style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
            planification de repas facile
          </p>
        </div>

        {/* BLOC */}
        <div style={{ backgroundColor: "#091718", borderRadius: "10px", padding: "32px" }}>
          <h2 style={{ fontSize: "20px", color: "#ffffff", margin: "0 0 8px 0", fontWeight: 700 }}>
            mot de passe oublié
          </h2>
          <p className="text-light" style={{ fontSize: "13px", color: "#ffffff", margin: "0 0 24px 0", fontWeight: 500 }}>
            on t'envoie un lien pour réinitialiser ton mot de passe.
          </p>

          {error && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {sent ? (
            <div style={{ textAlign: "center" }}>
              <img src="/icons/mailbox.png" alt="" style={{ width: 48, height: 48, marginBottom: "16px" }} />
              <p style={{ color: "#20ba59", fontWeight: 700, fontSize: "15px", margin: "0 0 8px 0" }}>Email envoyé !</p>
              <p className="text-light" style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", fontWeight: 700, margin: "0 0 24px 0" }}>
                Vérifie ta boîte mail et clique sur le lien.
              </p>
              <Link to="/login" style={{ color: "#ffffff", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                retour à la connexion
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                style={inputStyle}
                type="email"
                placeholder="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReset()}
              />

              <button
                onClick={handleReset}
                disabled={loading || !email}
                style={{
                  ...btnBaseStyle,
                  background: "#f3501e",
                  color: "#ffffff",
                  opacity: loading || !email ? 0.4 : 1,
                  cursor: loading || !email ? "not-allowed" : "pointer",
                  marginTop: "4px",
                }}
                onMouseEnter={e => { if (!loading && email) e.currentTarget.style.transform = "scale(1.03)" }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
                onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)" }}
                onMouseUp={e => { e.currentTarget.style.transform = "scale(1.03)" }}
              >
                {loading ? "envoi..." : "envoyer le lien"}
              </button>

              <p style={{ textAlign: "center", fontSize: "13px", marginTop: "8px", marginBottom: 0, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
                <Link to="/login" style={{ color: "#ffffff", textDecoration: "none", fontWeight: 700 }}>
                  retour à la connexion
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
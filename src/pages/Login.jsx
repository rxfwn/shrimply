import { useState } from "react"
import { supabase } from "../supabase"
import { Link, useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { isDay } = useTheme()

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError("Email ou mot de passe incorrect"); setLoading(false) }
    else navigate("/calendar")
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" }
    })
  }

  const inputStyle = {
    width: "100%",
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "14px",
    outline: "none",
    background: isDay ? "#FFFFFF" : "#111111",
    border: isDay ? "1.5px solid rgba(0,0,0,0.07)" : "0px solid rgba(255,255,255,0.08)",
    color: isDay ? "#111111" : "#666666",
    fontFamily: "Poppins, sans-serif",
    fontWeight: 100,
    letterSpacing: "-0.05em",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  }

  const btnBaseStyle = {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "-0.05em",
    fontFamily: "Poppins, sans-serif",
    border: "none",
    cursor: "pointer",
    transition: "transform 0.2s ease",
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDay ? "#F5F0E8" : "#111111",
      fontFamily: "Poppins, sans-serif",
      fontWeight: 700,
      letterSpacing: "-0.05em",
      padding: "24px",
      transition: "background-color 0.3s ease",
    }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
            <img src="/icons/shrim.png" alt="Shrimply" style={{ width: 40, height: 40 }} />
            <span style={{ fontSize: "28px", color: isDay ? "#111111" : "#ffffff", fontWeight: 700 }}>
              Shrim<span style={{ color: "#f3501e" }}>ply</span>
            </span>
          </div>
          <p style={{ fontSize: "13px", color: isDay ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)", margin: 0 }}>
            planification de repas facile
          </p>
        </div>

        {/* BLOC */}
        <div style={{
          backgroundColor: isDay ? "#FFFFFF" : "#091718",
          borderRadius: "10px",
          padding: "32px",
          border: isDay ? "1.5px solid rgba(0,0,0,0.07)" : "none",
          transition: "background-color 0.3s ease",
        }}>
          <h2 style={{ fontSize: "20px", color: isDay ? "#111111" : "#ffffff", margin: "0 0 24px 0", fontWeight: 700 }}>
            connexion
          </h2>

          {error && (
            <div style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "13px",
              background: "rgba(239,68,68,0.1)",
              color: "#fca5a5",
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontWeight: 900 }}>
            <input
              style={inputStyle}
              type="email"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <div style={{ position: "relative" }}>
              <input
                style={{ ...inputStyle, paddingRight: "44px" }}
                type={showPassword ? "text" : "password"}
                placeholder="mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <img src={showPassword ? "/icons/oeilouvert.png" : "/icons/oeilferme.png"} alt="" style={{ width: 18, height: 18, opacity: 0.4 }} />
              </button>
            </div>

            <div style={{ textAlign: "right", marginTop: "-4px" }}>
              <Link to="/reset-password" style={{ fontSize: "12px", color: isDay ? "#111111" : "#ffffff", textDecoration: "none", fontWeight: 500 }}>
                mot de passe oublié ?
              </Link>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              style={{
                ...btnBaseStyle,
                background: "#f3501e",
                color: "#ffffff",
                opacity: loading || !email || !password ? 0.4 : 1,
                cursor: loading || !email || !password ? "not-allowed" : "pointer",
                marginTop: "4px",
              }}
              onMouseEnter={e => { if (!loading && email && password) e.currentTarget.style.transform = "scale(1.03)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)" }}
              onMouseUp={e => { e.currentTarget.style.transform = "scale(1.03)" }}
            >
              {loading ? "connexion..." : "se connecter"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "4px 0" }}>
              <div style={{ flex: 1, height: "1px", background: isDay ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)" }} />
              <span style={{ fontSize: "12px", color: isDay ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.25)", fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: "1px", background: isDay ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)" }} />
            </div>

            <button
              onClick={handleGoogle}
              style={{
                ...btnBaseStyle,
                background: isDay ? "#EDE8DF" : "#111111",
                color: isDay ? "#111111" : "#ffffff",
                border: isDay ? "1.5px solid rgba(0,0,0,0.07)" : "none",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1.03)"}
            >
              continuer avec google
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: "13px", marginTop: "20px", marginBottom: 0, color: isDay ? "#111111" : "#ffffff", fontWeight: 500 }}>
            pas encore de compte ?{" "}
            <Link to="/register" style={{ color: "#f3501e", textDecoration: "none", fontWeight: 700 }}>
              s'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
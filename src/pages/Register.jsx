import { useState } from "react"
import { supabase } from "../supabase"
import { Link, useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

export default function Register() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { isDay } = useTheme()

  const validateUsername = async (value) => {
    setUsernameError("")
    if (!value) return
    if (value.length < 3) { setUsernameError("minimum 3 caractères"); return }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) { setUsernameError("Lettres, chiffres et _ uniquement"); return }
    const { data } = await supabase.from("profiles").select("id").eq("username", value).single()
    if (data) setUsernameError("Ce pseudo est déjà pris")
  }

  const handleRegister = async () => {
    setError("")
    if (usernameError) return
    if (!username) { setError("Le pseudo est obligatoire"); return }
    if (username.length < 3) { setError("Pseudo trop court"); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError("Pseudo invalide"); return }
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return }
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères"); return }
    setLoading(true)

    const { data: existing } = await supabase.from("profiles").select("id").eq("username", username).single()
    if (existing) { setError("Ce pseudo est déjà pris"); setLoading(false); return }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      await supabase.from("profiles").insert({ id: data.user.id, username })
    }

    navigate("/calendar")
    setLoading(false)
  }

  const passwordMatch = confirmPassword && password === confirmPassword
  const passwordMismatch = confirmPassword && password !== confirmPassword

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
    fontWeight: 500,
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
            <img src="/icons/shrim.webp" alt="Shrimply" style={{ width: 40, height: 40 }} />
            <span style={{ fontSize: "28px", color: isDay ? "#111111" : "#ffffff", fontWeight: 700 }}>
              Shrim<span style={{ color: "#f3501e" }}>ply</span>
            </span>
          </div>
          <p style={{ fontSize: "13px", color: isDay ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)", margin: 0, fontWeight: 500 }}>
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
            créer un compte
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

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            <input
              style={inputStyle}
              type="email"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <div>
              <input
                style={{
                  ...inputStyle,
                  border: usernameError
                    ? "1.5px solid rgba(239,68,68,0.5)"
                    : isDay ? "1.5px solid rgba(0,0,0,0.07)" : "0px solid rgba(255,255,255,0.08)",
                }}
                type="text"
                placeholder="pseudo"
                value={username}
                onChange={e => { setUsername(e.target.value); validateUsername(e.target.value) }}
              />
              {usernameError && (
                <p style={{ fontSize: "12px", color: "#fca5a5", margin: "4px 0 0 4px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                  <img src="/icons/cross.webp" alt="" style={{ width: 14, height: 14 }} /> {usernameError}
                </p>
              )}
              {username.length >= 3 && !usernameError && /^[a-zA-Z0-9_]+$/.test(username) && (
                <p style={{ fontSize: "12px", color: "#20ba59", margin: "4px 0 0 4px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                  <img src="/icons/check.webp" alt="" style={{ width: 14, height: 14 }} /> pseudo disponible
                </p>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <input
                style={{ ...inputStyle, paddingRight: "44px" }}
                type={showPassword ? "text" : "password"}
                placeholder="mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <img src={showPassword ? "/icons/oeilouvert.webp" : "/icons/oeilferme.webp"} alt="" style={{ width: 18, height: 18, opacity: 0.4 }} />
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <input
                style={{
                  ...inputStyle,
                  paddingRight: "44px",
                  border: passwordMismatch
                    ? "1.5px solid rgba(239,68,68,0.5)"
                    : passwordMatch
                    ? "1.5px solid rgba(52,211,153,0.5)"
                    : isDay ? "1.5px solid rgba(0,0,0,0.07)" : "0px solid rgba(255,255,255,0.08)",
                }}
                type={showConfirm ? "text" : "password"}
                placeholder="confirmer le mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <button
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <img src={showConfirm ? "/icons/oeilouvert.webp" : "/icons/oeilferme.webp"} alt="" style={{ width: 18, height: 18, opacity: 0.4 }} />
              </button>
            </div>

            {passwordMatch && (
              <p style={{ fontSize: "12px", color: "#34d399", margin: "-4px 0 0 4px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                <img src="/icons/check.webp" alt="" style={{ width: 14, height: 14 }} /> les mots de passe correspondent
              </p>
            )}
            {passwordMismatch && (
              <p style={{ fontSize: "12px", color: "#fca5a5", margin: "-4px 0 0 4px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                <img src="/icons/cross.webp" alt="" style={{ width: 14, height: 14 }} /> les mots de passe ne correspondent pas
              </p>
            )}

            <button
              onClick={handleRegister}
              disabled={loading || !email || !password || !confirmPassword || !username || !!usernameError}
              style={{
                ...btnBaseStyle,
                background: "#f3501e",
                color: "#ffffff",
                opacity: loading || !email || !password || !confirmPassword || !username || !!usernameError ? 0.4 : 1,
                cursor: loading || !email || !password || !confirmPassword || !username || !!usernameError ? "not-allowed" : "pointer",
                marginTop: "4px",
              }}
              onMouseEnter={e => { if (!loading && email && password && confirmPassword && username && !usernameError) e.currentTarget.style.transform = "scale(1.03)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)" }}
              onMouseUp={e => { e.currentTarget.style.transform = "scale(1.03)" }}
            >
              {loading ? "création..." : "créer mon compte"}
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: "13px", marginTop: "20px", marginBottom: 0, color: isDay ? "#111111" : "#ffffff", fontWeight: 500 }}>
            déjà un compte ?{" "}
            <Link to="/login" style={{ color: "#f3501e", textDecoration: "none", fontWeight: 700 }}>
              se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
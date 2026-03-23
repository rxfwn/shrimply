import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { useNavigate } from "react-router-dom"

export default function ResetPasswordConfirm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  const passwordMatch = confirmPassword && password === confirmPassword
  const passwordMismatch = confirmPassword && password !== confirmPassword

  useEffect(() => {
    // 1. Écoute l'event PASSWORD_RECOVERY émis par Supabase quand il lit le hash de l'URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true)
        setChecking(false)
      }
    })

    // 2. Vérifie si une session est déjà présente (ex: rechargement de page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
        setChecking(false)
      } else {
        // Laisse un peu de temps à Supabase pour traiter le hash de l'URL
        setTimeout(() => setChecking(false), 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleConfirm = async () => {
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return }
    if (password.length < 6) { setError("Minimum 6 caractères"); return }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError("Erreur lors de la mise à jour. Le lien a peut-être expiré.")
      setLoading(false)
    } else {
      setSuccess(true)
      await supabase.auth.signOut()
      setTimeout(() => navigate("/login"), 2500)
    }
  }

  const inputStyle = {
    width: "100%", borderRadius: "12px", padding: "14px 16px",
    fontSize: "14px", outline: "none", background: "#1a1a1a",
    border: "1.5px solid rgba(255,255,255,0.08)", color: "#e5e5e5",
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
      backgroundColor: "#111111", fontFamily: "Poppins, sans-serif",
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
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", margin: 0, fontWeight: 500 }}>
            planification de repas facile
          </p>
        </div>

        {/* BLOC */}
        <div style={{ backgroundColor: "#091718", borderRadius: "16px", padding: "32px", border: "1px solid rgba(255,255,255,0.06)" }}>

          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <p style={{ color: "#34d399", fontWeight: 700, fontSize: "16px", margin: "0 0 8px 0" }}>Mot de passe mis à jour !</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", fontWeight: 500 }}>Redirection vers la connexion...</p>
            </div>

          ) : checking ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{
                width: 32, height: 32,
                border: "3px solid rgba(243,80,30,0.2)",
                borderTopColor: "#f3501e",
                borderRadius: "50%",
                margin: "0 auto 16px",
                animation: "spin 0.8s linear infinite"
              }} />
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", fontWeight: 500, margin: 0 }}>vérification du lien...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>

          ) : !sessionReady ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
              <p style={{ color: "#fca5a5", fontWeight: 700, fontSize: "15px", margin: "0 0 8px 0" }}>Lien invalide ou expiré</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", fontWeight: 500, margin: "0 0 24px 0" }}>
                Ce lien n'est plus valide. Refais une demande de réinitialisation.
              </p>
              <button onClick={() => navigate("/reset-password")} style={{ ...btnBaseStyle, background: "#f3501e", color: "#ffffff" }}>
                refaire la demande
              </button>
            </div>

          ) : (
            <>
              <h2 style={{ fontSize: "20px", color: "#ffffff", margin: "0 0 8px 0", fontWeight: 700 }}>
                nouveau mot de passe
              </h2>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", margin: "0 0 24px 0", fontWeight: 500 }}>
                Choisis un nouveau mot de passe pour ton compte.
              </p>

              {error && (
                <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", background: "rgba(239,68,68,0.1)", color: "#fca5a5", fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                {/* Nouveau mot de passe */}
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    nouveau mot de passe
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      style={{ ...inputStyle, paddingRight: "44px" }}
                      type={showPassword ? "text" : "password"}
                      placeholder="min. 6 caractères"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={e => e.target.style.borderColor = "#f3501e"}
                      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                    />
                    <button onClick={() => setShowPassword(!showPassword)}
                      style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <img src={showPassword ? "/icons/oeilouvert.png" : "/icons/oeilferme.png"} alt="" style={{ width: 18, height: 18, opacity: 0.4 }} />
                    </button>
                  </div>
                </div>

                {/* Confirmer */}
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    confirmer le mot de passe
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      style={{
                        ...inputStyle, paddingRight: "44px",
                        borderColor: passwordMismatch ? "rgba(239,68,68,0.6)" : passwordMatch ? "rgba(52,211,153,0.6)" : "rgba(255,255,255,0.08)",
                      }}
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleConfirm()}
                    />
                    <button onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <img src={showConfirm ? "/icons/oeilouvert.png" : "/icons/oeilferme.png"} alt="" style={{ width: 18, height: 18, opacity: 0.4 }} />
                    </button>
                  </div>
                  {passwordMatch && <p style={{ fontSize: "12px", color: "#34d399", margin: "6px 0 0 2px", fontWeight: 500 }}>✅ les mots de passe correspondent</p>}
                  {passwordMismatch && <p style={{ fontSize: "12px", color: "#fca5a5", margin: "6px 0 0 2px", fontWeight: 500 }}>❌ les mots de passe ne correspondent pas</p>}
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                  style={{
                    ...btnBaseStyle,
                    background: "#f3501e", color: "#ffffff", marginTop: "4px",
                    opacity: loading || !password || !confirmPassword || password !== confirmPassword ? 0.4 : 1,
                    cursor: loading || !password || !confirmPassword || password !== confirmPassword ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={e => { if (!loading && passwordMatch) e.currentTarget.style.transform = "scale(1.02)" }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)" }}
                  onMouseUp={e => { e.currentTarget.style.transform = "scale(1.02)" }}
                >
                  {loading ? "mise à jour..." : "mettre à jour le mot de passe"}
                </button>

                <p style={{ textAlign: "center", fontSize: "13px", margin: "4px 0 0", color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>
                  <span onClick={() => navigate("/login")} style={{ color: "rgba(255,255,255,0.6)", cursor: "pointer", fontWeight: 700 }}>
                    retour à la connexion
                  </span>
                </p>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
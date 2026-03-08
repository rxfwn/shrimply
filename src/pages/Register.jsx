import { useState } from "react"
import { supabase } from "../supabase"
import { Link, useNavigate } from "react-router-dom"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async () => {
    setError("")
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return }
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères"); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else navigate("/calendar")
    setLoading(false)
  }

  const passwordMatch = confirmPassword && password === confirmPassword
  const passwordMismatch = confirmPassword && password !== confirmPassword

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-purple">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-cream mb-1">🦐 Shrim<span className="text-brand-orange">ply</span></h1>
          <p className="text-sm text-brand-cream/50">Planifie tes repas avec style</p>
        </div>

        <div className="rounded-2xl p-7 shadow-2xl bg-brand-dark/60 border border-white/10">
          <h2 className="text-lg font-semibold text-brand-cream mb-5">Créer un compte</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-500/15 text-red-300 border border-red-500/30">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <input
              className="w-full rounded-xl px-4 py-3 text-sm outline-none bg-white/5 border border-white/10 text-brand-cream placeholder-brand-cream/30 focus:border-brand-orange transition"
              type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />

            <div className="relative">
              <input
                className="w-full rounded-xl px-4 py-3 text-sm outline-none bg-white/5 border border-white/10 text-brand-cream placeholder-brand-cream/30 focus:border-brand-orange transition pr-10"
                type={showPassword ? "text" : "password"} placeholder="Mot de passe" value={password}
                onChange={e => setPassword(e.target.value)} />
              <button onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-cream/40 hover:text-brand-cream transition text-sm">
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="relative">
              <input
                className={`w-full rounded-xl px-4 py-3 text-sm outline-none bg-white/5 border text-brand-cream placeholder-brand-cream/30 focus:border-brand-orange transition pr-10
                  ${passwordMismatch ? "border-red-500" : passwordMatch ? "border-brand-cyan" : "border-white/10"}`}
                type={showConfirm ? "text" : "password"} placeholder="Confirmer le mot de passe"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <button onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-cream/40 hover:text-brand-cream transition text-sm">
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {passwordMatch && <p className="text-xs -mt-1 text-brand-cyan">✅ Les mots de passe correspondent</p>}
            {passwordMismatch && <p className="text-xs -mt-1 text-red-400">❌ Les mots de passe ne correspondent pas</p>}

            <button onClick={handleRegister} disabled={loading || !email || !password || !confirmPassword}
              className="w-full py-3 rounded-xl text-sm font-bold bg-brand-orange hover:bg-brand-orange/80 text-white transition disabled:opacity-50 mt-1">
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </div>

          <p className="text-center text-sm mt-5 text-brand-cream/40">
            Déjà un compte ?{" "}
            <Link to="/login" className="font-semibold text-brand-cyan">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
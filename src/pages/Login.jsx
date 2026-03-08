import { useState } from "react"
import { supabase } from "../supabase"
import { Link, useNavigate } from "react-router-dom"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError("Email ou mot de passe incorrect")
    else navigate("/calendar")
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-purple">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-cream mb-1">🦐 Shrim<span className="text-brand-orange">ply</span></h1>
          <p className="text-sm text-brand-cream/50">Planifie tes repas avec style</p>
        </div>

        <div className="rounded-2xl p-7 shadow-2xl bg-brand-dark/60 border border-white/10">
          <h2 className="text-lg font-semibold text-brand-cream mb-5">Connexion</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-500/15 text-red-300 border border-red-500/30">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <input
              className="w-full rounded-xl px-4 py-3 text-sm outline-none bg-white/5 border border-white/10 text-brand-cream placeholder-brand-cream/30 focus:border-brand-orange transition"
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <div className="relative">
              <input
                className="w-full rounded-xl px-4 py-3 text-sm outline-none bg-white/5 border border-white/10 text-brand-cream placeholder-brand-cream/30 focus:border-brand-orange transition pr-10"
                type={showPassword ? "text" : "password"} placeholder="Mot de passe" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-cream/40 hover:text-brand-cream transition text-sm">
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            <button onClick={handleLogin} disabled={loading || !email || !password}
              className="w-full py-3 rounded-xl text-sm font-bold bg-brand-orange hover:bg-brand-orange/80 text-white transition disabled:opacity-50 mt-1">
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-xs text-brand-cream/30">ou</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <button onClick={handleGoogle}
              className="w-full py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-brand-cream hover:bg-white/10 transition">
              🔵 Continuer avec Google
            </button>
          </div>

          <p className="text-center text-sm mt-5 text-brand-cream/40">
            Pas encore de compte ?{" "}
            <Link to="/register" className="font-semibold text-brand-cyan">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
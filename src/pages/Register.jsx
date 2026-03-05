import { useState } from "react"
import { supabase } from "../supabase"
import { Link, useNavigate } from "react-router-dom"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else navigate("/home")
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" })
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-orange-500 mb-2 text-center">🦐 Shrimply</h1>
        <p className="text-center text-gray-400 mb-6">Crée ton compte</p>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <input className="w-full border border-gray-200 rounded-lg p-3 mb-3 outline-none focus:border-orange-400" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border border-gray-200 rounded-lg p-3 mb-4 outline-none focus:border-orange-400" type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={handleRegister} className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition mb-3">
          S'inscrire
        </button>
        <button onClick={handleGoogle} className="w-full border border-gray-200 text-gray-600 font-semibold py-3 rounded-lg hover:bg-gray-50 transition mb-6">
          🔵 Continuer avec Google
        </button>
        <p className="text-center text-gray-400 text-sm">Déjà un compte ? <Link to="/login" className="text-orange-500 font-medium">Se connecter</Link></p>
      </div>
    </div>
  )
}
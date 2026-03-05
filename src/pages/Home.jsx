import { supabase } from "../supabase"
import { useNavigate } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-orange-500 mb-4">🦐 Shrimply</h1>
        <p className="text-gray-500 mb-6">Tu es connecté !</p>
        <button onClick={handleLogout} className="bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-orange-600 transition">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
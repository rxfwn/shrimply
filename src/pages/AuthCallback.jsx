import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/calendar")
      } else {
        navigate("/login")
      }
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <p className="text-zinc-400 text-sm">Connexion en cours...</p>
    </div>
  )
}
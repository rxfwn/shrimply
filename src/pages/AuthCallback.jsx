// src/pages/AuthCallback.jsx
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handle = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        if (window.opener && !window.opener.closed) {
          window.close()
          return
        }

        // Vérifie si c'est un nouveau compte
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", session.user.id)
          .single()

        if (profile?.onboarded === false) {
          navigate("/recipes?onboarding=true", { replace: true })
        } else {
          navigate("/calendar", { replace: true })
        }
      } else {
        navigate("/login", { replace: true })
      }
    }

    handle()
  }, [])

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Poppins, sans-serif",
      fontSize: 13,
      color: "#888",
    }}>
      connexion en cours...
    </div>
  )
}
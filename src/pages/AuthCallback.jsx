// src/pages/AuthCallback.jsx
// Cette page est la cible du redirectTo après le login Google.
// Elle gère les deux cas : redirection normale ET popup PWA.

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handle = async () => {
      // Supabase lit automatiquement les tokens dans l'URL (hash ou query params)
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Si cette page est ouverte dans un popup PWA, on ferme juste le popup.
        // La fenêtre principale détecte la fermeture et récupère la session.
        if (window.opener && !window.opener.closed) {
          window.close()
          return
        }
        // Sinon (redirection classique navigateur), on redirige vers l'app
        navigate("/calendar", { replace: true })
      } else {
        // Pas de session — retour login
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
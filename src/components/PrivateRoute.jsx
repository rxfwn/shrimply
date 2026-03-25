import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router-dom"
import { supabase } from "../supabase"

export default function PrivateRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
      <p style={{ color: "var(--text-muted)", fontSize: 14, fontFamily: "Poppins, sans-serif" }}>Chargement...</p>
    </div>
  )

  if (!session) return <Navigate to="/" replace />

  return children ? children : <Outlet />
}

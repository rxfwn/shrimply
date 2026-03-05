import { useEffect, useState } from "react"
import { supabase } from "./supabase"

function App() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      setConnected(true)
    })
  }, [])

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-orange-500 mb-4">
          🦐 Shrimply
        </h1>
        <p className={`text-lg font-medium ${connected ? "text-green-500" : "text-gray-400"}`}>
          {connected ? "✅ Supabase connecté !" : "Connexion en cours..."}
        </p>
      </div>
    </div>
  )
}

export default App
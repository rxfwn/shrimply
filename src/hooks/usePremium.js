import { useEffect, useState } from "react"
import { supabase } from "../supabase"

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return setLoading(false)
      const { data } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single()
      setIsPremium(data?.is_premium ?? false)
      setLoading(false)
    })
  }, [])

  return { isPremium, loading }
}
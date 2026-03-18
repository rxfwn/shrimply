// src/context/ProfileContext.jsx
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../supabase"

const ProfileContext = createContext()

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
      if (data) setProfile(data)
    } catch (e) {
      console.error("ProfileContext fetchProfile error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Session existante au montage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Écoute login / logout / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = async () => {
    if (!user) return
    await fetchProfile(user.id)
  }

  return (
    <ProfileContext.Provider value={{ profile, user, loading, refreshProfile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
// src/context/ProfileContext.jsx
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../supabase"

const ProfileContext = createContext()

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      if (data) setProfile(data)
    } catch (e) {
      console.error("ProfileContext fetch error:", e)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = () => fetchProfile()

  return (
    <ProfileContext.Provider value={{ profile, user, loading, refreshProfile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
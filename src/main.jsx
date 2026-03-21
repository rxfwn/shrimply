import React, { useState, useEffect } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import { ProfileProvider } from "./context/ProfileContext"
import Login from "./pages/Login"
import Register from "./pages/Register"
import PrivateRoute from "./components/PrivateRoute"
import AuthCallback from "./pages/AuthCallback"
import Layout from "./components/Layout"
import Calendar from "./pages/Calendar"
import Recipes from "./pages/Recipes"
import RecipeDetail from "./pages/RecipeDetail"
import RecipeEdit from "./pages/RecipeEdit"
import Shopping from "./pages/Shopping"
import Fridge from "./pages/Fridge"
import Friends from "./pages/Friends"
import Discover from "./pages/Discover"
import Nutrition from "./pages/Nutrition"
import Suggestions from "./pages/Suggestions"
import Legal from "./components/Legal"
import Settings from "./pages/Settings"
import Profile from "./pages/Profile"
import ResetPassword from "./pages/ResetPassword"
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm"
import OnboardingTour from "./components/OnboardingTour"
import { supabase } from "./supabase"
import "./index.css"

// ── Onboarding isolé — ne bloque pas le rendu ──
function OnboardingManager() {
  const [state, setState] = useState({ userId: null, show: false })

  useEffect(() => {
    const checkOnboarding = async (userId) => {
      if (!userId) return
      const { data } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", userId)
        .single()
      if (data && data.onboarded === false) {
        setState({ userId, show: true })
      }
    }

    // Check utilisateur déjà connecté
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) checkOnboarding(user.id)
    })

    // Écoute les nouveaux logins (signup)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkOnboarding(session.user.id)
      }
      if (event === "SIGNED_OUT") {
        setState({ userId: null, show: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!state.show || !state.userId) return null

  return (
    <OnboardingTour
      userId={state.userId}
      onComplete={() => setState(s => ({ ...s, show: false }))}
    />
  )
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <ProfileProvider>
      <BrowserRouter>
        <Analytics />
        <SpeedInsights />

        <Routes>
          <Route path="/legal" element={<Legal />} />
          <Route path="/" element={<Navigate to="/calendar" />} />
          <Route path="/home" element={<Navigate to="/calendar" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/recipes/:id" element={<RecipeDetail />} />
              <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
              <Route path="/shopping" element={<Shopping />} />
              <Route path="/fridge" element={<Fridge />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/nutrition" element={<Nutrition />} />
              <Route path="/suggestions" element={<Suggestions />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} />
            </Route>
          </Route>
        </Routes>

        {/* Onboarding par dessus tout, sans bloquer le rendu */}
        <OnboardingManager />

      </BrowserRouter>
    </ProfileProvider>
  </ThemeProvider>
)
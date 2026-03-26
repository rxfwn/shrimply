import { useState, useEffect, lazy, Suspense } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import { ThemeProvider } from "./context/ThemeContext"
import { ProfileProvider } from "./context/ProfileContext"
import PrivateRoute from "./components/PrivateRoute"
import { supabase } from "./supabase"
import "./index.css"

// Pages chargées immédiatement (premier rendu critique)
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Register from "./pages/Register"

// Pages chargées à la demande (lazy)
const AuthCallback          = lazy(() => import("./pages/AuthCallback"))
const Layout                = lazy(() => import("./components/Layout"))
const Calendar              = lazy(() => import("./pages/Calendar"))
const Recipes               = lazy(() => import("./pages/Recipes"))
const RecipeDetail          = lazy(() => import("./pages/RecipeDetail"))
const RecipeEdit            = lazy(() => import("./pages/RecipeEdit"))
const Shopping              = lazy(() => import("./pages/Shopping"))
const Fridge                = lazy(() => import("./pages/Fridge"))
const Friends               = lazy(() => import("./pages/Friends"))
const Discover              = lazy(() => import("./pages/Discover"))
const Nutrition             = lazy(() => import("./pages/Nutrition"))
const Suggestions           = lazy(() => import("./pages/Suggestions"))
const Legal                 = lazy(() => import("./components/Legal"))
const Settings              = lazy(() => import("./pages/Settings"))
const Profile               = lazy(() => import("./pages/Profile"))
const ResetPassword         = lazy(() => import("./pages/ResetPassword"))
const ResetPasswordConfirm  = lazy(() => import("./pages/ResetPasswordConfirm"))
const OnboardingTour        = lazy(() => import("./components/OnboardingTour"))

// ── Route racine : affiche la landing immédiatement, redirige si connecté ──
function RootRoute() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/calendar", { replace: true })
    })
  }, [])

  return <Landing />
}

// ── Onboarding isolé — ne bloque pas le rendu ──
function OnboardingManager() {
  const [state, setState] = useState({ userId: null, show: false })
  const location = useLocation()

  useEffect(() => {
    // Démarrage instantané si flag ?onboarding=true dans l'URL
    const params = new URLSearchParams(location.search)
    if (params.get("onboarding") === "true") {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setState({ userId: user.id, show: true })
      })
      return
    }

    // Sinon comportement normal
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

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) checkOnboarding(user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return
      if (event === "SIGNED_IN" && session?.user) checkOnboarding(session.user.id)
      if (event === "SIGNED_OUT") setState({ userId: null, show: false })
    })

    return () => subscription.unsubscribe()
  }, [location.search])

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

        <Suspense fallback={null}>
          <Routes>
            <Route path="/legal" element={<Legal />} />
            <Route path="/" element={<RootRoute />} />
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
        </Suspense>

      </BrowserRouter>
    </ProfileProvider>
  </ThemeProvider>
)
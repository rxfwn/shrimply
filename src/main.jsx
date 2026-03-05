import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/login"
import Register from "./pages/register"
import PrivateRoute from "./components/privateroute"
import Layout from "./components/layout"
import Calendar from "./pages/calendar"
import Recipes from "./pages/recipes"
import Shopping from "./pages/shopping"
import Fridge from "./pages/fridge"
import Friends from "./pages/friends"
import Discover from "./pages/discover"
import Nutrition from "./pages/nutrition"
import Suggestions from "./pages/suggestions"
import Settings from "./pages/settings"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/calendar" />} />
        <Route path="/home" element={<Navigate to="/calendar" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<Navigate to="/calendar" />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/recipes" element={<Recipes />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="/fridge" element={<Fridge />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import PrivateRoute from "./components/PrivateRoute"
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
import Settings from "./pages/Settings"
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
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
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
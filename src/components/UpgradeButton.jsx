import { supabase } from "../supabase"

export default function UpgradeButton({ label = "Passer Premium — 4,99€/mois" }) {
  const handleUpgrade = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, email: user.email }),
      }
    )
    const { url } = await res.json()
    window.location.href = url
  }

  return (
    <button onClick={handleUpgrade}>{label}</button>
  )
}
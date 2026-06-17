// Calcule si le texte sur un fond coloré doit être blanc ou noir
export function getTextColor(hex) {
  if (!hex) return "#111111"
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return (0.299*r + 0.587*g + 0.114*b)/255 > 0.55 ? "#111111" : "#ffffff"
}

// Valide qu'une URL d'image est bien une URL HTTP (pas javascript:, data:, etc.)
export function safeImageUrl(url) {
  if (!url) return null
  return url.startsWith("https://") || url.startsWith("http://") ? url : null
}

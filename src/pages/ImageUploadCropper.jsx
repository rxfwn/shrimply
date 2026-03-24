import { useState, useRef, useCallback, useEffect } from "react"
import { supabase } from "../supabase"
import { useTheme } from "../context/ThemeContext"

const CROP_RATIO = 4 / 3
const CROP_WIDTH = 400
const CROP_HEIGHT = CROP_WIDTH / CROP_RATIO

export default function ImageUploadCropper({ onImageSaved, existingUrl, recipeId }) {
  const { isDay } = useTheme()
  const [stage, setStage] = useState(existingUrl ? "done" : "idle")
  const [imageSrc, setImageSrc] = useState(null)
  const [savedUrl, setSavedUrl] = useState(existingUrl || null)
  const [error, setError] = useState("")
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const fileInputRef = useRef(null)

  const moderateImage = async (base64Data) => {
    const base64 = base64Data.split(",")[1]
    const { data, error: funcError } = await supabase.functions.invoke('moderate-image', { body: { imageBase64: base64 } })
    if (funcError) throw new Error("Erreur de communication avec le service d'IA.")
    const result = data.responses?.[0]
    const safe = result?.safeSearchAnnotation
    if (safe?.adult === "LIKELY" || safe?.adult === "VERY_LIKELY") return { isFood: false, reason: "image inappropriée" }
    const labels = result?.labelAnnotations?.map(l => l.description.toLowerCase()) || []
    const foodKeywords = ["food", "dish", "cuisine", "meal", "ingredient", "recipe", "cooking"]
    const isFood = labels.some(label => foodKeywords.some(k => label.includes(k)))
    return { isFood, reason: isFood ? "OK" : "l'IA ne reconnaît pas de plat alimentaire ici." }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError("L'image est trop lourde (max 10 Mo)."); return }
    const reader = new FileReader()
    reader.onload = (ev) => { setImageSrc(ev.target.result); setStage("cropping"); setError("") }
    reader.readAsDataURL(file)
  }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !naturalSize.w) return
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, CROP_WIDTH, CROP_HEIGHT)
    ctx.drawImage(img, offset.x, offset.y, naturalSize.w * scale, naturalSize.h * scale)
  }, [offset, scale, naturalSize])

  useEffect(() => { if (stage === "cropping") drawCanvas() }, [drawCanvas, stage])

  const onImageLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target
    setNaturalSize({ w, h })
    const initScale = Math.max(CROP_WIDTH / w, CROP_HEIGHT / h)
    setScale(initScale)
    setOffset({ x: (CROP_WIDTH - w * initScale) / 2, y: (CROP_HEIGHT - h * initScale) / 2 })
  }

  const handleConfirm = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const croppedDataUrl = canvas.toDataURL("image/jpeg", 1)
    setError(""); setStage("moderating")
    try {
      const moderation = await moderateImage(croppedDataUrl)
      if (!moderation.isFood) { setError(`❌ Refusé : ${moderation.reason}`); setStage("cropping"); return }
      setStage("uploading")
      const blob = dataURLtoBlob(croppedDataUrl)
      const fileName = `${recipeId || "recipe"}_${Date.now()}.jpg`
      const filePath = `recipes/${fileName}`
      const { error: uploadError } = await supabase.storage.from("recipe-images").upload(filePath, blob)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from("recipe-images").getPublicUrl(filePath)
      setSavedUrl(publicUrl); setStage("done"); onImageSaved?.(publicUrl)
    } catch (err) {
      console.error(err)
      setError("Erreur technique. Vérifie ta console ou ta facturation Google.")
      setStage("cropping")
    }
  }

  const handleReset = () => { setStage("idle"); setImageSrc(null); setSavedUrl(null); setError("") }

  const btnBase = { fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-0.05em", border: "none", cursor: "pointer", borderRadius: 10, transition: "transform 0.15s" }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 16, backgroundColor: "var(--bg-card-2)", border: "1px solid var(--border)" }}>

      {/* IDLE */}
      {stage === "idle" && (
        <div
          onClick={() => fileInputRef.current.click()}
          style={{ height: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, cursor: "pointer", border: "2px dashed var(--border-2)", transition: "border-color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#f3501e"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-2)"}
        >
          <img src="/icons/photo.webp" alt="" style={{ width: 40, height: 40, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>ajouter la photo du plat</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-faint)" }}>JPG, PNG — max 10MB</p>
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} accept="image/*" />
        </div>
      )}

      {/* CROP */}
      {stage === "cropping" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{ position: "relative", overflow: "hidden", borderRadius: 10, width: "100%", aspectRatio: "4/3", cursor: dragging ? "grabbing" : "grab", backgroundColor: "var(--bg-main)" }}
            onMouseDown={(e) => { setDragging(true); dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y } }}
            onMouseMove={(e) => {
              if (!dragging) return
              const dx = e.clientX - dragStart.current.mx
              const dy = e.clientY - dragStart.current.my
              setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, scale, naturalSize))
            }}
            onMouseUp={() => setDragging(false)}
          >
            <canvas ref={canvasRef} width={CROP_WIDTH} height={CROP_HEIGHT} style={{ width: "100%", height: "100%" }} />
            <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} style={{ display: "none" }} alt="" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleReset} style={{ ...btnBase, flex: 1, padding: "10px", backgroundColor: "var(--bg-card-2)", color: "var(--text-muted)" }}>annuler</button>
            <button onClick={handleConfirm} style={{ ...btnBase, flex: 1, padding: "10px", backgroundColor: "#f3501e", color: "#ffffff" }}>valider la photo</button>
          </div>
        </div>
      )}

      {/* LOADING */}
      {(stage === "moderating" || stage === "uploading") && (
        <div style={{ height: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <div style={{ width: 32, height: 32, border: "3px solid #f3501e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#f3501e" }}>
            {stage === "moderating" ? "analyse de l'image par l'IA..." : "enregistrement sur Shrimply..."}
          </p>
        </div>
      )}

      {/* DONE */}
      {stage === "done" && savedUrl && (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
          <img src={savedUrl} alt="photo du plat" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
          <button onClick={handleReset}
            style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.8)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.6)"}
          >🗑️</button>
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 12, color: "#fca5a5", fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  )
}

function clampOffset(x, y, scale, naturalSize) {
  const renderedW = naturalSize.w * scale
  const renderedH = naturalSize.h * scale
  return {
    x: Math.min(0, Math.max(CROP_WIDTH - renderedW, x)),
    y: Math.min(0, Math.max(CROP_HEIGHT - renderedH, y)),
  }
}

function dataURLtoBlob(dataUrl) {
  const [header, data] = dataUrl.split(",")
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(data)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}
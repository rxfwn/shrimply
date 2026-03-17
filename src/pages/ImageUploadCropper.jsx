import { useState, useRef, useCallback, useEffect } from "react"
import { supabase } from "../supabase"

// Configuration du format d'image pour Shrimply 🦐
const CROP_RATIO = 4 / 3
const CROP_WIDTH = 400
const CROP_HEIGHT = CROP_WIDTH / CROP_RATIO

export default function ImageUploadCropper({ onImageSaved, existingUrl, recipeId }) {
  const [stage, setStage] = useState(existingUrl ? "done" : "idle")
  // stages : idle | cropping | moderating | uploading | done
  
  const [imageSrc, setImageSrc] = useState(null)
  const [savedUrl, setSavedUrl] = useState(existingUrl || null)
  const [error, setError] = useState("")

  // États pour la logique du Canvas / Crop
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef(null)
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const fileInputRef = useRef(null)

  // --- 1. FONCTION DE MODÉRATION (Appel à ton Edge Function) ---
  const moderateImage = async (base64Data) => {
    const base64 = base64Data.split(",")[1]

    const { data, error: funcError } = await supabase.functions.invoke('moderate-image', {
      body: { imageBase64: base64 }
    })

    if (funcError) throw new Error("Erreur de communication avec le service d'IA.")

    const result = data.responses?.[0]
    
    const safe = result?.safeSearchAnnotation
    if (safe?.adult === "LIKELY" || safe?.adult === "VERY_LIKELY") {
      return { isFood: false, reason: "image inappropriée" }
    }

    const labels = result?.labelAnnotations?.map(l => l.description.toLowerCase()) || []
    const foodKeywords = ["food", "dish", "cuisine", "meal", "ingredient", "recipe", "cooking"]
    const isFood = labels.some(label => foodKeywords.some(k => label.includes(k)))

    return {
      isFood,
      reason: isFood ? "OK" : "l'IA ne reconnaît pas de plat alimentaire ici."
    }
  }

  // --- 2. GESTION DU FICHIER ---
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError("L'image est trop lourde (max 10 Mo).")
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageSrc(ev.target.result)
      setStage("cropping")
      setError("")
    }
    reader.readAsDataURL(file)
  }

  // --- 3. LOGIQUE DU CANVAS ---
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !naturalSize.w) return
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, CROP_WIDTH, CROP_HEIGHT)
    
    const renderedW = naturalSize.w * scale
    const renderedH = naturalSize.h * scale
    ctx.drawImage(img, offset.x, offset.y, renderedW, renderedH)
  }, [offset, scale, naturalSize])

  useEffect(() => {
    if (stage === "cropping") drawCanvas()
  }, [drawCanvas, stage])

  const onImageLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.target
    setNaturalSize({ w, h })
    const initScale = Math.max(CROP_WIDTH / w, CROP_HEIGHT / h)
    setScale(initScale)
    setOffset({
      x: (CROP_WIDTH - w * initScale) / 2,
      y: (CROP_HEIGHT - h * initScale) / 2,
    })
  }

  // --- 4. VALIDATION FINALE (Modération + Upload) ---
  const handleConfirm = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Qualité JPEG augmentée à 0.95 pour de meilleures images
    const croppedDataUrl = canvas.toDataURL("image/jpeg", 1)
    setError("")
    setStage("moderating")

    try {
      const moderation = await moderateImage(croppedDataUrl)
      if (!moderation.isFood) {
        setError(`❌ Refusé : ${moderation.reason}`)
        setStage("cropping")
        return
      }

      setStage("uploading")
      const blob = dataURLtoBlob(croppedDataUrl)
      const fileName = `${recipeId || "recipe"}_${Date.now()}.jpg`
      const filePath = `recipes/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("recipe-images")
        .upload(filePath, blob)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("recipe-images")
        .getPublicUrl(filePath)

      setSavedUrl(publicUrl)
      setStage("done")
      onImageSaved?.(publicUrl)

    } catch (err) {
      console.error(err)
      setError("Erreur technique. Vérifie ta console ou ta facturation Google.")
      setStage("cropping")
    }
  }

  const handleReset = () => {
    setStage("idle")
    setImageSrc(null)
    setSavedUrl(null)
    setError("")
  }

  // --- RENDU UI ---
  return (
    <div className="flex flex-col gap-4 p-4 border rounded-2xl  bg-[#1A1A1A] shadow-sm">
      
      {/* ÉTAT INITIAL : ZONE DE DROP */}
      {stage === "idle" && (
        <div 
          onClick={() => fileInputRef.current.click()}
          className=" border-zinc-300 dark:border-zinc-700 h-52 flex flex-col items-center justify-center rounded-xl cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-900/5 transition"
        >
          <img src="/icons/photo.png" alt="" style={{ width: 48, height: 48 }} className="mb-2" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Ajouter la photo du plat</p>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
        </div>
      )}

      {/* ÉTAT : RECADRAGE */}
      {stage === "cropping" && (
        <div className="flex flex-col gap-4">
          <div 
            className="relative overflow-hidden mx-auto border rounded-lg bg-zinc-100 dark:bg-black"
            style={{ width: "100%", maxWidth: CROP_WIDTH, aspectRatio: "4/3", cursor: dragging ? "grabbing" : "grab" }}
            onMouseDown={(e) => {
              setDragging(true)
              dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
            }}
            onMouseMove={(e) => {
              if (!dragging) return
              const dx = e.clientX - dragStart.current.mx
              const dy = e.clientY - dragStart.current.my
              setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, scale, naturalSize))
            }}
            onMouseUp={() => setDragging(false)}
          >
            <canvas ref={canvasRef} width={CROP_WIDTH} height={CROP_HEIGHT} className="w-full h-full" />
            <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} className="hidden" alt="" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleReset} className="flex-1 py-2 text-zinc-600 bg-zinc-100 rounded-xl text-sm font-medium">Annuler</button>
            <button onClick={handleConfirm} className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-200 dark:shadow-none">Valider la photo</button>
          </div>
        </div>
      )}

      {/* ÉTATS DE CHARGEMENT */}
      {(stage === "moderating" || stage === "uploading") && (
        <div className="h-52 flex flex-col items-center justify-center gap-3 text-orange-500">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">{stage === "moderating" ? "Analyse de l'image par l'IA..." : "Enregistrement sur Shrimply..."}</p>
        </div>
      )}

      {/* ÉTAT : TERMINÉ */}
      {stage === "done" && savedUrl && (
        <div className="relative group rounded-xl overflow-hidden shadow-md">
          <img src={savedUrl} alt="Plat Shrimply" className="w-full aspect-[4/3] object-cover" />
          <button 
            onClick={handleReset} 
            className="absolute top-3 right-3 bg-white/90 dark:bg-zinc-800/90 p-2 rounded-full shadow-lg hover:text-red-500 transition"
          >
            🗑️
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg animate-shake">
          {error}
        </div>
      )}
    </div>
  )
}

// --- HELPERS ---
function clampOffset(x, y, scale, naturalSize) {
  const renderedW = naturalSize.w * scale
  const renderedH = naturalSize.h * scale
  return {
    x: Math.min(0, Math.max(CROP_WIDTH - renderedW, x)),
    y: Math.min(0, Math.max(CROP_HEIGHT - renderedH, y)),
  }
}

function getMinScale(naturalSize) {
  if (!naturalSize.w) return 1
  return Math.max(CROP_WIDTH / naturalSize.w, CROP_HEIGHT / naturalSize.h)
}

function dataURLtoBlob(dataUrl) {
  const [header, data] = dataUrl.split(",")
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(data)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}
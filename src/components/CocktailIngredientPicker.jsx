import { useState, useRef, useEffect } from "react"
import { COCKTAIL_INGREDIENTS, COCKTAIL_INGREDIENT_CATEGORIES } from "../tags"

// Aliases pour la détection automatique depuis les ingrédients texte
// Ordre important : les termes composés doivent être avant les termes simples
const DETECT_ALIASES = [
  // Spiritueux — composés en premier
  { key: "rhum_overproof",    terms: ["rhum overproof", "rum overproof"] },
  { key: "rhum_epice",        terms: ["rhum épicé", "rhum epice", "spiced rum"] },
  { key: "rhum_blanc",        terms: ["rhum blanc", "rum blanc", "white rum"] },
  { key: "rhum_ambre",        terms: ["rhum ambré", "rhum ambre", "golden rum"] },
  { key: "rhum_brun",         terms: ["rhum brun", "rhum vieux", "dark rum"] },
  { key: "cachaca",           terms: ["cachaça", "cachaca"] },
  { key: "gin_contemp",       terms: ["gin contemporain", "gin new wave"] },
  { key: "tequila_reposado",  terms: ["tequila reposado"] },
  { key: "tequila_blanche",   terms: ["tequila blanche", "tequila blanco", "tequila"] },
  { key: "irish_whiskey",     terms: ["irish whiskey", "whisky irlandais"] },
  { key: "whisky_japonais",   terms: ["whisky japonais"] },
  { key: "bourbon",           terms: ["bourbon américain", "bourbon"] },
  { key: "rye",               terms: ["rye whiskey", "rye"] },
  { key: "whisky",            terms: ["whisky écossais", "whisky", "whiskey", "scotch"] },
  { key: "cognac",            terms: ["cognac"] },
  { key: "calvados",          terms: ["calvados"] },
  { key: "mezcal",            terms: ["mezcal"] },
  { key: "pisco",             terms: ["pisco"] },
  { key: "brandy",            terms: ["brandy"] },
  { key: "vodka",             terms: ["vodka"] },
  { key: "gin",               terms: ["gin"] },
  // Liqueurs — composés en premier
  { key: "grand_marnier",     terms: ["grand marnier"] },
  { key: "southern_comfort",  terms: ["southern comfort"] },
  { key: "allspice_dram",     terms: ["allspice dram", "pimento dram"] },
  { key: "liqueur_cafe",      terms: ["liqueur de café", "liqueur cafe"] },
  { key: "creme_cacao_brun",  terms: ["crème de cacao brune", "creme de cacao brune"] },
  { key: "creme_cacao_blanc", terms: ["crème de cacao blanche", "creme de cacao blanche", "creme de cacao"] },
  { key: "creme_violette",    terms: ["crème de violette", "creme de violette"] },
  { key: "creme_cassis",      terms: ["crème de cassis", "creme de cassis", "cassis"] },
  { key: "creme_mure",        terms: ["crème de mûre", "creme de mure"] },
  { key: "creme_menthe",      terms: ["crème de menthe", "creme de menthe"] },
  { key: "chartreuse_verte",  terms: ["chartreuse verte"] },
  { key: "chartreuse_jaune",  terms: ["chartreuse jaune"] },
  { key: "apricot_brandy",    terms: ["apricot brandy", "liqueur abricot"] },
  { key: "cointreau",         terms: ["cointreau"] },
  { key: "triple_sec",        terms: ["triple sec"] },
  { key: "st_germain",        terms: ["st-germain", "st germain", "sureau"] },
  { key: "drambuie",          terms: ["drambuie"] },
  { key: "benedictine",       terms: ["bénédictine", "benedictine"] },
  { key: "licor_43",          terms: ["licor 43"] },
  { key: "jagermeister",      terms: ["jägermeister", "jagermeister"] },
  { key: "amaretto",          terms: ["amaretto"] },
  { key: "kahlua",            terms: ["kahlúa", "kahlua"] },
  { key: "baileys",           terms: ["baileys", "bailey's"] },
  { key: "limoncello",        terms: ["limoncello"] },
  { key: "maraschino",        terms: ["maraschino luxardo", "maraschino"] },
  { key: "midori",            terms: ["midori"] },
  { key: "curacao_bleu",      terms: ["curaçao bleu", "curacao bleu", "blue curacao"] },
  { key: "malibu",            terms: ["malibu"] },
  { key: "passoa",            terms: ["passoã", "passoa"] },
  { key: "absinthe_rouge",    terms: ["absinthe rouge"] },
  { key: "absinthe",          terms: ["absinthe"] },
  { key: "creme_coco_liq",    terms: ["crème de noix de coco", "creme de noix de coco"] },
  { key: "creme_banane",      terms: ["crème de banane", "creme de banane"] },
  { key: "galliano",          terms: ["galliano"] },
  { key: "chambord",          terms: ["chambord"] },
  { key: "pimms",             terms: ["pimm's", "pimms", "pimm"] },
  { key: "frangelico",        terms: ["frangelico"] },
  // Vin & vermouth
  { key: "vermouth_rouge",    terms: ["vermouth rouge", "rosso", "vermouth doux"] },
  { key: "vermouth_dry",      terms: ["vermouth dry", "vermouth sec", "vermouth"] },
  { key: "champagne",         terms: ["champagne"] },
  { key: "prosecco",          terms: ["prosecco"] },
  { key: "vin_blanc",         terms: ["vin blanc"] },
  { key: "vin_rouge",         terms: ["vin rouge"] },
  { key: "porto",             terms: ["porto rouge", "porto"] },
  { key: "sherry",            terms: ["sherry"] },
  // Bière & cidre
  { key: "ginger_beer",       terms: ["ginger beer"] },
  { key: "biere_brune",       terms: ["bière brune", "biere brune"] },
  { key: "biere_blonde",      terms: ["bière blonde", "biere blonde", "bière", "biere"] },
  { key: "cidre",             terms: ["cidre"] },
  // Amers & bitters
  { key: "amaro_montenegro",  terms: ["amaro montenegro"] },
  { key: "amaro_nonino",      terms: ["amaro nonino"] },
  { key: "angostura",         terms: ["angostura bitters", "angostura"] },
  { key: "peychauds",         terms: ["peychaud's bitters", "peychauds"] },
  { key: "orange_bitters",    terms: ["orange bitters"] },
  { key: "campari",           terms: ["campari"] },
  { key: "aperol",            terms: ["aperol"] },
  { key: "suze",              terms: ["suze"] },
  { key: "ricard",            terms: ["ricard"] },
  { key: "pastis",            terms: ["pastis"] },
  { key: "fernet",            terms: ["fernet-branca", "fernet branca", "fernet"] },
  // Sirops — composés en premier
  { key: "sirop_passion",     terms: ["sirop de fruit de la passion", "sirop passion"] },
  { key: "sirop_gingembre",   terms: ["sirop de gingembre"] },
  { key: "sirop_cannelle",    terms: ["sirop de cannelle"] },
  { key: "sirop_orgeat",      terms: ["sirop d'orgeat", "orgeat"] },
  { key: "sirop_framboise",   terms: ["sirop de framboise"] },
  { key: "sirop_peche",       terms: ["sirop de pêche", "sirop de peche"] },
  { key: "sirop_menthe",      terms: ["sirop de menthe"] },
  { key: "sirop_vanille",     terms: ["sirop de vanille"] },
  { key: "sirop_coco",        terms: ["sirop de coco"] },
  { key: "sirop_agave",       terms: ["sirop d'agave", "agave"] },
  { key: "sirop_sucre",       terms: ["sirop de sucre", "simple syrup", "sirop sucre"] },
  { key: "falernum",          terms: ["falernum"] },
  { key: "grenadine",         terms: ["grenadine"] },
  { key: "miel",              terms: ["miel"] },
  // Jus & purées
  { key: "jus_pamplemousse",  terms: ["jus de pamplemousse"] },
  { key: "jus_passion",       terms: ["jus de fruit de la passion", "jus passion"] },
  { key: "jus_mangue",        terms: ["jus de mangue", "jus mangue"] },
  { key: "jus_peche",         terms: ["jus de pêche", "jus peche"] },
  { key: "jus_cranberry",     terms: ["jus de cranberry", "cranberry", "canneberge"] },
  { key: "jus_citron_vert",   terms: ["jus de citron vert", "jus lime"] },
  { key: "jus_citron",        terms: ["jus de citron", "jus citron", "citron pressé"] },
  { key: "jus_orange",        terms: ["jus d'orange", "jus orange"] },
  { key: "jus_ananas",        terms: ["jus d'ananas", "jus ananas"] },
  { key: "jus_pomme",         terms: ["jus de pomme", "jus pomme"] },
  { key: "jus_tomate",        terms: ["jus de tomate", "jus tomate"] },
  { key: "puree_peche",       terms: ["purée de pêche", "puree de peche", "bellini"] },
  { key: "puree_fraise",      terms: ["purée de fraise", "puree de fraise"] },
  { key: "puree_framboise",   terms: ["purée de framboise", "puree de framboise"] },
  { key: "puree_passion",     terms: ["purée de passion", "puree de passion"] },
  // Mixeurs
  { key: "lait_coco",         terms: ["lait de coco"] },
  { key: "eau_coco",          terms: ["eau de coco"] },
  { key: "soda_citron",       terms: ["soda citron-lime", "soda citron lime", "sprite", "7up"] },
  { key: "ginger_ale",        terms: ["ginger ale"] },
  { key: "cola",              terms: ["coca-cola", "coca cola", "cola", "pepsi"] },
  { key: "red_bull",          terms: ["red bull", "redbull"] },
  { key: "limonade",          terms: ["limonade"] },
  { key: "tonic",             terms: ["tonic water", "tonic"] },
  { key: "eau_gazeuse",       terms: ["eau gazeuse", "soda water", "club soda"] },
  // Frigo & placard — fruits
  { key: "pamplemousse_fruit",terms: ["pamplemousse"] },
  { key: "fruits_passion",    terms: ["fruits de la passion", "fruit de la passion"] },
  { key: "ananas_frais",      terms: ["ananas frais", "ananas"] },
  { key: "fraises",           terms: ["fraises", "fraise"] },
  { key: "framboises",        terms: ["framboises", "framboise"] },
  { key: "mures",             terms: ["mûres", "mures", "mûre"] },
  { key: "orange_fruit",      terms: ["orange"] },
  { key: "citron_vert_fruit", terms: ["citron vert", "lime"] },
  { key: "citron_fruit",      terms: ["citron"] },
  // Frigo & placard — herbes, garnitures, assaisonnements
  { key: "cerises_amarena",   terms: ["cerises amarena", "amarena"] },
  { key: "cerises_marasquin", terms: ["cerises marasquin", "marasquin"] },
  { key: "worcestershire",    terms: ["sauce worcestershire", "worcestershire"] },
  { key: "sel_celeri",        terms: ["sel de céleri", "sel celeri"] },
  { key: "blanc_oeuf",        terms: ["blanc d'œuf", "blanc d'oeuf", "egg white"] },
  { key: "creme_fraiche",     terms: ["crème fraîche", "creme fraiche"] },
  { key: "menthe_fraiche",    terms: ["menthe fraîche", "menthe fraiche", "menthe"] },
  { key: "concombre",         terms: ["concombre"] },
  { key: "celeri",            terms: ["branche de céleri", "céleri", "celeri"] },
  { key: "gingembre",         terms: ["gingembre frais", "gingembre"] },
  { key: "zeste_citron",      terms: ["zeste de citron"] },
  { key: "zeste_orange",      terms: ["zeste d'orange", "zeste orange"] },
  { key: "tranche_citron",    terms: ["tranche de citron"] },
  { key: "tranche_orange",    terms: ["tranche d'orange", "tranche orange"] },
  { key: "olives",            terms: ["olives vertes", "olives"] },
  { key: "cassonade",         terms: ["cassonade", "sucre roux"] },
  { key: "tabasco",           terms: ["tabasco"] },
  { key: "piment",            terms: ["piment"] },
  { key: "lait_concentre",    terms: ["lait concentré sucré", "lait concentre"] },
  { key: "espresso",          terms: ["espresso", "café espresso"] },
  { key: "the_matcha",        terms: ["thé matcha", "the matcha", "matcha"] },
  { key: "vanille_extrait",   terms: ["extrait de vanille", "vanille extrait"] },
  { key: "vanille_gousse",    terms: ["gousse de vanille", "vanille gousse", "vanille"] },
  { key: "lait",              terms: ["lait"] },
  { key: "sucre",             terms: ["sucre blanc", "sucre"] },
  { key: "sel",               terms: ["sel"] },
  { key: "cannelle",          terms: ["cannelle en bâton", "cannelle"] },
  { key: "noix_muscade",      terms: ["noix de muscade", "muscade"] },
  { key: "poivre",            terms: ["poivre"] },
]

export function detectCocktailIngs(textIngredients) {
  const fullText = textIngredients.map(i => (i.name || "").toLowerCase()).join(" | ")
  const detected = []
  for (const { key, terms } of DETECT_ALIASES) {
    if (terms.some(term => fullText.includes(term.toLowerCase()))) {
      detected.push(key)
    }
  }
  return detected
}

export default function CocktailIngredientPicker({ selected, onChange, textIngredients = [] }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const filtered = COCKTAIL_INGREDIENTS.filter(i => {
    if (selected.includes(i.key)) return false
    if (!query) return true
    return i.label.toLowerCase().includes(query.toLowerCase())
  })

  const add = (key) => {
    onChange([...selected, key])
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }

  const remove = (key) => onChange(selected.filter(k => k !== key))

  const handleDetect = () => {
    if (!textIngredients.length) return
    setDetecting(true)
    const found = detectCocktailIngs(textIngredients)
    const merged = [...new Set([...selected, ...found])]
    onChange(merged)
    setTimeout(() => setDetecting(false), 800)
  }

  useEffect(() => {
    const handler = (e) => {
      if (!listRef.current?.contains(e.target) && e.target !== inputRef.current) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div>
      {/* Pills des ingrédients sélectionnés */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {selected.map(key => {
            const ing = COCKTAIL_INGREDIENTS.find(i => i.key === key)
            const cat = COCKTAIL_INGREDIENT_CATEGORIES[ing?.category]
            return (
              <div key={key} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px 4px 12px", borderRadius: 20, backgroundColor: cat?.bg || "#e5e5e5", border: `1.5px solid ${cat?.color || "#ccc"}` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: cat?.color || "#333", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em" }}>
                  {ing?.label || key}
                </span>
                <button onClick={() => remove(key)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: cat?.color || "#333", opacity: 0.55, fontSize: 15, lineHeight: 1, padding: "0 0 0 2px", display: "flex", alignItems: "center" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.55"}
                >×</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Input autocomplete */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="ex : ginger beer, rhum, citron vert..."
          style={{ width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", backgroundColor: "var(--bg-card-2)", border: "1.5px solid var(--input-border)", color: "var(--text-main)", fontFamily: "Poppins, sans-serif", fontWeight: 500, letterSpacing: "-0.04em", boxSizing: "border-box", transition: "border-color 0.15s" }}
          onFocusCapture={e => e.target.style.borderColor = "#d57bff"}
          onBlur={e => e.target.style.borderColor = "var(--input-border)"}
        />

        {open && filtered.length > 0 && (
          <div ref={listRef} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, maxHeight: 240, overflowY: "auto", boxShadow: "0 8px 28px rgba(0,0,0,0.18)" }}>
            {filtered.map(ing => {
              const cat = COCKTAIL_INGREDIENT_CATEGORIES[ing.category]
              return (
                <button key={ing.key} onMouseDown={() => add(ing.key)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", border: "none", background: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card-2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, backgroundColor: cat?.bg, color: cat?.color, fontWeight: 700, fontFamily: "Poppins, sans-serif", flexShrink: 0 }}>
                    {cat?.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", fontFamily: "Poppins, sans-serif", letterSpacing: "-0.03em" }}>
                    {ing.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {open && query.length > 0 && filtered.length === 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px", fontSize: 12, color: "var(--text-muted)", fontFamily: "Poppins, sans-serif", textAlign: "center" }}>
            aucun résultat pour « {query} »
          </div>
        )}
      </div>

      {/* Bouton détection auto — uniquement si des ingrédients texte existent */}
      {textIngredients.some(i => i.name?.trim()) && (
        <button onClick={handleDetect}
          style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 11, color: "#d57bff", padding: 0, letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: 5 }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {detecting ? "détection..." : "détecter depuis les ingrédients →"}
        </button>
      )}
    </div>
  )
}

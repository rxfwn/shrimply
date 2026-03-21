import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

const LAST_UPDATE = "21 mars 2026"
const CONTACT_EMAIL = "contact@shrimply.app"

const S = {
  btn: { fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "-0.05em", border: "none", cursor: "pointer", borderRadius: 10, transition: "transform 0.15s, opacity 0.15s" },
}

function Section({ title }) {
  return (
    <h2 style={{
      margin: "28px 0 6px",
      fontSize: 13, fontWeight: 700,
      color: "#130b2d", letterSpacing: "-0.03em",
      fontFamily: "Poppins, sans-serif",
    }}>
      {title}
    </h2>
  )
}

function P({ children }) {
  return (
    <p style={{
      margin: "0 0 6px", fontSize: 13, fontWeight: 400,
      color: "#130b2d", lineHeight: 1.7,
      fontFamily: "Poppins, sans-serif",
    }}>
      {children}
    </p>
  )
}

function Li({ children }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 4, alignItems: "flex-start" }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#f3501e", flexShrink: 0, marginTop: 8 }} />
      <p style={{ margin: 0, fontSize: 13, fontWeight: 400, color: "#130b2d", lineHeight: 1.7, fontFamily: "Poppins, sans-serif" }}>
        {children}
      </p>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: "rgba(19,11,45,0.08)", margin: "28px 0 0" }} />
}

function BlockTitle({ label }) {
  return (
    <h3 style={{
      margin: "28px 0 10px", fontSize: 16, fontWeight: 800,
      color: "#130b2d", letterSpacing: "-0.05em",
      fontFamily: "Poppins, sans-serif",
      paddingBottom: 8, borderBottom: "2px solid #f3501e",
      display: "inline-block",
    }}>
      {label}
    </h3>
  )
}

export default function Legal() {
  const navigate = useNavigate()
  const { isDay } = useTheme()

  return (
    <div style={{
      padding: "16px 20px 48px",
      backgroundColor: "var(--bg-main)",
      minHeight: "100%",
      fontFamily: "Poppins, sans-serif",
      transition: "background-color 0.25s ease",
    }}>

      {/* Bouton retour — même style que RecipeDetail */}
      <button
        onClick={() => navigate(-1)}
        style={{ ...S.btn, background: "none", color: "var(--text-faint)", fontSize: 12, padding: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--text-main)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}
      >
        retour
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <img src="/icons/lock.png" alt="" style={{ width: 20, height: 20 }} onError={e => e.target.style.display = "none"} />
        <h1 style={{
          margin: 0, fontSize: 18, fontWeight: 800,
          color: "var(--text-main)", letterSpacing: "-0.05em",
          fontFamily: "Poppins, sans-serif",
        }}>
          informations légales
        </h1>
      </div>

      {/* Card blanche centrée */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: 10,
          padding: "28px 32px 32px",
          width: "100%",
          maxWidth: 680,
          boxShadow: "0 2px 20px rgba(19,11,45,0.08)",
        }}>

          <p style={{
            margin: "0 0 4px", fontSize: 11, fontWeight: 500,
            color: "rgba(19,11,45,0.35)", fontFamily: "Poppins, sans-serif",
          }}>
            Dernière mise à jour : {LAST_UPDATE}
          </p>

          {/* ── MENTIONS LÉGALES ── */}
          <BlockTitle label="Mentions légales" />

          <Section title="Éditeur du site" />
          <P>Le site <strong>Shrimply</strong> (accessible à l'adresse <strong>shrimply.app</strong>) est édité par un particulier domicilié à <strong>Villeparisis (77), France</strong>.</P>
          <P>Shrimply est un projet personnel, non enregistré en tant qu'entreprise à ce jour.</P>

          <Section title="Hébergement" />
          <Li><strong>Vercel Inc.</strong> — 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis — <a href="https://vercel.com" style={{ color: "#f3501e", textDecoration: "none", fontWeight: 600 }}>vercel.com</a></Li>
          <Li><strong>Supabase Inc.</strong> (base de données et authentification) — <a href="https://supabase.com" style={{ color: "#f3501e", textDecoration: "none", fontWeight: 600 }}>supabase.com</a></Li>

          <Section title="Contact" />
          <P>Pour toute question, contactez l'éditeur par email à <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#f3501e", textDecoration: "none", fontWeight: 600 }}>{CONTACT_EMAIL}</a>.</P>

          <Section title="Propriété intellectuelle" />
          <P>L'ensemble des éléments constituant Shrimply (design, textes, logos, icônes) sont la propriété exclusive de l'éditeur. Toute reproduction est interdite sans autorisation préalable.</P>
          <P>Les recettes partagées par les utilisateurs restent leur propriété. En les publiant, l'utilisateur accorde à l'éditeur une licence d'affichage non exclusive sur la plateforme.</P>

          <Section title="Responsabilité" />
          <P>L'éditeur ne peut garantir l'exactitude des informations publiées. Les recettes sont fournies à titre informatif. L'utilisation du site se fait sous la seule responsabilité de l'utilisateur.</P>

          <Section title="Droit applicable" />
          <P>Le présent site est soumis au droit français. Tout litige sera soumis à la compétence des tribunaux français.</P>

          <Divider />

          {/* ── CGU ── */}
          <BlockTitle label="Conditions générales d'utilisation" />

          <Section title="Objet" />
          <P>Les présentes CGU régissent l'accès et l'utilisation de la plateforme Shrimply disponible sur <strong>shrimply.app</strong>. En créant un compte, l'utilisateur les accepte sans réserve.</P>

          <Section title="Description du service" />
          <P>Shrimply permet de créer et gérer des recettes, les partager avec la communauté, découvrir celles des autres, estimer leur coût et planifier ses repas. Le service est actuellement gratuit.</P>

          <Section title="Accès au service" />
          <P>L'accès nécessite la création d'un compte avec des informations exactes. L'éditeur peut suspendre tout compte en cas de violation des CGU.</P>

          <Section title="Contenu utilisateur" />
          <P>L'utilisateur est seul responsable des contenus publiés. Il s'engage à ne pas publier de contenu illicite, haineux, portant atteinte aux droits de tiers, ou à caractère commercial non autorisé.</P>

          <Section title="Recettes importées" />
          <P>Les recettes importées depuis la section Découvrir sont strictement réservées à un usage personnel.</P>

          <Section title="Âge minimum" />
          <P>Le service est réservé aux personnes d'au moins 15 ans.</P>

          <Section title="Résiliation" />
          <P>La suppression du compte entraîne la suppression de toutes les données associées dans un délai de 30 jours.</P>

          <Section title="Droit applicable" />
          <P>Les présentes CGU sont soumises au droit français.</P>

          <Divider />

          {/* ── CONFIDENTIALITÉ ── */}
          <BlockTitle label="Politique de confidentialité" />

          <Section title="Responsable du traitement" />
          <P>Éditeur basé à Villeparisis (77), France.</P>

          <Section title="Données collectées" />
          <Li>Données de compte : email, nom d'utilisateur, photo de profil</Li>
          <Li>Données de contenu : recettes, ingrédients, photos</Li>
          <Li>Données d'usage : dates de création, préférences alimentaires</Li>

          <Section title="Finalités" />
          <Li>Fournir et améliorer le service</Li>
          <Li>Gérer l'authentification et la sécurité</Li>
          <Li>Permettre le partage de recettes</Li>
          <Li>Calculer les estimations de coût</Li>

          <Section title="Sous-traitants" />
          <Li><strong>Supabase Inc.</strong> — stockage et authentification</Li>
          <Li><strong>Google LLC</strong> — authentification OAuth</Li>
          <Li><strong>Vercel Inc.</strong> — hébergement frontend</Li>
          <P>Ces transferts sont encadrés par des clauses contractuelles types de la Commission européenne.</P>

          <Section title="Conservation des données" />
          <P>Les données sont conservées le temps de l'existence du compte, puis supprimées dans un délai de 30 jours après sa suppression.</P>

          <Section title="Vos droits (RGPD)" />
          <P>Conformément au RGPD, vous disposez des droits d'accès, rectification, suppression, portabilité et opposition.</P>
          <P>Contact : <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#f3501e", textDecoration: "none", fontWeight: 600 }}>{CONTACT_EMAIL}</a></P>
          <P>En cas de litige, vous pouvez saisir la <strong>CNIL</strong> : <a href="https://www.cnil.fr" style={{ color: "#f3501e", textDecoration: "none", fontWeight: 600 }}>cnil.fr</a></P>

          <Section title="Cookies" />
          <P>Shrimply utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du service. Aucun cookie publicitaire ou de traçage n'est utilisé.</P>

          <Section title="Sécurité" />
          <P>Les données sont protégées via Supabase : chiffrement au repos et en transit, Row Level Security.</P>

          {/* Footer card */}
          <div style={{
            marginTop: 32, paddingTop: 16,
            borderTop: "1px solid rgba(19,11,45,0.08)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <img src="/icons/shrim.png" alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display = "none"} />
            <span style={{ fontSize: 11, color: "rgba(19,11,45,0.35)", fontFamily: "Poppins, sans-serif", fontWeight: 500 }}>
              Shrimply — shrimply.app — Villeparisis (77), France — {LAST_UPDATE}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
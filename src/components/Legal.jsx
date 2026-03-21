import { useState } from "react"

const TABS = [
  { id: "mentions", label: "Mentions légales" },
  { id: "cgu", label: "CGU" },
  { id: "confidentialite", label: "Confidentialité" },
]

const LAST_UPDATE = "21 mars 2026"
const CONTACT_EMAIL = "contact@shrimply.app"

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        margin: "0 0 10px",
        fontSize: 12,
        fontWeight: 700,
        color: "#f3501e",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: "Poppins, sans-serif",
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: 13,
        color: "var(--text-main)",
        lineHeight: 1.75,
        fontFamily: "Poppins, sans-serif",
        fontWeight: 400,
      }}>
        {children}
      </div>
    </div>
  )
}

function P({ children, style }) {
  return <p style={{ margin: "0 0 8px", ...style }}>{children}</p>
}

function Li({ children }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 5, alignItems: "flex-start" }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        backgroundColor: "#f3501e", flexShrink: 0, marginTop: 7,
      }} />
      <span style={{ color: "var(--text-main)" }}>{children}</span>
    </div>
  )
}

function MentionsLegales() {
  return (
    <>
      <Section title="Éditeur du site">
        <P>Le site <strong>Shrimply</strong> (accessible à l'adresse <strong>shrimply.app</strong>) est édité par un particulier domicilié à <strong>Villeparisis (77), France</strong>.</P>
        <P>Shrimply est un projet personnel, non enregistré en tant qu'entreprise à ce jour.</P>
      </Section>

      <Section title="Hébergement">
        <P>Le site est hébergé par :</P>
        <Li><strong>Vercel Inc.</strong> — 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis — <a href="https://vercel.com" style={{ color: "#f3501e", textDecoration: "none", fontWeight: 600 }}>vercel.com</a></Li>
        <Li><strong>Supabase Inc.</strong> (base de données et authentification) — <a href="https://supabase.com" style={{ color: "#f3501e", textDecoration: "none", fontWeight: 600 }}>supabase.com</a></Li>
      </Section>

      <Section title="Contact">
        <P>Pour toute question relative au site, vous pouvez contacter l'éditeur par email à <strong><a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#f3501e", textDecoration: "none" }}>{CONTACT_EMAIL}</a></strong>.</P>
      </Section>

      <Section title="Propriété intellectuelle">
        <P>L'ensemble des éléments constituant le site Shrimply (design, textes, logos, icônes) sont la propriété exclusive de l'éditeur. Toute reproduction, représentation ou diffusion, en tout ou partie, est interdite sans autorisation préalable.</P>
        <P>Les recettes partagées par les utilisateurs restent la propriété de leurs auteurs. En les publiant sur Shrimply, l'utilisateur accorde à l'éditeur une licence d'affichage non exclusive sur la plateforme.</P>
      </Section>

      <Section title="Responsabilité">
        <P>L'éditeur s'efforce de maintenir le site accessible et à jour, mais ne peut garantir l'exactitude ou l'exhaustivité des informations publiées.</P>
        <P>Les recettes sont fournies à titre informatif. L'éditeur ne garantit pas leur valeur nutritionnelle ou leur compatibilité avec des régimes spécifiques.</P>
        <P>L'utilisation du site se fait sous la seule responsabilité de l'utilisateur.</P>
      </Section>

      <Section title="Droit applicable">
        <P>Le présent site est soumis au droit français. Tout litige relatif à son utilisation sera soumis à la compétence des tribunaux français.</P>
      </Section>
    </>
  )
}

function CGU() {
  return (
    <>
      <Section title="Objet">
        <P>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme Shrimply, disponible sur <strong>shrimply.app</strong>. En créant un compte, l'utilisateur accepte sans réserve les présentes CGU.</P>
      </Section>

      <Section title="Description du service">
        <P>Shrimply permet de :</P>
        <Li>Créer, organiser et gérer ses recettes de cuisine</Li>
        <Li>Partager des recettes avec la communauté</Li>
        <Li>Découvrir les recettes d'autres utilisateurs</Li>
        <Li>Estimer le coût des recettes</Li>
        <Li>Planifier ses repas et générer des listes de courses</Li>
        <P style={{ marginTop: 10 }}>Le service est actuellement gratuit. Une offre freemium est en cours de développement.</P>
      </Section>

      <Section title="Accès au service">
        <P>L'accès nécessite la création d'un compte. L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants.</P>
        <P>L'éditeur se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU.</P>
      </Section>

      <Section title="Contenu utilisateur">
        <P>L'utilisateur est seul responsable des contenus publiés. Il s'engage à ne pas publier de contenu :</P>
        <Li>Illicite, diffamatoire, haineux ou discriminatoire</Li>
        <Li>Portant atteinte aux droits de tiers</Li>
        <Li>À caractère commercial non autorisé ou spam</Li>
        <Li>Contenant des données personnelles sans consentement</Li>
      </Section>

      <Section title="Recettes importées">
        <P>Les recettes importées depuis la section "Découvrir" sont strictement réservées à un usage personnel et ne peuvent pas être republiées publiquement.</P>
      </Section>

      <Section title="Âge minimum">
        <P>Le service est réservé aux personnes d'au moins 15 ans.</P>
      </Section>

      <Section title="Résiliation">
        <P>La suppression du compte entraîne la suppression définitive de toutes les données associées dans un délai de 30 jours.</P>
      </Section>

      <Section title="Droit applicable">
        <P>Les présentes CGU sont soumises au droit français.</P>
      </Section>
    </>
  )
}

function Confidentialite() {
  return (
    <>
      <Section title="Responsable du traitement">
        <P>Le responsable du traitement est l'éditeur du site, domicilié à <strong>Villeparisis (77), France</strong>.</P>
      </Section>

      <Section title="Données collectées">
        <Li>Données de compte : email, nom d'utilisateur, photo de profil</Li>
        <Li>Données de contenu : recettes, ingrédients, photos uploadées</Li>
        <Li>Données d'usage : dates de création, préférences</Li>
      </Section>

      <Section title="Finalités">
        <Li>Fournir et améliorer le service</Li>
        <Li>Gérer l'authentification et la sécurité</Li>
        <Li>Permettre le partage de recettes</Li>
        <Li>Calculer les estimations de coût</Li>
        <Li>Assurer la modération du contenu</Li>
      </Section>

      <Section title="Sous-traitants">
        <Li><strong>Supabase Inc.</strong> — stockage et authentification</Li>
        <Li><strong>Google LLC</strong> — authentification OAuth</Li>
        <Li><strong>Vercel Inc.</strong> — hébergement frontend</Li>
        <P style={{ marginTop: 10 }}>Ces transferts sont encadrés par des clauses contractuelles types de la Commission européenne.</P>
      </Section>

      <Section title="Conservation">
        <P>Les données sont conservées le temps de l'existence du compte, puis supprimées dans un délai de 30 jours après sa suppression.</P>
      </Section>

      <Section title="Vos droits (RGPD)">
        <P>Conformément au RGPD, vous disposez des droits suivants :</P>
        <Li>Accès à vos données</Li>
        <Li>Rectification</Li>
        <Li>Suppression (via les paramètres de l'app)</Li>
        <Li>Portabilité</Li>
        <Li>Opposition</Li>
        <P style={{ marginTop: 10 }}>Contact : <strong><a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#f3501e", textDecoration: "none" }}>{CONTACT_EMAIL}</a></strong></P>
        <P>En cas de litige, vous pouvez saisir la <strong>CNIL</strong> : <a href="https://www.cnil.fr" style={{ color: "#f3501e", textDecoration: "none", fontWeight: 600 }}>cnil.fr</a></P>
      </Section>

      <Section title="Cookies">
        <P>Shrimply utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du service. Aucun cookie publicitaire ou de traçage n'est utilisé.</P>
      </Section>

      <Section title="Sécurité">
        <P>Les données sont protégées via les mécanismes de sécurité Supabase : chiffrement au repos et en transit, Row Level Security.</P>
      </Section>
    </>
  )
}

export default function Legal() {
  const [activeTab, setActiveTab] = useState("mentions")

  return (
    <div style={{
      padding: "20px 24px",
      backgroundColor: "var(--bg-main)",
      minHeight: "100%",
      fontFamily: "Poppins, sans-serif",
      transition: "background-color 0.25s ease",
    }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: "0 0 4px",
          fontSize: 18, fontWeight: 800,
          color: "var(--text-main)",
          letterSpacing: "-0.05em",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <img src="/icons/lock.png" alt="" style={{ width: 20, height: 20 }} onError={e => e.target.style.display = "none"} />
          informations légales
        </h1>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
          Dernière mise à jour : {LAST_UPDATE}
        </p>
      </div>

      {/* Onglets */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        backgroundColor: "var(--bg-card-2)",
        borderRadius: 12, padding: 4,
        width: "fit-content",
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                fontFamily: "Poppins, sans-serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "-0.04em",
                border: "none",
                cursor: "pointer",
                padding: "7px 14px",
                borderRadius: 9,
                backgroundColor: isActive ? "var(--bg-card)" : "transparent",
                color: isActive ? "#f3501e" : "var(--text-muted)",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--text-main)" }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--text-muted)" }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenu */}
      <div style={{
        backgroundColor: "var(--bg-card)",
        borderRadius: 14,
        border: "1px solid var(--border)",
        padding: "24px 28px",
        maxWidth: 700,
      }}>
        {activeTab === "mentions" && <MentionsLegales />}
        {activeTab === "cgu" && <CGU />}
        {activeTab === "confidentialite" && <Confidentialite />}

        <div style={{
          marginTop: 8,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-faint)",
          fontFamily: "Poppins, sans-serif",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <img src="/icons/shrim.png" alt="" style={{ width: 14, height: 14 }} onError={e => e.target.style.display = "none"} />
          Shrimply — shrimply.app — Villeparisis (77), France — {LAST_UPDATE}
        </div>
      </div>

    </div>
  )
}
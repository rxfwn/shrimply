import { useEffect } from "react"
import { useNavigate, useParams, Link, Navigate } from "react-router-dom"
import { marked } from "marked"
import { getPostBySlug, getPostContent } from "../content/blog"

const syne = { fontFamily: "'Syne', sans-serif" }
const inst = { fontFamily: "'Instrument Sans', sans-serif" }
const R = "#f3501e"
const D = "#111111"

const cssStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  .blog-back:hover { opacity: .7; }
  .blog-content { font-family: 'Instrument Sans', sans-serif; font-size: 16px; line-height: 1.75; color: rgba(17,17,17,.78); }
  .blog-content h2 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 26px; letter-spacing: -.02em; color: #111111; margin: 36px 0 14px; }
  .blog-content h3 { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 20px; letter-spacing: -.01em; color: #111111; margin: 28px 0 10px; }
  .blog-content p { margin: 0 0 16px; }
  .blog-content ul, .blog-content ol { margin: 0 0 16px; padding-left: 22px; }
  .blog-content li { margin-bottom: 8px; }
  .blog-content strong { color: #111111; font-weight: 600; }
  .blog-content a { color: #f3501e; font-weight: 600; text-decoration: none; }
  .blog-content a:hover { text-decoration: underline; }
  .blog-content hr { border: none; border-top: 1px solid rgba(17,17,17,.1); margin: 32px 0; }
`

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

export default function BlogPost() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const post = getPostBySlug(slug)

  useEffect(() => {
    document.getElementById("lcp-shell")?.remove()
  }, [])

  if (!post) {
    return <Navigate to="/blog" replace />
  }

  const html = marked.parse(getPostContent(slug))

  return (
    <div style={{ background: "#f2ede4", color: D, minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 28px",
        background: "#111111", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}>
        <button onClick={() => navigate("/")}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/icons/shrim.webp" alt="" width="22" height="22" loading="eager" />
          <span style={{ ...syne, fontSize: 17, fontWeight: 700, color: "#fff" }}>
            Shrim<span style={{ color: R }}>ply</span>
          </span>
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-orange" onClick={() => navigate("/register")}
            style={{ padding: "9px 16px", fontSize: 13, borderRadius: 100, fontWeight: 600, background: "#f3501e", color: "#fff", border: "none", cursor: "pointer" }}>
            essayer gratuitement
          </button>
        </div>
      </nav>

      <article style={{ maxWidth: 680, margin: "0 auto", padding: "120px 20px 60px" }}>
        <Link to="/blog" className="blog-back" style={{ ...inst, fontSize: 13, fontWeight: 600, color: R, textDecoration: "none" }}>
          ← Retour au blog
        </Link>

        <time dateTime={post.date} style={{ ...inst, fontSize: 12, color: "rgba(17,17,17,.4)", fontWeight: 500, display: "block", marginTop: 20 }}>
          {formatDate(post.date)}
        </time>

        <h1 style={{ ...syne, fontWeight: 800, fontSize: 34, lineHeight: 1.15, letterSpacing: "-.03em", margin: "10px 0 28px" }}>
          {post.title}
        </h1>

        <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />

        {/* ── CTA ── */}
        <div style={{ background: "#111111", borderRadius: 24, padding: "40px 28px", marginTop: 48, textAlign: "center" }}>
          <h2 style={{ ...syne, fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "-.02em", marginBottom: 10 }}>
            prêt à arrêter de te demander "on mange quoi ce soir ?"
          </h2>
          <p style={{ ...inst, fontSize: 14, color: "rgba(255,255,255,.6)", marginBottom: 20 }}>
            gratuit · sans carte bancaire · 30 secondes
          </p>
          <button className="btn btn-orange" onClick={() => navigate("/register")}
            style={{ padding: "14px 32px", borderRadius: 100, fontSize: 15, fontWeight: 600, background: "#f3501e", color: "#fff", border: "none", cursor: "pointer" }}>
            essayer Shrimply gratuitement
          </button>
        </div>
      </article>

      <footer style={{ padding: "32px 20px", textAlign: "center", borderTop: "1px solid rgba(17,17,17,.06)" }}>
        <Link to="/" className="blog-back" style={{ ...inst, fontSize: 13, color: "rgba(17,17,17,.45)", textDecoration: "none" }}>
          ← Retour à l'accueil
        </Link>
      </footer>
    </div>
  )
}

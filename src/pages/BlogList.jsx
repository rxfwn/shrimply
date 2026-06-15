import { useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { getAllPosts } from "../content/blog"

const syne = { fontFamily: "'Syne', sans-serif" }
const inst = { fontFamily: "'Instrument Sans', sans-serif" }
const R = "#f3501e"
const D = "#111111"

const cssStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  .blog-card { transition: transform .2s, box-shadow .2s; text-decoration: none; color: inherit; display: block; }
  .blog-card:hover { transform: translateY(-3px); box-shadow: 0 20px 50px rgba(0,0,0,.10); }
  .blog-back:hover { opacity: .7; }
`

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

export default function BlogList() {
  const navigate = useNavigate()
  const posts = getAllPosts()

  useEffect(() => {
    document.getElementById("lcp-shell")?.remove()
  }, [])

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

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "120px 20px 80px" }}>
        <span style={{ ...inst, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(17,17,17,.4)", marginBottom: 12, display: "block" }}>
          Blog Shrimply
        </span>
        <h1 style={{ ...syne, fontWeight: 800, fontSize: 40, lineHeight: 1.1, letterSpacing: "-.04em", marginBottom: 14 }}>
          Conseils repas, courses &amp; anti-gaspi
        </h1>
        <p style={{ ...inst, fontSize: 16, color: "rgba(17,17,17,.55)", lineHeight: 1.6, marginBottom: 48, maxWidth: 540 }}>
          Des conseils simples et concrets pour planifier tes repas, organiser tes courses,
          et arrêter de te demander "on mange quoi ce soir ?".
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {posts.map(post => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="blog-card">
              <article style={{ background: "#fff", borderRadius: 20, padding: 28, border: "1px solid rgba(17,17,17,.06)" }}>
                <time dateTime={post.date} style={{ ...inst, fontSize: 12, color: "rgba(17,17,17,.4)", fontWeight: 500 }}>
                  {formatDate(post.date)}
                </time>
                <h2 style={{ ...syne, fontWeight: 800, fontSize: 22, letterSpacing: "-.02em", margin: "8px 0 10px", lineHeight: 1.2 }}>
                  {post.title}
                </h2>
                <p style={{ ...inst, fontSize: 14, color: "rgba(17,17,17,.6)", lineHeight: 1.6, marginBottom: 14 }}>
                  {post.excerpt}
                </p>
                <span style={{ ...inst, fontSize: 13, fontWeight: 600, color: R }}>
                  Lire l'article →
                </span>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <footer style={{ padding: "32px 20px", textAlign: "center", borderTop: "1px solid rgba(17,17,17,.06)" }}>
        <Link to="/" className="blog-back" style={{ ...inst, fontSize: 13, color: "rgba(17,17,17,.45)", textDecoration: "none" }}>
          ← Retour à l'accueil
        </Link>
      </footer>
    </div>
  )
}

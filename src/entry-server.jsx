/**
 * entry-server.jsx
 * Point d'entrée SSR — compilé par scripts/prerender.mjs au build, jamais inclus dans le bundle client.
 */
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import BlogList from './pages/BlogList'
import BlogPost from './pages/BlogPost'
import { getAllPosts } from './content/blog'

const SITE_URL = 'https://www.shrimply.app'

// Rend une route donnée (utilisée pour "/", "/blog" et "/blog/:slug")
export function render(url) {
  return renderToString(
    <MemoryRouter initialEntries={[url]} initialIndex={0}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </MemoryRouter>
  )
}

// Liste des routes statiques à générer en plus de "/" (page + fichier de sortie + métadonnées SEO)
export function getStaticRoutes() {
  const posts = getAllPosts()

  const blogList = {
    url: '/blog',
    file: 'blog/index.html',
    meta: {
      title: 'Blog Shrimply — conseils repas, courses & anti-gaspi',
      description: 'Des conseils simples pour planifier tes repas, organiser tes courses et arrêter de te demander "on mange quoi ce soir ?".',
      canonical: `${SITE_URL}/blog`,
      type: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Blog Shrimply',
        url: `${SITE_URL}/blog`,
        description: 'Conseils pratiques pour planifier ses repas, organiser ses courses et réduire le gaspillage alimentaire.'
      }
    }
  }

  const postRoutes = posts.map(post => ({
    url: `/blog/${post.slug}`,
    file: `blog/${post.slug}.html`,
    meta: {
      title: `${post.title} — Shrimply`,
      description: post.description || post.excerpt,
      canonical: `${SITE_URL}/blog/${post.slug}`,
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description || post.excerpt,
        datePublished: post.date,
        url: `${SITE_URL}/blog/${post.slug}`,
        mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        image: `${SITE_URL}/og-shrimply.jpg`,
        author: { '@type': 'Organization', name: 'Shrimply' },
        publisher: { '@type': 'Organization', name: 'Shrimply' }
      }
    }
  }))

  return [blogList, ...postRoutes]
}

// Données pour la génération du sitemap.xml
export function getSitemapPosts() {
  return getAllPosts()
}

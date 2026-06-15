/**
 * scripts/prerender.mjs
 *
 * Pré-rend "/" ainsi que toutes les routes /blog et /blog/:slug en HTML statique
 * après le build Vite client. Lancé automatiquement par le hook "postbuild" de npm.
 *
 * Étapes :
 *   1. Compile un bundle SSR de src/entry-server.jsx via l'API Vite
 *   2. Appelle renderToString() côté Node.js pour chaque route
 *   3. Injecte le HTML + les meta tags SEO dans des copies de dist/index.html
 *   4. Régénère dist/sitemap.xml avec les articles du blog
 *   5. Supprime le bundle SSR temporaire
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'fs'
import { resolve, dirname }                               from 'path'
import { fileURLToPath, pathToFileURL }                   from 'url'
import { build }                                          from 'vite'
import react                                              from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')
const ssrDir    = resolve(root, 'dist', '.ssr')
const SITE_URL  = 'https://www.shrimply.app'

console.log('\n🔨 [prerender] Compilation du bundle SSR...')

try {
  // ── 1. Compiler src/entry-server.jsx en module ESM Node.js ──────────────
  await build({
    root,
    configFile: false,       // On n'applique pas vite.config.js (inlineCSSPlugin inutile ici)
    plugins:    [react()],
    logLevel:   'error',
    define:     { 'process.env.NODE_ENV': '"production"' },
    build: {
      ssr:    resolve(root, 'src', 'entry-server.jsx'),
      outDir: ssrDir,
      minify: false,
      rollupOptions: {
        output: { format: 'esm', entryFileNames: 'entry-server.js' }
      }
    }
  })

  const moduleUrl = pathToFileURL(resolve(ssrDir, 'entry-server.js')).href
  const { render, getStaticRoutes, getSitemapPosts } = await import(moduleUrl)

  const htmlPath     = resolve(root, 'dist', 'index.html')
  const baseTemplate = readFileSync(htmlPath, 'utf-8')

  // ── 2. Landing "/" — meta tags par défaut déjà corrects dans index.html ──
  writeFileSync(htmlPath, injectRoot(baseTemplate, render('/')))
  console.log('✅ [prerender] "/" pré-rendu')

  // ── 3. Routes /blog et /blog/:slug ───────────────────────────────────────
  mkdirSync(resolve(root, 'dist', 'blog'), { recursive: true })

  for (const route of getStaticRoutes()) {
    let pageHtml = injectRoot(baseTemplate, render(route.url))
    pageHtml = applyMeta(pageHtml, route.meta)
    writeFileSync(resolve(root, 'dist', route.file), pageHtml)
    console.log(`✅ [prerender] ${route.url} pré-rendu → dist/${route.file}`)
  }

  // ── 4. sitemap.xml dynamique (inclut les articles du blog) ───────────────
  writeFileSync(resolve(root, 'dist', 'sitemap.xml'), buildSitemap(getSitemapPosts()))
  console.log('✅ [prerender] sitemap.xml régénéré avec les articles du blog\n')

} catch (err) {
  // Ne pas planter le build si le pré-rendu échoue — la SPA reste fonctionnelle
  console.error('⚠️  [prerender] Échec (build livré quand même) :', err.message, '\n')
} finally {
  // ── 5. Supprimer le bundle SSR temporaire ────────────────────────────────
  rmSync(ssrDir, { recursive: true, force: true })
}

// ───────────────────────────────────────────────────────────────────────────

function injectRoot(template, appHtml) {
  return template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
}

// Remplace title / description / canonical / og:* / twitter:* / JSON-LD pour une route donnée
function applyMeta(html, meta) {
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  html = html.replace(/<title>.*?<\/title>/s, `<title>${esc(meta.title)}</title>`)
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.description)}" />`)
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${meta.canonical}" />`)
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(meta.description)}" />`)
  html = html.replace(/<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="${meta.type}" />`)
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${meta.canonical}" />`)
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(meta.title)}" />`)
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(meta.description)}" />`)
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${JSON.stringify(meta.jsonLd, null, 2)}\n    </script>`
  )

  return html
}

function buildSitemap(posts) {
  const staticUrls = [
    { loc: '/',         priority: '1.0', changefreq: 'weekly'  },
    { loc: '/blog',     priority: '0.8', changefreq: 'weekly'  },
    { loc: '/register', priority: '0.8', changefreq: 'monthly' },
    { loc: '/login',    priority: '0.5', changefreq: 'monthly' },
    { loc: '/legal',    priority: '0.2', changefreq: 'yearly'  },
  ]

  const postUrls = posts.map(p => ({
    loc: `/blog/${p.slug}`,
    priority: '0.6',
    changefreq: 'monthly',
    lastmod: p.date
  }))

  const entries = [...staticUrls, ...postUrls].map(u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`).join('\n\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${entries}

</urlset>
`
}

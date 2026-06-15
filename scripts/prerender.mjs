/**
 * scripts/prerender.mjs
 *
 * Pré-rend la route "/" en HTML statique après le build Vite client.
 * Lancé automatiquement par le hook "postbuild" de npm.
 *
 * Étapes :
 *   1. Compile un bundle SSR de src/entry-server.jsx via l'API Vite
 *   2. Appelle renderToString() côté Node.js
 *   3. Injecte le HTML dans dist/index.html
 *   4. Supprime le bundle SSR temporaire
 */
import { readFileSync, writeFileSync, rmSync } from 'fs'
import { resolve, dirname }                    from 'path'
import { fileURLToPath, pathToFileURL }        from 'url'
import { build }                               from 'vite'
import react                                   from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')
const ssrDir    = resolve(root, 'dist', '.ssr')

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

  // ── 2. Importer le module compilé et générer le HTML ────────────────────
  const moduleUrl = pathToFileURL(resolve(ssrDir, 'entry-server.js')).href
  const { render } = await import(moduleUrl)
  const appHtml    = render()

  // ── 3. Injecter dans dist/index.html ────────────────────────────────────
  const htmlPath = resolve(root, 'dist', 'index.html')
  const template = readFileSync(htmlPath, 'utf-8')
  const output   = template.replace(
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`
  )
  writeFileSync(htmlPath, output)

  console.log('✅ [prerender] "/" pré-rendu et injecté dans dist/index.html\n')

} catch (err) {
  // Ne pas planter le build si le pré-rendu échoue — la SPA reste fonctionnelle
  console.error('⚠️  [prerender] Échec (build livré quand même) :', err.message, '\n')
} finally {
  // ── 4. Supprimer le bundle SSR temporaire ───────────────────────────────
  rmSync(ssrDir, { recursive: true, force: true })
}

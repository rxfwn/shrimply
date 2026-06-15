/**
 * entry-server.jsx
 * Point d'entrée SSR — compilé par scripts/prerender.mjs au build, jamais inclus dans le bundle client.
 */
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import Landing from './pages/Landing'

export function render() {
  return renderToString(
    <MemoryRouter initialEntries={['/']} initialIndex={0}>
      <Landing />
    </MemoryRouter>
  )
}
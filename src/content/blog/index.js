import posts from './posts.json'

// Charge le contenu markdown de chaque article au build (client, SSR et dev)
const markdownModules = import.meta.glob('./*.md', { eager: true, query: '?raw', import: 'default' })

export function getAllPosts() {
  return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function getPostBySlug(slug) {
  return posts.find(p => p.slug === slug)
}

export function getPostContent(slug) {
  return markdownModules[`./${slug}.md`] || ''
}

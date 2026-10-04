import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'vite'

const distDir = join(process.cwd(), 'dist')
const indexFile = join(distDir, 'index.html')

const appRoutes = [
  'beta',
  'pricing',
  'nclex-rn',
  'nclex-pn',
  'about',
  'privacy',
  'terms',
  'admin',
  'admin/acquisition',
  'admin/activation',
  'admin/users',
  'admin/feature-usage',
  'admin/retention',
  'admin/content-quality',
  'admin/security',
  'dashboard',
  'daily-lesson',
  'review',
  'study-results',
  'exam-prep',
  'practice-questions',
  'test-mode',
  'nurse-command-lab',
  'clinical-simulator',
  'quick-study',
  'weak-areas',
  'performance-analytics',
  'flashcards',
  'study-plan',
  'strategy-training',
  'notes',
  'my-materials',
  'social',
  'settings',
  'medical-command-center',
  'shift-command',
  'hospitalvania',
  'nurse-tycoon',
]

if (!existsSync(indexFile)) {
  throw new Error(`Missing build entry: ${indexFile}`)
}

const pages = JSON.parse(readFileSync(join(process.cwd(), 'src/seo/pages.json'), 'utf8'))
const topics = JSON.parse(readFileSync(join(process.cwd(), 'src/seo/topics.json'), 'utf8'))
const renderedTopics = new Map()
const renderer = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true } })
try {
  const { renderTopic, renderGame } = await renderer.ssrLoadModule('/src/seo/render-topics.tsx')
  const logo = readdirSync(join(distDir, 'assets')).find(file => /^nursing-command-logo-small-.*\.webp$/.test(file))
  if (!logo) throw new Error('Missing built topic logo')
  renderedTopics.set('/nursing-game', renderGame().replaceAll('/src/assets/brand/nursing-command-logo-small.webp', `/assets/${logo}`))
  for (const topic of topics) renderedTopics.set(`/nclex-rn/${topic.slug}`, renderTopic(topic.slug).replaceAll('/src/assets/brand/nursing-command-logo-small.webp', `/assets/${logo}`))
} finally { await renderer.close() }
const template = readFileSync(indexFile, 'utf8')
const origin = 'https://nursecommand.com'
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
function documentFor(path) {
  const page = pages.find((entry) => entry.path === path)
  const title = `${page?.title ?? page?.label ?? 'Study Tools'} | Nurse Command`
  const description = page?.description ?? 'Your personal Nurse Command study workspace.'
  const url = origin + (path === '/' || path === '/dashboard' ? '/' : `${path}/`)
  const graph = [
    { '@type': 'WebSite', '@id': `${origin}/#website`, name: 'Nurse Command', url: `${origin}/` },
    { '@type': 'WebPage', name: title, description, url, isPartOf: { '@id': `${origin}/#website` } },
    ...(path === '/' ? [] : [{ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      ...(path.startsWith('/nclex-rn/') ? [{ '@type': 'ListItem', position: 2, name: 'NCLEX-RN', item: `${origin}/nclex-rn/` }] : []),
      { '@type': 'ListItem', position: path.startsWith('/nclex-rn/') ? 3 : 2, name: page?.label, item: url },
    ] }]),
  ]
  const tags = [
    ...(process.env.GOOGLE_SITE_VERIFICATION ? [`<meta name="google-site-verification" content="${escape(process.env.GOOGLE_SITE_VERIFICATION)}" />`] : []),
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="${page?.index ? 'index,follow,max-image-preview:large' : 'noindex,follow'}" />`,
    ...Object.entries({ title, description, url, type: 'website', site_name: 'Nurse Command', image: `${origin}/nursing-command-logo.png` }).map(([key, value]) => `<meta property="og:${key}" content="${escape(value)}" />`),
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    `<meta name="twitter:image" content="${origin}/nursing-command-logo.png" />`,
    ...(page?.index ? [`<script id="route-schema" type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c')}</script>`] : []),
  ].join('\n    ')
  return template.replace(/<title>.*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escape(description)}" />`)
    .replace('</head>', `${tags}\n  </head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${renderedTopics.get(path) ?? ''}</div>`)
}
writeFileSync(indexFile, documentFor('/'))
for (const route of new Set([...appRoutes, ...pages.map(page => page.path.slice(1)).filter(Boolean)])) {
  const routeDir = join(distDir, route)
  mkdirSync(routeDir, { recursive: true })
  writeFileSync(join(routeDir, 'index.html'), documentFor(`/${route}`))
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter((page) => page.index).map((page) => `  <url><loc>${origin}${page.path === '/' ? '/' : `${page.path}/`}</loc></url>`).join('\n')}\n</urlset>\n`
writeFileSync(join(distDir, 'sitemap.xml'), sitemap)

console.log(`Created GitHub Pages fallbacks for ${appRoutes.length} app routes.`)

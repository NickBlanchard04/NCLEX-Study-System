import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import pages from './pages.json'

const origin = 'https://nursecommand.com'
export function RouteSeo() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/'
    const page = pages.find((entry) => entry.path === path)
    const privateView = new URLSearchParams(search).has('auth') || new URLSearchParams(search).has('studyResult')
    const title = `${page?.title ?? page?.label ?? 'Study Tools'} | Nurse Command`
    const description = page?.description ?? 'Your personal Nurse Command study workspace.'
    const url = origin + (path === '/' || path === '/dashboard' ? '/' : `${path}/`)
    document.title = title
    const meta = (key: string, value: string, property = false) => {
      const attribute = property ? 'property' : 'name'
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, key); document.head.appendChild(element) }
      element.content = value
    }
    meta('description', description)
    meta('robots', page?.index && !privateView ? 'index,follow,max-image-preview:large' : 'noindex,follow')
    for (const [key, value] of Object.entries({ title, description, url, type: 'website', site_name: 'Nurse Command', image: `${origin}/nursing-command-logo.png` })) meta(`og:${key}`, value, true)
    meta('twitter:card', 'summary')
    meta('twitter:title', title)
    meta('twitter:description', description)
    meta('twitter:image', `${origin}/nursing-command-logo.png`)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    canonical.href = url
    document.getElementById('route-schema')?.remove()
    if (page?.index && !privateView) {
      const script = document.createElement('script')
      script.id = 'route-schema'
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
        { '@type': 'WebSite', '@id': `${origin}/#website`, name: 'Nurse Command', url: `${origin}/` },
        { '@type': 'WebPage', name: title, description, url, isPartOf: { '@id': `${origin}/#website` } },
        ...(path === '/' ? [] : [{ '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          ...(path.startsWith('/nclex-rn/') ? [{ '@type': 'ListItem', position: 2, name: 'NCLEX-RN', item: `${origin}/nclex-rn/` }] : []),
          { '@type': 'ListItem', position: path.startsWith('/nclex-rn/') ? 3 : 2, name: page.label, item: url },
        ] }]),
      ] })
      document.head.appendChild(script)
    }
  }, [pathname, search])
  return null
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const page = pages.find((entry) => entry.path === (pathname.replace(/\/+$/, '') || '/'))
  if (!page || page.label === 'Home') return null
  return <nav aria-label="Breadcrumb" className="site-breadcrumbs"><ol>
    <li><Link to="/">Home</Link></li>
    {page.path.startsWith('/nclex-rn/') && <li><span aria-hidden="true">/</span> <Link to="/nclex-rn/">NCLEX-RN</Link></li>}
    <li><span aria-hidden="true">/</span> <span aria-current="page">{page.label}</span></li>
  </ol></nav>
}

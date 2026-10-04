import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const pages = JSON.parse(readFileSync('src/seo/pages.json', 'utf8'))
const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
const game = readFileSync('dist/nursing-game/index.html', 'utf8')
assert.ok(game.includes('Play Nurse Tycoon'))
assert.ok(game.includes('What happens during a shift?'))
assert.ok(game.includes('href="/nurse-tycoon/"'))
assert.ok(!game.includes('/src/assets/'))
assert.ok(readFileSync('dist/nurse-tycoon/index.html', 'utf8').includes('noindex,follow'))
for (const page of pages) {
  const html = readFileSync(`dist${page.path === '/' ? '' : page.path}/index.html`, 'utf8')
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1, page.path)
  assert.equal((html.match(/name="description"/g) ?? []).length, 1, page.path)
  assert.ok(html.includes('property="og:title"'), page.path)
  const canonicalUrl = `https://nursecommand.com${page.path === '/' || page.path === '/dashboard' ? '/' : `${page.path}/`}`
  assert.ok(html.includes(`rel="canonical" href="${canonicalUrl}"`), page.path)
  assert.ok(html.includes(`property="og:url" content="${canonicalUrl}"`), page.path)
  const sitemapUrl = `https://nursecommand.com${page.path === '/' ? '/' : `${page.path}/`}`
  assert.equal(sitemap.includes(`<loc>${sitemapUrl}</loc>`), page.index, page.path)
  assert.ok(html.includes(page.index ? 'index,follow,max-image-preview:large' : 'noindex,follow'), page.path)
  if (page.index) {
    const schema = JSON.parse(html.match(/<script id="route-schema" type="application\/ld\+json">(.*?)<\/script>/s)[1])
    const breadcrumb = schema['@graph'].find((item) => item['@type'] === 'BreadcrumbList')
    if (page.path !== '/') {
      assert.equal(breadcrumb.itemListElement.at(-1).name, page.label)
      assert.equal(breadcrumb.itemListElement.at(-1).item, canonicalUrl)
      if (page.path.startsWith('/nclex-rn/')) {
        assert.equal(breadcrumb.itemListElement.length, 3)
        assert.ok(html.includes('Try a sample question'), page.path)
        assert.ok(html.includes('Show answer and explanation'), page.path)
        assert.ok(!html.includes('/src/assets/'), page.path)
      }
    }
  }
}
for (const path of ['/admin', '/my-materials', '/clinical-simulator']) {
  assert.ok(readFileSync(`dist${path}/index.html`, 'utf8').includes('noindex,follow'), path)
}
console.log(`SEO checks passed for ${pages.length} routes and private fallbacks.`)

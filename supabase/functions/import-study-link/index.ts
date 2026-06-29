const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  })

const htmlEntityMap: Record<string, string> = {
  amp: '&',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (entity, key: string) => {
    if (key.startsWith('#x')) return String.fromCharCode(Number.parseInt(key.slice(2), 16))
    if (key.startsWith('#')) return String.fromCharCode(Number.parseInt(key.slice(1), 10))
    return htmlEntityMap[key.toLowerCase()] ?? entity
  })

const cleanText = (value: string) =>
  decodeHtmlEntities(value)
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ \f\v]+/g, ' ')
    .replace(/\n[ ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const htmlToText = (markup: string) => {
  const title = decodeHtmlEntities(
    markup.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, ' ') ?? '',
  ).trim()
  const text = markup
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<\/(?:article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|li|main|nav|ol|p|section|table|td|th|tr|ul)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  return {
    text: cleanText(text),
    title,
  }
}

const isBlockedResponse = (response: Response, bodyPreview: string) => {
  const cfMitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const statusBlocked = [401, 403, 429].includes(response.status)
  const challengeBody = /\b(?:captcha|cloudflare|just a moment|access denied|forbidden|verify you are human)\b/i.test(bodyPreview)

  return cfMitigated === 'challenge' || (statusBlocked && (server.includes('cloudflare') || challengeBody))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'Authentication required.' }, 401)
  }

  const body = await request.json().catch(() => null) as null | { url?: string }
  const rawUrl = body?.url?.trim()
  if (!rawUrl) return json({ error: 'URL is required.' }, 400)

  let source: URL
  try {
    source = new URL(rawUrl)
  } catch {
    return json({ error: 'Invalid URL.' }, 400)
  }

  if (!['http:', 'https:'].includes(source.protocol)) {
    return json({ error: 'Only HTTP and HTTPS links can be imported.' }, 400)
  }

  let response: Response
  try {
    response = await fetch(source.toString(), {
      headers: {
        Accept: 'text/html,text/plain,text/markdown,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'User-Agent':
          'Mozilla/5.0 (compatible; NurseCommandStudyImporter/1.0; +https://nursecommand.com)',
      },
      redirect: 'follow',
    })
  } catch {
    return json({
      ok: false,
      reason: 'network',
      message: 'The study link could not be reached.',
    })
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const rawText = await response.text()
  const preview = rawText.slice(0, 1800)

  if (!response.ok || isBlockedResponse(response, preview)) {
    return json({
      ok: false,
      reason: isBlockedResponse(response, preview) ? 'blocked' : 'http',
      status: response.status,
      message: 'The study site blocked direct import.',
    })
  }

  const parsed =
    contentType.includes('html') || /^\s*</.test(rawText)
      ? htmlToText(rawText)
      : { text: cleanText(rawText), title: '' }

  return json({
    ok: true,
    contentType,
    sourceUrl: response.url || source.toString(),
    text: parsed.text.slice(0, 120000),
    title: parsed.title || source.hostname.replace(/^www\./, ''),
  })
})

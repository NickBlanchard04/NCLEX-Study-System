import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import { extractRawText } from 'mammoth'
import type {
  AnswerChoice,
  MaterialAsset,
  MaterialFlashcard,
  MaterialImportMode,
  MaterialQuestion,
  QuestionCategory,
  StudyMaterial,
  StudyMaterialFileType,
} from '../app/types'
import { hasCodeLikeStudyArtifact } from './material-quality'
import { createClientId } from './ids'
import { isSupabaseConfigured, supabase } from './supabase'

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TEXT_CHARS = 60000
const MAX_CARD_FRONT = 140
const MAX_CARD_BACK = 420

const categoryKeywords: Array<{ category: QuestionCategory; keywords: string[] }> = [
  { category: 'Fundamentals & Safety', keywords: ['safety', 'sterile', 'fall', 'infection', 'post-op', 'restraint'] },
  { category: 'Pharmacology', keywords: ['medication', 'drug', 'dose', 'toxicity', 'pharmacology', 'insulin', 'anticoagulant'] },
  { category: 'Adult Health / Med-Surg', keywords: ['heart failure', 'copd', 'med-surg', 'adult health', 'gi bleed', 'pneumothorax'] },
  { category: 'Maternal-Newborn', keywords: ['maternal', 'newborn', 'labor', 'pregnancy', 'postpartum', 'fetal'] },
  { category: 'Pediatrics', keywords: ['child', 'infant', 'pediatric', 'adolescent', 'newborn'] },
  { category: 'Mental Health', keywords: ['anxiety', 'suicide', 'therapeutic communication', 'mental health', 'behavior'] },
  { category: 'Leadership / Prioritization / Delegation', keywords: ['priority', 'delegation', 'assignment', 'uap', 'lpn', 'charge nurse'] },
  { category: 'Lab Values / Clinical Judgment', keywords: ['lab', 'abg', 'potassium', 'sodium', 'troponin', 'lactate'] },
]

const splitParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

const cleanSentence = (value: string) => value.replace(/\s+/g, ' ').trim()

const monthNamePattern =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const monthYearPattern = new RegExp(`\\b${monthNamePattern}\\s+\\d{4}\\b`, 'gi')
const sourceDomainPattern =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9.-]+\.(?:com|org|edu|gov|net)(?:\/\S*)?/gi
const codeSourceHostPattern =
  /\b(?:github\.com|raw\.githubusercontent\.com|gitlab\.com|bitbucket\.org|stackoverflow\.com|stackblitz\.com|codesandbox\.io|npmjs\.com|react\.dev|vitejs\.dev)\b/i
const codeSourcePathPattern = /\.(?:cjs|css|js|jsx|json|mjs|py|sql|ts|tsx)(?:$|[?#])/i
const blockedStudyLinkHostPattern = /\b(?:quizlet\.com|chegg\.com|coursehero\.com|studocu\.com)\b/i
const quizletNoiseLinePattern =
  /^(?:advertisement|already have an account|create|create flashcards|expert solutions|flashcards|learn|log in|login|match|q-chat|quizlet|sign up|spell|study with quizlet|test|terms in this set(?: \(\d+\))?|upgrade|write)$/i
const deckLabelLinePattern = /^(?:term|definition|answer|question|front|back)$/i
const commonMedicationPattern =
  /\b(?:acetaminophen|acyclovir|albuterol|amiodarone|amoxicillin|aspirin|atenolol|atropine|ceftriaxone|digoxin|dopamine|epinephrine|fentanyl|furosemide|gabapentin|heparin|hydralazine|ibuprofen|insulin|labetalol|levothyroxine|lisinopril|lithium|lorazepam|metformin|metoprolol|morphine|nitroglycerin|ondansetron|phenytoin|prednisone|vancomycin|warfarin)\b/i

const genericConceptLabels = new Set([
  'answer',
  'answers',
  'background',
  'content',
  'definition',
  'description',
  'findings',
  'information',
  'key point',
  'material',
  'note',
  'notes',
  'objective',
  'objectives',
  'overview',
  'purpose',
  'question',
  'range',
  'result',
  'results',
  'source',
  'study material',
  'table',
  'uploaded nursing concept',
  'value',
])

const truncate = (value: string, max = MAX_CARD_BACK) => {
  const cleaned = cleanSentence(value)
  if (cleaned.length <= max) return cleaned
  const clipped = cleaned.slice(0, max).replace(/\s+\S*$/, '')
  return `${clipped}...`
}

const stripSourceArtifacts = (value: string) =>
  value
    .replace(/â€¢/g, '\n- ')
    .replace(/[•·▪◦]/g, '\n- ')
    .replace(/\b(?:doi|pmid|issn)\s*[:#]?\s*\S+/gi, ' ')
    .replace(sourceDomainPattern, ' ')
    .replace(monthYearPattern, ' ')
    .replace(/\bpage\s+\d+\s+(?:of\s+\d+)?\b/gi, ' ')
    .replace(/\b(?:retrieved|accessed|downloaded)\s+(?:from|on)\b.*$/gim, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isSourceNoiseLine = (line: string) => {
  const raw = cleanSentence(line)
  const stripped = cleanSentence(stripSourceArtifacts(line))
  const lowerRaw = raw.toLowerCase()

  if (!raw) return true
  if (stripped.length >= 32 && stripped !== raw) return false
  if (/^(?:page\s*)?\d+(?:\s+of\s+\d+)?$/i.test(raw)) return true
  if (new RegExp(`^${monthNamePattern}\\s+\\d{4}$`, 'i').test(raw)) return true
  if (/(?:https?:\/\/|www\.|\bdoi\b|\bpmid\b|\bissn\b)/i.test(raw)) return true
  if (
    [
      'all rights reserved',
      'author manuscript',
      'copyright',
      'downloaded from',
      'frontiersin.org',
      'nursingcenter.com',
      'publisher',
      'retrieved from',
    ].some((token) => lowerRaw.includes(token))
  ) {
    return true
  }
  if (/^(?:volume|vol\.|issue|copyright|references)\b/i.test(raw)) return true

  return false
}

const cleanStudyFragment = (value: string) => {
  const cleaned = stripSourceArtifacts(value)
    .replace(/^(?:answer|finding|findings|note|notes|question|range|result|results|value)\s*[:;-]\s*/i, '')
    .replace(/^of\s+/i, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/^[,;:\s-]+/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

interface StudyPair {
  definition: string
  term: string
}

const normalizeDeckLine = (line: string) =>
  line
    .replace(/\u00a0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^[\s•*#\d.)-]+/, '')
    .replace(/\s+/g, ' ')
    .trim()

const isStudyDeckNoiseLine = (line: string) => {
  const cleaned = normalizeDeckLine(line)
  const lower = cleaned.toLowerCase()

  if (!cleaned) return true
  if (isSourceNoiseLine(cleaned)) return true
  if (quizletNoiseLinePattern.test(cleaned)) return true
  if (/^study with quizlet\b/i.test(cleaned)) return true
  if (/^terms in this set\b/i.test(cleaned)) return true
  if (/^(?:copy|edit|share|star|view all|show answer|tap card to see definition)$/i.test(cleaned)) return true
  if (/^(?:\d+\s*)?(?:terms?|cards?)$/i.test(cleaned)) return true
  if (lower.includes('your browser') || lower.includes('enable javascript')) return true
  if (lower.includes('privacy policy') || lower.includes('terms of service')) return true
  if (lower.includes('cookie') && cleaned.length < 90) return true

  return false
}

const isLikelyTermLine = (line: string) => {
  const cleaned = normalizeConceptLabel(line)
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length

  if (!cleaned || deckLabelLinePattern.test(cleaned) || isStudyDeckNoiseLine(cleaned)) return false
  if (cleaned.length < 2 || cleaned.length > 88 || wordCount > 8) return false
  if (/[.!?]$/.test(cleaned) && !commonMedicationPattern.test(cleaned)) return false
  if (/\b(?:because|therefore|which|when|after|before|should|requires)\b/i.test(cleaned)) return false

  return /[a-z]/i.test(cleaned)
}

const isLikelyDefinitionLine = (line: string) => {
  const cleaned = normalizeDeckLine(line)
  if (!cleaned || deckLabelLinePattern.test(cleaned) || isStudyDeckNoiseLine(cleaned)) return false
  if (cleaned.length < 16 || cleaned.length > 760) return false
  if (hasCodeLikeStudyArtifact(cleaned)) return false

  return nursingStudySignalPatterns.some((pattern) => pattern.test(cleaned)) || commonMedicationPattern.test(cleaned) || cleaned.length >= 34
}

const normalizeStudyPair = (term: string, definition: string): StudyPair | null => {
  const cleanTerm = normalizeConceptLabel(term)
  const cleanDefinition = cleanStudyFragment(definition)

  if (!isLikelyTermLine(cleanTerm) || !isLikelyDefinitionLine(cleanDefinition)) return null
  if (cleanTerm.toLowerCase() === cleanDefinition.toLowerCase()) return null

  return {
    term: truncate(cleanTerm, 86),
    definition: truncate(cleanDefinition, 620),
  }
}

const hasEmbeddedStudyPairMarker = (definition: string) =>
  /\b[A-Z][A-Za-z0-9()/% -]{2,64}:\s+\S/.test(definition)

const extractDelimitedStudyPair = (line: string): StudyPair | null => {
  const spacingPreserved = line.replace(/\u00a0/g, ' ').replace(/^[\sâ€¢*#\d.)-]+/, '').trim()
  const spacedPair = spacingPreserved.match(/^(.{2,88}?)\s{2,}(.{16,760})$/)
  if (spacedPair && !hasEmbeddedStudyPairMarker(spacedPair[2])) {
    return normalizeStudyPair(spacedPair[1], spacedPair[2])
  }

  const cleaned = normalizeDeckLine(line)
  const delimiterMatch = cleaned.match(/^([^:\t|–—-]{2,88})(?:\s*(?:[:\t|]|[-–—]{1,2})\s+)(.{16,760})$/)
  if (!delimiterMatch) return null
  if (hasEmbeddedStudyPairMarker(delimiterMatch[2])) return null

  return normalizeStudyPair(delimiterMatch[1], delimiterMatch[2])
}

const extractStudyPairsFromLines = (rawLines: string[]) => {
  const delimitedPairs = rawLines
    .map((line) => extractDelimitedStudyPair(line))
    .filter((pair): pair is StudyPair => Boolean(pair))
  const lines = rawLines.map(normalizeDeckLine).filter((line) => line && !isStudyDeckNoiseLine(line))
  const pairs: StudyPair[] = [...delimitedPairs]
  const consumed = new Set<number>()

  lines.forEach((line, index) => {
    const delimited = extractDelimitedStudyPair(line)
    if (!delimited) return
    pairs.push(delimited)
    consumed.add(index)
  })

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (consumed.has(index) || consumed.has(index + 1)) continue
    const pair = normalizeStudyPair(lines[index], lines[index + 1])
    if (!pair) continue
    pairs.push(pair)
    consumed.add(index)
    consumed.add(index + 1)
    index += 1
  }

  return uniqueByKey(pairs, (pair) => `${pair.term}-${pair.definition}`).slice(0, 80)
}

const extractStudyPairs = (rawText: string) =>
  extractStudyPairsFromLines(
    rawText
      .replace(/\r/g, '')
      .split('\n')
      .map((line) => line.trim()),
  )

const buildStudyPairPrelude = (rawText: string) => {
  const pairs = extractStudyPairs(rawText)
  if (pairs.length < 2) return ''

  return pairs.map((pair) => `${pair.term}: ${pair.definition}`).join('\n\n')
}

const focusPairHeavyStudyText = (rawText: string) => {
  const pairs = extractStudyPairs(rawText)
  if (pairs.length < 3) return rawText

  return pairs.map((pair) => `${pair.term}: ${pair.definition}`).join('\n\n')
}

const isLikelyFrontMatter = (paragraph: string) => {
  if (isSourceNoiseLine(paragraph)) return true
  const lower = paragraph.toLowerCase()
  const metadataHits = [
    'frontiersin.org',
    'correspondence',
    'received',
    'accepted',
    'published',
    'citation',
    'copyright',
    'creative commons',
    'doi:',
    'author contributions',
    'conflict of interest',
    'publisher',
    'affiliation',
  ].filter((token) => lower.includes(token)).length
  const emailLike = /\b\S+@\S+\.\S+\b/.test(paragraph)
  const citationDense = /\(\d{4}\)|\bvol\.|\bissn\b/i.test(paragraph)
  const tooManyNames =
    paragraph.length > 180 &&
    (paragraph.match(/\b[A-Z][a-z]+ [A-Z]\b|\b[A-Z][a-z]+, [A-Z]/g)?.length ?? 0) >= 4

  return metadataHits >= 1 || emailLike || citationDense || tooManyNames
}

export function cleanExtractedStudyText(rawText: string) {
  const pairPrelude = buildStudyPairPrelude(rawText)
  const inputText = pairPrelude ? `${pairPrelude}\n\n${rawText}` : rawText
  const normalized = inputText
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n[ ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const withoutLineNoise = normalized
    .split('\n')
    .map((line) => cleanStudyFragment(line))
    .filter((line) => line && !isSourceNoiseLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const bodyStartMatch = withoutLineNoise.match(
    /\b(abstract|background|objective|objectives|purpose|introduction)\b[:\s]/i,
  )
  const bodyStart = bodyStartMatch?.index ?? -1
  const bodyEndMatch = withoutLineNoise.match(
    /\b(references|acknowledg(e)?ments|supplementary material|author contributions|conflict of interest)\b[:\s]/i,
  )
  const bodyEnd = bodyEndMatch?.index ?? -1
  const scopedText = withoutLineNoise
    .slice(bodyStart >= 0 && bodyStart < 9000 ? bodyStart : 0, bodyEnd > 0 ? bodyEnd : undefined)
    .replace(/\b(Abstract|Background|Objective|Objectives|Purpose|Introduction|Methods?|Results?|Discussion|Conclusions?)\b[:\s]*/gi, '\n\n$1: ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const paragraphs = splitParagraphs(scopedText)
  const contentStart = paragraphs.findIndex((paragraph, index) => {
    if (index > 10) return false
    return /^(abstract|background|objective|objectives|purpose|introduction|methods?|results?|conclusions?)\b[:\s]/i.test(paragraph)
  })
  const contentEnd = paragraphs.findIndex((paragraph, index) => {
    if (index < 3) return false
    return /^(references|acknowledg(e)?ments|supplementary material)\b/i.test(paragraph)
  })
  const scoped = paragraphs.slice(
    contentStart >= 0 ? contentStart : 0,
    contentEnd > 0 ? contentEnd : undefined,
  )
  const cleaned = scoped.filter((paragraph, index) => {
    if (!paragraph || paragraph.length < 24) return false
    if (index < 8 && isLikelyFrontMatter(paragraph)) return false
    return true
  })

  return (cleaned.length ? cleaned : paragraphs.filter((paragraph) => !isLikelyFrontMatter(paragraph)))
    .join('\n\n')
    .slice(0, MAX_TEXT_CHARS)
    .trim()
}

const stripExtension = (filename: string) => filename.replace(/\.[^/.]+$/, '')

const hasProtocol = (value: string) => /^[a-z][a-z\d+.-]*:\/\//i.test(value)

const normalizeStudyUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    throw new Error('Paste a study link before importing.')
  }

  const url = new URL(hasProtocol(trimmed) ? trimmed : `https://${trimmed}`)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS links can be imported.')
  }

  return url
}

export class MaterialImportBlockedError extends Error {
  readonly reason: string
  readonly sourceUrl: string

  constructor(sourceUrl: string, reason = 'blocked') {
    super(
      'This study site blocks direct import. Copy the visible terms, definitions, or notes from the page, paste them into Assisted import, and Nurse Command will clean them into editable study tools.',
    )
    this.name = 'MaterialImportBlockedError'
    this.reason = reason
    this.sourceUrl = sourceUrl
  }
}

const isBlockedStudyLinkHost = (url: URL) => blockedStudyLinkHostPattern.test(url.hostname)

const isCodeLikeStudyUrl = (url: URL) =>
  codeSourceHostPattern.test(url.hostname) || codeSourcePathPattern.test(url.pathname)

const parseLinkPayload = (
  source: URL,
  rawText: string,
  contentType = '',
  titleHint?: string,
) => {
  const parsed =
    contentType.toLowerCase().includes('html') || /^\s*</.test(rawText)
      ? htmlToStudyText(rawText)
      : {
          title: titleHint,
          text: rawText
            .replace(/\r/g, '')
            .replace(/\t/g, ' ')
            .replace(/\s+\n/g, '\n')
            .trim(),
        }

  if (!parsed.text || parsed.text.length < 80) {
    throw new Error('We could not find enough readable study text at this link.')
  }

  const focusedText = focusPairHeavyStudyText(parsed.text)
  const cleaned = cleanExtractedStudyText(focusedText)
  if (!cleaned) {
    throw new Error('We could not find enough readable study text at this link.')
  }
  validateStudyMaterialContent(cleaned, parsed.title || titleHint || titleFromUrl(source), true)

  return {
    fileType: 'link' as const,
    fullText: cleaned,
    assets: chunkMaterialContent(`${focusedText}\n\n${cleaned}`),
    preview: cleaned.slice(0, 420),
    title: parsed.title || titleHint || titleFromUrl(source),
    sourceUrl: source.toString(),
  }
}

type EdgeLinkImportPayload =
  | {
      contentType?: string
      ok: true
      sourceUrl?: string
      text: string
      title?: string
    }
  | {
      message?: string
      ok: false
      reason?: string
      status?: number
    }

const importStudyLinkFromEdge = async (source: URL) => {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase.functions.invoke('import-study-link', {
    body: { url: source.toString() },
  })
  if (error || !data || typeof data !== 'object') return null

  const payload = data as EdgeLinkImportPayload
  if (!payload.ok) {
    if (
      payload.reason === 'blocked' ||
      payload.status === 401 ||
      payload.status === 403 ||
      payload.status === 429 ||
      isBlockedStudyLinkHost(source)
    ) {
      throw new MaterialImportBlockedError(source.toString(), payload.reason ?? 'blocked')
    }
    throw new Error(payload.message || 'This link could not be imported.')
  }

  return parseLinkPayload(
    source,
    payload.text,
    payload.contentType,
    payload.title,
  )
}

const nursingStudySignalPatterns = [
  /\b(?:nurse|nursing|client|patient|clinical|nclex|rn|pn|fnp)\b/i,
  /\b(?:assessment|intervention|priority|delegation|teaching|therapeutic|safety|precaution)\b/i,
  /\b(?:medication|dose|administer|toxicity|contraindication|insulin|anticoagulant)\b/i,
  /\b(?:lab|laboratory|vital|abg|potassium|sodium|glucose|platelet|albumin|hemoglobin|hematocrit)\b/i,
  /\b(?:airway|breathing|oxygen|sepsis|infection|bleeding|cardiac|renal|postpartum|pediatric)\b/i,
]

function validateStudyMaterialContent(text: string, sourceLabel: string, strict = false) {
  const cleaned = cleanSentence(text)
  if (hasCodeLikeStudyArtifact(cleaned)) {
    throw new Error(
      'This looks like source code or app data, not nursing study material. Upload nursing notes, a study guide, or a text-heavy clinical reference instead.',
    )
  }

  const signalCount = nursingStudySignalPatterns.filter((pattern) => pattern.test(cleaned)).length
  const clinicalTopicMatch = clinicalTopicPatterns.some(({ pattern }) => pattern.test(cleaned))
  if (!clinicalTopicMatch && signalCount < (strict ? 2 : 1)) {
    throw new Error(
      `${sourceLabel} does not look like nursing study material yet. Upload NCLEX notes, a nursing study guide, or a clinical reference with enough readable text.`,
    )
  }
}

const titleFromUrl = (url: URL) => {
  const pathTitle = url.pathname
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/[-_]+/g, ' ')
    .replace(/\.[^/.]+$/, '')

  return pathTitle || url.hostname.replace(/^www\./, '')
}

const inferFileType = (file: File): StudyMaterialFileType | null => {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.md')) return 'md'
  if (name.endsWith('.txt')) return 'txt'
  return null
}

export function validateMaterialFile(file: File) {
  const fileType = inferFileType(file)
  if (!fileType) {
    throw new Error('Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.')
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error('This file is too large for browser-only import. Keep uploads under 8 MB.')
  }

  return fileType
}

async function extractPdfText(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, index) => {
      const page = await pdf.getPage(index + 1)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
      return pageText.replace(/\s+/g, ' ').trim()
    }),
  )
  return pages.join('\n\n')
}

async function extractDocxText(file: File) {
  const result = await extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

export async function extractMaterialText(file: File) {
  const fileType = validateMaterialFile(file)
  const fullText =
    fileType === 'pdf'
      ? await extractPdfText(file)
      : fileType === 'docx'
        ? await extractDocxText(file)
        : await file.text()

  const cleaned = cleanExtractedStudyText(fullText)
  if (!cleaned) {
    throw new Error('We could not extract readable text from this file.')
  }
  validateStudyMaterialContent(cleaned, file.name)

  return {
    fileType,
    fullText: cleaned,
    assets: chunkMaterialContent(`${fullText}\n\n${cleaned}`),
    preview: cleaned.slice(0, 420),
  }
}

function htmlToStudyText(markup: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(markup, 'text/html')
  doc.querySelectorAll('script, style, noscript, svg, iframe, nav, footer').forEach((node) => node.remove())

  const title = doc.querySelector('title')?.textContent?.trim()
  const bodyText = doc.body?.innerText ?? doc.documentElement.textContent ?? ''

  return {
    title,
    text: bodyText
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  }
}

export async function extractMaterialTextFromUrl(rawUrl: string) {
  const source = normalizeStudyUrl(rawUrl)
  if (isCodeLikeStudyUrl(source)) {
    throw new Error(
      'This link looks like source code or a software page. Import a nursing study article, class handout, or text-heavy clinical reference instead.',
    )
  }
  if (isBlockedStudyLinkHost(source)) {
    throw new MaterialImportBlockedError(source.toString(), 'assisted-import-required')
  }

  const edgeImport = await importStudyLinkFromEdge(source)
  if (edgeImport) return edgeImport

  let response: Response
  try {
    response = await fetch(source.toString(), {
      headers: {
        Accept: 'text/html,text/plain,text/markdown,application/xhtml+xml;q=0.9,*/*;q=0.5',
      },
    })
  } catch {
    if (isBlockedStudyLinkHost(source)) {
      throw new MaterialImportBlockedError(source.toString(), 'browser-blocked')
    }
    throw new Error(
      'We could not read this link directly. If the site blocks imports, use Assisted import or upload the PDF/DOCX/TXT file instead.',
    )
  }

  if (!response.ok) {
    if ([401, 403, 429].includes(response.status) || isBlockedStudyLinkHost(source)) {
      throw new MaterialImportBlockedError(source.toString(), `http-${response.status}`)
    }
    throw new Error(`This link could not be imported. The site returned ${response.status}.`)
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const rawText = await response.text()
  return parseLinkPayload(source, rawText, contentType)
}

export function extractMaterialTextFromPastedStudyText(input: {
  mode?: MaterialImportMode
  sourceUrl?: string
  text: string
  title?: string
}) {
  const source = input.sourceUrl?.trim() ? normalizeStudyUrl(input.sourceUrl) : null
  const title = input.title?.trim() || (source ? titleFromUrl(source) : 'Pasted study material')
  const rawText = input.text.trim()

  if (rawText.length < 80) {
    throw new Error('Paste the visible terms, definitions, notes, or study guide text before importing.')
  }

  const focusedText = focusPairHeavyStudyText(rawText)
  const cleaned = cleanExtractedStudyText(focusedText)
  if (!cleaned || cleaned.length < 80) {
    throw new Error('We could not find enough readable study text in that paste.')
  }
  validateStudyMaterialContent(cleaned, title, false)

  return {
    fileType: (source ? 'link' : 'txt') as StudyMaterialFileType,
    fullText: cleaned,
    assets: chunkMaterialContent(`${focusedText}\n\n${cleaned}`),
    preview: cleaned.slice(0, 420),
    title,
    sourceUrl: source?.toString(),
    importMode: input.mode ?? 'full',
  }
}

export function chunkMaterialContent(materialText: string) {
  const pairs = extractStudyPairs(materialText)
  const paragraphs = splitParagraphs(cleanExtractedStudyText(materialText))
  const assets: MaterialAsset[] = []
  let currentHeading = 'Overview'
  let order = 0

  pairs.forEach((pair) => {
    assets.push({
      id: createClientId(),
      materialId: '',
      title: safeHeading(pair.term),
      content: pair.definition,
      order,
    })
    order += 1
  })

  if (pairs.length >= 3) {
    return uniqueByKey(assets, (asset) => `${asset.title}-${asset.content}`).slice(0, 24)
  }

  paragraphs.forEach((paragraph) => {
    const content = cleanStudyFragment(paragraph)
    if (!content || isLikelyFrontMatter(content)) return
    const headingLike =
      content.length <= 70 &&
      content.split(' ').length <= 8 &&
      !content.includes('.') &&
      !content.includes(':')

    if (headingLike) {
      currentHeading = truncate(content, 48).replace(/\.+$/, '')
      return
    }

    assets.push({
      id: createClientId(),
      materialId: '',
      title: currentHeading,
      content,
      order,
    })
    order += 1
  })

  if (!assets.length) {
    const sentences = materialText
      .split(/(?<=[.?!])\s+/)
      .map(cleanSentence)
      .filter((sentence) => sentence.length > 40 && !isLikelyFrontMatter(sentence))

    assets.push({
      id: createClientId(),
      materialId: '',
      title: 'Overview',
      content: sentences.slice(0, 6).join(' ') || cleanExtractedStudyText(materialText),
      order: 0,
    })
  }

  return uniqueByKey(assets, (asset) => `${asset.title}-${asset.content}`).slice(0, 24)
}

const uniqueByKey = <T,>(items: T[], getKey: (item: T) => string) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item).toLowerCase().replace(/\s+/g, ' ').trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

type LearningPointKind =
  | 'assessment'
  | 'causes'
  | 'general'
  | 'lab'
  | 'medication'
  | 'priority'
  | 'safety'

interface LearningPoint {
  topic: string
  statement: string
  sourceTitle: string
  kind: LearningPointKind
}

const clinicalTopicPatterns: Array<{ pattern: RegExp; label: string; kind: LearningPointKind }> = [
  {
    pattern:
      /\b(?:thrombocytopenia|platelets?)\b(?=.*\b(?:bone marrow|destruction|production|sepsis|sequestration|spleen|splenic|autoimmune|drug-induced))/i,
    label: 'thrombocytopenia causes',
    kind: 'causes',
  },
  {
    pattern:
      /\b(?:thrombocytopenia|low platelet count|platelet count is below|platelets? below|bleeding precautions?|petechiae|bruising|bleeding gums|hematuria|melena|electric razor)\b/i,
    label: 'thrombocytopenia bleeding risk',
    kind: 'safety',
  },
  { pattern: /\btotal protein\b|\balbumin\b/i, label: 'total protein lab value', kind: 'lab' },
  { pattern: /\bpotassium\b|\bhyperkalemia\b|\bhypokalemia\b/i, label: 'potassium lab value', kind: 'lab' },
  { pattern: /\bsodium\b|\bhypernatremia\b|\bhyponatremia\b/i, label: 'sodium lab value', kind: 'lab' },
  { pattern: /\bglucose\b|\binsulin\b|\bhypoglycemia\b|\bhyperglycemia\b/i, label: 'glucose control', kind: 'lab' },
  { pattern: /\bhemoglobin\b|\bhematocrit\b|\bbleeding\b/i, label: 'bleeding risk', kind: 'safety' },
  { pattern: /\binfection\b|\bsterile\b|\bsepsis\b/i, label: 'infection and sepsis safety', kind: 'safety' },
  { pattern: /\bairway\b|\bbreathing\b|\boxygen\b|\bo2\b/i, label: 'oxygenation priority', kind: 'priority' },
  { pattern: /\bdelegate|delegation|uap|lpn|charge nurse\b/i, label: 'delegation priority', kind: 'priority' },
  { pattern: commonMedicationPattern, label: 'medication safety', kind: 'medication' },
  { pattern: /\bmedication\b|\bdrug\b|\bdose\b|\btoxicity\b|\bcontraindication\b/i, label: 'medication safety', kind: 'medication' },
  { pattern: /\bfluid\b|\belectrolyte\b|\bdehydration\b|\bedema\b/i, label: 'fluid and electrolyte balance', kind: 'lab' },
]

const fallbackDistractorsByKind: Record<LearningPointKind, string[]> = {
  assessment: [
    'The nurse should skip focused assessment once a familiar cue appears.',
    'The nurse should document the finding before comparing it with current client symptoms.',
    'The nurse should wait for the next scheduled check before reassessing a changing cue.',
    'The nurse should teach the client first without confirming the assessment finding.',
  ],
  causes: [
    'The finding is explained by normal aging and does not need follow-up.',
    'The cause pattern is limited to diet history without considering physiologic changes.',
    'The nurse should focus only on documenting the label instead of identifying the source pattern.',
    'The cause is best confirmed by repeating the same question without reviewing client data.',
  ],
  general: [
    'The nurse should treat the cue as stable without completing a focused assessment.',
    'The nurse should delay follow-up until the finding becomes severe.',
    'The nurse should prioritize documentation before interpreting the client cue.',
    'The nurse should choose an action that does not address the current finding.',
  ],
  lab: [
    'The nurse should treat one abnormal value as stable without reassessing the client.',
    'The nurse should wait to compare the lab result with symptoms before reporting a major change.',
    'The nurse should document the value only and skip trend review.',
    'The nurse should teach routine diet changes before checking for urgent clinical cues.',
  ],
  medication: [
    'The nurse should give the medication before checking ordered hold parameters.',
    'The nurse should ignore toxicity cues if the medication is commonly prescribed.',
    'The nurse should teach routine side effects before assessing for an adverse reaction.',
    'The nurse should document administration without verifying current safety data.',
  ],
  priority: [
    'The nurse should complete routine teaching before addressing the unstable cue.',
    'The nurse should delay action until all lower-risk tasks are complete.',
    'The nurse should focus on documentation before stabilizing the immediate concern.',
    'The nurse should delegate the priority assessment before collecting key client data.',
  ],
  safety: [
    'The nurse should delay precautions until visible injury occurs.',
    'The nurse should remove safeguards once the client reports feeling stable.',
    'The nurse should teach discharge instructions before reducing the immediate risk.',
    'The nurse should document the safety concern without adding protective measures.',
  ],
}

const sentenceCase = (value: string) => {
  const cleaned = cleanSentence(value)
  if (!cleaned) return cleaned
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`
}

const ensureTerminalPunctuation = (value: string) => {
  const cleaned = cleanSentence(value)
  if (!cleaned) return cleaned
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

const lowerFirst = (value: string) => {
  const cleaned = cleanSentence(value)
  if (!cleaned) return cleaned
  return `${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`
}

const normalizeConceptLabel = (value: string) =>
  cleanStudyFragment(value)
    .replace(/\b(?:laboratory value|nursing considerations|normal range|range)\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isMeaningfulConceptLabel = (value: string) => {
  const normalized = normalizeConceptLabel(value)
  const lower = normalized.toLowerCase()
  const wordCount = normalized.split(/\s+/).filter(Boolean).length

  if (!normalized || normalized.length < 4 || normalized.length > 80) return false
  if (wordCount > 8) return false
  if (genericConceptLabels.has(lower)) return false
  if (/^\d+|^[a-d]$/i.test(normalized)) return false
  if (isSourceNoiseLine(normalized) || isLikelyFrontMatter(normalized)) return false

  return /[a-z]/i.test(normalized)
}

const safeHeading = (heading: string) => {
  const cleaned = normalizeConceptLabel(truncate(heading, 56))
  if (!isMeaningfulConceptLabel(cleaned)) return 'uploaded nursing concept'
  return cleaned
}

const inferSpecificTopicCue = (text: string) => {
  if (
    /\b(?:thrombocytopenia|low platelet count|platelet count is below|platelets? below|petechiae|bruising|bleeding gums|hematuria|melena|electric razor)\b/i.test(
      text,
    )
  ) {
    return 'thrombocytopenia bleeding risk'
  }
  if (/\bbleeding precautions?\b/i.test(text)) return 'bleeding precautions'
  return ''
}

const inferTopicFromText = (text: string, fallbackTitle: string) => {
  const cleanedText = cleanStudyFragment(text)
  const matchedTopic = clinicalTopicPatterns.find(({ pattern }) => pattern.test(cleanedText))
  if (matchedTopic) return matchedTopic.label
  const specificCue = inferSpecificTopicCue(cleanedText)
  if (specificCue) return specificCue

  const title = normalizeConceptLabel(fallbackTitle)
  if (isMeaningfulConceptLabel(title)) return title

  const phraseMatch = cleanedText.match(
    /\b(?:[a-z]+(?:emia|osis|itis|pathy|tion|sion)|platelet(?:s)?|protein|albumin|potassium|sodium|calcium|magnesium|glucose|insulin|sepsis|infection|oxygenation|delegation)(?:\s+[a-z]+){0,3}\b/i,
  )
  const phrase = phraseMatch ? normalizeConceptLabel(phraseMatch[0]) : ''
  return isMeaningfulConceptLabel(phrase) ? phrase : 'uploaded nursing concept'
}

const inferLearningKind = (topic: string, statement: string): LearningPointKind => {
  const haystack = `${topic} ${statement}`
  const matchedTopic = clinicalTopicPatterns.find(({ pattern }) => pattern.test(haystack))
  if (matchedTopic) return matchedTopic.kind
  if (/\b(?:cause|caused|causes|due to|result(?:s)? from|production|destruction|sequestration|risk factor)\b/i.test(haystack)) {
    return 'causes'
  }
  if (/\b(?:lab|range|value|sodium|potassium|protein|albumin|glucose|hemoglobin|hematocrit|platelet)\b/i.test(haystack)) {
    return 'lab'
  }
  if (/\b(?:priority|first|immediate|airway|breathing|circulation|unstable|deteriorate)\b/i.test(haystack)) {
    return 'priority'
  }
  if (/\b(?:safety|precaution|fall|bleeding|infection|sterile|sepsis)\b/i.test(haystack)) return 'safety'
  if (commonMedicationPattern.test(haystack)) return 'medication'
  if (/\b(?:medication|drug|dose|administer|toxicity|contraindication)\b/i.test(haystack)) return 'medication'
  if (/\b(?:assess|assessment|monitor|finding|symptom|sign)\b/i.test(haystack)) return 'assessment'
  return 'general'
}

const polishLearningStatement = (statement: string, kind: LearningPointKind, topic: string) => {
  const cleaned = cleanStudyFragment(statement)
    .replace(/^(?:can include|include|includes)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return cleaned

  if (
    kind === 'causes' &&
    !/\b(?:cause|caused|causes|due to|include|includes|result(?:s)? from)\b/i.test(cleaned)
  ) {
    return ensureTerminalPunctuation(`Common causes include ${lowerFirst(cleaned).replace(/[.;:,]+$/, '')}`)
  }

  if (topic.toLowerCase().includes('lab value') && /\b\d/.test(cleaned) && !/\bnursing\b/i.test(cleaned)) {
    return ensureTerminalPunctuation(sentenceCase(cleaned))
  }

  return ensureTerminalPunctuation(sentenceCase(cleaned))
}

const extractStudySegments = (content: string) =>
  cleanStudyFragment(content)
    .split(/(?<=[.?!])\s+|\s+-\s+|\n+|;\s+/)
    .map((segment) => cleanStudyFragment(segment))
    .filter((segment) => {
      if (segment.length < 28 || segment.length > 720) return false
      if (hasCodeLikeStudyArtifact(segment)) return false
      if (isSourceNoiseLine(segment) || isLikelyFrontMatter(segment)) return false
      if (/^(?:abstract|background|objective|purpose|introduction|methods?|discussion|conclusion)s?\b[:\s]*$/i.test(segment)) {
        return false
      }
      return true
    })

const learningPointFromSegment = (segment: string, assetTitle: string): LearningPoint | null => {
  const colonMatch = segment.match(/^([^:]{2,90}):\s*(.{20,})$/)
  const label = colonMatch ? normalizeConceptLabel(colonMatch[1]) : ''
  const statementSource = colonMatch ? colonMatch[2] : segment
  const baseStatement = cleanStudyFragment(statementSource)

  if (baseStatement.length < 28 || isSourceNoiseLine(baseStatement) || isLikelyFrontMatter(baseStatement)) {
    return null
  }

  const topic = isMeaningfulConceptLabel(label)
    ? label
    : inferTopicFromText(`${assetTitle} ${baseStatement}`, assetTitle)
  const kind = inferLearningKind(topic, baseStatement)
  const statement = polishLearningStatement(baseStatement, kind, topic)

  if (statement.length < 32 || statement.length > MAX_CARD_BACK) return null

  return {
    topic,
    statement,
    sourceTitle: safeHeading(assetTitle),
    kind,
  }
}

const extractLearningPoints = (material: StudyMaterial): LearningPoint[] => {
  const points = material.assets.flatMap((asset) =>
    extractStudySegments(asset.content)
      .map((segment) => learningPointFromSegment(segment, asset.title))
      .filter((point): point is LearningPoint => Boolean(point)),
  )

  const fallbackText = cleanExtractedStudyText(
    `${material.preview}\n\n${material.assets.map((asset) => asset.content).join('\n\n')}`,
  )
  const fallbackPoints = extractStudySegments(fallbackText)
    .map((segment) => learningPointFromSegment(segment, material.displayTitle))
    .filter((point): point is LearningPoint => Boolean(point))

  return uniqueByKey([...points, ...fallbackPoints], (point) => `${point.topic}-${point.statement}`).slice(0, 12)
}

const makeFlashcardFront = (point: LearningPoint) => {
  const topic = point.topic === 'uploaded nursing concept' ? point.sourceTitle : point.topic
  if (point.kind === 'causes') {
    return `What are common causes of ${topic.replace(/\s+causes$/i, '')}?`
  }
  if (point.kind === 'lab') return `How should a nurse interpret ${topic}?`
  if (point.kind === 'priority') return `What priority point matters for ${topic}?`
  if (point.kind === 'safety') return `Which safety precautions matter for ${topic}?`
  if (point.kind === 'medication') return `What medication safety point applies to ${topic}?`
  if (point.kind === 'assessment') return `What assessment point matters for ${topic}?`
  return `What nursing action or teaching point is linked to ${topic}?`
}

const hasBrokenGeneratedShape = (value: string) => {
  const cleaned = cleanSentence(value).toLowerCase()
  if (!cleaned) return true
  if (hasCodeLikeStudyArtifact(value)) return true
  if (/(?:https?:\/\/|www\.|\bdoi\b|\bpmid\b|\bissn\b)/i.test(value)) return true
  if (/\b(?:frontiersin\.org|nursingcenter\.com|copyright|publisher|all rights reserved)\b/i.test(value)) {
    return true
  }
  if (/what should you know about (?:result|results|value|source)\??/i.test(value)) return true
  if (
    /^what is (?:a|the) key (?:nursing )?point about (?:overview|this study material|uploaded nursing concept)\??$/i.test(
      value,
    )
  ) {
    return true
  }
  if (/\b(?:uploaded nursing concept|this study material|smoke material)\b/i.test(value)) return true
  return false
}

const normalizeFlashcardCandidate = (item: { front: string; back: string }) => {
  const front = truncate(sentenceCase(item.front).replace(/\.+$/, '?').replace(/\?+$/, '?'), MAX_CARD_FRONT)
  const back = truncate(ensureTerminalPunctuation(item.back), MAX_CARD_BACK)
  if (front.length < 14 || back.length < 24) return null
  if (front.toLowerCase() === back.toLowerCase()) return null
  if (hasBrokenGeneratedShape(front) || hasBrokenGeneratedShape(back)) return null
  if (isLikelyFrontMatter(front) || isLikelyFrontMatter(back)) return null
  return { front, back }
}

const cleanChoiceText = (value: string) => {
  const cleaned = truncate(ensureTerminalPunctuation(value), 190)
  return cleaned.replace(/\s+/g, ' ').trim()
}

const getFallbackDistractors = (point?: Pick<LearningPoint, 'kind'>) =>
  fallbackDistractorsByKind[point?.kind ?? 'general'] ?? fallbackDistractorsByKind.general

const buildChoices = (
  correct: string,
  distractors: string[],
  point?: Pick<LearningPoint, 'kind'>,
): AnswerChoice[] => {
  const correctText = cleanChoiceText(correct)
  const options = uniqueByKey(
    [correctText, ...distractors.map(cleanChoiceText), ...getFallbackDistractors(point).map(cleanChoiceText)].filter(
      (choice) => choice.length >= 18 && !hasBrokenGeneratedShape(choice),
    ),
    (choice) => choice,
  ).slice(0, 4)
  const safeOptions = options.length ? options : [correctText]
  const rotation = correctText.length % safeOptions.length
  const ordered = [...safeOptions.slice(rotation), ...safeOptions.slice(0, rotation)]

  return ordered.map((text, index) => ({
    id: String.fromCharCode(65 + index),
    text,
  }))
}

const buildQuestionRationale = (point: LearningPoint) => {
  const topic = point.topic === 'uploaded nursing concept' ? point.sourceTitle : point.topic
  const base = `The correct answer is supported by the uploaded material about ${topic}: ${point.statement}`

  if (point.kind === 'lab') {
    return `${base} Compare lab cues with the client's current status and prioritize findings that signal risk.`
  }
  if (point.kind === 'medication') {
    return `${base} Medication questions should protect safety by checking ordered parameters, adverse effects, and toxicity cues before routine actions.`
  }
  if (point.kind === 'priority') {
    return `${base} Priority items should address the cue most likely to affect safety or deterioration first.`
  }
  if (point.kind === 'safety') {
    return `${base} Safety items should reduce the immediate client risk before lower-priority teaching or documentation.`
  }
  if (point.kind === 'assessment') {
    return `${base} Assessment items should confirm the relevant cue before moving to teaching, routine documentation, or delayed follow-up.`
  }
  if (point.kind === 'causes') {
    return `${base} Cause-pattern items should match the mechanism described in the source instead of choosing an unrelated clinical concept.`
  }

  return `${base} The other choices do not best address the priority cue in the stem.`
}

const buildQuestionPrompt = (point: LearningPoint, index: number) => {
  const topic = point.topic === 'uploaded nursing concept' ? point.sourceTitle : point.topic
  if (point.kind === 'causes') {
    return `A nurse is reviewing ${topic.replace(/\s+causes$/i, '')}. Which statement best explains the cause pattern from the material?`
  }
  if (point.kind === 'lab') {
    return `A nurse is studying ${topic}. Which statement best reflects the nursing interpretation from the material?`
  }
  if (point.kind === 'priority') {
    return `A nurse is reviewing ${topic}. Which point should guide priority follow-up?`
  }
  if (point.kind === 'safety') {
    return `A nurse is planning safe care for ${topic}. Which statement is best supported?`
  }
  if (index % 2 === 0) {
    return `A nurse is reviewing ${topic}. Which statement is best supported by the material?`
  }
  return `Which study statement best matches the material about ${topic}?`
}

const qualityFilterQuestions = (questions: MaterialQuestion[]) =>
  questions.filter((question) => {
    if (hasBrokenGeneratedShape(question.prompt) || question.prompt.length < 40) return false
    if (question.choices.length !== 4) return false
    if (new Set(question.choices.map((choice) => choice.text.toLowerCase())).size !== 4) return false
    if (question.choices.some((choice) => hasBrokenGeneratedShape(choice.text) || choice.text.length < 18)) return false
    if (question.correctAnswer.length !== 1) return false
    if (!question.choices.some((choice) => choice.id === question.correctAnswer[0])) return false
    return question.rationale.length >= 60 && !hasBrokenGeneratedShape(question.rationale)
  })

const inferCategory = (material: StudyMaterial) => {
  const haystack = `${material.displayTitle} ${material.preview}`.toLowerCase()
  const match = categoryKeywords.find(({ keywords }) =>
    keywords.some((keyword) => haystack.includes(keyword)),
  )
  return match?.category
}

export function createStudyMaterialRecord(
  file: File,
  extracted: {
    fileType: StudyMaterialFileType
    fullText: string
    assets: MaterialAsset[]
    preview: string
  },
  materialId: string = createClientId(),
): StudyMaterial {
  const assets = extracted.assets.map((asset) => ({
    ...asset,
    id: createClientId(),
    materialId,
  }))

  const base: StudyMaterial = {
    id: materialId,
    filename: file.name,
    displayTitle: stripExtension(file.name),
    fileType: extracted.fileType,
    importedAt: new Date().toISOString(),
    extractionStatus: 'ready',
    textLength: extracted.fullText.length,
    tags: extracted.assets.slice(0, 3).map((asset) => asset.title).filter(Boolean),
    preview: extracted.preview,
    assets,
    generatedFlashcardIds: [],
    generatedQuestionIds: [],
  }

  return {
    ...base,
    sourceCategory: inferCategory(base) ?? 'General',
  }
}

export function createStudyMaterialRecordFromUrl(
  rawUrl: string,
  extracted: {
    fileType: 'link'
    fullText: string
    assets: MaterialAsset[]
    preview: string
    title: string
    sourceUrl: string
  },
  materialId: string = createClientId(),
): StudyMaterial {
  const source = normalizeStudyUrl(rawUrl)
  const assets = extracted.assets.map((asset) => ({
    ...asset,
    id: createClientId(),
    materialId,
  }))

  const base: StudyMaterial = {
    id: materialId,
    filename: source.hostname,
    displayTitle: extracted.title || titleFromUrl(source),
    fileType: 'link',
    sourceUrl: extracted.sourceUrl,
    importedAt: new Date().toISOString(),
    extractionStatus: 'ready',
    textLength: extracted.fullText.length,
    tags: extracted.assets.slice(0, 3).map((asset) => asset.title).filter(Boolean),
    preview: extracted.preview,
    assets,
    generatedFlashcardIds: [],
    generatedQuestionIds: [],
  }

  return {
    ...base,
    sourceCategory: inferCategory(base) ?? 'General',
  }
}

export function createStudyMaterialRecordFromText(
  extracted: {
    assets: MaterialAsset[]
    fileType: StudyMaterialFileType
    fullText: string
    importMode?: MaterialImportMode
    preview: string
    sourceUrl?: string
    title: string
  },
  materialId: string = createClientId(),
): StudyMaterial {
  const source = extracted.sourceUrl ? normalizeStudyUrl(extracted.sourceUrl) : null
  const assets = extracted.assets.map((asset) => ({
    ...asset,
    id: createClientId(),
    materialId,
  }))

  const base: StudyMaterial = {
    id: materialId,
    filename: source?.hostname ?? 'pasted-study-material.txt',
    displayTitle: extracted.title || source?.hostname || 'Pasted study material',
    fileType: extracted.fileType,
    sourceUrl: source?.toString(),
    importedAt: new Date().toISOString(),
    extractionStatus: 'ready',
    textLength: extracted.fullText.length,
    tags: extracted.assets.slice(0, 3).map((asset) => asset.title).filter(Boolean),
    preview: extracted.preview,
    assets,
    generatedFlashcardIds: [],
    generatedQuestionIds: [],
  }

  return {
    ...base,
    sourceCategory: inferCategory(base) ?? 'General',
  }
}

export function createPendingStudyMaterial(file: File): StudyMaterial {
  const fileType = validateMaterialFile(file)
  return {
    id: createClientId(),
    filename: file.name,
    displayTitle: stripExtension(file.name),
    fileType,
    importedAt: new Date().toISOString(),
    extractionStatus: 'extracting',
    textLength: 0,
    tags: [],
    preview: '',
    assets: [],
    generatedFlashcardIds: [],
    generatedQuestionIds: [],
  }
}

export function createPendingStudyMaterialFromUrl(rawUrl: string): StudyMaterial {
  const source = normalizeStudyUrl(rawUrl)
  return {
    id: createClientId(),
    filename: source.hostname,
    displayTitle: titleFromUrl(source),
    fileType: 'link',
    sourceUrl: source.toString(),
    importedAt: new Date().toISOString(),
    extractionStatus: 'extracting',
    textLength: 0,
    tags: [],
    preview: '',
    assets: [],
    generatedFlashcardIds: [],
    generatedQuestionIds: [],
  }
}

export function createPendingStudyMaterialFromText(input: { sourceUrl?: string; title?: string }): StudyMaterial {
  const source = input.sourceUrl?.trim() ? normalizeStudyUrl(input.sourceUrl) : null
  const displayTitle = input.title?.trim() || (source ? titleFromUrl(source) : 'Pasted study material')

  return {
    id: createClientId(),
    filename: source?.hostname ?? 'pasted-study-material.txt',
    displayTitle,
    fileType: source ? 'link' : 'txt',
    sourceUrl: source?.toString(),
    importedAt: new Date().toISOString(),
    extractionStatus: 'extracting',
    textLength: 0,
    tags: [],
    preview: '',
    assets: [],
    generatedFlashcardIds: [],
    generatedQuestionIds: [],
  }
}

export function createErroredMaterial(material: StudyMaterial, error: string): StudyMaterial {
  return {
    ...material,
    extractionStatus: 'error',
    error,
    generatedFlashcardIds: [],
    generatedQuestionIds: [],
  }
}

export function repairStudyMaterialContent(material: StudyMaterial): StudyMaterial {
  const joinedText =
    material.assets.map((asset) => `${asset.title}\n${asset.content}`).join('\n\n') ||
    material.preview
  const cleaned = cleanExtractedStudyText(joinedText)
  const assets = chunkMaterialContent(cleaned).map((asset) => ({
    ...asset,
    id: createClientId(),
    materialId: material.id,
  }))

  return {
    ...material,
    textLength: cleaned.length,
    preview: cleaned.slice(0, 420),
    tags: assets.slice(0, 3).map((asset) => asset.title).filter(Boolean),
    assets,
    error: undefined,
  }
}

export function materialNeedsRepair(
  material: StudyMaterial,
  flashcards: MaterialFlashcard[] = [],
) {
  return (
    material.assets.some((asset) => asset.title.length > 90 || isLikelyFrontMatter(asset.title)) ||
    material.assets.some((asset) => asset.content.slice(0, 1200).toLowerCase().includes('frontiersin.org')) ||
    (material.extractionStatus === 'ready' && flashcards.filter((card) => card.sourceMaterialId === material.id).length === 0) ||
    flashcards.some(
      (card) =>
        card.sourceMaterialId === material.id &&
        (card.front.length > MAX_CARD_FRONT ||
          isLikelyFrontMatter(card.front) ||
          card.front.toLowerCase().includes('frontiersin.org')),
    )
  )
}

export function generateCleanFlashcardsFromMaterial(material: StudyMaterial): MaterialFlashcard[] {
  let candidates = uniqueByKey(
    extractLearningPoints(material)
      .map((point) =>
        normalizeFlashcardCandidate({
          front: makeFlashcardFront(point),
          back: point.statement,
        }),
      )
      .filter((item): item is { front: string; back: string } => Boolean(item)),
    (item) => `${item.front}-${item.back}`,
  ).slice(0, 12)

  if (!candidates.length) {
    const fallbackText = cleanExtractedStudyText(
      `${material.preview}\n\n${material.assets.map((asset) => asset.content).join('\n\n')}`,
    )
    const fallbackSentences = fallbackText
      .split(/(?<=[.?!])\s+/)
      .map(cleanStudyFragment)
      .filter((sentence) => sentence.length > 40 && !isLikelyFrontMatter(sentence))
      .slice(0, 12)

    candidates = fallbackSentences
      .map((sentence, index) =>
        normalizeFlashcardCandidate({
          front: `What is study point ${index + 1} from this material?`,
          back: sentence,
        }),
      )
      .filter((item): item is { front: string; back: string } => Boolean(item))
  }

  return candidates.map((item) => ({
    id: createClientId(),
    sourceMaterialId: material.id,
    sourceTitle: material.displayTitle,
    front: item.front,
    back: item.back,
    status: 'new',
    createdAt: new Date().toISOString(),
  }))
}

export function generateCleanQuestionsFromMaterial(
  material: StudyMaterial,
  flashcards: MaterialFlashcard[],
): MaterialQuestion[] {
  if (!flashcards.length) return []

  const learningPoints = extractLearningPoints(material)
  const fallbackPoints = flashcards.map((card): LearningPoint => ({
    topic: inferTopicFromText(`${card.front} ${card.back}`, material.displayTitle),
    statement: ensureTerminalPunctuation(card.back),
    sourceTitle: safeHeading(material.displayTitle),
    kind: inferLearningKind(card.front, card.back),
  }))
  const questionPoints = uniqueByKey(
    [...learningPoints, ...fallbackPoints],
    (point) => `${point.topic}-${point.statement}`,
  ).slice(0, 8)

  const questions = questionPoints.map((point, index) => {
    const distractors = uniqueByKey(
      [...questionPoints.filter((item) => item.statement !== point.statement), ...fallbackPoints]
        .map((item) => item.statement)
        .filter((statement) => statement !== point.statement),
      (statement) => statement,
    )
    const correctText = cleanChoiceText(point.statement)
    const choices = buildChoices(correctText, distractors, point)
    const correctChoice = choices.find((choice) => choice.text === correctText)

    return {
      id: createClientId(),
      sourceMaterialId: material.id,
      sourceTitle: material.displayTitle,
      prompt: buildQuestionPrompt(point, index),
      choices,
      correctAnswer: correctChoice ? [correctChoice.id] : ['A'],
      rationale: buildQuestionRationale(point),
      createdAt: new Date().toISOString(),
    }
  })

  return qualityFilterQuestions(questions)
}

export function generateFlashcardsFromMaterial(material: StudyMaterial): MaterialFlashcard[] {
  return generateCleanFlashcardsFromMaterial(material)
}

export function generateQuestionsFromMaterial(
  material: StudyMaterial,
  flashcards: MaterialFlashcard[],
): MaterialQuestion[] {
  return generateCleanQuestionsFromMaterial(material, flashcards)
}

export function generateCleanFlashcardsFromMaterialLegacy(material: StudyMaterial): MaterialFlashcard[] {
  const usableAssets = material.assets.filter(
    (asset) => asset.content.length > 30 && !isLikelyFrontMatter(asset.content),
  )
  const byColonPattern = usableAssets.flatMap((asset) =>
    asset.content
      .split(/\s*[•-]\s*/)
      .map((item) => item.trim())
      .filter((item) => item.includes(':') && item.length < 700)
      .map((item) => {
        const [term, ...rest] = item.split(':')
        return {
          front: `What nursing point is supported by ${safeHeading(term)}?`,
          back: rest.join(':').trim(),
        }
      }),
  )

  const bySectionSummary = usableAssets.map((asset) => ({
    front: `What is a key point about ${safeHeading(asset.title)}?`,
    back: truncate(cleanStudyFragment(asset.content), MAX_CARD_BACK),
  }))

  const byPromptPattern = usableAssets.map((asset) => ({
    front: `What should you remember from ${safeHeading(asset.title)}?`,
    back: truncate(cleanStudyFragment(asset.content), MAX_CARD_BACK),
  }))

  let candidates = uniqueByKey(
    [...byColonPattern, ...bySectionSummary, ...byPromptPattern]
      .map(normalizeFlashcardCandidate)
      .filter((item): item is { front: string; back: string } => Boolean(item)),
    (item) => `${item.front}-${item.back}`,
  ).slice(0, 12)

  if (!candidates.length) {
    const fallbackText = cleanExtractedStudyText(
      `${material.preview}\n\n${material.assets.map((asset) => asset.content).join('\n\n')}`,
    )
    const fallbackSentences = fallbackText
      .split(/(?<=[.?!])\s+/)
      .map(cleanSentence)
      .filter((sentence) => sentence.length > 40 && !isLikelyFrontMatter(sentence))
      .slice(0, 12)

    candidates = fallbackSentences
      .map((sentence, index) =>
        normalizeFlashcardCandidate({
          front: `What is study point ${index + 1} from this material?`,
          back: sentence,
        }),
      )
      .filter((item): item is { front: string; back: string } => Boolean(item))
  }

  return candidates.map((item) => ({
    id: createClientId(),
    sourceMaterialId: material.id,
    sourceTitle: material.displayTitle,
    front: item.front,
    back: item.back,
    status: 'new',
    createdAt: new Date().toISOString(),
  }))
}

export function generateCleanQuestionsFromMaterialLegacy(
  material: StudyMaterial,
  flashcards: MaterialFlashcard[],
): MaterialQuestion[] {
  if (!flashcards.length) return []

  return flashcards.slice(0, 8).map((card, index) => {
    const distractors = flashcards
      .filter((item) => item.id !== card.id)
      .map((item) => truncate(item.back, 220))
      .filter((value, valueIndex, array) => array.indexOf(value) === valueIndex)

    const choices = buildChoices(truncate(card.back, 220), distractors)
    const correctChoice = choices.find((choice) => choice.text === truncate(card.back, 220))

    return {
      id: createClientId(),
      sourceMaterialId: material.id,
      sourceTitle: material.displayTitle,
      prompt:
        index % 2 === 0
          ? `A nurse is reviewing the uploaded material. Which statement is best supported by ${truncate(card.front, 110)}?`
          : `Which statement best completes this study point: ${truncate(card.front, 110)}`,
      choices,
      correctAnswer: correctChoice ? [correctChoice.id] : ['A'],
      rationale: `This question was generated from cleaned study content in "${material.displayTitle}". Review the related flashcard if you want to reinforce the concept.`,
      createdAt: new Date().toISOString(),
    }
  })
}

export function generateFlashcardsFromMaterialLegacy(material: StudyMaterial): MaterialFlashcard[] {
  const byColonPattern = material.assets.flatMap((asset) =>
    asset.content
      .split(/\s*•\s*|\s*-\s*/)
      .map((item) => item.trim())
      .filter((item) => item.includes(':'))
      .map((item) => {
        const [term, ...rest] = item.split(':')
        return {
          front: term.trim(),
          back: rest.join(':').trim(),
        }
      }),
  )

  const bySectionSummary = material.assets.map((asset) => ({
    front: `What is a key point about ${asset.title}?`,
    back: truncate(cleanStudyFragment(asset.content), MAX_CARD_BACK),
  }))

  const byPromptPattern = material.assets
    .filter((asset) => asset.content.length > 30)
    .map((asset) => ({
      front: `What should you remember from ${asset.title}?`,
      back: truncate(cleanStudyFragment(asset.content), MAX_CARD_BACK),
    }))

  const candidates = uniqueByKey(
    [...byColonPattern, ...bySectionSummary, ...byPromptPattern].filter(
      (item) => item.front && item.back && item.front.toLowerCase() !== item.back.toLowerCase(),
    ),
    (item) => `${item.front}-${item.back}`,
  ).slice(0, 12)

  return candidates.map((item) => ({
    id: createClientId(),
    sourceMaterialId: material.id,
    sourceTitle: material.displayTitle,
    front: item.front,
    back: item.back,
    status: 'new',
    createdAt: new Date().toISOString(),
  }))
}

export function generateQuestionsFromMaterialLegacy(
  material: StudyMaterial,
  flashcards: MaterialFlashcard[],
): MaterialQuestion[] {
  if (!flashcards.length) return []

  return flashcards.slice(0, 8).map((card, index) => {
    const distractors = flashcards
      .filter((item) => item.id !== card.id)
      .map((item) => item.back)
      .filter((value, valueIndex, array) => array.indexOf(value) === valueIndex)

    const choices = buildChoices(card.back, distractors)
    const correctChoice = choices.find((choice) => choice.text === card.back)

    return {
      id: createClientId(),
      sourceMaterialId: material.id,
      sourceTitle: material.displayTitle,
      prompt:
        index % 2 === 0
          ? `A nurse is reviewing the uploaded material. Which statement is best supported by ${truncate(card.front, 110)}?`
          : `Which statement best completes this study point: ${card.front}?`,
      choices,
      correctAnswer: correctChoice ? [correctChoice.id] : ['A'],
      rationale: `This question was generated from your uploaded material "${material.displayTitle}". Review the related flashcard if you want to reinforce this point.`,
      createdAt: new Date().toISOString(),
    }
  })
}

import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import { extractRawText } from 'mammoth'
import type {
  AnswerChoice,
  MaterialAsset,
  MaterialFlashcard,
  MaterialQuestion,
  QuestionCategory,
  StudyMaterial,
  StudyMaterialFileType,
} from '../app/types'
import { hasCodeLikeStudyArtifact } from './material-quality'

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
  const normalized = rawText
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

const isCodeLikeStudyUrl = (url: URL) =>
  codeSourceHostPattern.test(url.hostname) || codeSourcePathPattern.test(url.pathname)

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
    assets: chunkMaterialContent(cleaned),
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

  let response: Response
  try {
    response = await fetch(source.toString(), {
      headers: {
        Accept: 'text/html,text/plain,text/markdown,application/xhtml+xml;q=0.9,*/*;q=0.5',
      },
    })
  } catch {
    throw new Error(
      'We could not read this link from the browser. If the site blocks imports, upload the PDF/DOCX/TXT file instead.',
    )
  }

  if (!response.ok) {
    throw new Error(`This link could not be imported. The site returned ${response.status}.`)
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const rawText = await response.text()
  const parsed =
    contentType.includes('html') || /^\s*</.test(rawText)
      ? htmlToStudyText(rawText)
      : {
          title: undefined,
          text: rawText
            .replace(/\r/g, '')
            .replace(/\t/g, ' ')
            .replace(/\s+\n/g, '\n')
            .trim(),
        }

  if (!parsed.text || parsed.text.length < 80) {
    throw new Error('We could not find enough readable study text at this link.')
  }

  const cleaned = cleanExtractedStudyText(parsed.text)
  if (!cleaned) {
    throw new Error('We could not find enough readable study text at this link.')
  }
  validateStudyMaterialContent(cleaned, parsed.title || titleFromUrl(source), true)

  return {
    fileType: 'link' as const,
    fullText: cleaned,
    assets: chunkMaterialContent(cleaned),
    preview: cleaned.slice(0, 420),
    title: parsed.title || titleFromUrl(source),
    sourceUrl: source.toString(),
  }
}

export function chunkMaterialContent(materialText: string) {
  const paragraphs = splitParagraphs(cleanExtractedStudyText(materialText))
  const assets: MaterialAsset[] = []
  let currentHeading = 'Overview'
  let order = 0

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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      materialId: '',
      title: 'Overview',
      content: sentences.slice(0, 6).join(' ') || cleanExtractedStudyText(materialText),
      order: 0,
    })
  }

  return assets.slice(0, 20)
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
  { pattern: /\bmedication\b|\bdrug\b|\bdose\b|\btoxicity\b|\bcontraindication\b/i, label: 'medication safety', kind: 'medication' },
  { pattern: /\bfluid\b|\belectrolyte\b|\bdehydration\b|\bedema\b/i, label: 'fluid and electrolyte balance', kind: 'lab' },
]

const fallbackDistractors = [
  'The nurse should treat the cue as stable without completing a focused assessment.',
  'The nurse should delay clinical judgment until an unrelated finding appears.',
  'The priority is to document the topic label before interpreting the client cue.',
  'The safest response is to choose an intervention unrelated to the current finding.',
]

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

const buildChoices = (correct: string, distractors: string[]): AnswerChoice[] => {
  const correctText = cleanChoiceText(correct)
  const options = uniqueByKey(
    [correctText, ...distractors.map(cleanChoiceText), ...fallbackDistractors.map(cleanChoiceText)].filter(
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
  materialId: string = crypto.randomUUID(),
): StudyMaterial {
  const assets = extracted.assets.map((asset) => ({
    ...asset,
    id: crypto.randomUUID(),
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
  materialId: string = crypto.randomUUID(),
): StudyMaterial {
  const source = normalizeStudyUrl(rawUrl)
  const assets = extracted.assets.map((asset) => ({
    ...asset,
    id: crypto.randomUUID(),
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

export function createPendingStudyMaterial(file: File): StudyMaterial {
  const fileType = validateMaterialFile(file)
  return {
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
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
    const choices = buildChoices(correctText, distractors)
    const correctChoice = choices.find((choice) => choice.text === correctText)

    return {
      id: crypto.randomUUID(),
      sourceMaterialId: material.id,
      sourceTitle: material.displayTitle,
      prompt: buildQuestionPrompt(point, index),
      choices,
      correctAnswer: correctChoice ? [correctChoice.id] : ['A'],
      rationale: `The correct answer matches the reviewed material: ${point.statement} The other options are either unsupported by this material or describe a different study point.`,
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
    id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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

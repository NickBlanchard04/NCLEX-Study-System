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

const truncate = (value: string, max = MAX_CARD_BACK) => {
  const cleaned = cleanSentence(value)
  if (cleaned.length <= max) return cleaned
  const clipped = cleaned.slice(0, max).replace(/\s+\S*$/, '')
  return `${clipped}...`
}

const isLikelyFrontMatter = (paragraph: string) => {
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

  const bodyStartMatch = normalized.match(
    /\b(abstract|background|objective|objectives|purpose|introduction)\b[:\s]/i,
  )
  const bodyStart = bodyStartMatch?.index ?? -1
  const bodyEndMatch = normalized.match(
    /\b(references|acknowledg(e)?ments|supplementary material|author contributions|conflict of interest)\b[:\s]/i,
  )
  const bodyEnd = bodyEndMatch?.index ?? -1
  const scopedText = normalized
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
    if (isLikelyFrontMatter(paragraph)) return
    const headingLike =
      paragraph.length <= 70 &&
      paragraph.split(' ').length <= 8 &&
      !paragraph.includes('.') &&
      !paragraph.includes(':')

    if (headingLike) {
      currentHeading = truncate(paragraph, 48).replace(/\.+$/, '')
      return
    }

    assets.push({
      id: crypto.randomUUID(),
      materialId: '',
      title: currentHeading,
      content: paragraph,
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

const toSentence = (content: string) => {
  const sentence =
    content
      .split(/(?<=[.?!])\s+/)
      .map(cleanSentence)
      .find((item) => item.length > 35 && !isLikelyFrontMatter(item)) ?? content
  return truncate(sentence, MAX_CARD_BACK)
}

const safeHeading = (heading: string) => {
  const cleaned = truncate(heading, 56)
  if (!cleaned || cleaned === 'Overview') return 'this study material'
  if (isLikelyFrontMatter(cleaned)) return 'this study material'
  return cleaned
}

const normalizeFlashcardCandidate = (item: { front: string; back: string }) => {
  const front = truncate(item.front, MAX_CARD_FRONT)
  const back = truncate(item.back, MAX_CARD_BACK)
  if (front.length < 8 || back.length < 16) return null
  if (front.toLowerCase() === back.toLowerCase()) return null
  if (isLikelyFrontMatter(front) || isLikelyFrontMatter(back)) return null
  return { front, back }
}

const uniqueByKey = <T,>(items: T[], getKey: (item: T) => string) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const buildChoices = (correct: string, distractors: string[]): AnswerChoice[] => {
  const shuffled = [correct, ...distractors.slice(0, 3)]
    .sort(() => Math.random() - 0.5)
    .map((text, index) => ({
      id: String.fromCharCode(65 + index),
      text,
    }))
  return shuffled
}

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
          front: `What should you know about ${term.trim()}?`,
          back: rest.join(':').trim(),
        }
      }),
  )

  const bySectionSummary = usableAssets.map((asset) => ({
    front: `What is a key point about ${safeHeading(asset.title)}?`,
    back: toSentence(asset.content),
  }))

  const byPromptPattern = usableAssets.map((asset) => ({
    front: `What should you remember from ${safeHeading(asset.title)}?`,
    back: toSentence(asset.content),
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

export function generateCleanQuestionsFromMaterial(
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
          ? `Based on your material, which answer best matches this point: ${truncate(card.front, 110)}`
          : `Which statement best completes this study point: ${truncate(card.front, 110)}`,
      choices,
      correctAnswer: correctChoice ? [correctChoice.id] : ['A'],
      rationale: `This question was generated from cleaned study content in "${material.displayTitle}". Review the related flashcard if you want to reinforce the concept.`,
      createdAt: new Date().toISOString(),
    }
  })
}

export function generateFlashcardsFromMaterial(material: StudyMaterial): MaterialFlashcard[] {
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
    back: toSentence(asset.content),
  }))

  const byPromptPattern = material.assets
    .filter((asset) => asset.content.length > 30)
    .map((asset) => ({
      front: `What should you remember from ${asset.title}?`,
      back: toSentence(asset.content),
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

export function generateQuestionsFromMaterial(
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
          ? `Based on your material, which answer best matches: ${card.front}?`
          : `Which statement best completes this study point: ${card.front}?`,
      choices,
      correctAnswer: correctChoice ? [correctChoice.id] : ['A'],
      rationale: `This question was generated from your uploaded material "${material.displayTitle}". Review the related flashcard if you want to reinforce this point.`,
      createdAt: new Date().toISOString(),
    }
  })
}

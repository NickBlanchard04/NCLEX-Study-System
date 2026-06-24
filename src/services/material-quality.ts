import type { MaterialFlashcard, MaterialQuestion } from '../app/types'

export type MaterialQualitySeverity = 'blocker' | 'warning'

export interface MaterialQualityIssue {
  code: string
  field?: string
  itemId: string
  itemLabel: string
  itemType: 'flashcard' | 'question'
  message: string
  severity: MaterialQualitySeverity
}

export interface MaterialQualitySummary {
  blockerCount: number
  flashcards: MaterialFlashcard[]
  issues: MaterialQualityIssue[]
  issuesByItemId: Record<string, MaterialQualityIssue[]>
  questions: MaterialQuestion[]
  warningCount: number
}

const sourceArtifactPattern =
  /\b(?:https?:\/\/|www\.|doi\b|pmid\b|issn\b|copyright|all rights reserved|nursingcenter\.com|frontiersin\.org)\b/i
const genericFragmentPattern =
  /\b(?:what should you know about (?:result|results|value|source)|best matches this point|uploaded nursing concept|this study material|june\s+\d{4})\b/i

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()

const makeIssue = (
  item: MaterialFlashcard | MaterialQuestion,
  itemType: MaterialQualityIssue['itemType'],
  itemLabel: string,
  issue: Omit<MaterialQualityIssue, 'itemId' | 'itemType' | 'itemLabel'>,
): MaterialQualityIssue => ({
  ...issue,
  itemId: item.id,
  itemLabel,
  itemType,
})

const hasSourceArtifact = (value: string) => sourceArtifactPattern.test(value)

const hasBrokenFragment = (value: string) => genericFragmentPattern.test(value)

const isLikelyNclexStem = (prompt: string) =>
  /\b(?:nurse|client|patient|priority|most appropriate|best|which statement|which point)\b/i.test(prompt)

const groupByItemId = (issues: MaterialQualityIssue[]) =>
  issues.reduce<Record<string, MaterialQualityIssue[]>>((groups, issue) => {
    groups[issue.itemId] = [...(groups[issue.itemId] ?? []), issue]
    return groups
  }, {})

export function inspectMaterialFlashcard(
  card: MaterialFlashcard,
  index = 0,
): MaterialQualityIssue[] {
  const itemLabel = `Card ${index + 1}`
  const front = clean(card.front)
  const back = clean(card.back)
  const issues: MaterialQualityIssue[] = []

  if (!front) {
    issues.push(
      makeIssue(card, 'flashcard', itemLabel, {
        code: 'flashcard_front_missing',
        field: 'front',
        message: 'Add a clear front prompt.',
        severity: 'blocker',
      }),
    )
  } else if (front.length < 12) {
    issues.push(
      makeIssue(card, 'flashcard', itemLabel, {
        code: 'flashcard_front_short',
        field: 'front',
        message: 'Make the front specific enough to study from.',
        severity: 'warning',
      }),
    )
  }

  if (!back) {
    issues.push(
      makeIssue(card, 'flashcard', itemLabel, {
        code: 'flashcard_back_missing',
        field: 'back',
        message: 'Add the learning point on the back.',
        severity: 'blocker',
      }),
    )
  }

  if (front.toLowerCase() === back.toLowerCase() && front) {
    issues.push(
      makeIssue(card, 'flashcard', itemLabel, {
        code: 'flashcard_front_back_duplicate',
        message: 'Front and back should not be the same text.',
        severity: 'blocker',
      }),
    )
  }

  if (front.length > 160) {
    issues.push(
      makeIssue(card, 'flashcard', itemLabel, {
        code: 'flashcard_front_long',
        field: 'front',
        message: 'Shorten the front so it reads like a study prompt.',
        severity: 'warning',
      }),
    )
  }

  if (back.length > 520) {
    issues.push(
      makeIssue(card, 'flashcard', itemLabel, {
        code: 'flashcard_back_long',
        field: 'back',
        message: 'Trim the back to one focused learning point.',
        severity: 'warning',
      }),
    )
  }

  if (hasSourceArtifact(`${front} ${back}`) || hasBrokenFragment(`${front} ${back}`)) {
    issues.push(
      makeIssue(card, 'flashcard', itemLabel, {
        code: 'flashcard_source_noise',
        message: 'Remove copied source metadata or raw extraction fragments.',
        severity: 'blocker',
      }),
    )
  }

  return issues
}

export function inspectMaterialQuestion(
  question: MaterialQuestion,
  index = 0,
): MaterialQualityIssue[] {
  const itemLabel = `Question ${index + 1}`
  const prompt = clean(question.prompt)
  const rationale = clean(question.rationale)
  const choiceTexts = question.choices.map((choice) => clean(choice.text))
  const uniqueChoiceTexts = new Set(choiceTexts.map((choice) => choice.toLowerCase()))
  const issues: MaterialQualityIssue[] = []

  if (!prompt) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_prompt_missing',
        field: 'prompt',
        message: 'Add a clear question stem.',
        severity: 'blocker',
      }),
    )
  } else if (!isLikelyNclexStem(prompt)) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_prompt_style',
        field: 'prompt',
        message: 'Rewrite the stem so it reads like a nursing judgment question.',
        severity: 'warning',
      }),
    )
  }

  if (prompt.length > 300) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_prompt_long',
        field: 'prompt',
        message: 'Shorten the stem and keep details in the choices or rationale.',
        severity: 'warning',
      }),
    )
  }

  if (question.choices.length !== 4) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_choice_count',
        field: 'choices',
        message: 'Use exactly four answer choices.',
        severity: 'blocker',
      }),
    )
  }

  if (uniqueChoiceTexts.size !== choiceTexts.length) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_duplicate_choices',
        field: 'choices',
        message: 'Each answer choice should be unique.',
        severity: 'blocker',
      }),
    )
  }

  if (choiceTexts.some((choice) => !choice)) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_blank_choice',
        field: 'choices',
        message: 'Fill in every answer choice.',
        severity: 'blocker',
      }),
    )
  }

  if (choiceTexts.some((choice) => choice.length > 210)) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_choice_long',
        field: 'choices',
        message: 'Trim oversized answer choices so they are easy to compare.',
        severity: 'warning',
      }),
    )
  }

  if (
    question.correctAnswer.length !== 1 ||
    !question.choices.some((choice) => choice.id === question.correctAnswer[0])
  ) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_correct_answer_missing',
        field: 'correctAnswer',
        message: 'Select one correct answer.',
        severity: 'blocker',
      }),
    )
  }

  if (rationale.length < 45) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_rationale_short',
        field: 'rationale',
        message: 'Add a rationale that explains why the answer is supported.',
        severity: 'blocker',
      }),
    )
  }

  if (
    hasSourceArtifact(`${prompt} ${choiceTexts.join(' ')} ${rationale}`) ||
    hasBrokenFragment(`${prompt} ${choiceTexts.join(' ')} ${rationale}`)
  ) {
    issues.push(
      makeIssue(question, 'question', itemLabel, {
        code: 'question_source_noise',
        message: 'Remove copied source metadata or raw extraction fragments.',
        severity: 'blocker',
      }),
    )
  }

  return issues
}

export function summarizeMaterialQuality(
  flashcards: MaterialFlashcard[],
  questions: MaterialQuestion[],
): MaterialQualitySummary {
  const issues = [
    ...flashcards.flatMap((card, index) => inspectMaterialFlashcard(card, index)),
    ...questions.flatMap((question, index) => inspectMaterialQuestion(question, index)),
  ]
  const cardFronts = new Map<string, MaterialFlashcard[]>()
  const questionPrompts = new Map<string, MaterialQuestion[]>()

  flashcards.forEach((card) => {
    const key = clean(card.front).toLowerCase()
    if (!key) return
    cardFronts.set(key, [...(cardFronts.get(key) ?? []), card])
  })

  questions.forEach((question) => {
    const key = clean(question.prompt).toLowerCase()
    if (!key) return
    questionPrompts.set(key, [...(questionPrompts.get(key) ?? []), question])
  })

  cardFronts.forEach((items) => {
    if (items.length < 2) return
    items.forEach((card) => {
      issues.push(
        makeIssue(card, 'flashcard', 'Duplicate card', {
          code: 'flashcard_duplicate_prompt',
          field: 'front',
          message: 'This duplicates another proposed card.',
          severity: 'blocker',
        }),
      )
    })
  })

  questionPrompts.forEach((items) => {
    if (items.length < 2) return
    items.forEach((question) => {
      issues.push(
        makeIssue(question, 'question', 'Duplicate question', {
          code: 'question_duplicate_prompt',
          field: 'prompt',
          message: 'This duplicates another proposed question.',
          severity: 'blocker',
        }),
      )
    })
  })

  return {
    blockerCount: issues.filter((issue) => issue.severity === 'blocker').length,
    flashcards,
    issues,
    issuesByItemId: groupByItemId(issues),
    questions,
    warningCount: issues.filter((issue) => issue.severity === 'warning').length,
  }
}

export function filterMaterialStudyTools(
  flashcards: MaterialFlashcard[],
  questions: MaterialQuestion[],
) {
  const summary = summarizeMaterialQuality(flashcards, questions)
  const blockedItemIds = new Set(
    summary.issues
      .filter((issue) => issue.severity === 'blocker')
      .map((issue) => issue.itemId),
  )

  return {
    flashcards: flashcards.filter((card) => !blockedItemIds.has(card.id)),
    questions: questions.filter((question) => !blockedItemIds.has(question.id)),
    summary,
  }
}

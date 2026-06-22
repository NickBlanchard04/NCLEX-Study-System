import type { QuestionEngineItem, ScoreResult } from './types'

const normalizeSet = (values: string[]) => [...new Set(values)].sort()

const setsMatch = (left: string[], right: string[]) => {
  const normalizedLeft = normalizeSet(left)
  const normalizedRight = normalizeSet(right)
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  )
}

export function scoreAttempt(
  item: QuestionEngineItem,
  selectedAnswer: string[],
): ScoreResult {
  const selected = normalizeSet(selectedAnswer)
  const correct = normalizeSet(item.correctAnswer)
  const selectedDistractorIds = selected.filter((answerId) => !correct.includes(answerId))
  const exactMatch = setsMatch(selected, correct)

  if (item.scoringMethod === 'binary' || item.scoringMethod === 'all_or_nothing') {
    const rawScore = exactMatch ? 1 : 0
    return {
      rawScore,
      maxScore: 1,
      partialCreditScore: rawScore,
      isCorrect: exactMatch,
      selectedDistractorIds,
      scoringMethod: item.scoringMethod,
      confidenceEscalated: false,
    }
  }

  if (item.scoringMethod === 'partial_credit' || item.scoringMethod === 'matrix_partial') {
    const correctSelections = selected.filter((answerId) => correct.includes(answerId)).length
    const unsafeExtras = selectedDistractorIds.length
    const rawScore = Math.max(0, correctSelections - unsafeExtras)
    const maxScore = Math.max(correct.length, 1)
    const partialCreditScore = rawScore / maxScore

    return {
      rawScore,
      maxScore,
      partialCreditScore,
      isCorrect: partialCreditScore >= 0.999,
      selectedDistractorIds,
      scoringMethod: item.scoringMethod,
      confidenceEscalated: false,
    }
  }

  if (item.scoringMethod === 'highlight_partial' || item.scoringMethod === 'ordered_partial') {
    const rawScore = selected.reduce(
      (score, answerId, index) => score + (correct[index] === answerId ? 1 : 0),
      0,
    )
    const maxScore = Math.max(correct.length, 1)
    const partialCreditScore = rawScore / maxScore

    return {
      rawScore,
      maxScore,
      partialCreditScore,
      isCorrect: partialCreditScore >= 0.999,
      selectedDistractorIds,
      scoringMethod: item.scoringMethod,
      confidenceEscalated: false,
    }
  }

  return {
    rawScore: 0,
    maxScore: 0,
    partialCreditScore: 0,
    isCorrect: false,
    selectedDistractorIds,
    scoringMethod: item.scoringMethod,
    confidenceEscalated: false,
  }
}

export function calculateCalibrationScore(
  scoreResult: ScoreResult,
  confidence: 'low' | 'medium' | 'high',
) {
  if (scoreResult.maxScore <= 1) {
    if (scoreResult.isCorrect && confidence === 'high') return 1
    if (scoreResult.isCorrect && confidence === 'medium') return 0.6
    if (scoreResult.isCorrect && confidence === 'low') return 0.2
    if (!scoreResult.isCorrect && confidence === 'low') return -0.2
    if (!scoreResult.isCorrect && confidence === 'medium') return -0.6
    return -1
  }

  if (scoreResult.partialCreditScore >= 0.85) {
    if (confidence === 'high') return 1
    if (confidence === 'medium') return 0.6
    return 0.2
  }

  if (scoreResult.partialCreditScore >= 0.5) {
    if (confidence === 'high') return -0.3
    if (confidence === 'medium') return 0.2
    return 0.1
  }

  if (confidence === 'high') return -1
  if (confidence === 'medium') return -0.6
  return -0.2
}

export function withConfidenceEscalation(
  scoreResult: ScoreResult,
  confidence: 'low' | 'medium' | 'high',
): ScoreResult {
  return {
    ...scoreResult,
    confidenceEscalated:
      confidence === 'high' &&
      (!scoreResult.isCorrect || scoreResult.partialCreditScore < 0.5),
  }
}

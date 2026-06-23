import type {
  AttemptDiagnosis,
  CalibrationTrend,
  DiagnosisEvidenceLevel,
  EvidenceScope,
  ExposureLevel,
  LearnerMasteryVector,
  MasteryDimensionStats,
  ReadinessExclusionReason,
  RemediationEvent,
} from './types'

interface MutableDimension {
  dimensionType: string
  dimensionId: string
  attemptCount: number
  practiceAttemptCount: number
  trustedAttemptCount: number
  readinessAttemptCount: number
  correctCount: number
  readinessCorrectCount: number
  scoreTotal: number
  maxScoreTotal: number
  calibrationTotal: number
  calibrationScores: number[]
  highConfidenceMissCount: number
  lowConfidenceCorrectCount: number
  confidenceMismatchCount: number
  remediationAssignedCount: number
  remediationRepairedCount: number
  activeRepairCount: number
  unresolvedHighSeverityCount: number
  practiceSignalCount: number
  trustedSignalCount: number
  untrustedSignalCount: number
  activeExclusionReasons: Set<ReadinessExclusionReason>
  evidenceLevels: DiagnosisEvidenceLevel[]
  firstAttemptAt: string | null
  latestAttemptAt: string | null
  latestTrustedAttemptAt: string | null
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const dimensionKey = (dimensionType: string, dimensionId: string) => `${dimensionType}:${dimensionId}`

const getMutableDimension = (
  dimensions: Map<string, MutableDimension>,
  dimensionType: string,
  dimensionId: string,
) => {
  const key = dimensionKey(dimensionType, dimensionId)
  const existing = dimensions.get(key)
  if (existing) return existing

  const created: MutableDimension = {
    dimensionType,
    dimensionId,
    attemptCount: 0,
    practiceAttemptCount: 0,
    trustedAttemptCount: 0,
    readinessAttemptCount: 0,
    correctCount: 0,
    readinessCorrectCount: 0,
    scoreTotal: 0,
    maxScoreTotal: 0,
    calibrationTotal: 0,
    calibrationScores: [],
    highConfidenceMissCount: 0,
    lowConfidenceCorrectCount: 0,
    confidenceMismatchCount: 0,
    remediationAssignedCount: 0,
    remediationRepairedCount: 0,
    activeRepairCount: 0,
    unresolvedHighSeverityCount: 0,
    practiceSignalCount: 0,
    trustedSignalCount: 0,
    untrustedSignalCount: 0,
    activeExclusionReasons: new Set(),
    evidenceLevels: [],
    firstAttemptAt: null,
    latestAttemptAt: null,
    latestTrustedAttemptAt: null,
  }
  dimensions.set(key, created)
  return created
}

const getDimensionPairs = (diagnosis: AttemptDiagnosis) => {
  if (diagnosis.weakAreaDimensions?.length) {
    return diagnosis.weakAreaDimensions.map((dimension) => [
      dimension.dimensionType,
      dimension.dimensionId,
    ])
  }

  const fallbackPairs = [
    ['client_need', diagnosis.clientNeed],
    ['subcategory', diagnosis.subcategory],
    ['clinical_judgment_step', diagnosis.clinicalJudgmentStep],
    ['item_type', diagnosis.itemType],
  ]

  return diagnosis.misconceptionFamily === 'unknown'
    ? fallbackPairs
    : [...fallbackPairs, ['misconception_family', diagnosis.misconceptionFamily]]
}

const getEvidenceScope = (dimension: MutableDimension): EvidenceScope => {
  if (dimension.trustedAttemptCount > 0 && dimension.untrustedSignalCount > 0) {
    return 'mixed_separated'
  }
  if (dimension.trustedAttemptCount > 0) return 'readiness_eligible'
  return 'practice_only'
}

const getCalibrationTrend = (scores: number[]): CalibrationTrend => {
  if (scores.length < 3) return 'insufficient_data'

  const midpoint = Math.floor(scores.length / 2)
  const earlier = scores.slice(0, midpoint)
  const recent = scores.slice(midpoint)
  const average = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
  const delta = average(recent) - average(earlier)

  if (delta >= 0.25) return 'improving'
  if (delta <= -0.25) return 'declining'
  return 'stable'
}

const getExposureLevel = (attemptCount: number): ExposureLevel => {
  if (attemptCount < 3) return 'low'
  if (attemptCount < 6) return 'moderate'
  return 'sufficient'
}

const evidenceRank: Record<DiagnosisEvidenceLevel, number> = {
  insufficient_evidence: 0,
  attempt_signal: 1,
  practice_hypothesis: 2,
  practice_confirmed: 3,
  confirmed_practice_weak_area: 3,
  readiness_supported: 4,
}

const getDimensionEvidenceLevel = (dimension: MutableDimension): DiagnosisEvidenceLevel => {
  if (dimension.trustedSignalCount > 0 && dimension.activeRepairCount === 0) {
    return 'readiness_supported'
  }
  if (dimension.practiceSignalCount >= 3 || dimension.highConfidenceMissCount >= 2) {
    return 'practice_confirmed'
  }
  if (dimension.practiceSignalCount >= 2 || dimension.highConfidenceMissCount >= 1) {
    return 'practice_hypothesis'
  }

  const strongest = dimension.evidenceLevels.toSorted(
    (left, right) => evidenceRank[right] - evidenceRank[left],
  )[0]

  return strongest ?? 'insufficient_evidence'
}

const finalizeDimension = (dimension: MutableDimension): MasteryDimensionStats => {
  const avgScore = dimension.maxScoreTotal ? dimension.scoreTotal / dimension.maxScoreTotal : 0
  const accuracy = dimension.attemptCount ? dimension.correctCount / dimension.attemptCount : 0
  const readinessAccuracy = dimension.readinessAttemptCount
    ? dimension.readinessCorrectCount / dimension.readinessAttemptCount
    : 0
  const avgCalibrationScore = dimension.attemptCount
    ? dimension.calibrationTotal / dimension.attemptCount
    : 0
  const confidenceMismatchScore = dimension.attemptCount
    ? (dimension.highConfidenceMissCount * 1.25 +
      dimension.lowConfidenceCorrectCount * 0.85 +
      Math.max(0, dimension.confidenceMismatchCount - dimension.highConfidenceMissCount - dimension.lowConfidenceCorrectCount) * 0.65) /
      dimension.attemptCount
    : 0.5
  const performanceComponent = avgScore || accuracy
  const calibrationComponent = clamp01((avgCalibrationScore + 1) / 2)
  const remediationRepairComponent = dimension.remediationAssignedCount
    ? dimension.remediationRepairedCount / dimension.remediationAssignedCount
    : 0.5
  const recencyComponent = dimension.latestTrustedAttemptAt ? 1 : dimension.latestAttemptAt ? 0.7 : 0
  const evidenceLevel = getDimensionEvidenceLevel(dimension)
  const exposureLevel = getExposureLevel(dimension.attemptCount)
  const activeExclusionReasons = Array.from(dimension.activeExclusionReasons).sort()
  const activeRepairComponent = dimension.activeRepairCount ? 1 : 0
  const safetyRiskComponent = clamp01(dimension.unresolvedHighSeverityCount / Math.max(1, dimension.attemptCount))
  const masteryScore =
    performanceComponent * 0.4 +
    calibrationComponent * 0.25 +
    remediationRepairComponent * 0.2 +
    recencyComponent * 0.15
  const weaknessScore =
    (1 - masteryScore) * 0.5 +
    safetyRiskComponent * 0.2 +
    confidenceMismatchScore * 0.2 +
    activeRepairComponent * 0.1
  const selectionWeight = clamp01(
    weaknessScore +
    activeRepairComponent * 0.2 +
    safetyRiskComponent * 0.2 +
    (exposureLevel === 'low' ? 0.1 : 0),
  )
  const readinessWeight = dimension.trustedAttemptCount
    ? clamp01(masteryScore * 0.7 + (activeExclusionReasons.length ? 0 : 0.3) - activeRepairComponent * 0.4)
    : 0
  const masteryLevel =
    exposureLevel === 'low' ||
    avgScore < 0.6 ||
    confidenceMismatchScore > 0.45 ||
    dimension.unresolvedHighSeverityCount > 0 ||
    dimension.activeRepairCount > 0
      ? 'fragile'
      : avgScore >= 0.8 && confidenceMismatchScore <= 0.25
        ? 'strong'
        : 'developing'

  return {
    dimensionType: dimension.dimensionType,
    dimensionId: dimension.dimensionId,
    evidenceScope: getEvidenceScope(dimension),
    attemptCount: dimension.attemptCount,
    practiceAttemptCount: dimension.practiceAttemptCount,
    trustedAttemptCount: dimension.trustedAttemptCount,
    readinessAttemptCount: dimension.readinessAttemptCount,
    scoreTotal: dimension.scoreTotal,
    maxScoreTotal: dimension.maxScoreTotal,
    avgScore,
    accuracy,
    readinessAccuracy,
    avgCalibrationScore,
    calibrationTrend: getCalibrationTrend(dimension.calibrationScores),
    highConfidenceMissCount: dimension.highConfidenceMissCount,
    lowConfidenceCorrectCount: dimension.lowConfidenceCorrectCount,
    confidenceMismatchScore,
    remediationAssignedCount: dimension.remediationAssignedCount,
    remediationRepairedCount: dimension.remediationRepairedCount,
    activeRepairCount: dimension.activeRepairCount,
    unresolvedHighSeverityCount: dimension.unresolvedHighSeverityCount,
    practiceSignalCount: dimension.practiceSignalCount,
    trustedSignalCount: dimension.trustedSignalCount,
    untrustedSignalCount: dimension.untrustedSignalCount,
    recurrenceCount: Math.max(0, dimension.practiceSignalCount + dimension.trustedSignalCount - 1),
    exposureLevel,
    evidenceLevel,
    selectionWeight,
    readinessWeight,
    activeExclusionReasons,
    masteryScore,
    weaknessScore,
    masteryLevel,
    firstAttemptAt: dimension.firstAttemptAt,
    latestAttemptAt: dimension.latestAttemptAt,
    latestTrustedAttemptAt: dimension.latestTrustedAttemptAt,
  }
}

export function buildLearnerMasteryVector(
  diagnoses: AttemptDiagnosis[],
  remediationEvents: RemediationEvent[] = [],
): LearnerMasteryVector {
  const dimensions = new Map<string, MutableDimension>()
  const remediationByDiagnosis = new Map(remediationEvents.map((event) => [event.diagnosisId, event]))

  for (const diagnosis of diagnoses) {
    for (const [dimensionType, dimensionId] of getDimensionPairs(diagnosis)) {
      const dimension = getMutableDimension(dimensions, dimensionType, dimensionId)
      const remediation = remediationByDiagnosis.get(diagnosis.id)
      dimension.attemptCount += 1
      dimension.practiceAttemptCount += diagnosis.countsTowardReadiness ? 0 : 1
      dimension.trustedAttemptCount += diagnosis.countsTowardReadiness ? 1 : 0
      dimension.correctCount += diagnosis.scoreResult.isCorrect ? 1 : 0
      dimension.readinessAttemptCount += diagnosis.countsTowardReadiness ? 1 : 0
      dimension.readinessCorrectCount += diagnosis.countsTowardReadiness && diagnosis.scoreResult.isCorrect ? 1 : 0
      dimension.scoreTotal += diagnosis.scoreResult.rawScore
      dimension.maxScoreTotal += diagnosis.scoreResult.maxScore
      dimension.calibrationTotal += diagnosis.calibrationScore
      dimension.calibrationScores.push(diagnosis.calibrationScore)
      dimension.highConfidenceMissCount += diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect ? 1 : 0
      dimension.lowConfidenceCorrectCount += diagnosis.confidenceSignal === 'fragile_correct' ? 1 : 0
      dimension.confidenceMismatchCount += diagnosis.confidenceMismatch ? 1 : 0
      dimension.remediationAssignedCount += remediation ? 1 : 0
      dimension.remediationRepairedCount += remediation?.repairSuccess ? 1 : 0
      dimension.activeRepairCount += remediation && !remediation.repairSuccess ? 1 : 0
      dimension.unresolvedHighSeverityCount +=
        !diagnosis.scoreResult.isCorrect &&
        diagnosis.confidenceEscalated &&
        (diagnosis.safetySeverity === 'high' || diagnosis.safetySeverity === 'critical') &&
        !remediation?.repairSuccess
          ? 1
          : 0
      dimension.practiceSignalCount += diagnosis.countsTowardReadiness ? 0 : 1
      dimension.trustedSignalCount += diagnosis.countsTowardReadiness ? 1 : 0
      dimension.untrustedSignalCount += diagnosis.countsTowardReadiness ? 0 : 1
      dimension.evidenceLevels.push(diagnosis.evidenceLevel)
      for (const reason of diagnosis.readinessExclusionReasons) {
        dimension.activeExclusionReasons.add(reason)
      }
      dimension.firstAttemptAt =
        !dimension.firstAttemptAt || diagnosis.createdAt < dimension.firstAttemptAt
          ? diagnosis.createdAt
          : dimension.firstAttemptAt
      dimension.latestAttemptAt =
        !dimension.latestAttemptAt || diagnosis.createdAt > dimension.latestAttemptAt
          ? diagnosis.createdAt
          : dimension.latestAttemptAt
      dimension.latestTrustedAttemptAt =
        diagnosis.countsTowardReadiness &&
        (!dimension.latestTrustedAttemptAt || diagnosis.createdAt > dimension.latestTrustedAttemptAt)
          ? diagnosis.createdAt
          : dimension.latestTrustedAttemptAt
    }
  }

  const finalized = Array.from(dimensions.values()).map(finalizeDimension)
  const byKey = Object.fromEntries(
    finalized.map((dimension) => [dimensionKey(dimension.dimensionType, dimension.dimensionId), dimension]),
  )
  const weakest = finalized.toSorted((left, right) => right.weaknessScore - left.weaknessScore)[0]
  const strongest = finalized.toSorted((left, right) => right.masteryScore - left.masteryScore)[0]
  const activeExclusionReasons = Array.from(
    new Set(finalized.flatMap((dimension) => dimension.activeExclusionReasons)),
  ).sort()
  const recurringWeakAreaDimensionIds = finalized
    .filter((dimension) => dimension.evidenceLevel === 'practice_confirmed' || dimension.recurrenceCount >= 2)
    .map((dimension) => dimensionKey(dimension.dimensionType, dimension.dimensionId))
    .sort()
  const lowExposureDimensionIds = finalized
    .filter((dimension) => dimension.exposureLevel === 'low')
    .map((dimension) => dimensionKey(dimension.dimensionType, dimension.dimensionId))
    .sort()
  const latestAttemptAt = diagnoses
    .map((diagnosis) => diagnosis.createdAt)
    .sort()
    .at(-1)

  return {
    dimensions: byKey,
    summary: {
      attemptCount: diagnoses.length,
      practiceAttemptCount: diagnoses.filter((diagnosis) => !diagnosis.countsTowardReadiness).length,
      trustedAttemptCount: diagnoses.filter((diagnosis) => diagnosis.countsTowardReadiness).length,
      readinessAttemptCount: diagnoses.filter((diagnosis) => diagnosis.countsTowardReadiness).length,
      highConfidenceMissCount: diagnoses.filter(
        (diagnosis) => diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect,
      ).length,
      lowConfidenceCorrectCount: diagnoses.filter(
        (diagnosis) => diagnosis.confidenceSignal === 'fragile_correct',
      ).length,
      confidenceMismatchCount: diagnoses.filter((diagnosis) => diagnosis.confidenceMismatch).length,
      activeReadinessBlockerCount: finalized.filter(
        (dimension) =>
          dimension.evidenceScope !== 'readiness_eligible' ||
          dimension.activeRepairCount > 0 ||
          dimension.activeExclusionReasons.length > 0,
      ).length,
      activeExclusionReasons,
      recurringWeakAreaDimensionIds,
      lowExposureDimensionIds,
      strongestDimensionId: strongest ? dimensionKey(strongest.dimensionType, strongest.dimensionId) : undefined,
      weakestDimensionId: weakest ? dimensionKey(weakest.dimensionType, weakest.dimensionId) : undefined,
    },
    updatedAt: latestAttemptAt ?? '1970-01-01T00:00:00.000Z',
  }
}

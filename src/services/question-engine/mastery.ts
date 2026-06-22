import type {
  AttemptDiagnosis,
  LearnerMasteryVector,
  MasteryDimensionStats,
  RemediationEvent,
} from './types'

interface MutableDimension {
  dimensionType: string
  dimensionId: string
  attemptCount: number
  readinessAttemptCount: number
  correctCount: number
  readinessCorrectCount: number
  calibrationTotal: number
  highConfidenceMissCount: number
  lowConfidenceCorrectCount: number
  remediationAssignedCount: number
  remediationRepairedCount: number
  latestAttemptAt: string | null
}

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
    readinessAttemptCount: 0,
    correctCount: 0,
    readinessCorrectCount: 0,
    calibrationTotal: 0,
    highConfidenceMissCount: 0,
    lowConfidenceCorrectCount: 0,
    remediationAssignedCount: 0,
    remediationRepairedCount: 0,
    latestAttemptAt: null,
  }
  dimensions.set(key, created)
  return created
}

const getDimensionPairs = (diagnosis: AttemptDiagnosis) => [
  ['client_need', diagnosis.clientNeed],
  ['subcategory', diagnosis.subcategory],
  ['clinical_judgment_step', diagnosis.clinicalJudgmentStep],
  ['misconception_family', diagnosis.misconceptionFamily],
  ['item_type', diagnosis.itemType],
]

const finalizeDimension = (dimension: MutableDimension): MasteryDimensionStats => {
  const accuracy = dimension.attemptCount ? dimension.correctCount / dimension.attemptCount : 0
  const readinessAccuracy = dimension.readinessAttemptCount
    ? dimension.readinessCorrectCount / dimension.readinessAttemptCount
    : 0
  const avgCalibrationScore = dimension.attemptCount
    ? dimension.calibrationTotal / dimension.attemptCount
    : 0
  const confidenceMismatchScore = dimension.attemptCount
    ? (dimension.highConfidenceMissCount * 1.25 + dimension.lowConfidenceCorrectCount * 0.85) /
      dimension.attemptCount
    : 0.5
  const performanceComponent = accuracy
  const calibrationComponent = Math.max(0, (avgCalibrationScore + 1) / 2)
  const remediationRepairComponent = dimension.remediationAssignedCount
    ? dimension.remediationRepairedCount / dimension.remediationAssignedCount
    : 0.5
  const exposureComponent = Math.min(1, dimension.attemptCount / 6)
  const recencyComponent = dimension.latestAttemptAt ? 0.7 : 0
  const masteryScore =
    performanceComponent * 0.45 +
    calibrationComponent * 0.25 +
    remediationRepairComponent * 0.15 +
    exposureComponent * 0.1 +
    recencyComponent * 0.05
  const weaknessScore =
    (1 - performanceComponent) * 0.4 +
    confidenceMismatchScore * 0.25 +
    Math.min(1, dimension.highConfidenceMissCount / Math.max(1, dimension.attemptCount)) * 0.2 +
    (1 - exposureComponent) * 0.1 +
    (avgCalibrationScore < 0 ? 0.05 : 0)
  const masteryLevel =
    dimension.attemptCount < 3 || accuracy < 0.6 || confidenceMismatchScore > 0.45
      ? 'fragile'
      : accuracy >= 0.8 && confidenceMismatchScore <= 0.25
        ? 'strong'
        : 'developing'

  return {
    dimensionType: dimension.dimensionType,
    dimensionId: dimension.dimensionId,
    attemptCount: dimension.attemptCount,
    readinessAttemptCount: dimension.readinessAttemptCount,
    accuracy,
    readinessAccuracy,
    avgCalibrationScore,
    highConfidenceMissCount: dimension.highConfidenceMissCount,
    lowConfidenceCorrectCount: dimension.lowConfidenceCorrectCount,
    confidenceMismatchScore,
    remediationAssignedCount: dimension.remediationAssignedCount,
    remediationRepairedCount: dimension.remediationRepairedCount,
    masteryScore,
    weaknessScore,
    masteryLevel,
    latestAttemptAt: dimension.latestAttemptAt,
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
      dimension.correctCount += diagnosis.scoreResult.isCorrect ? 1 : 0
      dimension.readinessAttemptCount += diagnosis.countsTowardReadiness ? 1 : 0
      dimension.readinessCorrectCount += diagnosis.countsTowardReadiness && diagnosis.scoreResult.isCorrect ? 1 : 0
      dimension.calibrationTotal += diagnosis.calibrationScore
      dimension.highConfidenceMissCount += diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect ? 1 : 0
      dimension.lowConfidenceCorrectCount += diagnosis.scoreResult.isCorrect && diagnosis.calibrationScore === 0.2 ? 1 : 0
      dimension.remediationAssignedCount += remediation ? 1 : 0
      dimension.remediationRepairedCount += remediation?.repairSuccess ? 1 : 0
      dimension.latestAttemptAt =
        !dimension.latestAttemptAt || diagnosis.createdAt > dimension.latestAttemptAt
          ? diagnosis.createdAt
          : dimension.latestAttemptAt
    }
  }

  const finalized = Array.from(dimensions.values()).map(finalizeDimension)
  const byKey = Object.fromEntries(
    finalized.map((dimension) => [dimensionKey(dimension.dimensionType, dimension.dimensionId), dimension]),
  )
  const weakest = finalized.toSorted((left, right) => right.weaknessScore - left.weaknessScore)[0]
  const strongest = finalized.toSorted((left, right) => right.masteryScore - left.masteryScore)[0]

  return {
    dimensions: byKey,
    summary: {
      attemptCount: diagnoses.length,
      readinessAttemptCount: diagnoses.filter((diagnosis) => diagnosis.countsTowardReadiness).length,
      highConfidenceMissCount: diagnoses.filter(
        (diagnosis) => diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect,
      ).length,
      strongestDimensionId: strongest ? dimensionKey(strongest.dimensionType, strongest.dimensionId) : undefined,
      weakestDimensionId: weakest ? dimensionKey(weakest.dimensionType, weakest.dimensionId) : undefined,
    },
    updatedAt: new Date().toISOString(),
  }
}

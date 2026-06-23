import {
  questionEngineVersions,
  type AttemptDiagnosis,
  type CoverageGap,
  type LearnerMasteryVector,
  type ReadinessBlockedReason,
  type ReadinessConfidenceCalibrationSummary,
  type ReadinessContentTrustSummary,
  type ReadinessCoverageSummary,
  type ReadinessExclusionReason,
  type ReadinessReconstructionStatus,
  type ReadinessRemediationSummary,
  type ReadinessSafetyRecoverySummary,
  type ReadinessSnapshot,
  type ReadinessSnapshotScope,
  type RemediationEvent,
} from './types'

export interface ReadinessSnapshotOptions {
  generatedAt?: string
  snapshotScope?: ReadinessSnapshotScope
  claimEvidenceRecordIds?: string[]
  requiredClaimsPresent?: boolean
  reconstructionStatus?: ReadinessReconstructionStatus
}

const majorClinicalJudgmentSteps = [
  'Recognize cues',
  'Analyze cues',
  'Prioritize hypotheses',
  'Generate solutions',
  'Take action',
  'Evaluate outcomes',
] as const

const highRiskClinicalJudgmentSteps = new Set([
  'Prioritize hypotheses',
  'Take action',
  'Evaluate outcomes',
])

const ngnItemTypes = new Set([
  'matrix',
  'cloze',
  'dropdown',
  'highlight',
  'drag_drop',
  'ordered_response',
  'bowtie',
  'trend',
  'sata',
])

const readinessSourceStatuses = new Set(['source_checked', 'sme_verified'])
const readinessReviewStatuses = new Set(['item_reviewed', 'sme_verified', 'analytics_reviewed'])

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const roundMetric = (value: number) => Math.round(value * 1000) / 1000
const dimensionKey = (dimensionType: string, dimensionId: string) => `${dimensionType}:${dimensionId}`

const countBy = <T extends string>(values: T[]) => {
  const counts: Record<string, number> = {}
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1
  return counts
}

const increment = <T extends string>(counts: Partial<Record<T, number>>, key: T) => {
  counts[key] = (counts[key] ?? 0) + 1
}

const unique = <T extends string>(values: T[]): T[] => Array.from(new Set(values))

const countByReason = (diagnoses: AttemptDiagnosis[]) => {
  const counts: Partial<Record<ReadinessExclusionReason, number>> = {}
  for (const diagnosis of diagnoses) {
    for (const reason of diagnosis.readinessExclusionReasons) increment(counts, reason)
  }
  return counts
}

const getSafetyFlags = (diagnosis: AttemptDiagnosis) =>
  diagnosis.weakAreaDimensions
    .filter((dimension) => dimension.dimensionType === 'safety_flag')
    .map((dimension) => dimension.dimensionId)

const hasSafetyCoverage = (diagnosis: AttemptDiagnosis) =>
  getSafetyFlags(diagnosis).length > 0 ||
  diagnosis.safetySeverity === 'high' ||
  diagnosis.safetySeverity === 'critical'

const isTrustedSnapshot = (diagnosis: AttemptDiagnosis) =>
  diagnosis.countsTowardReadiness &&
  diagnosis.itemTrustSnapshot.countsTowardReadiness &&
  diagnosis.itemTrustSnapshot.readinessExclusionReasons.length === 0 &&
  readinessSourceStatuses.has(diagnosis.itemTrustSnapshot.sourceStatus) &&
  readinessReviewStatuses.has(diagnosis.itemTrustSnapshot.reviewStatus) &&
  (diagnosis.itemTrustSnapshot.readinessState === 'readiness_eligible' ||
    diagnosis.itemTrustSnapshot.readinessState === 'readiness_trusted')

const getTrustBlockedReasons = (diagnoses: AttemptDiagnosis[]) => {
  const blockedReasons: ReadinessBlockedReason[] = []

  for (const diagnosis of diagnoses) {
    if (!diagnosis.countsTowardReadiness) continue
    const snapshot = diagnosis.itemTrustSnapshot

    if (!isTrustedSnapshot(diagnosis)) blockedReasons.push('untrusted_content')
    if (snapshot.sourceStatus === 'source_needed') blockedReasons.push('source_needed')
    if (snapshot.reviewStatus === 'not_reviewed') blockedReasons.push('not_reviewed')
    if (
      snapshot.readinessExclusionReasons.includes('revision_flagged') ||
      snapshot.readinessExclusionReasons.includes('retired_item')
    ) {
      blockedReasons.push('revision_active')
    }
    if (snapshot.readinessExclusionReasons.includes('missing_metadata')) {
      blockedReasons.push('missing_metadata')
    }
  }

  return unique(blockedReasons)
}

const getLatestAttemptAt = (diagnoses: AttemptDiagnosis[]) =>
  diagnoses.map((diagnosis) => diagnosis.createdAt).sort().at(-1) ?? new Date().toISOString()

const buildContentTrustSummary = (
  diagnoses: AttemptDiagnosis[],
  trustedDiagnoses: AttemptDiagnosis[],
): ReadinessContentTrustSummary => ({
  trustedAttemptCount: trustedDiagnoses.length,
  practiceAttemptCount: diagnoses.length,
  excludedAttemptCount: diagnoses.length - trustedDiagnoses.length,
  trustedItemCount: new Set(trustedDiagnoses.map((diagnosis) => diagnosis.itemId)).size,
  practiceItemCount: new Set(diagnoses.map((diagnosis) => diagnosis.itemId)).size,
  sourceCheckedAttemptCount: trustedDiagnoses.filter((diagnosis) =>
    readinessSourceStatuses.has(diagnosis.itemTrustSnapshot.sourceStatus),
  ).length,
  reviewedAttemptCount: trustedDiagnoses.filter((diagnosis) =>
    readinessReviewStatuses.has(diagnosis.itemTrustSnapshot.reviewStatus),
  ).length,
  readinessTrustedAttemptCount: trustedDiagnoses.filter(
    (diagnosis) => diagnosis.itemTrustSnapshot.readinessState === 'readiness_trusted',
  ).length,
})

const buildRemediationSummary = (
  remediationEvents: RemediationEvent[],
): ReadinessRemediationSummary => ({
  assignedCount: remediationEvents.length,
  engagementOnlyCount: remediationEvents.filter(
    (event) =>
      event.transferEvidenceLevel === 'engagement_only' ||
      event.repairOutcome === 'view_only' ||
      event.repairOutcome === 'teaching_completed_no_transfer',
  ).length,
  practiceRepairCount: remediationEvents.filter(
    (event) => event.repairOutcome === 'practice_repair_supported',
  ).length,
  trustedRepairSupportedCount: remediationEvents.filter(
    (event) => event.repairOutcome === 'trusted_repair_supported',
  ).length,
  officialRepairCount: remediationEvents.filter(
    (event) => event.repairOutcome === 'official_repair',
  ).length,
  unresolvedRepairCount: remediationEvents.filter(
    (event) => event.repairRequired && !event.repairSuccess,
  ).length,
})

const buildCoverageSummary = (
  diagnoses: AttemptDiagnosis[],
  trustedDiagnoses: AttemptDiagnosis[],
  remediationSummary: ReadinessRemediationSummary,
): ReadinessCoverageSummary => ({
  trustedAttemptCount: trustedDiagnoses.length,
  practiceAttemptCount: diagnoses.length,
  clientNeedCoverage: countBy(trustedDiagnoses.map((diagnosis) => diagnosis.clientNeed)),
  clinicalJudgmentCoverage: countBy(
    trustedDiagnoses.map((diagnosis) => diagnosis.clinicalJudgmentStep),
  ),
  safetyFlagCoverage: countBy(trustedDiagnoses.flatMap(getSafetyFlags)),
  itemTypeCoverage: countBy(trustedDiagnoses.map((diagnosis) => diagnosis.itemType)),
  misconceptionRepairCoverage: {
    officialRepairCount: remediationSummary.officialRepairCount,
    practiceRepairCount: remediationSummary.practiceRepairCount,
    trustedRepairSupportedCount: remediationSummary.trustedRepairSupportedCount,
    unresolvedRepairCount: remediationSummary.unresolvedRepairCount,
  },
})

const getUnrepairedSafetyDiagnoses = (
  diagnoses: AttemptDiagnosis[],
  remediationEvents: RemediationEvent[],
) => {
  const repairedDiagnosisIds = new Set(
    remediationEvents
      .filter((event) => event.repairSuccess)
      .map((event) => event.diagnosisId),
  )

  return diagnoses.filter(
    (diagnosis) =>
      !repairedDiagnosisIds.has(diagnosis.id) &&
      !diagnosis.scoreResult.isCorrect &&
      diagnosis.confidenceEscalated &&
      (diagnosis.safetySeverity === 'high' || diagnosis.safetySeverity === 'critical'),
  )
}

const buildCoverageGaps = (
  diagnoses: AttemptDiagnosis[],
  trustedDiagnoses: AttemptDiagnosis[],
  masteryVector: LearnerMasteryVector,
  remediationEvents: RemediationEvent[],
): CoverageGap[] => {
  const gaps: CoverageGap[] = []
  const trustedByStep = new Map<string, AttemptDiagnosis[]>()
  const practiceByStep = new Map<string, AttemptDiagnosis[]>()

  for (const diagnosis of diagnoses) {
    const practiceStep = practiceByStep.get(diagnosis.clinicalJudgmentStep) ?? []
    practiceStep.push(diagnosis)
    practiceByStep.set(diagnosis.clinicalJudgmentStep, practiceStep)
  }
  for (const diagnosis of trustedDiagnoses) {
    const trustedStep = trustedByStep.get(diagnosis.clinicalJudgmentStep) ?? []
    trustedStep.push(diagnosis)
    trustedByStep.set(diagnosis.clinicalJudgmentStep, trustedStep)
  }

  for (const step of majorClinicalJudgmentSteps) {
    const trustedStepDiagnoses = trustedByStep.get(step) ?? []
    const practiceStepDiagnoses = practiceByStep.get(step) ?? []
    const dimension = masteryVector.dimensions[dimensionKey('clinical_judgment_step', step)]
    const trustedAttemptCount = trustedStepDiagnoses.length
    const requiredAttempts = highRiskClinicalJudgmentSteps.has(step) ? 5 : 3

    if (trustedAttemptCount < requiredAttempts) {
      gaps.push({
        dimensionType: 'clinical_judgment_step',
        dimensionId: step,
        gapType: practiceStepDiagnoses.length ? 'untrusted_evidence_only' : 'low_exposure',
        severity: highRiskClinicalJudgmentSteps.has(step) ? 'high' : 'medium',
        trustedAttemptCount,
        practiceAttemptCount: practiceStepDiagnoses.length,
        readinessAttemptCount: trustedAttemptCount,
        latestAttemptAt: dimension?.latestAttemptAt ?? null,
        recommendedRoute: 'clinical_judgment_step_review',
        candidateRepairItemIds: [],
      })
    }

    if (dimension?.readinessAttemptCount && dimension.readinessAccuracy < 0.65) {
      gaps.push({
        dimensionType: 'clinical_judgment_step',
        dimensionId: step,
        gapType: 'weak_mastery',
        severity: highRiskClinicalJudgmentSteps.has(step) ? 'high' : 'medium',
        trustedAttemptCount,
        practiceAttemptCount: practiceStepDiagnoses.length,
        readinessAttemptCount: trustedAttemptCount,
        latestAttemptAt: dimension.latestAttemptAt,
        recommendedRoute: 'clinical_judgment_step_review',
        candidateRepairItemIds: [],
      })
    }

    if (dimension?.trustedAttemptCount && dimension.confidenceMismatchScore > 0.45) {
      gaps.push({
        dimensionType: 'clinical_judgment_step',
        dimensionId: step,
        gapType: 'confidence_mismatch',
        severity: highRiskClinicalJudgmentSteps.has(step) ? 'high' : 'medium',
        trustedAttemptCount,
        practiceAttemptCount: practiceStepDiagnoses.length,
        readinessAttemptCount: trustedAttemptCount,
        latestAttemptAt: dimension.latestAttemptAt,
        recommendedRoute: 'clinical_judgment_step_review',
        candidateRepairItemIds: [],
      })
    }
  }

  const clientNeedCounts = countBy(trustedDiagnoses.map((diagnosis) => diagnosis.clientNeed))
  const clientNeedValues = Object.values(clientNeedCounts)
  const dominantClientNeed = Math.max(...clientNeedValues, 0)
  if (trustedDiagnoses.length >= 60 && Object.keys(clientNeedCounts).length < 3) {
    gaps.push({
      dimensionType: 'client_need',
      dimensionId: 'client_need_spread',
      gapType: 'low_exposure',
      severity: 'high',
      trustedAttemptCount: Object.keys(clientNeedCounts).length,
      practiceAttemptCount: new Set(diagnoses.map((diagnosis) => diagnosis.clientNeed)).size,
      readinessAttemptCount: Object.keys(clientNeedCounts).length,
      latestAttemptAt: getLatestAttemptAt(trustedDiagnoses),
      recommendedRoute: 'coverage_builder',
      candidateRepairItemIds: [],
    })
  } else if (trustedDiagnoses.length >= 60 && dominantClientNeed / trustedDiagnoses.length > 0.6) {
    gaps.push({
      dimensionType: 'client_need',
      dimensionId: 'client_need_spread',
      gapType: 'weak_mastery',
      severity: 'medium',
      trustedAttemptCount: Object.keys(clientNeedCounts).length,
      practiceAttemptCount: new Set(diagnoses.map((diagnosis) => diagnosis.clientNeed)).size,
      readinessAttemptCount: Object.keys(clientNeedCounts).length,
      latestAttemptAt: getLatestAttemptAt(trustedDiagnoses),
      recommendedRoute: 'coverage_builder',
      candidateRepairItemIds: [],
    })
  }

  const safetyTrustedCount = trustedDiagnoses.filter(hasSafetyCoverage).length
  if (trustedDiagnoses.length >= 60 && safetyTrustedCount < 10) {
    gaps.push({
      dimensionType: 'safety_flag',
      dimensionId: 'safety_coverage',
      gapType: 'low_exposure',
      severity: 'high',
      trustedAttemptCount: safetyTrustedCount,
      practiceAttemptCount: diagnoses.filter(hasSafetyCoverage).length,
      readinessAttemptCount: safetyTrustedCount,
      latestAttemptAt: getLatestAttemptAt(trustedDiagnoses.filter(hasSafetyCoverage)),
      recommendedRoute: 'coverage_builder',
      candidateRepairItemIds: [],
    })
  }

  const hasTrustedNgn = trustedDiagnoses.some((diagnosis) => ngnItemTypes.has(diagnosis.itemType))
  if (trustedDiagnoses.length >= 60 && !hasTrustedNgn) {
    gaps.push({
      dimensionType: 'item_type',
      dimensionId: 'ngn_item_type_spread',
      gapType: 'low_exposure',
      severity: 'medium',
      trustedAttemptCount: 0,
      practiceAttemptCount: diagnoses.filter((diagnosis) => ngnItemTypes.has(diagnosis.itemType)).length,
      readinessAttemptCount: 0,
      latestAttemptAt: null,
      recommendedRoute: 'coverage_builder',
      candidateRepairItemIds: [],
    })
  }

  for (const diagnosis of getUnrepairedSafetyDiagnoses(diagnoses, remediationEvents).slice(-3)) {
    gaps.push({
      dimensionType: 'misconception_family',
      dimensionId: diagnosis.misconceptionFamily,
      gapType: 'unrepaired_safety_miss',
      severity: diagnosis.safetySeverity,
      trustedAttemptCount: diagnosis.countsTowardReadiness ? 1 : 0,
      practiceAttemptCount: 1,
      readinessAttemptCount: diagnosis.countsTowardReadiness ? 1 : 0,
      latestAttemptAt: diagnosis.createdAt,
      recommendedRoute: diagnosis.remediationRoute,
      candidateRepairItemIds: [],
    })
  }

  return gaps
}

const calculateClinicalJudgmentBalance = (
  trustedDiagnoses: AttemptDiagnosis[],
  masteryVector: LearnerMasteryVector,
  coverageGaps: CoverageGap[],
) => {
  if (!trustedDiagnoses.length) return 0

  const counts = majorClinicalJudgmentSteps.map(
    (step) => trustedDiagnoses.filter((diagnosis) => diagnosis.clinicalJudgmentStep === step).length,
  )
  const total = counts.reduce((sum, count) => sum + count, 0)
  const expected = total / majorClinicalJudgmentSteps.length
  const imbalance = counts.reduce((sum, count) => sum + Math.abs(count - expected), 0)
  const coverageEvenness = total ? clamp01(1 - imbalance / Math.max(total * 1.25, 1)) : 0
  const weakestStepMastery = Math.min(
    ...majorClinicalJudgmentSteps.map((step) => {
      const dimension = masteryVector.dimensions[dimensionKey('clinical_judgment_step', step)]
      return dimension?.trustedAttemptCount ? dimension.readinessAccuracy : 0
    }),
  )
  const highRiskStepRepair = coverageGaps.some(
    (gap) =>
      gap.gapType === 'unrepaired_safety_miss' ||
      (gap.gapType === 'confidence_mismatch' && highRiskClinicalJudgmentSteps.has(gap.dimensionId)),
  )
    ? 0.35
    : 1
  const itemTypeSpread = trustedDiagnoses.some((diagnosis) => ngnItemTypes.has(diagnosis.itemType))
    ? 1
    : 0.45
  const recencyCoverage =
    majorClinicalJudgmentSteps.filter((step) => {
      const dimension = masteryVector.dimensions[dimensionKey('clinical_judgment_step', step)]
      return Boolean(dimension?.latestTrustedAttemptAt)
    }).length / majorClinicalJudgmentSteps.length
  let balance =
    coverageEvenness * 0.35 +
    weakestStepMastery * 0.3 +
    highRiskStepRepair * 0.2 +
    itemTypeSpread * 0.1 +
    recencyCoverage * 0.05

  if (counts.some((count) => count === 0)) balance = Math.min(balance, 0.5)
  if (
    coverageGaps.some(
      (gap) =>
        gap.gapType === 'unrepaired_safety_miss' &&
        (gap.severity === 'high' || gap.severity === 'critical'),
    )
  ) {
    balance = Math.min(balance, 0.6)
  }

  return roundMetric(clamp01(balance))
}

const buildConfidenceSummary = (
  trustedDiagnoses: AttemptDiagnosis[],
  remediationEvents: RemediationEvent[],
): ReadinessConfidenceCalibrationSummary => {
  const avgTrustedCalibrationScore = trustedDiagnoses.length
    ? trustedDiagnoses.reduce((sum, diagnosis) => sum + diagnosis.calibrationScore, 0) /
      trustedDiagnoses.length
    : 0
  const repairedDiagnosisIds = new Set(
    remediationEvents
      .filter((event) => event.repairSuccess)
      .map((event) => event.diagnosisId),
  )
  const trustedAttemptCountsByDimension = new Map<string, number>()
  const mismatchWeightByDimension = new Map<string, number>()

  for (const diagnosis of trustedDiagnoses) {
    const uniqueDimensionKeys = unique(
      diagnosis.weakAreaDimensions.map((dimension) =>
        dimensionKey(dimension.dimensionType, dimension.dimensionId),
      ),
    )
    for (const key of uniqueDimensionKeys) {
      trustedAttemptCountsByDimension.set(key, (trustedAttemptCountsByDimension.get(key) ?? 0) + 1)
    }

    const repairedHighConfidenceMiss =
      repairedDiagnosisIds.has(diagnosis.id) &&
      diagnosis.confidenceEscalated &&
      !diagnosis.scoreResult.isCorrect
    if (!diagnosis.confidenceMismatch || repairedHighConfidenceMiss) continue

    const mismatchWeight =
      diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect
        ? 1.25
        : diagnosis.confidenceSignal === 'fragile_correct'
          ? 0.85
          : 0.65
    for (const key of uniqueDimensionKeys) {
      mismatchWeightByDimension.set(key, (mismatchWeightByDimension.get(key) ?? 0) + mismatchWeight)
    }
  }

  const highRiskDimensionIds = Array.from(mismatchWeightByDimension.entries())
    .filter(([key, weight]) => weight / Math.max(trustedAttemptCountsByDimension.get(key) ?? 1, 1) > 0.45)
    .map(([key]) => key)
    .sort()

  return {
    avgTrustedCalibrationScore: roundMetric(avgTrustedCalibrationScore),
    normalizedTrustedCalibration: roundMetric(clamp01((avgTrustedCalibrationScore + 1) / 2)),
    highConfidenceMissCount: trustedDiagnoses.filter(
      (diagnosis) => diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect,
    ).length,
    lowConfidenceCorrectCount: trustedDiagnoses.filter(
      (diagnosis) => diagnosis.confidenceSignal === 'fragile_correct',
    ).length,
    confidenceMismatchCount: trustedDiagnoses.filter((diagnosis) => diagnosis.confidenceMismatch).length,
    highRiskDimensionIds,
  }
}

const buildSafetySummary = (
  unrepairedSafetyDiagnoses: AttemptDiagnosis[],
  remediationSummary: ReadinessRemediationSummary,
): ReadinessSafetyRecoverySummary => {
  const unresolvedCount = unrepairedSafetyDiagnoses.length
  const denominator = unresolvedCount + remediationSummary.officialRepairCount + 1
  return {
    unrepairedSafetyMissCount: unresolvedCount,
    officialRepairCount: remediationSummary.officialRepairCount,
    practiceRepairCount: remediationSummary.practiceRepairCount,
    safetyRecoveryScore: roundMetric(clamp01(1 - unresolvedCount / denominator)),
  }
}

const getTopWeakDimensions = (masteryVector: LearnerMasteryVector) =>
  Object.values(masteryVector.dimensions)
    .filter((dimension) => dimension.trustedAttemptCount > 0 || dimension.practiceAttemptCount > 0)
    .toSorted((left, right) => right.selectionWeight - left.selectionWeight)
    .slice(0, 5)
    .map((dimension) => ({
      dimensionType: dimension.dimensionType,
      dimensionId: dimension.dimensionId,
      score: roundMetric(dimension.selectionWeight),
      reason:
        dimension.activeRepairCount > 0
          ? 'active_repair'
          : dimension.confidenceMismatchScore > 0.45
            ? 'confidence_mismatch'
            : dimension.masteryLevel,
    }))

const getTopConfidenceRisks = (masteryVector: LearnerMasteryVector) =>
  Object.values(masteryVector.dimensions)
    .filter((dimension) => dimension.confidenceMismatchScore > 0)
    .toSorted((left, right) => right.confidenceMismatchScore - left.confidenceMismatchScore)
    .slice(0, 5)
    .map((dimension) => ({
      dimensionType: dimension.dimensionType,
      dimensionId: dimension.dimensionId,
      score: roundMetric(dimension.confidenceMismatchScore),
      reason: dimension.lowConfidenceCorrectCount ? 'fragile_correct' : 'overconfident_miss',
    }))

const getCoverageBlockedReasons = (coverageGaps: CoverageGap[]): ReadinessBlockedReason[] => {
  const reasons: ReadinessBlockedReason[] = []
  if (coverageGaps.length) reasons.push('coverage_gap')
  if (coverageGaps.some((gap) => gap.dimensionType === 'client_need')) {
    reasons.push('client_need_spread')
  }
  if (coverageGaps.some((gap) => gap.dimensionType === 'item_type')) {
    reasons.push('item_type_gap')
  }
  if (coverageGaps.some((gap) => gap.dimensionType === 'safety_flag')) {
    reasons.push('safety_coverage_gap')
  }
  if (coverageGaps.some((gap) => gap.gapType === 'confidence_mismatch')) {
    reasons.push('confidence_mismatch')
  }
  if (coverageGaps.some((gap) => gap.gapType === 'unrepaired_safety_miss')) {
    reasons.push('unresolved_safety_miss', 'repair_not_proven')
  }
  return unique(reasons)
}

const getLearnerCopyKeys = (blockedReasons: ReadinessBlockedReason[]) => {
  if (!blockedReasons.length) return ['readiness_snapshot_trusted_ready']
  const keys = ['readiness_snapshot_insufficient_evidence']
  if (blockedReasons.includes('insufficient_trusted_volume')) keys.push('readiness_gap_trusted_volume')
  if (blockedReasons.includes('coverage_gap')) keys.push('readiness_gap_coverage')
  if (blockedReasons.includes('confidence_mismatch')) keys.push('readiness_gap_confidence_calibration')
  if (blockedReasons.includes('repair_not_proven')) keys.push('readiness_gap_repair_not_proven')
  if (blockedReasons.includes('untrusted_content')) keys.push('readiness_gap_content_trust')
  return keys
}

const getNextBestAction = (
  trustedAttemptCount: number,
  coverageGaps: CoverageGap[],
  blockedReasons: ReadinessBlockedReason[],
) => {
  if (blockedReasons.includes('insufficient_trusted_volume')) {
    return `Build ${Math.max(0, 60 - trustedAttemptCount)} more trusted readiness attempts.`
  }

  const firstGap = coverageGaps[0]
  if (firstGap) {
    return `Build trusted evidence for ${firstGap.dimensionId}.`
  }

  if (blockedReasons.includes('confidence_mismatch')) {
    return 'Use trusted confidence rechecks before raising readiness.'
  }

  return 'Keep practicing with trusted review items.'
}

export function buildReadinessSnapshot(
  diagnoses: AttemptDiagnosis[],
  masteryVector: LearnerMasteryVector,
  remediationEvents: RemediationEvent[] = [],
  options: ReadinessSnapshotOptions = {},
): ReadinessSnapshot {
  const trustedDiagnoses = diagnoses.filter(isTrustedSnapshot)
  const trustedAttemptCount = trustedDiagnoses.length
  const practiceAttemptCount = diagnoses.length
  const excludedAttemptCount = diagnoses.length - trustedAttemptCount
  const practiceAccuracy = practiceAttemptCount
    ? diagnoses.filter((diagnosis) => diagnosis.scoreResult.isCorrect).length / practiceAttemptCount
    : 0
  const readinessAccuracy = trustedAttemptCount
    ? trustedDiagnoses.filter((diagnosis) => diagnosis.scoreResult.isCorrect).length /
      trustedAttemptCount
    : 0
  const readinessScoreNumerator = trustedDiagnoses.reduce(
    (sum, diagnosis) => sum + diagnosis.scoreResult.rawScore,
    0,
  )
  const readinessScoreDenominator = trustedDiagnoses.reduce(
    (sum, diagnosis) => sum + diagnosis.scoreResult.maxScore,
    0,
  )
  const performanceMastery = readinessScoreDenominator
    ? readinessScoreNumerator / readinessScoreDenominator
    : 0
  const remediationSummary = buildRemediationSummary(remediationEvents)
  const coverageGaps = buildCoverageGaps(diagnoses, trustedDiagnoses, masteryVector, remediationEvents)
  const coverageSummary = buildCoverageSummary(diagnoses, trustedDiagnoses, remediationSummary)
  const clinicalJudgmentBalance = calculateClinicalJudgmentBalance(
    trustedDiagnoses,
    masteryVector,
    coverageGaps,
  )
  const confidenceCalibrationSummary = buildConfidenceSummary(trustedDiagnoses, remediationEvents)
  const unrepairedSafetyDiagnoses = getUnrepairedSafetyDiagnoses(diagnoses, remediationEvents)
  const safetyRecoverySummary = buildSafetySummary(unrepairedSafetyDiagnoses, remediationSummary)
  const contentTrustSummary = buildContentTrustSummary(diagnoses, trustedDiagnoses)
  const claimEvidenceRecordIds = options.claimEvidenceRecordIds ?? []
  const requiredClaimsPresent = options.requiredClaimsPresent ?? true
  const reconstructionStatus = options.reconstructionStatus ?? 'not_required'
  const trustBlockedReasons = getTrustBlockedReasons(diagnoses)
  const blockedReasons = unique<ReadinessBlockedReason>([
    ...(trustedAttemptCount < 60 ? ['insufficient_trusted_volume' as const] : []),
    ...trustBlockedReasons,
    ...getCoverageBlockedReasons(coverageGaps),
    ...(confidenceCalibrationSummary.highRiskDimensionIds.length ? ['confidence_mismatch' as const] : []),
    ...(requiredClaimsPresent ? [] : ['claim_evidence_missing' as const]),
    ...(reconstructionStatus === 'failed' || reconstructionStatus === 'blocked'
      ? ['reconstruction_failed' as const]
      : []),
  ])
  const evidenceRequirementsMet = blockedReasons.length === 0
  const coverageRequirementsMet =
    trustedAttemptCount >= 60 &&
    trustBlockedReasons.length === 0 &&
    coverageGaps.length === 0
  const remediationCompletion = remediationSummary.assignedCount
    ? remediationSummary.officialRepairCount / remediationSummary.assignedCount
    : 1
  const readinessScore = evidenceRequirementsMet
    ? roundMetric(
      performanceMastery * 0.4 +
        clinicalJudgmentBalance * 0.2 +
        confidenceCalibrationSummary.normalizedTrustedCalibration * 0.2 +
        safetyRecoverySummary.safetyRecoveryScore * 0.15 +
        remediationCompletion * 0.05,
    )
    : 0
  const status =
    !evidenceRequirementsMet
      ? 'insufficient_evidence'
      : readinessScore >= 0.82
        ? 'ready'
        : readinessScore >= 0.72
          ? 'approaching'
          : 'building'

  return {
    status,
    readinessScore,
    readinessScoreAvailable: evidenceRequirementsMet,
    evidenceRequirementsMet,
    snapshotScope:
      options.snapshotScope ??
      (trustedAttemptCount && excludedAttemptCount
        ? 'mixed_separated'
        : trustedAttemptCount
          ? 'official_readiness'
          : 'practice_progress'),
    practiceAccuracy: roundMetric(practiceAccuracy),
    readinessAccuracy: roundMetric(readinessAccuracy),
    trustedAttemptCount,
    practiceAttemptCount,
    excludedAttemptCount,
    trustedItemCount: contentTrustSummary.trustedItemCount,
    practiceItemCount: contentTrustSummary.practiceItemCount,
    highConfidenceMissCount: trustedDiagnoses.filter(
      (diagnosis) => diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect,
    ).length,
    coverageRequirementsMet,
    clinicalJudgmentBalance,
    coverageGaps,
    exclusionCounts: countByReason(diagnoses),
    contentTrustSummary,
    coverageSummary,
    confidenceCalibrationSummary,
    safetyRecoverySummary,
    remediationSummary,
    topWeakDimensions: getTopWeakDimensions(masteryVector),
    topConfidenceRisks: getTopConfidenceRisks(masteryVector),
    claimEvidenceRecordIds,
    requiredClaimsPresent,
    reconstructionStatus,
    blockedReasons,
    learnerCopyKeys: getLearnerCopyKeys(blockedReasons),
    schoolReportingAllowed: false,
    fallbackToOverallAccuracy: false,
    showPracticeProgressSeparately: true,
    calculationVersions: {
      readiness: questionEngineVersions.readiness,
      diagnosis: questionEngineVersions.diagnosis,
      remediationTransfer: questionEngineVersions.remediationTransfer,
    },
    nextBestAction: getNextBestAction(trustedAttemptCount, coverageGaps, blockedReasons),
    generatedAt: options.generatedAt ?? getLatestAttemptAt(diagnoses),
    readinessVersion: questionEngineVersions.readiness,
  }
}

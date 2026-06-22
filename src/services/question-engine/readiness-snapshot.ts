import {
  questionEngineVersions,
  type AttemptDiagnosis,
  type CoverageGap,
  type LearnerMasteryVector,
  type ReadinessExclusionReason,
  type ReadinessSnapshot,
  type RemediationEvent,
} from './types'

const majorClinicalJudgmentSteps = [
  'Recognize cues',
  'Analyze cues',
  'Prioritize hypotheses',
  'Generate solutions',
  'Take action',
  'Evaluate outcomes',
]

const countByReason = (diagnoses: AttemptDiagnosis[]) => {
  const counts: Partial<Record<ReadinessExclusionReason, number>> = {}
  for (const diagnosis of diagnoses) {
    for (const reason of diagnosis.readinessExclusionReasons) {
      counts[reason] = (counts[reason] ?? 0) + 1
    }
  }
  return counts
}

const buildCoverageGaps = (
  diagnoses: AttemptDiagnosis[],
  masteryVector: LearnerMasteryVector,
): CoverageGap[] => {
  const gaps: CoverageGap[] = []

  for (const step of majorClinicalJudgmentSteps) {
    const dimension = masteryVector.dimensions[`clinical_judgment_step:${step}`]
    const practiceAttemptCount = dimension?.attemptCount ?? 0
    const readinessAttemptCount = dimension?.readinessAttemptCount ?? 0
    const highConfidenceMissCount = dimension?.highConfidenceMissCount ?? 0

    if (readinessAttemptCount < 3) {
      gaps.push({
        dimensionType: 'clinical_judgment_step',
        dimensionId: step,
        gapType: practiceAttemptCount ? 'untrusted_evidence_only' : 'low_exposure',
        severity: step === 'Prioritize hypotheses' || step === 'Take action' ? 'high' : 'medium',
        trustedAttemptCount: readinessAttemptCount,
        practiceAttemptCount,
        readinessAttemptCount,
        latestAttemptAt: dimension?.latestAttemptAt ?? null,
        recommendedRoute: 'clinical_judgment_step_review',
        candidateRepairItemIds: [],
      })
    }

    if (highConfidenceMissCount > 0) {
      gaps.push({
        dimensionType: 'clinical_judgment_step',
        dimensionId: step,
        gapType: 'confidence_mismatch',
        severity: 'high',
        trustedAttemptCount: readinessAttemptCount,
        practiceAttemptCount,
        readinessAttemptCount,
        latestAttemptAt: dimension?.latestAttemptAt ?? null,
        recommendedRoute: 'clinical_judgment_step_review',
        candidateRepairItemIds: [],
      })
    }
  }

  const unrepairedSafety = diagnoses.filter(
    (diagnosis) =>
      !diagnosis.scoreResult.isCorrect &&
      diagnosis.confidenceEscalated &&
      (diagnosis.safetySeverity === 'high' || diagnosis.safetySeverity === 'critical'),
  )

  for (const diagnosis of unrepairedSafety.slice(-3)) {
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

export function buildReadinessSnapshot(
  diagnoses: AttemptDiagnosis[],
  masteryVector: LearnerMasteryVector,
  remediationEvents: RemediationEvent[] = [],
): ReadinessSnapshot {
  const readinessDiagnoses = diagnoses.filter((diagnosis) => diagnosis.countsTowardReadiness)
  const trustedAttemptCount = readinessDiagnoses.length
  const practiceAttemptCount = diagnoses.length
  const practiceAccuracy = practiceAttemptCount
    ? diagnoses.filter((diagnosis) => diagnosis.scoreResult.isCorrect).length / practiceAttemptCount
    : 0
  const readinessAccuracy = trustedAttemptCount
    ? readinessDiagnoses.filter((diagnosis) => diagnosis.scoreResult.isCorrect).length /
      trustedAttemptCount
    : 0
  const highConfidenceMissCount = diagnoses.filter(
    (diagnosis) => diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect,
  ).length
  const coverageGaps = buildCoverageGaps(diagnoses, masteryVector)
  const clinicalJudgmentBalance = Math.max(
    0,
    Math.min(
      1,
      1 -
        coverageGaps.filter((gap) => gap.dimensionType === 'clinical_judgment_step').length /
          Math.max(majorClinicalJudgmentSteps.length * 2, 1),
    ),
  )
  const recentUnrepairedSafety = remediationEvents.some(
    (event) => event.repairRequired && !event.repairSuccess,
  )
  const coverageRequirementsMet =
    trustedAttemptCount >= 60 &&
    clinicalJudgmentBalance >= 0.7 &&
    !recentUnrepairedSafety &&
    coverageGaps.filter((gap) => gap.severity === 'high' || gap.severity === 'critical').length === 0
  const readinessScore = coverageRequirementsMet
    ? readinessAccuracy * 0.65 + clinicalJudgmentBalance * 0.2 + Math.max(0, 1 - highConfidenceMissCount / 8) * 0.15
    : 0
  const status =
    !coverageRequirementsMet || trustedAttemptCount < 60
      ? 'insufficient_evidence'
      : readinessScore >= 0.82
        ? 'ready'
        : readinessScore >= 0.72
          ? 'approaching'
          : 'building'
  const firstGap = coverageGaps[0]

  return {
    status,
    readinessScore,
    practiceAccuracy,
    readinessAccuracy,
    trustedAttemptCount,
    practiceAttemptCount,
    highConfidenceMissCount,
    coverageRequirementsMet,
    clinicalJudgmentBalance,
    coverageGaps,
    exclusionCounts: countByReason(diagnoses),
    nextBestAction: firstGap
      ? `Build trusted evidence for ${firstGap.dimensionId}.`
      : 'Keep practicing with trusted review items.',
    generatedAt: new Date().toISOString(),
    readinessVersion: questionEngineVersions.readiness,
  }
}

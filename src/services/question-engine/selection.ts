import type {
  AttemptDiagnosis,
  LearnerMasteryVector,
  QuestionEngineItem,
  SelectionDecision,
} from './types'

interface SelectionOptions {
  trustMode?: 'practice' | 'readiness'
  preferredMisconceptionFamily?: string
  recentWindowSize?: number
}

const dimensionScore = (
  masteryVector: LearnerMasteryVector,
  dimensionType: string,
  dimensionId: string,
) => masteryVector.dimensions[`${dimensionType}:${dimensionId}`]?.weaknessScore ?? 0.35

export function selectNextItem(
  candidates: QuestionEngineItem[],
  masteryVector: LearnerMasteryVector,
  recentDiagnoses: AttemptDiagnosis[] = [],
  options: SelectionOptions = {},
): SelectionDecision {
  const trustMode = options.trustMode ?? 'practice'
  const recentWindowSize = options.recentWindowSize ?? 5
  const recentItemIds = new Set(
    recentDiagnoses.slice(-recentWindowSize).map((diagnosis) => diagnosis.itemId),
  )
  const available = candidates.filter((item) => {
    if (item.readinessState === 'retired') return false
    if (trustMode === 'readiness' && !item.countsTowardReadinessDefault) return false
    return true
  })

  if (!available.length) {
    return {
      selectedItemId: null,
      selectionIntent: 'no_candidate',
      primaryReasonCode: 'no_safe_candidate',
      trustMode,
      learnerExplanationKey: 'no_safe_candidate_available',
      candidateCount: candidates.length,
      excludedCandidateCount: candidates.length,
      scoreByItemId: {},
    }
  }

  const scoreByItemId = Object.fromEntries(
    available.map((item) => {
      const weaknessScore =
        dimensionScore(masteryVector, 'client_need', item.clientNeed) * 0.28 +
        dimensionScore(masteryVector, 'subcategory', item.subcategory) * 0.18 +
        dimensionScore(masteryVector, 'clinical_judgment_step', item.clinicalJudgmentStep) * 0.24 +
        dimensionScore(masteryVector, 'item_type', item.itemType) * 0.08
      const activeFamilyRepair =
        options.preferredMisconceptionFamily &&
        Object.values(item.distractorMisconceptions).some((id) =>
          id.includes(options.preferredMisconceptionFamily ?? 'never-match'),
        )
          ? 0.5
          : 0
      const confidenceMismatch =
        masteryVector.dimensions[`clinical_judgment_step:${item.clinicalJudgmentStep}`]
          ?.confidenceMismatchScore ?? 0
      const safetySeverityWeight =
        item.safetySeverity === 'critical' ? 0.4 : item.safetySeverity === 'high' ? 0.3 : 0.08
      const lowExposureWeight =
        masteryVector.dimensions[`client_need:${item.clientNeed}`]?.attemptCount
          ? 0
          : 0.2
      const trustedWeight = item.countsTowardReadinessDefault ? 0.18 : 0
      const recentRepeatPenalty = recentItemIds.has(item.itemId) ? 0.38 : 0
      const score =
        weaknessScore +
        confidenceMismatch * 0.35 +
        safetySeverityWeight +
        activeFamilyRepair +
        lowExposureWeight +
        trustedWeight -
        recentRepeatPenalty

      return [item.itemId, score]
    }),
  )
  const selected = available.toSorted(
    (left, right) => (scoreByItemId[right.itemId] ?? 0) - (scoreByItemId[left.itemId] ?? 0),
  )[0]
  const selectedDimension = masteryVector.dimensions[`clinical_judgment_step:${selected.clinicalJudgmentStep}`]
  const wasRecent = recentItemIds.has(selected.itemId)
  const reasonCode = wasRecent
    ? 'recent_repeat_penalty'
    : selectedDimension?.confidenceMismatchScore && selectedDimension.confidenceMismatchScore > 0.35
      ? 'confidence_mismatch'
      : selectedDimension?.weaknessScore && selectedDimension.weaknessScore > 0.45
        ? 'weak_clinical_judgment_step'
        : selected.countsTowardReadinessDefault
          ? 'trusted_readiness_evidence'
          : 'low_exposure'

  return {
    selectedItemId: selected.itemId,
    selectionIntent:
      reasonCode === 'confidence_mismatch' || reasonCode === 'weak_clinical_judgment_step'
        ? 'stabilize_confidence'
        : selected.countsTowardReadinessDefault
          ? 'fill_coverage_gap'
          : 'build_exposure',
    primaryReasonCode: reasonCode,
    trustMode,
    learnerExplanationKey: `next_item_${reasonCode}`,
    candidateCount: candidates.length,
    excludedCandidateCount: candidates.length - available.length,
    scoreByItemId,
  }
}

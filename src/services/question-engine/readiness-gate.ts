import type {
  QuestionEngineItem,
  ReadinessExclusionReason,
  ReadinessState,
  RationaleQualityStatus,
} from './types'

export interface ReadinessDecision {
  readinessState: ReadinessState
  countsTowardReadiness: boolean
  readinessExclusionReasons: ReadinessExclusionReason[]
}

const readinessRationaleStatuses: RationaleQualityStatus[] = ['remediation_ready', 'reviewed']

const uniqueReasons = (reasons: ReadinessExclusionReason[]) => Array.from(new Set(reasons))

export function getReadinessDecision(item: QuestionEngineItem): ReadinessDecision {
  const reasons: ReadinessExclusionReason[] = []

  if (item.revisionFlag) reasons.push('revision_flagged')
  if (item.sourceStatus === 'retired' || item.reviewStatus === 'retired') reasons.push('retired_item')
  if (item.sourceStatus === 'source_needed') reasons.push('source_needed')
  if (item.reviewStatus === 'not_reviewed') reasons.push('not_reviewed')
  if (item.generatedOnly) reasons.push('generated_only')
  if (item.contentOrigin === 'user_uploaded_material' || item.contentOrigin === 'generated_material') {
    reasons.push('user_uploaded_material')
  }
  if (!item.hasExplicitClinicalJudgmentStep || !item.hasExplicitNursingProcessStep) {
    reasons.push('missing_metadata')
  }
  if (!item.rationale.correctExplanation.trim()) {
    reasons.push('missing_rationale')
  } else if (!readinessRationaleStatuses.includes(item.rationale.qualityStatus)) {
    reasons.push('rationale_not_remediation_ready')
  }
  if (item.scoringMethod === 'manual_review' || item.scoringMethod === 'not_scored') {
    reasons.push('unknown_scoring')
  }

  const exclusionReasons = uniqueReasons(reasons)

  if (exclusionReasons.includes('retired_item')) {
    return {
      readinessState: 'retired',
      countsTowardReadiness: false,
      readinessExclusionReasons: exclusionReasons,
    }
  }

  if (exclusionReasons.length) {
    return {
      readinessState: 'draft_only',
      countsTowardReadiness: false,
      readinessExclusionReasons: exclusionReasons,
    }
  }

  if (item.sourceStatus === 'sme_verified' || item.reviewStatus === 'sme_verified' || item.reviewStatus === 'analytics_reviewed') {
    return {
      readinessState: 'readiness_trusted',
      countsTowardReadiness: true,
      readinessExclusionReasons: [],
    }
  }

  if (item.sourceStatus === 'source_checked' && item.reviewStatus === 'item_reviewed') {
    return {
      readinessState: 'readiness_eligible',
      countsTowardReadiness: true,
      readinessExclusionReasons: [],
    }
  }

  return {
    readinessState: 'practice_safe',
    countsTowardReadiness: false,
    readinessExclusionReasons: ['insufficient_item_trust'],
  }
}

export const getReadinessState = (item: QuestionEngineItem) =>
  getReadinessDecision(item).readinessState

export const getReadinessExclusionReasons = (item: QuestionEngineItem) =>
  getReadinessDecision(item).readinessExclusionReasons

import { getMisconceptionDefinition } from './diagnosis'
import {
  questionEngineVersions,
  type AttemptDiagnosis,
  type MisconceptionFamily,
  type MisconceptionId,
  type ReadinessExclusionReason,
  type RemediationEvent,
  type RemediationStatus,
  type RemediationTeachingStatus,
  type RemediationTransferDistance,
  type RemediationTransferEvidence,
  type RemediationTransferEvidenceLevel,
  type RepairBlockedReason,
  type RepairOutcome,
} from './types'

interface RouteDefinition {
  routeId: string
  routeLabel: string
  assignedAssetIds: string[]
  assignedRepairItemIds: string[]
  nextActionCopy: (diagnosis: AttemptDiagnosis) => string
}

interface TransferOptions {
  transferDistance?: RemediationTransferDistance
  repairMisconceptionId?: MisconceptionId
  repairMisconceptionFamily?: MisconceptionFamily
  updatedAt?: string
}

const routeCatalog: Record<string, RouteDefinition> = {
  none: {
    routeId: 'confidence_reinforcement',
    routeLabel: 'Confidence reinforcement',
    assignedAssetIds: ['FC-RN-CONFIDENCE-CALIBRATION-0001'],
    assignedRepairItemIds: [],
    nextActionCopy: () =>
      'Reinforce this answer with a quick flashcard because the knowledge is correct but still fragile.',
  },
  priority_rescue_set: {
    routeId: 'priority_rescue_set',
    routeLabel: 'Priority rescue set',
    assignedAssetIds: ['REM-RN-MOC-PRIORITY-CLIENTS-0001'],
    assignedRepairItemIds: ['NC-RN-MOC-PRIORITY-REPAIR-0001'],
    nextActionCopy: () =>
      'Run a priority repair item that asks which client could deteriorate fastest.',
  },
  delegation_boundary_set: {
    routeId: 'delegation_boundary_set',
    routeLabel: 'Delegation boundary set',
    assignedAssetIds: ['REM-RN-MOC-DELEGATION-BOUNDARY-0001'],
    assignedRepairItemIds: ['NC-RN-MOC-DELEGATION-REPAIR-0001'],
    nextActionCopy: () =>
      'Repair the scope boundary: delegate stable tasks, not assessment, teaching, evaluation, or escalation.',
  },
  evaluation_followup_set: {
    routeId: 'evaluation_followup_set',
    routeLabel: 'Evaluation follow-up set',
    assignedAssetIds: ['REM-RN-CJ-EVALUATION-FOLLOWUP-0001'],
    assignedRepairItemIds: ['NC-RN-CJ-EVALUATION-REPAIR-0001'],
    nextActionCopy: () =>
      'Practice closing the loop: reassess the full pattern after the first action.',
  },
  clinical_judgment_step_review: {
    routeId: 'clinical_judgment_step_review',
    routeLabel: 'Clinical judgment step review',
    assignedAssetIds: ['REM-RN-CJ-STEP-REVIEW-0001'],
    assignedRepairItemIds: [],
    nextActionCopy: () =>
      'Review the clinical judgment step, then answer a nearby repair question from a different angle.',
  },
}

const routeForDiagnosis = (diagnosis: AttemptDiagnosis): RouteDefinition => {
  if (diagnosis.scoreResult.isCorrect) return routeCatalog.none
  return routeCatalog[diagnosis.remediationRoute] ?? routeCatalog.clinical_judgment_step_review
}

const firstReadinessBlock = (
  reasons: ReadinessExclusionReason[],
): ReadinessExclusionReason | undefined => reasons[0] ?? undefined

const unique = <T extends string>(values: T[]): T[] => Array.from(new Set(values))

const getInitialBlockedReasons = (diagnosis: AttemptDiagnosis, route: RouteDefinition) => {
  const blockedReasons: RepairBlockedReason[] = []
  if (diagnosis.repairRequired && !route.assignedRepairItemIds.length) {
    blockedReasons.push('no_repair_item')
  }
  if (!diagnosis.countsTowardReadiness) {
    blockedReasons.push('coverage_not_readiness_eligible')
  }
  for (const reason of diagnosis.readinessExclusionReasons) {
    if (reason === 'source_needed') blockedReasons.push('repair_item_source_needed')
    if (reason === 'not_reviewed') blockedReasons.push('repair_item_not_reviewed')
    if (reason === 'revision_flagged') blockedReasons.push('repair_item_revision_active')
    if (reason === 'missing_metadata') blockedReasons.push('insufficient_metadata')
  }
  return unique(blockedReasons)
}

export function routeRemediation(diagnosis: AttemptDiagnosis): RemediationEvent[] {
  if (diagnosis.scoreResult.isCorrect && diagnosis.calibrationScore >= 0.4) return []

  const route = routeForDiagnosis(diagnosis)
  const actionType = diagnosis.scoreResult.isCorrect
    ? 'reinforcement'
    : diagnosis.repairRequired
      ? 'targeted_repair'
      : 'micro_lesson'
  const blockedOfficialRepairReason = diagnosis.countsTowardReadiness
    ? undefined
    : firstReadinessBlock(diagnosis.readinessExclusionReasons) ?? 'insufficient_item_trust'
  const repairAvailable = route.assignedRepairItemIds.length > 0

  return [
    {
      id: `${diagnosis.id}:remediation`,
      diagnosisId: diagnosis.id,
      attemptId: diagnosis.attemptId,
      itemId: diagnosis.itemId,
      status: 'assigned',
      teachingStatus: 'not_started',
      misconceptionId: diagnosis.likelyMisconceptionId,
      misconceptionFamily: diagnosis.misconceptionFamily,
      routeId: route.routeId,
      routeLabel: route.routeLabel,
      actionType,
      assignedAssetIds: route.assignedAssetIds,
      assignedRepairItemIds: route.assignedRepairItemIds,
      repairAvailable,
      repairRequired: diagnosis.repairRequired,
      repairCompleted: false,
      repairSuccess: false,
      officialRepairEligible: diagnosis.countsTowardReadiness && repairAvailable,
      readinessRepairEligible: diagnosis.countsTowardReadiness && repairAvailable,
      blockedOfficialRepairReason,
      blockedReasons: getInitialBlockedReasons(diagnosis, route),
      repairOutcome: 'not_attempted',
      transferDistance: null,
      transferEvidenceLevel: 'none',
      repairItemId: null,
      repairAttemptId: null,
      repairItemTrustSnapshot: null,
      repairMisconceptionId: null,
      repairMisconceptionFamily: null,
      repairScore: null,
      repairConfidence: null,
      repairCalibrationScore: null,
      triggerConfidence: diagnosis.confidence,
      triggerCalibrationScore: diagnosis.calibrationScore,
      triggerSafetySeverity: diagnosis.safetySeverity,
      nextActionCopy: route.nextActionCopy(diagnosis),
      createdAt: diagnosis.createdAt,
      updatedAt: diagnosis.createdAt,
      remediationVersion: questionEngineVersions.remediationTransfer,
    },
  ]
}

const withEngagementState = (
  event: RemediationEvent,
  status: RemediationStatus,
  teachingStatus: RemediationTeachingStatus,
  repairOutcome: RepairOutcome,
  updatedAt: string,
): RemediationEvent => ({
  ...event,
  status,
  teachingStatus,
  repairCompleted: false,
  repairSuccess: false,
  officialRepairEligible: false,
  readinessRepairEligible: false,
  repairOutcome,
  transferEvidenceLevel: 'engagement_only',
  updatedAt,
})

export const markRationaleViewed = (
  event: RemediationEvent,
  viewedAt: string = event.updatedAt,
): RemediationEvent =>
  withEngagementState(event, 'viewed', 'viewed', 'view_only', viewedAt)

export const markTeachingCompleted = (
  event: RemediationEvent,
  completedAt: string = event.updatedAt,
): RemediationEvent =>
  withEngagementState(
    event,
    'completed_teaching',
    'completed',
    'teaching_completed_no_transfer',
    completedAt,
  )

const inferTransferDistance = (
  triggerDiagnosis: AttemptDiagnosis,
  repairDiagnosis: AttemptDiagnosis,
): RemediationTransferDistance => {
  if (repairDiagnosis.itemId === triggerDiagnosis.itemId) return 'same_item'

  return repairDiagnosis.itemTrustSnapshot.countsTowardReadiness &&
    repairDiagnosis.itemTrustSnapshot.readinessExclusionReasons.length === 0
    ? 'trusted_parallel_item'
    : 'parallel_item_same_family'
}

const getRepairTarget = (
  repairDiagnosis: AttemptDiagnosis,
  options: TransferOptions,
) => {
  const repairMisconceptionId = options.repairMisconceptionId ??
    (repairDiagnosis.likelyMisconceptionId === 'unknown_misconception'
      ? undefined
      : repairDiagnosis.likelyMisconceptionId)
  const repairMisconceptionFamily = options.repairMisconceptionFamily ??
    (repairMisconceptionId
      ? getMisconceptionDefinition(repairMisconceptionId).family
      : repairDiagnosis.misconceptionFamily === 'unknown'
        ? undefined
        : repairDiagnosis.misconceptionFamily)

  return {
    repairMisconceptionId: repairMisconceptionId ?? 'unknown_misconception',
    repairMisconceptionFamily: repairMisconceptionFamily ?? 'unknown',
  }
}

const getTrustBlockedReasons = (repairDiagnosis: AttemptDiagnosis): RepairBlockedReason[] => {
  const blockedReasons: RepairBlockedReason[] = []
  const snapshot = repairDiagnosis.itemTrustSnapshot

  if (!snapshot.countsTowardReadiness) blockedReasons.push('repair_item_not_trusted')
  for (const reason of snapshot.readinessExclusionReasons) {
    if (reason === 'source_needed') blockedReasons.push('repair_item_source_needed')
    if (reason === 'not_reviewed') blockedReasons.push('repair_item_not_reviewed')
    if (reason === 'revision_flagged') blockedReasons.push('repair_item_revision_active')
    if (reason === 'missing_metadata') blockedReasons.push('insufficient_metadata')
  }

  return blockedReasons
}

const getRepairOutcomeState = (
  transferDistance: RemediationTransferDistance,
  readinessRepairEligible: boolean,
  strongPerformance: boolean,
  misconceptionMatches: boolean,
  confidenceGatePassed: boolean,
): {
  status: RemediationStatus
  repairOutcome: RepairOutcome
  transferEvidenceLevel: RemediationTransferEvidenceLevel
} => {
  if (transferDistance === 'same_item') {
    return {
      status: 'same_item_repeated',
      repairOutcome: 'same_item_repeat',
      transferEvidenceLevel: 'same_item_recall',
    }
  }

  if (!strongPerformance || !misconceptionMatches) {
    return {
      status: 'unresolved',
      repairOutcome: strongPerformance ? 'repair_blocked' : 'repair_failed',
      transferEvidenceLevel: 'none',
    }
  }

  if (readinessRepairEligible && confidenceGatePassed) {
    return {
      status: 'officially_repaired',
      repairOutcome: 'official_repair',
      transferEvidenceLevel: 'official_transfer',
    }
  }

  if (readinessRepairEligible) {
    return {
      status: 'trusted_repair_supported',
      repairOutcome: 'trusted_repair_supported',
      transferEvidenceLevel: 'trusted_transfer_supported',
    }
  }

  if (transferDistance === 'same_case') {
    return {
      status: 'same_case_practice_repaired',
      repairOutcome: 'practice_repair_supported',
      transferEvidenceLevel: 'practice_transfer',
    }
  }

  return {
    status: 'parallel_practice_repaired',
    repairOutcome: 'practice_repair_supported',
    transferEvidenceLevel: 'practice_transfer',
  }
}

export function evaluateRemediationTransfer(
  event: RemediationEvent,
  triggerDiagnosis: AttemptDiagnosis,
  repairDiagnosis: AttemptDiagnosis,
  options: TransferOptions = {},
): RemediationEvent {
  const transferDistance = options.transferDistance ??
    inferTransferDistance(triggerDiagnosis, repairDiagnosis)
  const { repairMisconceptionId, repairMisconceptionFamily } = getRepairTarget(
    repairDiagnosis,
    options,
  )
  const sameMisconceptionId =
    triggerDiagnosis.likelyMisconceptionId !== 'unknown_misconception' &&
    repairMisconceptionId === triggerDiagnosis.likelyMisconceptionId
  const sameMisconceptionFamily =
    triggerDiagnosis.misconceptionFamily !== 'unknown' &&
    repairMisconceptionFamily === triggerDiagnosis.misconceptionFamily
  const misconceptionMatches = sameMisconceptionId || sameMisconceptionFamily
  const strongPerformance =
    repairDiagnosis.scoreResult.isCorrect || repairDiagnosis.scoreResult.partialCreditScore >= 0.85
  const scoreImproved =
    repairDiagnosis.scoreResult.partialCreditScore > triggerDiagnosis.scoreResult.partialCreditScore
  const calibrationImproved = repairDiagnosis.calibrationScore > triggerDiagnosis.calibrationScore
  const confidenceGatePassed =
    calibrationImproved &&
    (triggerDiagnosis.confidence !== 'high' || repairDiagnosis.confidence !== 'low')
  const readinessRepairEligible =
    (transferDistance === 'trusted_parallel_item' || transferDistance === 'delayed_recheck') &&
    repairDiagnosis.itemTrustSnapshot.countsTowardReadiness &&
    repairDiagnosis.itemTrustSnapshot.readinessExclusionReasons.length === 0
  const blockedReasons: RepairBlockedReason[] = [
    ...event.blockedReasons.filter((reason) => reason === 'no_repair_item'),
  ]

  if (transferDistance === 'same_item') blockedReasons.push('same_item_repeat')
  if (!misconceptionMatches) blockedReasons.push('misconception_mismatch')
  if (!scoreImproved || !strongPerformance) blockedReasons.push('score_not_improved')
  if (!confidenceGatePassed) blockedReasons.push('confidence_not_improved')
  if (!readinessRepairEligible) blockedReasons.push(...getTrustBlockedReasons(repairDiagnosis))

  const outcome = getRepairOutcomeState(
    transferDistance,
    readinessRepairEligible,
    strongPerformance,
    misconceptionMatches,
    confidenceGatePassed,
  )
  const repairSuccess = outcome.repairOutcome === 'official_repair'

  return {
    ...event,
    status: outcome.status,
    teachingStatus:
      event.teachingStatus === 'not_started' ? 'viewed' : event.teachingStatus,
    repairCompleted: true,
    repairSuccess,
    officialRepairEligible: readinessRepairEligible,
    readinessRepairEligible,
    blockedOfficialRepairReason: readinessRepairEligible
      ? undefined
      : firstReadinessBlock(repairDiagnosis.itemTrustSnapshot.readinessExclusionReasons) ??
        event.blockedOfficialRepairReason,
    blockedReasons: unique(blockedReasons),
    repairOutcome: outcome.repairOutcome,
    transferDistance,
    transferEvidenceLevel: outcome.transferEvidenceLevel,
    repairItemId: repairDiagnosis.itemId,
    repairAttemptId: repairDiagnosis.attemptId,
    repairItemTrustSnapshot: repairDiagnosis.itemTrustSnapshot,
    repairMisconceptionId,
    repairMisconceptionFamily,
    repairScore: repairDiagnosis.scoreResult.partialCreditScore,
    repairConfidence: repairDiagnosis.confidence,
    repairCalibrationScore: repairDiagnosis.calibrationScore,
    updatedAt: options.updatedAt ?? repairDiagnosis.createdAt,
  }
}

export const buildRemediationTransferEvidence = (
  event: RemediationEvent,
): RemediationTransferEvidence => ({
  remediationEventId: event.id,
  triggerAttemptId: event.attemptId,
  triggerDiagnosisId: event.diagnosisId,
  triggerItemId: event.itemId,
  triggerMisconceptionId: event.misconceptionId,
  triggerMisconceptionFamily: event.misconceptionFamily,
  triggerSafetySeverity: event.triggerSafetySeverity,
  triggerConfidence: event.triggerConfidence,
  triggerCalibrationScore: event.triggerCalibrationScore,
  assignedRoute: event.routeId,
  assignedAssetIds: event.assignedAssetIds,
  teachingStatus: event.teachingStatus,
  repairItemId: event.repairItemId,
  repairAttemptId: event.repairAttemptId,
  repairItemTrustSnapshot: event.repairItemTrustSnapshot,
  repairMisconceptionId: event.repairMisconceptionId,
  repairMisconceptionFamily: event.repairMisconceptionFamily,
  repairScore: event.repairScore,
  repairConfidence: event.repairConfidence,
  repairCalibrationScore: event.repairCalibrationScore,
  transferDistance: event.transferDistance,
  readinessRepairEligible: event.readinessRepairEligible,
  repairSuccess: event.repairSuccess,
  repairOutcome: event.repairOutcome,
  blockedReasons: event.blockedReasons,
  evidenceLevel: event.transferEvidenceLevel,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
  remediationVersion: event.remediationVersion,
})

import { questionEngineVersions } from './types'
import type {
  AttemptDiagnosis,
  LearnerMasteryVector,
  MasteryDimensionStats,
  QuestionEngineItem,
  ReadinessSnapshot,
  RemediationEvent,
} from './types'

export type QuestionEngineSnapshotType =
  | 'session_summary'
  | 'learner_dashboard'
  | 'weekly_report'
  | 'school_report_preview'
  | 'internal_qa'

export interface QuestionItemPersistenceRow {
  item_id: string
  exam_tracks: string[]
  content_type: string
  client_need: string
  subcategory: string
  clinical_judgment_step: string
  nursing_process_step: string
  body_system: string | null
  topic: string | null
  difficulty: string | null
  item_type: string
  scoring_method: string
  priority_frameworks: string[]
  safety_flags: string[]
  safety_severity: string
  source_status: string
  review_status: string
  readiness_state: string
  readiness_exclusion_reasons: string[]
  source_refs: string[]
  rationale_quality_status: string
  misconception_tested: string | null
  distractor_misconceptions: Record<string, string>
  content_hash: string
  metadata_version: string
  revision_flag: boolean
  retired_at: string | null
  updated_at: string
}

export interface AttemptDiagnosisPersistenceRow {
  idempotency_key: string
  engine_diagnosis_id: string
  user_id: string
  attempt_id: string
  item_id: string
  exam_track: string
  selected_answer: string[]
  selected_distractor_ids: string[]
  unsafe_extra_selection_ids: string[]
  is_correct: boolean
  raw_score: number
  max_score: number
  partial_credit_score: number | null
  scoring_method: string
  scoring_contract_version: string
  scoring_warnings: string[]
  confidence: string
  calibration_score: number
  confidence_escalated: boolean
  likely_misconception_id: string
  misconception_family: string
  misconception_confidence: number
  diagnosis_source: string
  diagnosis_evidence_level: string
  learner_copy_certainty: string
  performance_band: string
  confidence_signal: string
  confidence_mismatch: boolean
  weak_area_dimensions: AttemptDiagnosis['weakAreaDimensions']
  weak_area_tags: string[]
  clinical_judgment_step: string
  nursing_process_step: string
  client_need: string
  subcategory: string
  item_type: string
  safety_severity: string
  remediation_route: string
  repair_required: boolean
  counts_toward_readiness: boolean
  can_show_as_durable_weak_area: boolean
  can_count_toward_official_readiness: boolean
  readiness_exclusion_reasons: string[]
  readiness_state_snapshot: string
  item_trust_snapshot: AttemptDiagnosis['itemTrustSnapshot']
  diagnosis_version: string
  misconception_vocabulary_version: string
  completed_at: string
  updated_at: string
}

export interface RemediationEventPersistenceRow {
  idempotency_key: string
  engine_remediation_event_id: string
  user_id: string
  trigger_attempt_id: string
  trigger_diagnosis_id: string | null
  trigger_engine_diagnosis_id: string
  item_id: string
  exam_track: string
  misconception_id: string
  misconception_family: string
  safety_severity: string
  remediation_route: string
  route_label: string
  action_type: string
  assigned_asset_ids: string[]
  assigned_repair_item_ids: string[]
  repair_available: boolean
  repair_required: boolean
  repair_completed: boolean
  repair_success: boolean
  official_repair_eligible: boolean
  readiness_repair_eligible: boolean
  status: string
  teaching_status: string
  blocked_official_repair_reason: string | null
  blocked_reasons: string[]
  repair_outcome: string
  transfer_distance: string | null
  repair_evidence_level: string
  repair_item_id: string | null
  repair_attempt_id: string | null
  repair_engine_attempt_id: string | null
  repair_diagnosis_id: string | null
  repair_engine_diagnosis_id: string | null
  repair_item_trust_snapshot: RemediationEvent['repairItemTrustSnapshot']
  repair_misconception_id: string | null
  repair_misconception_family: string | null
  repair_score: number | null
  repair_confidence: string | null
  repair_calibration_score: number | null
  trigger_confidence: string
  trigger_calibration_score: number
  next_action_copy: string
  remediation_version: string
  updated_at: string
}

export interface LearnerMasteryVectorPersistenceRow {
  idempotency_key: string
  vector_version: string
  user_id: string
  exam_track: string
  dimension_type: string
  dimension_id: string
  evidence_scope: string
  attempt_count: number
  trusted_attempt_count: number
  practice_attempt_count: number
  readiness_attempt_count: number
  score_total: number
  max_score_total: number
  avg_score: number
  accuracy: number
  readiness_accuracy: number
  avg_calibration_score: number
  calibration_trend: string
  high_confidence_miss_count: number
  low_confidence_correct_count: number
  confidence_mismatch_score: number
  remediation_assigned_count: number
  remediation_repaired_count: number
  active_repair_count: number
  unresolved_high_severity_count: number
  practice_signal_count: number
  trusted_signal_count: number
  untrusted_signal_count: number
  recurrence_count: number
  exposure_level: string
  evidence_level: string
  selection_weight: number
  readiness_weight: number
  active_exclusion_reasons: string[]
  source_record_refs: Array<Record<string, string>>
  mastery_score: number
  weakness_score: number
  mastery_level: string
  first_attempt_at: string | null
  last_attempt_at: string | null
  last_trusted_attempt_at: string | null
  calculated_at: string
  updated_at: string
}

export interface ItemStatsPersistenceRow {
  item_id: string
  attempt_count: number
  readiness_attempt_count: number
  percent_correct: number
  avg_time_seconds: number
  most_selected_distractor_id: string | null
  distractor_distribution: Record<string, number>
  high_confidence_miss_rate: number
  low_confidence_correct_rate: number
  avg_calibration_score: number
  calibration_state: string
  difficulty_source: string
  observed_difficulty_band: string
  scoring_stability: string
  exposure_count_recent: number
  exposure_cap_status: string
  calibration_blocked_reasons: string[]
  quality_flags: Array<Record<string, string>>
  quality_severity: string
  analytics_review_status: string
  updated_at: string
}

export interface ReadinessSnapshotPersistenceRow {
  idempotency_key: string
  snapshot_version: string
  user_id: string
  exam_track: string
  snapshot_type: QuestionEngineSnapshotType
  snapshot_scope: string
  snapshot_period_or_session_id: string
  readiness_band: ReadinessSnapshot['status']
  readiness_score: number | null
  readiness_score_available: boolean
  trusted_attempt_count: number
  practice_attempt_count: number
  excluded_attempt_count: number
  trusted_item_count: number
  practice_item_count: number
  evidence_requirements_met: boolean
  exclusion_counts: ReadinessSnapshot['exclusionCounts']
  top_weak_dimensions: ReadinessSnapshot['topWeakDimensions']
  top_confidence_risks: ReadinessSnapshot['topConfidenceRisks']
  remediation_summary: ReadinessSnapshot['remediationSummary']
  session_summary: Record<string, unknown>
  quality_metric_summary: Record<string, unknown>
  content_trust_summary: ReadinessSnapshot['contentTrustSummary']
  coverage_summary: ReadinessSnapshot['coverageSummary']
  confidence_calibration_summary: ReadinessSnapshot['confidenceCalibrationSummary']
  safety_recovery_summary: ReadinessSnapshot['safetyRecoverySummary']
  coverage_gaps: ReadinessSnapshot['coverageGaps']
  clinical_judgment_balance: number
  coverage_requirements_met: boolean
  claim_evidence_record_ids: string[]
  required_claims_present: boolean
  reconstruction_status: string
  blocked_reasons: string[]
  learner_copy_keys: string[]
  school_reporting_allowed: boolean
  fallback_to_overall_accuracy: boolean
  show_practice_progress_separately: boolean
  calculation_version: string
  calculation_versions: Record<string, string>
  next_best_action: string
  generated_at: string
}

export interface ClaimEvidenceRecordPersistenceRow {
  idempotency_key: string
  claim_id: string
  user_id: string
  exam_track: string
  claim_category: string
  claim_surface: string
  claim_text_key: string
  claim_strength: string
  trust_label: string
  evidence_record_refs: Array<Record<string, unknown>>
  required_records_present: boolean
  item_trust_summary: ReadinessSnapshot['contentTrustSummary']
  reconstruction_status: string
  blocked_reasons: string[]
  can_show_to_learner: boolean
  can_show_to_school: boolean
  can_count_toward_official_readiness: boolean
  calculation_versions: Record<string, string>
  created_at: string
  expires_at: string | null
}

export interface BackendReconstructionResult {
  reconstructionId: string
  userId: string
  examTrack: string
  snapshotPeriodOrSessionId: string
  sourceRecordCount: number
  trustedAttemptCount: number
  practiceAttemptCount: number
  readinessBandMatches: boolean
  readinessScoreDelta: number | null
  exclusionCountsMatch: boolean
  coverageGapsMatch: boolean
  remediationSummaryMatches: boolean
  claimEvidenceRefsMatch: boolean
  pass: boolean
  failureReasons: string[]
}

export interface QuestionEnginePersistenceBundle {
  questionItemRows: QuestionItemPersistenceRow[]
  attemptDiagnosisRows: AttemptDiagnosisPersistenceRow[]
  remediationEventRows: RemediationEventPersistenceRow[]
  learnerMasteryVectorRows: LearnerMasteryVectorPersistenceRow[]
  itemStatsRows: ItemStatsPersistenceRow[]
  readinessSnapshotRow: ReadinessSnapshotPersistenceRow
  claimEvidenceRecordRows: ClaimEvidenceRecordPersistenceRow[]
  reconstructionResult: BackendReconstructionResult
  liveSchoolReportingEnabled: false
}

export interface BuildQuestionEnginePersistenceBundleInput {
  userId: string
  examTrack: string
  diagnoses: AttemptDiagnosis[]
  remediationEvents?: RemediationEvent[]
  masteryVector: LearnerMasteryVector
  readinessSnapshot: ReadinessSnapshot
  questionItems?: QuestionEngineItem[]
  rawAttemptIdByAttemptId?: Record<string, string>
  snapshotType?: QuestionEngineSnapshotType
  snapshotPeriodOrSessionId?: string
  generatedAt?: string
}

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

const contentHash = (item: QuestionEngineItem) =>
  stableJson({
    itemId: item.itemId,
    choices: item.choices,
    correctAnswer: item.correctAnswer,
    rationale: item.rationale,
    readinessState: item.readinessState,
    sourceStatus: item.sourceStatus,
    reviewStatus: item.reviewStatus,
  })

const roundMetric = (value: number) => Math.round(value * 1000) / 1000

const persistenceKey = (...parts: string[]) =>
  parts.map((part) => part.replaceAll(':', '_')).join(':')

export const buildQuestionItemPersistenceRow = (
  item: QuestionEngineItem,
  updatedAt = new Date().toISOString(),
): QuestionItemPersistenceRow => ({
  item_id: item.itemId,
  exam_tracks: [item.examTrack],
  content_type: 'standalone_question',
  client_need: item.clientNeed,
  subcategory: item.subcategory,
  clinical_judgment_step: item.clinicalJudgmentStep,
  nursing_process_step: item.nursingProcessStep,
  body_system: item.bodySystem ?? null,
  topic: item.topic ?? null,
  difficulty: item.contentPipelineStatus ?? null,
  item_type: item.itemType,
  scoring_method: item.scoringMethod,
  priority_frameworks: item.priorityFrameworks,
  safety_flags: item.safetyFlags,
  safety_severity: item.safetySeverity,
  source_status: item.sourceStatus,
  review_status: item.reviewStatus,
  readiness_state: item.readinessState,
  readiness_exclusion_reasons: item.readinessExclusionReasons,
  source_refs: item.candidateSourceRefs,
  rationale_quality_status: item.rationale.qualityStatus,
  misconception_tested: item.misconceptionTested ?? null,
  distractor_misconceptions: item.distractorMisconceptions,
  content_hash: contentHash(item),
  metadata_version: questionEngineVersions.itemMetadata,
  revision_flag: item.revisionFlag,
  retired_at: item.readinessState === 'retired' ? updatedAt : null,
  updated_at: updatedAt,
})

const getRawAttemptId = (
  diagnosis: AttemptDiagnosis,
  rawAttemptIdByAttemptId: Record<string, string>,
) => rawAttemptIdByAttemptId[diagnosis.attemptId] ?? diagnosis.attemptId

export const buildAttemptDiagnosisPersistenceRow = (
  userId: string,
  examTrack: string,
  diagnosis: AttemptDiagnosis,
  rawAttemptIdByAttemptId: Record<string, string> = {},
): AttemptDiagnosisPersistenceRow => ({
  idempotency_key: persistenceKey(userId, diagnosis.id, diagnosis.diagnosisVersion),
  engine_diagnosis_id: diagnosis.id,
  user_id: userId,
  attempt_id: getRawAttemptId(diagnosis, rawAttemptIdByAttemptId),
  item_id: diagnosis.itemId,
  exam_track: examTrack,
  selected_answer: diagnosis.selectedAnswer,
  selected_distractor_ids: diagnosis.scoreResult.selectedDistractorIds,
  unsafe_extra_selection_ids: [],
  is_correct: diagnosis.scoreResult.isCorrect,
  raw_score: diagnosis.scoreResult.rawScore,
  max_score: diagnosis.scoreResult.maxScore,
  partial_credit_score: diagnosis.scoreResult.maxScore ? diagnosis.scoreResult.partialCreditScore : null,
  scoring_method: diagnosis.scoreResult.scoringMethod,
  scoring_contract_version: diagnosis.diagnosisVersion,
  scoring_warnings: [],
  confidence: diagnosis.confidence,
  calibration_score: diagnosis.calibrationScore,
  confidence_escalated: diagnosis.confidenceEscalated,
  likely_misconception_id: diagnosis.likelyMisconceptionId,
  misconception_family: diagnosis.misconceptionFamily,
  misconception_confidence: diagnosis.misconceptionConfidence,
  diagnosis_source: diagnosis.diagnosisSource,
  diagnosis_evidence_level: diagnosis.evidenceLevel,
  learner_copy_certainty: diagnosis.learnerCopyCertainty,
  performance_band: diagnosis.performanceBand,
  confidence_signal: diagnosis.confidenceSignal,
  confidence_mismatch: diagnosis.confidenceMismatch,
  weak_area_dimensions: diagnosis.weakAreaDimensions,
  weak_area_tags: diagnosis.weakAreaTags,
  clinical_judgment_step: diagnosis.clinicalJudgmentStep,
  nursing_process_step: diagnosis.nursingProcessStep,
  client_need: diagnosis.clientNeed,
  subcategory: diagnosis.subcategory,
  item_type: diagnosis.itemType,
  safety_severity: diagnosis.safetySeverity,
  remediation_route: diagnosis.remediationRoute,
  repair_required: diagnosis.repairRequired,
  counts_toward_readiness: diagnosis.countsTowardReadiness,
  can_show_as_durable_weak_area: diagnosis.canShowAsDurableWeakArea,
  can_count_toward_official_readiness: diagnosis.canCountTowardOfficialReadiness,
  readiness_exclusion_reasons: diagnosis.readinessExclusionReasons,
  readiness_state_snapshot: diagnosis.itemTrustSnapshot.readinessState,
  item_trust_snapshot: diagnosis.itemTrustSnapshot,
  diagnosis_version: diagnosis.diagnosisVersion,
  misconception_vocabulary_version: diagnosis.misconceptionVocabularyVersion,
  completed_at: diagnosis.createdAt,
  updated_at: diagnosis.createdAt,
})

export const buildRemediationEventPersistenceRow = (
  userId: string,
  examTrack: string,
  event: RemediationEvent,
  rawAttemptIdByAttemptId: Record<string, string> = {},
): RemediationEventPersistenceRow => ({
  idempotency_key: persistenceKey(userId, event.id, event.remediationVersion),
  engine_remediation_event_id: event.id,
  user_id: userId,
  trigger_attempt_id: rawAttemptIdByAttemptId[event.attemptId] ?? event.attemptId,
  trigger_diagnosis_id: null,
  trigger_engine_diagnosis_id: event.diagnosisId,
  item_id: event.itemId,
  exam_track: examTrack,
  misconception_id: event.misconceptionId,
  misconception_family: event.misconceptionFamily,
  safety_severity: event.triggerSafetySeverity,
  remediation_route: event.routeId,
  route_label: event.routeLabel,
  action_type: event.actionType,
  assigned_asset_ids: event.assignedAssetIds,
  assigned_repair_item_ids: event.assignedRepairItemIds,
  repair_available: event.repairAvailable,
  repair_required: event.repairRequired,
  repair_completed: event.repairCompleted,
  repair_success: event.repairSuccess,
  official_repair_eligible: event.officialRepairEligible,
  readiness_repair_eligible: event.readinessRepairEligible,
  status: event.status,
  teaching_status: event.teachingStatus,
  blocked_official_repair_reason: event.blockedOfficialRepairReason ?? null,
  blocked_reasons: event.blockedReasons,
  repair_outcome: event.repairOutcome,
  transfer_distance: event.transferDistance,
  repair_evidence_level: event.transferEvidenceLevel,
  repair_item_id: event.repairItemId,
  repair_attempt_id: event.repairAttemptId
    ? rawAttemptIdByAttemptId[event.repairAttemptId] ?? event.repairAttemptId
    : null,
  repair_engine_attempt_id: event.repairAttemptId,
  repair_diagnosis_id: null,
  repair_engine_diagnosis_id: null,
  repair_item_trust_snapshot: event.repairItemTrustSnapshot,
  repair_misconception_id: event.repairMisconceptionId,
  repair_misconception_family: event.repairMisconceptionFamily,
  repair_score: event.repairScore,
  repair_confidence: event.repairConfidence,
  repair_calibration_score: event.repairCalibrationScore,
  trigger_confidence: event.triggerConfidence,
  trigger_calibration_score: event.triggerCalibrationScore,
  next_action_copy: event.nextActionCopy,
  remediation_version: event.remediationVersion,
  updated_at: event.updatedAt,
})

const sourceRefsForDimension = (dimension: MasteryDimensionStats) => [
  {
    dimensionType: dimension.dimensionType,
    dimensionId: dimension.dimensionId,
    evidenceScope: dimension.evidenceScope,
  },
]

export const buildLearnerMasteryVectorPersistenceRows = (
  userId: string,
  examTrack: string,
  masteryVector: LearnerMasteryVector,
): LearnerMasteryVectorPersistenceRow[] =>
  Object.values(masteryVector.dimensions).map((dimension) => ({
    idempotency_key: persistenceKey(userId, examTrack, dimension.dimensionType, dimension.dimensionId),
    vector_version: '2026-06-23-learner-mastery-persistence-v1',
    user_id: userId,
    exam_track: examTrack,
    dimension_type: dimension.dimensionType,
    dimension_id: dimension.dimensionId,
    evidence_scope: dimension.evidenceScope,
    attempt_count: dimension.attemptCount,
    trusted_attempt_count: dimension.trustedAttemptCount,
    practice_attempt_count: dimension.practiceAttemptCount,
    readiness_attempt_count: dimension.readinessAttemptCount,
    score_total: dimension.scoreTotal,
    max_score_total: dimension.maxScoreTotal,
    avg_score: roundMetric(dimension.avgScore),
    accuracy: roundMetric(dimension.accuracy),
    readiness_accuracy: roundMetric(dimension.readinessAccuracy),
    avg_calibration_score: roundMetric(dimension.avgCalibrationScore),
    calibration_trend: dimension.calibrationTrend,
    high_confidence_miss_count: dimension.highConfidenceMissCount,
    low_confidence_correct_count: dimension.lowConfidenceCorrectCount,
    confidence_mismatch_score: roundMetric(dimension.confidenceMismatchScore),
    remediation_assigned_count: dimension.remediationAssignedCount,
    remediation_repaired_count: dimension.remediationRepairedCount,
    active_repair_count: dimension.activeRepairCount,
    unresolved_high_severity_count: dimension.unresolvedHighSeverityCount,
    practice_signal_count: dimension.practiceSignalCount,
    trusted_signal_count: dimension.trustedSignalCount,
    untrusted_signal_count: dimension.untrustedSignalCount,
    recurrence_count: dimension.recurrenceCount,
    exposure_level: dimension.exposureLevel,
    evidence_level: dimension.evidenceLevel,
    selection_weight: roundMetric(dimension.selectionWeight),
    readiness_weight: roundMetric(dimension.readinessWeight),
    active_exclusion_reasons: dimension.activeExclusionReasons,
    source_record_refs: sourceRefsForDimension(dimension),
    mastery_score: roundMetric(dimension.masteryScore),
    weakness_score: roundMetric(dimension.weaknessScore),
    mastery_level: dimension.masteryLevel,
    first_attempt_at: dimension.firstAttemptAt,
    last_attempt_at: dimension.latestAttemptAt,
    last_trusted_attempt_at: dimension.latestTrustedAttemptAt,
    calculated_at: masteryVector.updatedAt,
    updated_at: masteryVector.updatedAt,
  }))

export const buildItemStatsPersistenceRows = (
  diagnoses: AttemptDiagnosis[],
  updatedAt = new Date().toISOString(),
): ItemStatsPersistenceRow[] => {
  const byItem = new Map<string, AttemptDiagnosis[]>()
  for (const diagnosis of diagnoses) {
    byItem.set(diagnosis.itemId, [...(byItem.get(diagnosis.itemId) ?? []), diagnosis])
  }

  return Array.from(byItem.entries()).map(([itemId, itemDiagnoses]) => {
    const scoreTotal = itemDiagnoses.reduce((sum, diagnosis) => sum + diagnosis.scoreResult.rawScore, 0)
    const maxScoreTotal = itemDiagnoses.reduce((sum, diagnosis) => sum + diagnosis.scoreResult.maxScore, 0)
    const distractorDistribution: Record<string, number> = {}
    for (const diagnosis of itemDiagnoses) {
      for (const distractorId of diagnosis.scoreResult.selectedDistractorIds) {
        distractorDistribution[distractorId] = (distractorDistribution[distractorId] ?? 0) + 1
      }
    }
    const mostSelectedDistractorId =
      Object.entries(distractorDistribution).toSorted((left, right) => right[1] - left[1])[0]?.[0] ?? null
    const highConfidenceMissCount = itemDiagnoses.filter(
      (diagnosis) => diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect,
    ).length
    const lowConfidenceCorrectCount = itemDiagnoses.filter(
      (diagnosis) => diagnosis.confidenceSignal === 'fragile_correct',
    ).length

    return {
      item_id: itemId,
      attempt_count: itemDiagnoses.length,
      readiness_attempt_count: itemDiagnoses.filter((diagnosis) => diagnosis.countsTowardReadiness).length,
      percent_correct: roundMetric(maxScoreTotal ? scoreTotal / maxScoreTotal : 0),
      avg_time_seconds: 0,
      most_selected_distractor_id: mostSelectedDistractorId,
      distractor_distribution: distractorDistribution,
      high_confidence_miss_rate: roundMetric(highConfidenceMissCount / Math.max(itemDiagnoses.length, 1)),
      low_confidence_correct_rate: roundMetric(lowConfidenceCorrectCount / Math.max(itemDiagnoses.length, 1)),
      avg_calibration_score: roundMetric(
        itemDiagnoses.reduce((sum, diagnosis) => sum + diagnosis.calibrationScore, 0) /
          Math.max(itemDiagnoses.length, 1),
      ),
      calibration_state: itemDiagnoses.some((diagnosis) => diagnosis.countsTowardReadiness)
        ? 'trusted_observed'
        : 'practice_observed',
      difficulty_source: 'observed_practice_behavior',
      observed_difficulty_band: itemDiagnoses.length < 20 ? 'insufficient_volume' : 'target_range',
      scoring_stability: itemDiagnoses.every((diagnosis) => diagnosis.scoreResult.maxScore > 0)
        ? 'stable'
        : 'insufficient_metadata',
      exposure_count_recent: itemDiagnoses.length,
      exposure_cap_status: 'within_cap',
      calibration_blocked_reasons: itemDiagnoses.some((diagnosis) => diagnosis.countsTowardReadiness)
        ? []
        : ['practice_only_data'],
      quality_flags: [],
      quality_severity: highConfidenceMissCount ? 'medium' : 'low',
      analytics_review_status: itemDiagnoses.length < 20 ? 'insufficient_volume' : 'pending_review',
      updated_at: updatedAt,
    }
  })
}

const buildReadinessClaimEvidenceRecord = (
  userId: string,
  examTrack: string,
  snapshot: ReadinessSnapshot,
  snapshotPeriodOrSessionId: string,
): ClaimEvidenceRecordPersistenceRow => {
  const claimId = `readiness:${userId}:${examTrack}:${snapshotPeriodOrSessionId}`
  const claimSupported = snapshot.evidenceRequirementsMet && snapshot.readinessScoreAvailable

  return {
    idempotency_key: persistenceKey(userId, claimId, snapshot.readinessVersion),
    claim_id: claimId,
    user_id: userId,
    exam_track: examTrack,
    claim_category: 'readiness_status',
    claim_surface: 'learner_dashboard',
    claim_text_key: snapshot.learnerCopyKeys[0] ?? 'readiness_snapshot_insufficient_evidence',
    claim_strength: claimSupported ? 'official_readiness_supported' : 'blocked',
    trust_label: claimSupported ? 'readiness_evidence' : 'insufficient_evidence',
    evidence_record_refs: [
      {
        source: 'readiness_snapshot',
        snapshotPeriodOrSessionId,
        readinessVersion: snapshot.readinessVersion,
      },
    ],
    required_records_present: claimSupported,
    item_trust_summary: snapshot.contentTrustSummary,
    reconstruction_status: snapshot.reconstructionStatus,
    blocked_reasons: snapshot.blockedReasons,
    can_show_to_learner: true,
    can_show_to_school: false,
    can_count_toward_official_readiness: claimSupported,
    calculation_versions: snapshot.calculationVersions,
    created_at: snapshot.generatedAt,
    expires_at: null,
  }
}

export const buildReadinessSnapshotPersistenceRow = (
  userId: string,
  examTrack: string,
  snapshot: ReadinessSnapshot,
  snapshotType: QuestionEngineSnapshotType,
  snapshotPeriodOrSessionId: string,
  claimEvidenceRecordIds: string[],
): ReadinessSnapshotPersistenceRow => ({
  idempotency_key: persistenceKey(userId, examTrack, snapshotType, snapshotPeriodOrSessionId, snapshot.readinessVersion),
  snapshot_version: snapshot.readinessVersion,
  user_id: userId,
  exam_track: examTrack,
  snapshot_type: snapshotType,
  snapshot_scope: snapshot.snapshotScope,
  snapshot_period_or_session_id: snapshotPeriodOrSessionId,
  readiness_band: snapshot.status,
  readiness_score: snapshot.readinessScoreAvailable ? snapshot.readinessScore : null,
  readiness_score_available: snapshot.readinessScoreAvailable,
  trusted_attempt_count: snapshot.trustedAttemptCount,
  practice_attempt_count: snapshot.practiceAttemptCount,
  excluded_attempt_count: snapshot.excludedAttemptCount,
  trusted_item_count: snapshot.trustedItemCount,
  practice_item_count: snapshot.practiceItemCount,
  evidence_requirements_met: snapshot.evidenceRequirementsMet,
  exclusion_counts: snapshot.exclusionCounts,
  top_weak_dimensions: snapshot.topWeakDimensions,
  top_confidence_risks: snapshot.topConfidenceRisks,
  remediation_summary: snapshot.remediationSummary,
  session_summary: {},
  quality_metric_summary: {},
  content_trust_summary: snapshot.contentTrustSummary,
  coverage_summary: snapshot.coverageSummary,
  confidence_calibration_summary: snapshot.confidenceCalibrationSummary,
  safety_recovery_summary: snapshot.safetyRecoverySummary,
  coverage_gaps: snapshot.coverageGaps,
  clinical_judgment_balance: snapshot.clinicalJudgmentBalance,
  coverage_requirements_met: snapshot.coverageRequirementsMet,
  claim_evidence_record_ids: claimEvidenceRecordIds,
  required_claims_present: snapshot.requiredClaimsPresent,
  reconstruction_status: snapshot.reconstructionStatus,
  blocked_reasons: snapshot.blockedReasons,
  learner_copy_keys: snapshot.learnerCopyKeys,
  school_reporting_allowed: false,
  fallback_to_overall_accuracy: false,
  show_practice_progress_separately: snapshot.showPracticeProgressSeparately,
  calculation_version: snapshot.readinessVersion,
  calculation_versions: snapshot.calculationVersions,
  next_best_action: snapshot.nextBestAction,
  generated_at: snapshot.generatedAt,
})

export const reconstructReadinessSnapshotFromPersistenceRows = (
  userId: string,
  examTrack: string,
  snapshot: ReadinessSnapshot,
  snapshotRow: ReadinessSnapshotPersistenceRow,
  diagnosisRows: AttemptDiagnosisPersistenceRow[],
  remediationRows: RemediationEventPersistenceRow[],
  claimRows: ClaimEvidenceRecordPersistenceRow[],
): BackendReconstructionResult => {
  const trustedAttemptCount = diagnosisRows.filter((row) => row.counts_toward_readiness).length
  const practiceAttemptCount = diagnosisRows.length
  const readinessBandMatches = snapshotRow.readiness_band === snapshot.status
  const rowScore = snapshotRow.readiness_score
  const readinessScoreDelta =
    rowScore === null && !snapshot.readinessScoreAvailable
      ? null
      : Math.abs((rowScore ?? 0) - snapshot.readinessScore)
  const exclusionCountsMatch = stableJson(snapshotRow.exclusion_counts) === stableJson(snapshot.exclusionCounts)
  const coverageGapsMatch = stableJson(snapshotRow.coverage_gaps) === stableJson(snapshot.coverageGaps)
  const remediationSummaryMatches =
    stableJson(snapshotRow.remediation_summary) === stableJson(snapshot.remediationSummary)
  const claimEvidenceRefsMatch =
    snapshotRow.claim_evidence_record_ids.length === claimRows.length &&
    claimRows.every((row) => snapshotRow.claim_evidence_record_ids.includes(row.claim_id))
  const failureReasons = [
    trustedAttemptCount !== snapshot.trustedAttemptCount ? 'trusted_attempt_count_mismatch' : null,
    practiceAttemptCount !== snapshot.practiceAttemptCount ? 'practice_attempt_count_mismatch' : null,
    !readinessBandMatches ? 'readiness_band_mismatch' : null,
    readinessScoreDelta !== null && readinessScoreDelta > 0.001 ? 'readiness_score_mismatch' : null,
    !exclusionCountsMatch ? 'exclusion_counts_mismatch' : null,
    !coverageGapsMatch ? 'coverage_gaps_mismatch' : null,
    !remediationSummaryMatches ? 'remediation_summary_mismatch' : null,
    !claimEvidenceRefsMatch ? 'claim_evidence_refs_mismatch' : null,
  ].filter(Boolean) as string[]

  return {
    reconstructionId: persistenceKey('reconstruct', userId, examTrack, snapshotRow.snapshot_period_or_session_id),
    userId,
    examTrack,
    snapshotPeriodOrSessionId: snapshotRow.snapshot_period_or_session_id,
    sourceRecordCount: diagnosisRows.length + remediationRows.length + claimRows.length + 1,
    trustedAttemptCount,
    practiceAttemptCount,
    readinessBandMatches,
    readinessScoreDelta,
    exclusionCountsMatch,
    coverageGapsMatch,
    remediationSummaryMatches,
    claimEvidenceRefsMatch,
    pass: failureReasons.length === 0,
    failureReasons,
  }
}

export const buildQuestionEnginePersistenceBundle = ({
  userId,
  examTrack,
  diagnoses,
  remediationEvents = [],
  masteryVector,
  readinessSnapshot,
  questionItems = [],
  rawAttemptIdByAttemptId = {},
  snapshotType = 'learner_dashboard',
  snapshotPeriodOrSessionId = 'current',
  generatedAt,
}: BuildQuestionEnginePersistenceBundleInput): QuestionEnginePersistenceBundle => {
  const now = generatedAt ?? readinessSnapshot.generatedAt
  const questionItemRows = questionItems.map((item) => buildQuestionItemPersistenceRow(item, now))
  const attemptDiagnosisRows = diagnoses.map((diagnosis) =>
    buildAttemptDiagnosisPersistenceRow(userId, examTrack, diagnosis, rawAttemptIdByAttemptId),
  )
  const remediationEventRows = remediationEvents.map((event) =>
    buildRemediationEventPersistenceRow(userId, examTrack, event, rawAttemptIdByAttemptId),
  )
  const learnerMasteryVectorRows = buildLearnerMasteryVectorPersistenceRows(
    userId,
    examTrack,
    masteryVector,
  )
  const itemStatsRows = buildItemStatsPersistenceRows(diagnoses, now)
  const generatedClaim = buildReadinessClaimEvidenceRecord(
    userId,
    examTrack,
    readinessSnapshot,
    snapshotPeriodOrSessionId,
  )
  const claimEvidenceRecordRows = [generatedClaim]
  const claimEvidenceRecordIds = readinessSnapshot.claimEvidenceRecordIds.length
    ? readinessSnapshot.claimEvidenceRecordIds
    : claimEvidenceRecordRows.map((row) => row.claim_id)
  const readinessSnapshotRow = buildReadinessSnapshotPersistenceRow(
    userId,
    examTrack,
    readinessSnapshot,
    snapshotType,
    snapshotPeriodOrSessionId,
    claimEvidenceRecordIds,
  )
  const reconstructionResult = reconstructReadinessSnapshotFromPersistenceRows(
    userId,
    examTrack,
    readinessSnapshot,
    readinessSnapshotRow,
    attemptDiagnosisRows,
    remediationEventRows,
    claimEvidenceRecordRows,
  )

  return {
    questionItemRows,
    attemptDiagnosisRows,
    remediationEventRows,
    learnerMasteryVectorRows,
    itemStatsRows,
    readinessSnapshotRow,
    claimEvidenceRecordRows,
    reconstructionResult,
    liveSchoolReportingEnabled: false,
  }
}

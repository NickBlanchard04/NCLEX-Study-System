export const questionEngineVersions = {
  adapter: '2026-06-22-app-adapter-v1',
  itemMetadata: '2026-06-22-engine-item-v1',
  diagnosis: '2026-06-22-diagnosis-v1',
  readiness: '2026-06-22-readiness-v1',
  selection: '2026-06-23-adaptive-selection-v1',
  misconceptionVocabulary: '2026-06-22-priority-delegation-v1',
  remediationTransfer: '2026-06-22-remediation-transfer-v1',
} as const

export type ExamTrackCode = 'RN' | 'PN' | 'practice_only'
export type SourceStatus = 'source_needed' | 'source_checked' | 'sme_verified' | 'retired'
export type ReviewStatus =
  | 'not_reviewed'
  | 'item_reviewed'
  | 'sme_verified'
  | 'analytics_reviewed'
  | 'needs_revision'
  | 'retired'
export type ReadinessState =
  | 'draft_only'
  | 'practice_safe'
  | 'readiness_eligible'
  | 'readiness_trusted'
  | 'retired'
export type ReadinessExclusionReason =
  | 'source_needed'
  | 'not_reviewed'
  | 'generated_only'
  | 'user_uploaded_material'
  | 'revision_flagged'
  | 'retired_item'
  | 'missing_metadata'
  | 'missing_rationale'
  | 'rationale_not_remediation_ready'
  | 'unresolved_safety_concern'
  | 'insufficient_item_trust'
  | 'practice_mode_only'
  | 'insufficient_volume'
  | 'insufficient_coverage'
  | 'unknown_scoring'

export type EngineWarningCode =
  | 'source_status_defaulted'
  | 'review_status_defaulted'
  | 'unknown_source_status'
  | 'unknown_review_status'
  | 'missing_clinical_judgment_step'
  | 'clinical_judgment_step_inferred'
  | 'missing_nursing_process_step'
  | 'source_refs_candidate_only'
  | 'source_backed_not_source_checked'
  | 'sme_review_ready_not_sme_verified'
  | 'blueprint_hint_not_coverage_proof'
  | 'missing_rationale_quality_status'
  | 'missing_misconception_map'
  | 'practice_only_exam_track'
  | 'unknown_scoring'
  | 'noncanonical_client_need'

export type ClinicalJudgmentStep =
  | 'Recognize cues'
  | 'Analyze cues'
  | 'Prioritize hypotheses'
  | 'Generate solutions'
  | 'Take action'
  | 'Evaluate outcomes'
  | 'Not primary'
export type NursingProcessStep =
  | 'Assessment'
  | 'Analysis'
  | 'Planning'
  | 'Implementation'
  | 'Evaluation'
  | 'Not primary'
export type QuestionItemType =
  | 'multiple_choice'
  | 'sata'
  | 'matrix'
  | 'cloze'
  | 'dropdown'
  | 'highlight'
  | 'drag_drop'
  | 'ordered_response'
  | 'bowtie'
  | 'trend'
  | 'flashcard'
  | 'drill'
  | 'scenario'
  | 'unknown_item_type'
export type ScoringMethod =
  | 'binary'
  | 'all_or_nothing'
  | 'partial_credit'
  | 'matrix_partial'
  | 'ordered_partial'
  | 'highlight_partial'
  | 'manual_review'
  | 'not_scored'
export type SafetySeverity = 'low' | 'medium' | 'high' | 'critical'
export type ContentOrigin =
  | 'app_seed'
  | 'official_bank'
  | 'quality_pack'
  | 'user_uploaded_material'
  | 'generated_material'

export type RationaleQualityStatus =
  | 'missing'
  | 'basic'
  | 'teaching_only'
  | 'remediation_ready'
  | 'reviewed'

export type MisconceptionFamily =
  | 'priority_and_acuity'
  | 'delegation_and_scope'
  | 'escalation_and_follow_through'
  | 'medication_safety'
  | 'trend_recognition'
  | 'airway_breathing_priority'
  | 'infection_control'
  | 'therapeutic_communication'
  | 'unknown'

export type MisconceptionId =
  | 'stable_need_over_unstable_client'
  | 'pain_before_perfusion_or_oxygenation'
  | 'teaching_deadline_before_instability'
  | 'routine_task_before_deterioration'
  | 'single_improved_value_equals_stable'
  | 'expected_finding_over_unexpected_change'
  | 'delegating_nursing_judgment'
  | 'delegating_unstable_client_care'
  | 'delegating_initial_teaching_or_evaluation'
  | 'missing_delegation_safety_qualifier'
  | 'delayed_escalation_for_deterioration'
  | 'reassurance_despite_instability'
  | 'failure_to_close_loop_after_intervention'
  | 'unknown_misconception'

export type DiagnosisSource =
  | 'option_map'
  | 'item_map'
  | 'content_review_map'
  | 'rationale_trap'
  | 'tag_inference'
  | 'unknown'

export type DiagnosisEvidenceLevel =
  | 'insufficient_evidence'
  | 'attempt_signal'
  | 'practice_hypothesis'
  | 'practice_confirmed'
  | 'confirmed_practice_weak_area'
  | 'readiness_supported'

export type PerformanceBand =
  | 'full'
  | 'strong_partial'
  | 'mixed_partial'
  | 'weak_partial'
  | 'incorrect'
  | 'unscored'

export type ConfidenceSignal =
  | 'calibrated'
  | 'fragile_correct'
  | 'ordinary_miss'
  | 'overconfident_miss'
  | 'overconfident_partial'
  | 'unscored'

export type LearnerCopyCertainty =
  | 'possible'
  | 'likely'
  | 'practice_confirmed'
  | 'trusted_evidence'
  | 'insufficient'

export type WeakAreaDimensionType =
  | 'client_need'
  | 'subcategory'
  | 'clinical_judgment_step'
  | 'body_system'
  | 'safety_flag'
  | 'priority_framework'
  | 'misconception_family'
  | 'misconception_id'
  | 'item_type'
  | 'confidence_calibration'

export type EvidenceScope = 'practice_only' | 'readiness_eligible' | 'mixed_separated'
export type CalibrationTrend = 'improving' | 'stable' | 'declining' | 'insufficient_data'
export type ExposureLevel = 'low' | 'moderate' | 'sufficient'

export type RemediationStatus =
  | 'assigned'
  | 'viewed'
  | 'completed_teaching'
  | 'repair_attempted'
  | 'same_item_repeated'
  | 'same_case_practice_repaired'
  | 'parallel_practice_repaired'
  | 'trusted_repair_supported'
  | 'officially_repaired'
  | 'unresolved'
  | 'blocked_official_repair'

export type RemediationTeachingStatus = 'not_started' | 'viewed' | 'completed' | 'skipped'

export type RemediationTransferDistance =
  | 'same_item'
  | 'same_case'
  | 'parallel_item_same_family'
  | 'trusted_parallel_item'
  | 'delayed_recheck'

export type RepairOutcome =
  | 'not_attempted'
  | 'view_only'
  | 'teaching_completed_no_transfer'
  | 'same_item_repeat'
  | 'practice_repair_supported'
  | 'trusted_repair_supported'
  | 'official_repair'
  | 'repair_failed'
  | 'repair_blocked'

export type RemediationTransferEvidenceLevel =
  | 'none'
  | 'engagement_only'
  | 'same_item_recall'
  | 'practice_transfer'
  | 'trusted_transfer_supported'
  | 'official_transfer'

export type RepairBlockedReason =
  | 'no_repair_item'
  | 'repair_item_not_trusted'
  | 'repair_item_source_needed'
  | 'repair_item_not_reviewed'
  | 'repair_item_revision_active'
  | 'misconception_mismatch'
  | 'confidence_not_improved'
  | 'score_not_improved'
  | 'same_item_repeat'
  | 'coverage_not_readiness_eligible'
  | 'insufficient_metadata'

export type ReadinessSnapshotScope =
  | 'practice_progress'
  | 'official_readiness'
  | 'mixed_separated'
  | 'internal_qa_only'

export type ReadinessReconstructionStatus =
  | 'not_required'
  | 'pending'
  | 'passed'
  | 'failed'
  | 'blocked'

export type ReadinessBlockedReason =
  | 'insufficient_trusted_volume'
  | 'untrusted_content'
  | 'source_needed'
  | 'not_reviewed'
  | 'revision_active'
  | 'missing_metadata'
  | 'coverage_gap'
  | 'client_need_spread'
  | 'item_type_gap'
  | 'safety_coverage_gap'
  | 'confidence_mismatch'
  | 'unresolved_safety_miss'
  | 'repair_not_proven'
  | 'claim_evidence_missing'
  | 'reconstruction_failed'
  | 'raw_accuracy_not_allowed'

export interface WeakAreaDimension {
  dimensionType: WeakAreaDimensionType
  dimensionId: string
}

export type SelectionIntent =
  | 'diagnose'
  | 'repair'
  | 'reinforce'
  | 'repair_misconception'
  | 'fill_coverage_gap'
  | 'build_readiness_evidence'
  | 'build_exposure'
  | 'stabilize_confidence'
  | 'reduce_fatigue'
  | 'internal_qa_probe'
  | 'maintain_momentum'
  | 'no_candidate'

export type SelectionReasonCode =
  | 'active_misconception_repair'
  | 'active_safety_misconception'
  | 'active_high_confidence_miss'
  | 'mapped_misconception_repair_available'
  | 'repair_required_not_proven'
  | 'weak_clinical_judgment_step'
  | 'clinical_judgment_gap'
  | 'client_need_gap'
  | 'item_type_gap'
  | 'safety_flag_gap'
  | 'low_exposure'
  | 'confidence_mismatch'
  | 'overconfidence_recalibration'
  | 'fragile_correct_reinforcement'
  | 'calibration_recheck_due'
  | 'trusted_readiness_evidence'
  | 'trusted_readiness_candidate'
  | 'practice_only_candidate'
  | 'internal_qa_candidate'
  | 'insufficient_trusted_candidates'
  | 'trust_gate_exclusion'
  | 'recent_repeat_penalty'
  | 'recent_exact_repeat'
  | 'dimension_overuse_penalty'
  | 'high_load_fatigue_guardrail'
  | 'difficulty_fit_pacing'
  | 'unknown_misconception_probe'
  | 'maintain_momentum'
  | 'no_safe_candidate'

export type SelectionExclusionReason =
  | ReadinessExclusionReason
  | 'trust_gate_exclusion'
  | 'recent_exact_repeat'
  | 'fatigue_load_blocked'

export interface SelectionTargetDimensions {
  clientNeed: string | null
  subcategory: string | null
  clinicalJudgmentStep: string | null
  nursingProcessStep: string | null
  bodySystem: string | null
  safetyFlag: string | null
  misconceptionId: string | null
  misconceptionFamily: string | null
  itemType: string | null
}

export interface SelectionScoreComponents {
  weaknessScore: number
  confidenceMismatchScore: number
  safetySeverityWeight: number
  misconceptionRepairWeight: number
  coverageGapWeight: number
  lowExposureWeight: number
  recencyGapWeight: number
  readinessGateWeight: number
  difficultyFitWeight: number
  overusePenalty: number
  fatiguePenalty: number
  total: number
}

export interface CandidatePoolSummary {
  candidateCount: number
  eligibleCount: number
  excludedCount: number
  topExclusionReasons: SelectionExclusionReason[]
}

export interface EngineAnswerChoice {
  id: string
  text: string
}

export interface EngineRationale {
  correctExplanation: string
  distractorExplanations?: string
  qualityStatus: RationaleQualityStatus
}

export interface QuestionEngineItem {
  itemId: string
  examTrack: ExamTrackCode
  appExamTrack?: string
  clientNeed: string
  subcategory: string
  bodySystem?: string
  topic?: string
  clinicalJudgmentStep: ClinicalJudgmentStep
  nursingProcessStep: NursingProcessStep
  itemType: QuestionItemType
  scoringMethod: ScoringMethod
  choices: EngineAnswerChoice[]
  correctAnswer: string[]
  distractorMisconceptions: Record<string, MisconceptionId>
  misconceptionTested?: MisconceptionId
  priorityFrameworks: string[]
  safetyFlags: string[]
  safetySeverity: SafetySeverity
  rationale: EngineRationale
  learningTip?: string
  clinicalRelevanceNote?: string
  tags: string[]
  sourceStatus: SourceStatus
  reviewStatus: ReviewStatus
  readinessState: ReadinessState
  readinessExclusionReasons: ReadinessExclusionReason[]
  countsTowardReadinessDefault: boolean
  contentOrigin: ContentOrigin
  generatedOnly: boolean
  revisionFlag: boolean
  contentPipelineStatus?: string
  candidateSourceRefs: string[]
  sourceHintPresent: boolean
  blueprintMappedHint: boolean
  hasExplicitClinicalJudgmentStep: boolean
  hasExplicitNursingProcessStep: boolean
  warnings: EngineWarningCode[]
  rawAppQuestionId?: string
}

export interface QuestionEngineItemAdapterResult {
  engineItem: QuestionEngineItem
  warnings: EngineWarningCode[]
  readinessExclusionReasons: ReadinessExclusionReason[]
  adapterVersion: typeof questionEngineVersions.adapter
}

export interface ScoreResult {
  rawScore: number
  maxScore: number
  partialCreditScore: number
  isCorrect: boolean
  selectedDistractorIds: string[]
  scoringMethod: ScoringMethod
  confidenceEscalated: boolean
}

export interface AttemptForDiagnosis {
  id: string
  questionId: string
  selectedAnswer: string[]
  isCorrect: boolean
  confidence: 'low' | 'medium' | 'high'
  timeSpentSec: number
  flagged: boolean
  completedAt: string
  sessionType: string
}

export interface ItemTrustSnapshot {
  itemId: string
  sourceStatus: SourceStatus
  reviewStatus: ReviewStatus
  readinessState: ReadinessState
  readinessExclusionReasons: ReadinessExclusionReason[]
  countsTowardReadiness: boolean
  adapterVersion: typeof questionEngineVersions.adapter
  readinessVersion: typeof questionEngineVersions.readiness
}

export interface AttemptDiagnosis {
  id: string
  attemptId: string
  itemId: string
  selectedAnswer: string[]
  confidence: 'low' | 'medium' | 'high'
  rawBinaryCorrect: boolean
  scoreResult: ScoreResult
  performanceBand: PerformanceBand
  isPartialCredit: boolean
  calibrationScore: number
  confidenceSignal: ConfidenceSignal
  confidenceMismatch: boolean
  likelyMisconceptionId: MisconceptionId
  misconceptionFamily: MisconceptionFamily
  misconceptionConfidence: number
  diagnosisSource: DiagnosisSource
  evidenceLevel: DiagnosisEvidenceLevel
  learnerCopyCertainty: LearnerCopyCertainty
  canShowAsDurableWeakArea: boolean
  canCountTowardOfficialReadiness: boolean
  weakAreaDimensions: WeakAreaDimension[]
  weakAreaTags: string[]
  clinicalJudgmentStep: ClinicalJudgmentStep
  nursingProcessStep: NursingProcessStep
  clientNeed: string
  subcategory: string
  itemType: QuestionItemType
  safetySeverity: SafetySeverity
  confidenceEscalated: boolean
  remediationRoute: string
  repairRequired: boolean
  repairCompleted: boolean
  countsTowardReadiness: boolean
  readinessExclusionReasons: ReadinessExclusionReason[]
  itemTrustSnapshot: ItemTrustSnapshot
  createdAt: string
  diagnosisVersion: typeof questionEngineVersions.diagnosis
  misconceptionVocabularyVersion: typeof questionEngineVersions.misconceptionVocabulary
}

export interface RemediationEvent {
  id: string
  diagnosisId: string
  attemptId: string
  itemId: string
  status: RemediationStatus
  teachingStatus: RemediationTeachingStatus
  misconceptionId: MisconceptionId
  misconceptionFamily: MisconceptionFamily
  routeId: string
  routeLabel: string
  actionType: 'none' | 'reinforcement' | 'micro_lesson' | 'targeted_repair'
  assignedAssetIds: string[]
  assignedRepairItemIds: string[]
  repairAvailable: boolean
  repairRequired: boolean
  repairCompleted: boolean
  repairSuccess: boolean
  officialRepairEligible: boolean
  readinessRepairEligible: boolean
  blockedOfficialRepairReason?: ReadinessExclusionReason
  blockedReasons: RepairBlockedReason[]
  repairOutcome: RepairOutcome
  transferDistance: RemediationTransferDistance | null
  transferEvidenceLevel: RemediationTransferEvidenceLevel
  repairItemId: string | null
  repairAttemptId: string | null
  repairItemTrustSnapshot: ItemTrustSnapshot | null
  repairMisconceptionId: MisconceptionId | null
  repairMisconceptionFamily: MisconceptionFamily | null
  repairScore: number | null
  repairConfidence: 'low' | 'medium' | 'high' | null
  repairCalibrationScore: number | null
  triggerConfidence: 'low' | 'medium' | 'high'
  triggerCalibrationScore: number
  triggerSafetySeverity: SafetySeverity
  nextActionCopy: string
  createdAt: string
  updatedAt: string
  remediationVersion: typeof questionEngineVersions.remediationTransfer
}

export interface RemediationTransferEvidence {
  remediationEventId: string
  triggerAttemptId: string
  triggerDiagnosisId: string
  triggerItemId: string
  triggerMisconceptionId: MisconceptionId
  triggerMisconceptionFamily: MisconceptionFamily
  triggerSafetySeverity: SafetySeverity
  triggerConfidence: 'low' | 'medium' | 'high'
  triggerCalibrationScore: number
  assignedRoute: string
  assignedAssetIds: string[]
  teachingStatus: RemediationTeachingStatus
  repairItemId: string | null
  repairAttemptId: string | null
  repairItemTrustSnapshot: ItemTrustSnapshot | null
  repairMisconceptionId: MisconceptionId | null
  repairMisconceptionFamily: MisconceptionFamily | null
  repairScore: number | null
  repairConfidence: 'low' | 'medium' | 'high' | null
  repairCalibrationScore: number | null
  transferDistance: RemediationTransferDistance | null
  readinessRepairEligible: boolean
  repairSuccess: boolean
  repairOutcome: RepairOutcome
  blockedReasons: RepairBlockedReason[]
  evidenceLevel: RemediationTransferEvidenceLevel
  createdAt: string
  updatedAt: string
  remediationVersion: typeof questionEngineVersions.remediationTransfer
}

export interface MasteryDimensionStats {
  dimensionType: string
  dimensionId: string
  evidenceScope: EvidenceScope
  attemptCount: number
  practiceAttemptCount: number
  trustedAttemptCount: number
  readinessAttemptCount: number
  scoreTotal: number
  maxScoreTotal: number
  avgScore: number
  accuracy: number
  readinessAccuracy: number
  avgCalibrationScore: number
  calibrationTrend: CalibrationTrend
  highConfidenceMissCount: number
  lowConfidenceCorrectCount: number
  confidenceMismatchScore: number
  remediationAssignedCount: number
  remediationRepairedCount: number
  activeRepairCount: number
  unresolvedHighSeverityCount: number
  practiceSignalCount: number
  trustedSignalCount: number
  untrustedSignalCount: number
  recurrenceCount: number
  exposureLevel: ExposureLevel
  evidenceLevel: DiagnosisEvidenceLevel
  selectionWeight: number
  readinessWeight: number
  activeExclusionReasons: ReadinessExclusionReason[]
  masteryScore: number
  weaknessScore: number
  masteryLevel: 'fragile' | 'developing' | 'strong'
  firstAttemptAt: string | null
  latestAttemptAt: string | null
  latestTrustedAttemptAt: string | null
}

export interface LearnerMasteryVector {
  dimensions: Record<string, MasteryDimensionStats>
  summary: {
    attemptCount: number
    practiceAttemptCount: number
    trustedAttemptCount: number
    readinessAttemptCount: number
    highConfidenceMissCount: number
    lowConfidenceCorrectCount: number
    confidenceMismatchCount: number
    activeReadinessBlockerCount: number
    activeExclusionReasons: ReadinessExclusionReason[]
    recurringWeakAreaDimensionIds: string[]
    lowExposureDimensionIds: string[]
    strongestDimensionId?: string
    weakestDimensionId?: string
  }
  updatedAt: string
}

export interface SelectionDecision {
  selectedItemId: string | null
  selectionIntent: SelectionIntent
  primaryReasonCode: SelectionReasonCode
  secondaryReasonCodes: SelectionReasonCode[]
  trustMode: 'practice' | 'readiness'
  learnerExplanationKey: string
  targetDimensions: SelectionTargetDimensions
  candidatePoolSummary: CandidatePoolSummary
  candidateCount: number
  eligibleCandidateCount: number
  excludedCandidateCount: number
  exclusionCounts: Partial<Record<SelectionExclusionReason, number>>
  scoreByItemId: Record<string, number>
  scoreComponentsByItemId: Record<string, SelectionScoreComponents>
  selectionVersion: typeof questionEngineVersions.selection
}

export interface CoverageGap {
  dimensionType: string
  dimensionId: string
  gapType:
    | 'low_exposure'
    | 'weak_mastery'
    | 'confidence_mismatch'
    | 'unrepaired_safety_miss'
    | 'untrusted_evidence_only'
    | 'stale_evidence'
  severity: SafetySeverity
  trustedAttemptCount: number
  practiceAttemptCount: number
  readinessAttemptCount: number
  latestAttemptAt: string | null
  recommendedRoute: string | null
  candidateRepairItemIds: string[]
}

export interface ReadinessContentTrustSummary {
  trustedAttemptCount: number
  practiceAttemptCount: number
  excludedAttemptCount: number
  trustedItemCount: number
  practiceItemCount: number
  sourceCheckedAttemptCount: number
  reviewedAttemptCount: number
  readinessTrustedAttemptCount: number
}

export interface ReadinessCoverageSummary {
  trustedAttemptCount: number
  practiceAttemptCount: number
  clientNeedCoverage: Record<string, number>
  clinicalJudgmentCoverage: Record<string, number>
  safetyFlagCoverage: Record<string, number>
  itemTypeCoverage: Record<string, number>
  misconceptionRepairCoverage: {
    officialRepairCount: number
    practiceRepairCount: number
    trustedRepairSupportedCount: number
    unresolvedRepairCount: number
  }
}

export interface ReadinessConfidenceCalibrationSummary {
  avgTrustedCalibrationScore: number
  normalizedTrustedCalibration: number
  highConfidenceMissCount: number
  lowConfidenceCorrectCount: number
  confidenceMismatchCount: number
  highRiskDimensionIds: string[]
}

export interface ReadinessSafetyRecoverySummary {
  unrepairedSafetyMissCount: number
  officialRepairCount: number
  practiceRepairCount: number
  safetyRecoveryScore: number
}

export interface ReadinessRemediationSummary {
  assignedCount: number
  engagementOnlyCount: number
  practiceRepairCount: number
  trustedRepairSupportedCount: number
  officialRepairCount: number
  unresolvedRepairCount: number
}

export interface ReadinessDimensionRisk {
  dimensionType: string
  dimensionId: string
  score: number
  reason: string
}

export interface ReadinessSnapshot {
  status: 'insufficient_evidence' | 'building' | 'approaching' | 'ready'
  readinessScore: number
  readinessScoreAvailable: boolean
  evidenceRequirementsMet: boolean
  snapshotScope: ReadinessSnapshotScope
  practiceAccuracy: number
  readinessAccuracy: number
  trustedAttemptCount: number
  practiceAttemptCount: number
  excludedAttemptCount: number
  trustedItemCount: number
  practiceItemCount: number
  highConfidenceMissCount: number
  coverageRequirementsMet: boolean
  clinicalJudgmentBalance: number
  coverageGaps: CoverageGap[]
  exclusionCounts: Partial<Record<ReadinessExclusionReason, number>>
  contentTrustSummary: ReadinessContentTrustSummary
  coverageSummary: ReadinessCoverageSummary
  confidenceCalibrationSummary: ReadinessConfidenceCalibrationSummary
  safetyRecoverySummary: ReadinessSafetyRecoverySummary
  remediationSummary: ReadinessRemediationSummary
  topWeakDimensions: ReadinessDimensionRisk[]
  topConfidenceRisks: ReadinessDimensionRisk[]
  claimEvidenceRecordIds: string[]
  requiredClaimsPresent: boolean
  reconstructionStatus: ReadinessReconstructionStatus
  blockedReasons: ReadinessBlockedReason[]
  learnerCopyKeys: string[]
  schoolReportingAllowed: false
  fallbackToOverallAccuracy: false
  showPracticeProgressSeparately: boolean
  calculationVersions: Record<string, string>
  nextBestAction: string
  generatedAt: string
  readinessVersion: typeof questionEngineVersions.readiness
}

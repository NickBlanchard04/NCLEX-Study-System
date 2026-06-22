export const questionEngineVersions = {
  adapter: '2026-06-22-app-adapter-v1',
  itemMetadata: '2026-06-22-engine-item-v1',
  diagnosis: '2026-06-22-diagnosis-v1',
  readiness: '2026-06-22-readiness-v1',
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
  | 'attempt_signal'
  | 'practice_hypothesis'
  | 'confirmed_practice_weak_area'
  | 'readiness_supported'

export type SelectionIntent =
  | 'repair_misconception'
  | 'fill_coverage_gap'
  | 'build_exposure'
  | 'stabilize_confidence'
  | 'maintain_momentum'
  | 'no_candidate'

export type SelectionReasonCode =
  | 'active_misconception_repair'
  | 'weak_clinical_judgment_step'
  | 'low_exposure'
  | 'confidence_mismatch'
  | 'trusted_readiness_evidence'
  | 'recent_repeat_penalty'
  | 'no_safe_candidate'

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
  rawBinaryCorrect: boolean
  scoreResult: ScoreResult
  calibrationScore: number
  likelyMisconceptionId: MisconceptionId
  misconceptionFamily: MisconceptionFamily
  misconceptionConfidence: number
  diagnosisSource: DiagnosisSource
  evidenceLevel: DiagnosisEvidenceLevel
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
  misconceptionId: MisconceptionId
  misconceptionFamily: MisconceptionFamily
  routeId: string
  routeLabel: string
  actionType: 'none' | 'reinforcement' | 'micro_lesson' | 'targeted_repair'
  repairRequired: boolean
  repairCompleted: boolean
  repairSuccess: boolean
  officialRepairEligible: boolean
  blockedOfficialRepairReason?: ReadinessExclusionReason
  nextActionCopy: string
  createdAt: string
}

export interface MasteryDimensionStats {
  dimensionType: string
  dimensionId: string
  attemptCount: number
  readinessAttemptCount: number
  accuracy: number
  readinessAccuracy: number
  avgCalibrationScore: number
  highConfidenceMissCount: number
  lowConfidenceCorrectCount: number
  confidenceMismatchScore: number
  remediationAssignedCount: number
  remediationRepairedCount: number
  masteryScore: number
  weaknessScore: number
  masteryLevel: 'fragile' | 'developing' | 'strong'
  latestAttemptAt: string | null
}

export interface LearnerMasteryVector {
  dimensions: Record<string, MasteryDimensionStats>
  summary: {
    attemptCount: number
    readinessAttemptCount: number
    highConfidenceMissCount: number
    strongestDimensionId?: string
    weakestDimensionId?: string
  }
  updatedAt: string
}

export interface SelectionDecision {
  selectedItemId: string | null
  selectionIntent: SelectionIntent
  primaryReasonCode: SelectionReasonCode
  trustMode: 'practice' | 'readiness'
  learnerExplanationKey: string
  candidateCount: number
  excludedCandidateCount: number
  scoreByItemId: Record<string, number>
}

export interface CoverageGap {
  dimensionType: string
  dimensionId: string
  gapType: 'low_exposure' | 'weak_mastery' | 'confidence_mismatch' | 'unrepaired_safety_miss' | 'untrusted_evidence_only'
  severity: SafetySeverity
  trustedAttemptCount: number
  practiceAttemptCount: number
  readinessAttemptCount: number
  latestAttemptAt: string | null
  recommendedRoute: string | null
  candidateRepairItemIds: string[]
}

export interface ReadinessSnapshot {
  status: 'insufficient_evidence' | 'building' | 'approaching' | 'ready'
  readinessScore: number
  practiceAccuracy: number
  readinessAccuracy: number
  trustedAttemptCount: number
  practiceAttemptCount: number
  highConfidenceMissCount: number
  coverageRequirementsMet: boolean
  clinicalJudgmentBalance: number
  coverageGaps: CoverageGap[]
  exclusionCounts: Partial<Record<ReadinessExclusionReason, number>>
  nextBestAction: string
  generatedAt: string
  readinessVersion: typeof questionEngineVersions.readiness
}

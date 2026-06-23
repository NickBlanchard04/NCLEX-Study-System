import type { InternalQAPilotEvidencePacket } from './internal-qa'

export type ValidationAudience =
  | 'student'
  | 'recent_graduate'
  | 'faculty'
  | 'remediation_lead'
  | 'program_leader'

export type ValidationTaskId =
  | 'high_confidence_miss'
  | 'named_misconception'
  | 'rationale_repair'
  | 'trust_labels'
  | 'claim_strength'
  | 'cat_safe_language'
  | 'faculty_risk_view'
  | 'report_privacy_boundary'
  | 'pilot_value'

export interface QuestionEngineValidationObservation {
  taskId: ValidationTaskId
  score: 0 | 1 | 2
  understandingMode: 'unaided' | 'after_prompt' | 'confused' | 'rejected'
  nextActionNamed?: string
  objection?: string
  trustRisk?:
    | 'none'
    | 'copy_confusing'
    | 'overclaim_risk'
    | 'privacy_risk'
    | 'evidence_gap'
    | 'clinical_trust_gap'
    | 'value_gap'
  followUpNeeded: boolean
}

export interface QuestionEngineValidationParticipantRecord {
  participantId: string
  audience: ValidationAudience
  examTrack: 'RN' | 'PN' | 'both' | 'unknown' | 'not_applicable'
  consentScope: 'notes_only' | 'recording_allowed' | 'follow_up_allowed' | 'no_follow_up'
  prototypePacketVersion: string
  observations: QuestionEngineValidationObservation[]
  deidentified: boolean
  containsDirectIdentifiers: boolean
}

export interface QuestionEngineValidationRollup {
  participantCountTotal: number
  studentCount: number
  recentGraduateCount: number
  facultyOrProgramCount: number
  studentMetrics: {
    highConfidenceMissScore2Rate: number
    namedMisconceptionPreferenceRate: number
    trustLabelScore2Rate: number
    repairProofScore2Rate: number
    nextActionScore2Rate: number
    shameOrBlameCount: number
  }
  facultyMetrics: {
    interventionPriorityChangedCount: number
    repairProofValuedCount: number
    contentTrustBoundaryScore2Count: number
    reportingPrivacyBoundaryScore2Count: number
    pilotDiscussionCount: number
    privacyBlockerCount: number
  }
  rejectedRecordIds: string[]
  changeRequestsRequired: string[]
  goNoGoRecommendation: 'proceed' | 'revise_and_retest' | 'delay'
}

export interface QuestionEngineValidationGate {
  learnerBetaReady: boolean
  schoolPilotPackagingReady: boolean
  liveSchoolReportingAllowed: false
  officialReadinessClaimAllowed: boolean
  evidenceStage:
    | 'stage_2_internal_qa_proven'
    | 'stage_3_learner_practice_beta_supported'
    | 'stage_5_school_pilot_reporting_supported'
    | 'blocked'
  blockers: string[]
}

const studentAudiences = new Set<ValidationAudience>(['student', 'recent_graduate'])
const facultyAudiences = new Set<ValidationAudience>([
  'faculty',
  'remediation_lead',
  'program_leader',
])

const observationScore = (
  record: QuestionEngineValidationParticipantRecord,
  taskId: ValidationTaskId,
) => record.observations.find((observation) => observation.taskId === taskId)?.score ?? 0

const hasScore2 = (
  record: QuestionEngineValidationParticipantRecord,
  taskId: ValidationTaskId,
) => observationScore(record, taskId) === 2

const rate = (numerator: number, denominator: number) =>
  denominator ? numerator / denominator : 0

const isRejectedRecord = (record: QuestionEngineValidationParticipantRecord) =>
  !record.deidentified || record.containsDirectIdentifiers

export const buildQuestionEngineValidationRollup = (
  records: QuestionEngineValidationParticipantRecord[],
): QuestionEngineValidationRollup => {
  const rejectedRecordIds = records.filter(isRejectedRecord).map((record) => record.participantId)
  const usableRecords = records.filter((record) => !isRejectedRecord(record))
  const studentRecords = usableRecords.filter((record) => studentAudiences.has(record.audience))
  const facultyRecords = usableRecords.filter((record) => facultyAudiences.has(record.audience))
  const highConfidenceMissScore2Count = studentRecords.filter((record) =>
    hasScore2(record, 'high_confidence_miss'),
  ).length
  const namedMisconceptionScore2Count = studentRecords.filter((record) =>
    hasScore2(record, 'named_misconception'),
  ).length
  const trustLabelScore2Count = studentRecords.filter((record) =>
    hasScore2(record, 'trust_labels'),
  ).length
  const repairProofScore2Count = studentRecords.filter((record) =>
    hasScore2(record, 'rationale_repair'),
  ).length
  const nextActionScore2Count = studentRecords.filter((record) =>
    hasScore2(record, 'pilot_value') || hasScore2(record, 'rationale_repair'),
  ).length
  const shameOrBlameCount = studentRecords.filter((record) =>
    record.observations.some(
      (observation) =>
        observation.taskId === 'high_confidence_miss' &&
        (observation.trustRisk === 'copy_confusing' || observation.objection?.toLowerCase().includes('shame')),
    ),
  ).length
  const interventionPriorityChangedCount = facultyRecords.filter((record) =>
    hasScore2(record, 'faculty_risk_view'),
  ).length
  const repairProofValuedCount = facultyRecords.filter((record) =>
    hasScore2(record, 'rationale_repair'),
  ).length
  const contentTrustBoundaryScore2Count = facultyRecords.filter((record) =>
    hasScore2(record, 'trust_labels'),
  ).length
  const reportingPrivacyBoundaryScore2Count = facultyRecords.filter((record) =>
    hasScore2(record, 'report_privacy_boundary'),
  ).length
  const pilotDiscussionCount = facultyRecords.filter((record) =>
    hasScore2(record, 'pilot_value'),
  ).length
  const privacyBlockerCount = facultyRecords.filter((record) =>
    record.observations.some((observation) => observation.trustRisk === 'privacy_risk'),
  ).length
  const changeRequestsRequired = usableRecords.flatMap((record) =>
    record.observations
      .filter((observation) => observation.score < 2 || observation.followUpNeeded)
      .map((observation) => `${record.participantId}:${observation.taskId}`),
  )
  const studentGatePasses =
    studentRecords.length >= 5 &&
    rate(highConfidenceMissScore2Count, studentRecords.length) >= 0.7 &&
    rate(namedMisconceptionScore2Count, studentRecords.length) >= 0.6 &&
    rate(trustLabelScore2Count, studentRecords.length) >= 0.6 &&
    rate(repairProofScore2Count, studentRecords.length) >= 0.5 &&
    shameOrBlameCount === 0
  const facultyGatePasses =
    facultyRecords.length >= 3 &&
    interventionPriorityChangedCount >= 2 &&
    repairProofValuedCount >= 2 &&
    pilotDiscussionCount >= 1 &&
    privacyBlockerCount === 0
  const goNoGoRecommendation =
    rejectedRecordIds.length > 0 || privacyBlockerCount > 0
      ? 'delay'
      : studentGatePasses && facultyGatePasses
        ? 'proceed'
        : changeRequestsRequired.length
          ? 'revise_and_retest'
          : 'delay'

  return {
    participantCountTotal: usableRecords.length,
    studentCount: studentRecords.length,
    recentGraduateCount: studentRecords.filter((record) => record.audience === 'recent_graduate').length,
    facultyOrProgramCount: facultyRecords.length,
    studentMetrics: {
      highConfidenceMissScore2Rate: rate(highConfidenceMissScore2Count, studentRecords.length),
      namedMisconceptionPreferenceRate: rate(namedMisconceptionScore2Count, studentRecords.length),
      trustLabelScore2Rate: rate(trustLabelScore2Count, studentRecords.length),
      repairProofScore2Rate: rate(repairProofScore2Count, studentRecords.length),
      nextActionScore2Rate: rate(nextActionScore2Count, studentRecords.length),
      shameOrBlameCount,
    },
    facultyMetrics: {
      interventionPriorityChangedCount,
      repairProofValuedCount,
      contentTrustBoundaryScore2Count,
      reportingPrivacyBoundaryScore2Count,
      pilotDiscussionCount,
      privacyBlockerCount,
    },
    rejectedRecordIds,
    changeRequestsRequired,
    goNoGoRecommendation,
  }
}

export const buildQuestionEngineValidationGate = (
  internalQAPacket: InternalQAPilotEvidencePacket,
  rollup: QuestionEngineValidationRollup,
): QuestionEngineValidationGate => {
  const learnerBetaReady =
    internalQAPacket.overallPass &&
    rollup.studentCount >= 5 &&
    rollup.studentMetrics.highConfidenceMissScore2Rate >= 0.7 &&
    rollup.studentMetrics.namedMisconceptionPreferenceRate >= 0.6 &&
    rollup.studentMetrics.trustLabelScore2Rate >= 0.6 &&
    rollup.studentMetrics.repairProofScore2Rate >= 0.5 &&
    rollup.studentMetrics.shameOrBlameCount === 0
  const schoolPilotPackagingReady =
    learnerBetaReady &&
    rollup.facultyOrProgramCount >= 3 &&
    rollup.facultyMetrics.interventionPriorityChangedCount >= 2 &&
    rollup.facultyMetrics.repairProofValuedCount >= 2 &&
    rollup.facultyMetrics.pilotDiscussionCount >= 1 &&
    rollup.facultyMetrics.privacyBlockerCount === 0
  const blockers = [
    internalQAPacket.overallPass ? null : 'internal_qa_packet_failed',
    rollup.studentCount < 5 ? 'student_validation_sample_missing' : null,
    rollup.studentMetrics.highConfidenceMissScore2Rate < 0.7 ? 'high_confidence_miss_comprehension_low' : null,
    rollup.studentMetrics.namedMisconceptionPreferenceRate < 0.6 ? 'named_misconception_value_low' : null,
    rollup.studentMetrics.trustLabelScore2Rate < 0.6 ? 'trust_label_comprehension_low' : null,
    rollup.studentMetrics.repairProofScore2Rate < 0.5 ? 'repair_loop_value_low' : null,
    rollup.studentMetrics.shameOrBlameCount > 0 ? 'high_confidence_copy_shame_risk' : null,
    rollup.facultyOrProgramCount < 3 ? 'faculty_program_validation_sample_missing' : null,
    rollup.facultyMetrics.interventionPriorityChangedCount < 2 ? 'faculty_intervention_value_low' : null,
    rollup.facultyMetrics.repairProofValuedCount < 2 ? 'faculty_repair_evidence_value_low' : null,
    rollup.facultyMetrics.pilotDiscussionCount < 1 ? 'school_pilot_discussion_missing' : null,
    rollup.facultyMetrics.privacyBlockerCount > 0 ? 'privacy_blocker_present' : null,
    rollup.rejectedRecordIds.length ? 'validation_record_privacy_rejection' : null,
    'live_school_reporting_privacy_review_missing',
    'official_readiness_claim_requires_trusted_content_rollout',
  ].filter(Boolean) as string[]
  const evidenceStage =
    !internalQAPacket.overallPass
      ? 'blocked'
      : schoolPilotPackagingReady
        ? 'stage_5_school_pilot_reporting_supported'
        : learnerBetaReady
          ? 'stage_3_learner_practice_beta_supported'
          : 'stage_2_internal_qa_proven'

  return {
    learnerBetaReady,
    schoolPilotPackagingReady,
    liveSchoolReportingAllowed: false,
    officialReadinessClaimAllowed: false,
    evidenceStage,
    blockers,
  }
}

import {
  questionEngineVersions,
  type AttemptDiagnosis,
  type AttemptForDiagnosis,
  type DiagnosisEvidenceLevel,
  type DiagnosisSource,
  type ItemTrustSnapshot,
  type MisconceptionFamily,
  type MisconceptionId,
  type QuestionEngineItem,
  type SafetySeverity,
  type ScoreResult,
} from './types'

interface MisconceptionDefinition {
  family: MisconceptionFamily
  safetySeverity: SafetySeverity
  remediationRoute: string
}

const misconceptionDefinitions: Record<MisconceptionId, MisconceptionDefinition> = {
  stable_need_over_unstable_client: {
    family: 'priority_and_acuity',
    safetySeverity: 'high',
    remediationRoute: 'priority_rescue_set',
  },
  pain_before_perfusion_or_oxygenation: {
    family: 'priority_and_acuity',
    safetySeverity: 'high',
    remediationRoute: 'priority_rescue_set',
  },
  teaching_deadline_before_instability: {
    family: 'priority_and_acuity',
    safetySeverity: 'medium',
    remediationRoute: 'priority_rescue_set',
  },
  routine_task_before_deterioration: {
    family: 'priority_and_acuity',
    safetySeverity: 'high',
    remediationRoute: 'priority_rescue_set',
  },
  single_improved_value_equals_stable: {
    family: 'escalation_and_follow_through',
    safetySeverity: 'high',
    remediationRoute: 'evaluation_followup_set',
  },
  expected_finding_over_unexpected_change: {
    family: 'priority_and_acuity',
    safetySeverity: 'medium',
    remediationRoute: 'priority_rescue_set',
  },
  delegating_nursing_judgment: {
    family: 'delegation_and_scope',
    safetySeverity: 'high',
    remediationRoute: 'delegation_boundary_set',
  },
  delegating_unstable_client_care: {
    family: 'delegation_and_scope',
    safetySeverity: 'high',
    remediationRoute: 'delegation_boundary_set',
  },
  delegating_initial_teaching_or_evaluation: {
    family: 'delegation_and_scope',
    safetySeverity: 'medium',
    remediationRoute: 'delegation_boundary_set',
  },
  missing_delegation_safety_qualifier: {
    family: 'delegation_and_scope',
    safetySeverity: 'medium',
    remediationRoute: 'delegation_boundary_set',
  },
  delayed_escalation_for_deterioration: {
    family: 'escalation_and_follow_through',
    safetySeverity: 'high',
    remediationRoute: 'evaluation_followup_set',
  },
  reassurance_despite_instability: {
    family: 'escalation_and_follow_through',
    safetySeverity: 'high',
    remediationRoute: 'evaluation_followup_set',
  },
  failure_to_close_loop_after_intervention: {
    family: 'escalation_and_follow_through',
    safetySeverity: 'medium',
    remediationRoute: 'evaluation_followup_set',
  },
  unknown_misconception: {
    family: 'unknown',
    safetySeverity: 'medium',
    remediationRoute: 'clinical_judgment_step_review',
  },
}

export const getMisconceptionDefinition = (id: MisconceptionId) =>
  misconceptionDefinitions[id] ?? misconceptionDefinitions.unknown_misconception

const chooseMappedMisconception = (
  item: QuestionEngineItem,
  scoreResult: ScoreResult,
): { id: MisconceptionId; source: DiagnosisSource; confidence: number } => {
  const mappedDistractor = scoreResult.selectedDistractorIds
    .map((answerId) => item.distractorMisconceptions[answerId])
    .find(Boolean)

  if (mappedDistractor) {
    return { id: mappedDistractor, source: 'option_map', confidence: 0.95 }
  }

  if (item.misconceptionTested && !scoreResult.isCorrect) {
    return { id: item.misconceptionTested, source: 'item_map', confidence: 0.8 }
  }

  const haystack = `${item.tags.join(' ')} ${item.rationale.correctExplanation} ${item.rationale.distractorExplanations ?? ''}`.toLowerCase()

  if (haystack.includes('delegation') || haystack.includes('uap')) {
    return { id: 'delegating_nursing_judgment', source: 'tag_inference', confidence: 0.4 }
  }

  if (haystack.includes('pain') && (haystack.includes('oxygen') || haystack.includes('perfusion'))) {
    return { id: 'pain_before_perfusion_or_oxygenation', source: 'rationale_trap', confidence: 0.6 }
  }

  if (haystack.includes('priority') || haystack.includes('unstable')) {
    return { id: 'stable_need_over_unstable_client', source: 'tag_inference', confidence: 0.4 }
  }

  return { id: 'unknown_misconception', source: 'unknown', confidence: 0 }
}

const getEvidenceLevel = (
  item: QuestionEngineItem,
  source: DiagnosisSource,
): DiagnosisEvidenceLevel => {
  if (item.countsTowardReadinessDefault && (source === 'option_map' || source === 'item_map')) {
    return 'readiness_supported'
  }
  if (source === 'option_map' || source === 'item_map' || source === 'rationale_trap') {
    return 'practice_hypothesis'
  }
  return 'attempt_signal'
}

const getTrustSnapshot = (item: QuestionEngineItem): ItemTrustSnapshot => ({
  itemId: item.itemId,
  sourceStatus: item.sourceStatus,
  reviewStatus: item.reviewStatus,
  readinessState: item.readinessState,
  readinessExclusionReasons: item.readinessExclusionReasons,
  countsTowardReadiness: item.countsTowardReadinessDefault,
  adapterVersion: questionEngineVersions.adapter,
  readinessVersion: questionEngineVersions.readiness,
})

export function diagnoseAttempt(
  item: QuestionEngineItem,
  attempt: AttemptForDiagnosis,
  scoreResult: ScoreResult,
  calibrationScore: number,
): AttemptDiagnosis {
  const createdAt = attempt.completedAt
  const mapped = scoreResult.isCorrect
    ? { id: 'unknown_misconception' as const, source: 'unknown' as const, confidence: 0 }
    : chooseMappedMisconception(item, scoreResult)
  const definition = getMisconceptionDefinition(mapped.id)
  const confidenceEscalated =
    scoreResult.confidenceEscalated ||
    (attempt.confidence === 'high' && (!scoreResult.isCorrect || definition.safetySeverity === 'high' || definition.safetySeverity === 'critical'))
  const repairRequired = !scoreResult.isCorrect && (attempt.confidence === 'high' || definition.safetySeverity === 'high' || definition.safetySeverity === 'critical')

  return {
    id: `${attempt.id}:diagnosis`,
    attemptId: attempt.id,
    itemId: item.itemId,
    rawBinaryCorrect: attempt.isCorrect,
    scoreResult,
    calibrationScore,
    likelyMisconceptionId: mapped.id,
    misconceptionFamily: definition.family,
    misconceptionConfidence: mapped.confidence,
    diagnosisSource: mapped.source,
    evidenceLevel: getEvidenceLevel(item, mapped.source),
    clinicalJudgmentStep: item.clinicalJudgmentStep,
    nursingProcessStep: item.nursingProcessStep,
    clientNeed: item.clientNeed,
    subcategory: item.subcategory,
    itemType: item.itemType,
    safetySeverity: definition.safetySeverity,
    confidenceEscalated,
    remediationRoute: scoreResult.isCorrect ? 'none' : definition.remediationRoute,
    repairRequired,
    repairCompleted: false,
    countsTowardReadiness: item.countsTowardReadinessDefault,
    readinessExclusionReasons: item.readinessExclusionReasons,
    itemTrustSnapshot: getTrustSnapshot(item),
    createdAt,
    diagnosisVersion: questionEngineVersions.diagnosis,
    misconceptionVocabularyVersion: questionEngineVersions.misconceptionVocabulary,
  }
}

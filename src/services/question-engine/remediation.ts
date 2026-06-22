import type { AttemptDiagnosis, RemediationEvent } from './types'

const routeLabels: Record<string, string> = {
  none: 'No remediation needed',
  priority_rescue_set: 'Priority rescue set',
  delegation_boundary_set: 'Delegation boundary set',
  evaluation_followup_set: 'Evaluation follow-up set',
  clinical_judgment_step_review: 'Clinical judgment step review',
}

const getNextActionCopy = (diagnosis: AttemptDiagnosis) => {
  if (diagnosis.scoreResult.isCorrect && diagnosis.calibrationScore < 0.4) {
    return 'Reinforce this answer with a quick flashcard because the knowledge is correct but still fragile.'
  }

  if (diagnosis.likelyMisconceptionId === 'delegating_nursing_judgment') {
    return 'Repair the scope boundary: delegate stable tasks, not assessment, teaching, evaluation, or escalation.'
  }

  if (diagnosis.misconceptionFamily === 'priority_and_acuity') {
    return 'Run a priority repair item that asks which client could deteriorate fastest.'
  }

  if (diagnosis.misconceptionFamily === 'escalation_and_follow_through') {
    return 'Practice closing the loop: reassess the full pattern after the first action.'
  }

  return 'Review the clinical judgment step, then answer a nearby repair question from a different angle.'
}

export function routeRemediation(diagnosis: AttemptDiagnosis): RemediationEvent[] {
  if (diagnosis.scoreResult.isCorrect && diagnosis.calibrationScore >= 0.4) return []

  const actionType = diagnosis.scoreResult.isCorrect
    ? 'reinforcement'
    : diagnosis.repairRequired
      ? 'targeted_repair'
      : 'micro_lesson'
  const blockedOfficialRepairReason = diagnosis.countsTowardReadiness
    ? undefined
    : diagnosis.readinessExclusionReasons[0] ?? 'insufficient_item_trust'

  return [
    {
      id: `${diagnosis.id}:remediation`,
      diagnosisId: diagnosis.id,
      attemptId: diagnosis.attemptId,
      itemId: diagnosis.itemId,
      misconceptionId: diagnosis.likelyMisconceptionId,
      misconceptionFamily: diagnosis.misconceptionFamily,
      routeId: diagnosis.remediationRoute === 'none' ? 'clinical_judgment_step_review' : diagnosis.remediationRoute,
      routeLabel: routeLabels[diagnosis.remediationRoute] ?? routeLabels.clinical_judgment_step_review,
      actionType,
      repairRequired: diagnosis.repairRequired,
      repairCompleted: false,
      repairSuccess: false,
      officialRepairEligible: diagnosis.countsTowardReadiness,
      blockedOfficialRepairReason,
      nextActionCopy: getNextActionCopy(diagnosis),
      createdAt: diagnosis.createdAt,
    },
  ]
}

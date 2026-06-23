import type { Question } from '../../app/types'
import {
  buildEngineLearningSnapshot,
  createAttemptEngineEvidence,
  evaluateRemediationTransfer,
  normalizeQuestionToEngineItem,
  selectNextItem,
  type QuestionEngineNormalizeOverrides,
} from '.'
import type {
  AttemptDiagnosis,
  MisconceptionId,
  RemediationEvent,
  SelectionDecision,
} from './types'

export const internalQAPilotRunbookId = 'qe_internal_qa_priority_repair_v1'
export const internalQAPilotRunbookVersion = '2026-06-22-internal-qa-pilot-v1'
export const internalQAEvidencePacketVersion = '2026-06-22-internal-qa-evidence-v1'

export interface InternalQAFixture {
  group: 'ngn_priority_case' | 'standalone_priority' | 'parallel_repair'
  question: Question
  overrides: QuestionEngineNormalizeOverrides
  scoringKey: {
    correctAnswer: string[]
    scoringMethod: string
    misconceptionMap: Record<string, string>
  }
  sourceVerificationRecord: {
    itemId: string
    sourceStatus: 'source_needed'
    reviewStatus: 'not_reviewed'
    candidateSourceVerified: false
    countsTowardReadiness: false
  }
}

export interface InternalQAAttemptResult {
  attemptFixtureId: string
  engineSubmitResultId: string
  scoreResultPassed: boolean
  calibrationPassed: boolean
  diagnosisPassed: boolean
  remediationRoutePassed: boolean
  trustGatePassed: boolean
  unexpectedReadinessPromotion: boolean
  diagnosis: AttemptDiagnosis
}

export interface InternalQASelectionProof {
  decisionId: string
  triggerAttemptFixtureId: string
  selectedItemId: string | null
  selectionIntent: string
  primaryReasonCode: string
  trustMode: string
  explanationKey: string
  selectedExpectedRepairItem: boolean
  genericCategorySelectedBeforeRepair: boolean
  decision: SelectionDecision
}

export interface InternalQARepairProof {
  remediationEventId: string
  triggerAttemptFixtureId: string
  repairItemId: string | null
  repairOutcome: string
  repairEvidenceLevel: string
  officialRepairSuccess: false
  officialRepairBlockedReasons: string[]
}

export interface InternalQAClaimEvidence {
  claimId: string
  claimSurface: 'internal_qa'
  claimStrength: 'suggestive' | 'practice_supported' | 'blocked' | 'mockup_only'
  canCountTowardOfficialReadiness: false
  canShowToSchool: false
  blockedReasons: string[]
}

export interface InternalQAMetricIntent {
  metricId: string
  trustScope: 'internal_qa' | 'practice_only'
  readinessEligible: false
  schoolVisible: false
  numerator: number | null
  denominator: number | null
  blockedOrLimitedReason: string | null
}

export interface InternalQAPilotEvidencePacket {
  packetId: string
  packetVersion: typeof internalQAEvidencePacketVersion
  runbookId: typeof internalQAPilotRunbookId
  runbookVersion: typeof internalQAPilotRunbookVersion
  fixtureBundle: {
    bundleId: string
    itemCount: number
    requiredItemIdsPresent: boolean
    nonPromotionInvariantsPassed: boolean
    missingOrInvalidFields: string[]
  }
  attemptResults: InternalQAAttemptResult[]
  selectionDecisions: InternalQASelectionProof[]
  repairEvidence: InternalQARepairProof[]
  readinessSnapshot: {
    snapshotId: string
    trustedAttemptCount: 0
    practiceAttemptCount: number
    readinessBand: 'insufficient_evidence'
    officialReadinessClaim: false
    exclusionCounts: Record<string, number>
  }
  claimEvidence: InternalQAClaimEvidence[]
  metricIntents: InternalQAMetricIntent[]
  reportingPrivacyContext: {
    reportMode: 'internal_qa'
    dataScope: 'practice_only_summary'
    disclosureState: 'internal_only'
    canShowToSchool: false
    canExport: false
  }
  overallPass: boolean
  releaseBlockers: string[]
}

const requiredFixtureIds = [
  'NGN-RN-MOC-PRIORITY-CLIENTS-0001-01',
  'NGN-RN-MOC-PRIORITY-CLIENTS-0001-02',
  'NGN-RN-MOC-PRIORITY-CLIENTS-0001-03',
  'NGN-RN-MOC-PRIORITY-CLIENTS-0001-04',
  'NGN-RN-MOC-PRIORITY-CLIENTS-0001-05',
  'NGN-RN-MOC-PRIORITY-CLIENTS-0001-06',
  'NC-RN-MOC-PRIORITY-CLIENTS-0001',
  'NC-RN-MOC-PRIORITY-CLIENTS-0002',
  'NC-RN-RRP-PRIORITY-CLIENTS-0003',
  'NC-RN-MOC-PRIORITY-REPAIR-0001',
  'NC-RN-MOC-DELEGATION-REPAIR-0001',
  'NC-RN-MOC-EVALUATE-REPAIR-0001',
]

const nowAt = (minute: number) =>
  new Date(Date.UTC(2026, 5, 22, 15, minute, 0)).toISOString()

const baseQuestion = (
  id: string,
  prompt: string,
  choices: Question['choices'],
  tags: string[],
): Question => ({
  id,
  examTrack: 'nclex-rn',
  category: 'Leadership / Prioritization / Delegation',
  subcategory: 'Priority clients',
  contentQuality: 'authored-draft',
  authorType: 'clinical-editor-draft',
  sourceRefs: ['Internal QA candidate source map'],
  sourceBacked: false,
  blueprintMapped: false,
  difficulty: 'developing',
  format: 'multiple-choice',
  scenario: 'Internal QA priority and delegation fixture.',
  prompt,
  choices,
  correctAnswer: ['A'],
  rationale: {
    whyCorrect: 'The safest response addresses unstable assessment findings first.',
    whyOthers: 'The other options delay assessment, delegate nursing judgment, or overvalue a stable finding.',
  },
  nclexTip: 'Use safety, instability, and scope before convenience.',
  clinicalRelevance: 'Internal QA only; source and review are intentionally incomplete.',
  tags,
})

const priorityChoices = [
  { id: 'A', text: 'Client with new shortness of breath and oxygen saturation of 86%.' },
  { id: 'B', text: 'Client reporting pain rated 8/10 after surgery.' },
  { id: 'C', text: 'Client waiting for discharge teaching.' },
  { id: 'D', text: 'Client needing routine documentation updated.' },
]

const delegationChoices = [
  { id: 'A', text: 'Assess the unstable client before assigning tasks.' },
  { id: 'B', text: 'Ask assistive personnel to assess the new shortness of breath.' },
  { id: 'C', text: 'Ask assistive personnel to complete discharge teaching.' },
  { id: 'D', text: 'Delegate vital signs for a stable client due later.' },
]

const evaluationChoices = [
  { id: 'A', text: 'Reassess the full respiratory pattern and oxygen response.' },
  { id: 'B', text: 'Document that the client is stable because one value improved.' },
  { id: 'C', text: 'Delay reassessment until the next routine vital signs.' },
  { id: 'D', text: 'Reassure the client without evaluating work of breathing.' },
]

const makeFixture = (
  group: InternalQAFixture['group'],
  question: Question,
  overrides: QuestionEngineNormalizeOverrides,
): InternalQAFixture => ({
  group,
  question,
  overrides,
  scoringKey: {
    correctAnswer: question.correctAnswer,
    scoringMethod: overrides.scoringMethod ?? 'binary',
    misconceptionMap: overrides.distractorMisconceptions ?? {},
  },
  sourceVerificationRecord: {
    itemId: question.id,
    sourceStatus: 'source_needed',
    reviewStatus: 'not_reviewed',
    candidateSourceVerified: false,
    countsTowardReadiness: false,
  },
})

const priorityOverrides: QuestionEngineNormalizeOverrides = {
  clinicalJudgmentStep: 'Prioritize hypotheses',
  nursingProcessStep: 'Analysis',
  rationaleQualityStatus: 'remediation_ready',
  priorityFrameworks: ['ABCs', 'unstable_vs_stable'],
  safetyFlags: ['oxygenation'],
  safetySeverity: 'high',
  distractorMisconceptions: {
    B: 'pain_before_perfusion_or_oxygenation',
    C: 'teaching_deadline_before_instability',
    D: 'routine_task_before_deterioration',
  },
}

const delegationOverrides: QuestionEngineNormalizeOverrides = {
  clinicalJudgmentStep: 'Take action',
  nursingProcessStep: 'Implementation',
  rationaleQualityStatus: 'remediation_ready',
  priorityFrameworks: ['delegation', 'scope_of_practice'],
  safetyFlags: ['scope_of_practice'],
  safetySeverity: 'high',
  distractorMisconceptions: {
    B: 'delegating_nursing_judgment',
    C: 'delegating_initial_teaching_or_evaluation',
  },
}

const evaluationOverrides: QuestionEngineNormalizeOverrides = {
  clinicalJudgmentStep: 'Evaluate outcomes',
  nursingProcessStep: 'Evaluation',
  rationaleQualityStatus: 'remediation_ready',
  priorityFrameworks: ['unstable_vs_stable'],
  safetyFlags: ['oxygenation'],
  safetySeverity: 'high',
  distractorMisconceptions: {
    B: 'single_improved_value_equals_stable',
    C: 'delayed_escalation_for_deterioration',
    D: 'reassurance_despite_instability',
  },
  misconceptionTested: 'single_improved_value_equals_stable',
}

export const createInternalQAPriorityRepairFixtureBundle = (): InternalQAFixture[] => {
  const ngnCaseItems = Array.from({ length: 6 }, (_, index) => {
    const id = `NGN-RN-MOC-PRIORITY-CLIENTS-0001-0${index + 1}`
    const isEvaluationItem = index === 5
    return makeFixture(
      'ngn_priority_case',
      baseQuestion(
        id,
        isEvaluationItem
          ? 'Which finding best shows whether the priority intervention worked?'
          : `Internal QA NGN priority case item ${index + 1}.`,
        isEvaluationItem ? evaluationChoices : priorityChoices,
        isEvaluationItem ? ['evaluate', 'priority', 'oxygenation'] : ['priority', 'oxygenation'],
      ),
      isEvaluationItem
        ? { ...evaluationOverrides, itemType: 'matrix', scoringMethod: 'matrix_partial' }
        : { ...priorityOverrides, itemType: 'matrix', scoringMethod: 'matrix_partial' },
    )
  })

  return [
    ...ngnCaseItems,
    makeFixture(
      'standalone_priority',
      baseQuestion(
        'NC-RN-MOC-PRIORITY-CLIENTS-0001',
        'Which client should the nurse see first?',
        priorityChoices,
        ['priority', 'oxygenation', 'unstable'],
      ),
      priorityOverrides,
    ),
    makeFixture(
      'standalone_priority',
      baseQuestion(
        'NC-RN-MOC-PRIORITY-CLIENTS-0002',
        'Which action is safest for the nurse to take before delegating?',
        delegationChoices,
        ['delegation', 'scope', 'unstable'],
      ),
      delegationOverrides,
    ),
    makeFixture(
      'standalone_priority',
      baseQuestion(
        'NC-RN-RRP-PRIORITY-CLIENTS-0003',
        'Which follow-up finding requires immediate escalation?',
        evaluationChoices,
        ['evaluate', 'follow-up', 'oxygenation'],
      ),
      evaluationOverrides,
    ),
    makeFixture(
      'parallel_repair',
      baseQuestion(
        'NC-RN-MOC-PRIORITY-REPAIR-0001',
        'A different set of clients calls. Which one could deteriorate fastest?',
        priorityChoices,
        ['repair', 'priority', 'oxygenation'],
      ),
      {
        ...priorityOverrides,
        misconceptionTested: 'pain_before_perfusion_or_oxygenation',
      },
    ),
    makeFixture(
      'parallel_repair',
      baseQuestion(
        'NC-RN-MOC-DELEGATION-REPAIR-0001',
        'Which delegated task would cross the RN scope boundary?',
        delegationChoices,
        ['repair', 'delegation', 'scope'],
      ),
      {
        ...delegationOverrides,
        misconceptionTested: 'delegating_nursing_judgment',
      },
    ),
    makeFixture(
      'parallel_repair',
      baseQuestion(
        'NC-RN-MOC-EVALUATE-REPAIR-0001',
        'Which response best proves the priority intervention worked?',
        evaluationChoices,
        ['repair', 'evaluate', 'follow-up'],
      ),
      evaluationOverrides,
    ),
  ]
}

const attemptScenarios = [
  {
    attemptFixtureId: 'qe_attempt_pain_first_high_confidence',
    itemId: 'NC-RN-MOC-PRIORITY-CLIENTS-0001',
    selectedAnswer: ['B'],
    confidence: 'high' as const,
    expectedMisconceptionId: 'pain_before_perfusion_or_oxygenation',
    expectedRoute: 'priority_rescue_set',
    expectedRepairItemId: 'NC-RN-MOC-PRIORITY-REPAIR-0001',
    expectedCalibration: -1,
  },
  {
    attemptFixtureId: 'qe_attempt_teaching_deadline_high_confidence',
    itemId: 'NC-RN-MOC-PRIORITY-CLIENTS-0001',
    selectedAnswer: ['C'],
    confidence: 'high' as const,
    expectedMisconceptionId: 'teaching_deadline_before_instability',
    expectedRoute: 'priority_rescue_set',
    expectedRepairItemId: 'NC-RN-MOC-PRIORITY-REPAIR-0001',
    expectedCalibration: -1,
  },
  {
    attemptFixtureId: 'qe_attempt_routine_task_high_confidence',
    itemId: 'NC-RN-MOC-PRIORITY-CLIENTS-0001',
    selectedAnswer: ['D'],
    confidence: 'high' as const,
    expectedMisconceptionId: 'routine_task_before_deterioration',
    expectedRoute: 'priority_rescue_set',
    expectedRepairItemId: 'NC-RN-MOC-PRIORITY-REPAIR-0001',
    expectedCalibration: -1,
  },
  {
    attemptFixtureId: 'qe_attempt_delegation_to_uap_high_confidence',
    itemId: 'NC-RN-MOC-PRIORITY-CLIENTS-0002',
    selectedAnswer: ['B'],
    confidence: 'high' as const,
    expectedMisconceptionId: 'delegating_nursing_judgment',
    expectedRoute: 'delegation_boundary_set',
    expectedRepairItemId: 'NC-RN-MOC-DELEGATION-REPAIR-0001',
    expectedCalibration: -1,
  },
  {
    attemptFixtureId: 'qe_attempt_teaching_delegated_medium_confidence',
    itemId: 'NC-RN-MOC-PRIORITY-CLIENTS-0002',
    selectedAnswer: ['C'],
    confidence: 'medium' as const,
    expectedMisconceptionId: 'delegating_initial_teaching_or_evaluation',
    expectedRoute: 'delegation_boundary_set',
    expectedRepairItemId: 'NC-RN-MOC-DELEGATION-REPAIR-0001',
    expectedCalibration: -0.6,
  },
  {
    attemptFixtureId: 'qe_attempt_partial_improvement_high_confidence',
    itemId: 'NGN-RN-MOC-PRIORITY-CLIENTS-0001-06',
    selectedAnswer: ['B'],
    confidence: 'high' as const,
    expectedMisconceptionId: 'single_improved_value_equals_stable',
    expectedRoute: 'evaluation_followup_set',
    expectedRepairItemId: 'NC-RN-MOC-EVALUATE-REPAIR-0001',
    expectedCalibration: -1,
  },
  {
    attemptFixtureId: 'qe_attempt_correct_low_confidence_priority',
    itemId: 'NC-RN-MOC-PRIORITY-CLIENTS-0001',
    selectedAnswer: ['A'],
    confidence: 'low' as const,
    expectedMisconceptionId: 'unknown_misconception',
    expectedRoute: 'none',
    expectedRepairItemId: null,
    expectedCalibration: 0.2,
  },
]

const evidenceForScenario = (
  fixtureById: Map<string, InternalQAFixture>,
  scenario: (typeof attemptScenarios)[number],
  index: number,
) => {
  const fixture = fixtureById.get(scenario.itemId)
  if (!fixture) throw new Error(`Missing internal QA fixture ${scenario.itemId}`)
  return createAttemptEngineEvidence(
    fixture.question,
    {
      id: scenario.attemptFixtureId,
      questionId: scenario.itemId,
      selectedAnswer: scenario.selectedAnswer,
      isCorrect: scenario.selectedAnswer.includes('A') && scenario.selectedAnswer.length === 1,
      confidence: scenario.confidence,
      timeSpentSec: 70,
      flagged: false,
      completedAt: nowAt(index),
      sessionType: 'internal_qa',
    },
    fixture.overrides,
  )
}

const buildSelectionProof = (
  fixtures: InternalQAFixture[],
  diagnoses: AttemptDiagnosis[],
  remediationEvents: RemediationEvent[],
  scenario: (typeof attemptScenarios)[number],
): InternalQASelectionProof | null => {
  if (!scenario.expectedRepairItemId) return null
  const triggerDiagnosis = diagnoses.find((diagnosis) => diagnosis.attemptId === scenario.attemptFixtureId)
  if (!triggerDiagnosis) return null
  const triggerRemediationEvents = remediationEvents.filter(
    (event) => event.diagnosisId === triggerDiagnosis.id,
  )
  const candidateItems = fixtures.map((fixture) =>
    normalizeQuestionToEngineItem(fixture.question, fixture.overrides).engineItem,
  )
  const vector = buildEngineLearningSnapshot([triggerDiagnosis], triggerRemediationEvents).masteryVector
  const decision = selectNextItem(candidateItems, vector, [triggerDiagnosis])

  return {
    decisionId: `${scenario.attemptFixtureId}:selection`,
    triggerAttemptFixtureId: scenario.attemptFixtureId,
    selectedItemId: decision.selectedItemId,
    selectionIntent: decision.selectionIntent,
    primaryReasonCode: decision.primaryReasonCode,
    trustMode: decision.trustMode,
    explanationKey: decision.learnerExplanationKey,
    selectedExpectedRepairItem: decision.selectedItemId === scenario.expectedRepairItemId,
    genericCategorySelectedBeforeRepair:
      Boolean(decision.selectedItemId) && decision.selectedItemId !== scenario.expectedRepairItemId,
    decision,
  }
}

const buildPracticeRepairProof = (
  fixtureById: Map<string, InternalQAFixture>,
  triggerScenario: (typeof attemptScenarios)[number],
  triggerDiagnosis: AttemptDiagnosis,
  remediationEvent: RemediationEvent,
): InternalQARepairProof | null => {
  if (!triggerScenario.expectedRepairItemId) return null
  const repairFixture = fixtureById.get(triggerScenario.expectedRepairItemId)
  if (!repairFixture) return null
  const repairEvidence = createAttemptEngineEvidence(
    repairFixture.question,
    {
      id: `${triggerScenario.attemptFixtureId}:practice-repair`,
      questionId: repairFixture.question.id,
      selectedAnswer: ['A'],
      isCorrect: true,
      confidence: 'high',
      timeSpentSec: 50,
      flagged: false,
      completedAt: nowAt(40),
      sessionType: 'internal_qa',
    },
    repairFixture.overrides,
  )
  const repaired = evaluateRemediationTransfer(
    remediationEvent,
    triggerDiagnosis,
    repairEvidence.diagnosis,
    {
      repairMisconceptionId:
        triggerScenario.expectedMisconceptionId === 'unknown_misconception'
          ? undefined
          : triggerScenario.expectedMisconceptionId as MisconceptionId,
    },
  )

  return {
    remediationEventId: repaired.id,
    triggerAttemptFixtureId: triggerScenario.attemptFixtureId,
    repairItemId: repaired.repairItemId,
    repairOutcome: repaired.repairOutcome,
    repairEvidenceLevel: repaired.transferEvidenceLevel,
    officialRepairSuccess: false,
    officialRepairBlockedReasons: repaired.blockedReasons,
  }
}

const toAttemptResult = (
  scenario: (typeof attemptScenarios)[number],
  diagnosis: AttemptDiagnosis,
): InternalQAAttemptResult => ({
  attemptFixtureId: scenario.attemptFixtureId,
  engineSubmitResultId: diagnosis.id,
  scoreResultPassed: scenario.selectedAnswer[0] === 'A'
    ? diagnosis.scoreResult.isCorrect
    : !diagnosis.scoreResult.isCorrect,
  calibrationPassed: Math.abs(diagnosis.calibrationScore - scenario.expectedCalibration) < 0.001,
  diagnosisPassed: diagnosis.likelyMisconceptionId === scenario.expectedMisconceptionId,
  remediationRoutePassed: diagnosis.remediationRoute === scenario.expectedRoute,
  trustGatePassed:
    !diagnosis.countsTowardReadiness &&
    diagnosis.itemTrustSnapshot.sourceStatus === 'source_needed' &&
    diagnosis.itemTrustSnapshot.reviewStatus === 'not_reviewed',
  unexpectedReadinessPromotion: diagnosis.countsTowardReadiness,
  diagnosis,
})

const getFixtureIssues = (fixtures: InternalQAFixture[]) => {
  const ids = new Set(fixtures.map((fixture) => fixture.question.id))
  const missing = requiredFixtureIds.filter((id) => !ids.has(id))
  const promoted = fixtures
    .map((fixture) => normalizeQuestionToEngineItem(fixture.question, fixture.overrides).engineItem)
    .filter((item) => item.countsTowardReadinessDefault || item.readinessState !== 'draft_only')
    .map((item) => item.itemId)
  return [
    ...missing.map((id) => `missing_required_item:${id}`),
    ...promoted.map((id) => `unexpected_readiness_promotion:${id}`),
  ]
}

export function runInternalQAPriorityRepairPilot(): InternalQAPilotEvidencePacket {
  const fixtures = createInternalQAPriorityRepairFixtureBundle()
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.question.id, fixture]))
  const fixtureIssues = getFixtureIssues(fixtures)
  const diagnoses: AttemptDiagnosis[] = []
  const remediationEvents: RemediationEvent[] = []
  const attemptResults: InternalQAAttemptResult[] = []
  const selectionDecisions: InternalQASelectionProof[] = []

  attemptScenarios.forEach((scenario, index) => {
    const evidence = evidenceForScenario(fixtureById, scenario, index)
    diagnoses.push(evidence.diagnosis)
    remediationEvents.push(...evidence.remediationEvents)
    attemptResults.push(toAttemptResult(scenario, evidence.diagnosis))
    const selectionProof = buildSelectionProof(fixtures, diagnoses, remediationEvents, scenario)
    if (selectionProof) selectionDecisions.push(selectionProof)
  })

  const repairEvidence = buildPracticeRepairProof(
    fixtureById,
    attemptScenarios[0],
    diagnoses[0],
    remediationEvents.find((event) => event.diagnosisId === diagnoses[0].id) ?? remediationEvents[0],
  )
  const repairProofs = repairEvidence ? [repairEvidence] : []
  const snapshot = buildEngineLearningSnapshot(diagnoses, remediationEvents, {
    snapshotScope: 'internal_qa_only',
    requiredClaimsPresent: false,
    reconstructionStatus: 'not_required',
    generatedAt: nowAt(60),
  }).readinessSnapshot
  const releaseBlockers = [
    ...fixtureIssues,
    ...attemptResults.flatMap((result) => {
      const failures = []
      if (!result.scoreResultPassed) failures.push(`${result.attemptFixtureId}:score`)
      if (!result.calibrationPassed) failures.push(`${result.attemptFixtureId}:calibration`)
      if (!result.diagnosisPassed) failures.push(`${result.attemptFixtureId}:diagnosis`)
      if (!result.remediationRoutePassed) failures.push(`${result.attemptFixtureId}:remediation_route`)
      if (!result.trustGatePassed) failures.push(`${result.attemptFixtureId}:trust_gate`)
      if (result.unexpectedReadinessPromotion) failures.push(`${result.attemptFixtureId}:readiness_promotion`)
      return failures
    }),
    ...selectionDecisions
      .filter((proof) => !proof.selectedExpectedRepairItem)
      .map((proof) => `${proof.triggerAttemptFixtureId}:repair_selection`),
    ...repairProofs
      .filter((proof) => proof.officialRepairSuccess)
      .map((proof) => `${proof.triggerAttemptFixtureId}:official_repair_promotion`),
    snapshot.trustedAttemptCount !== 0 ? 'snapshot_trusted_attempts_present' : null,
    snapshot.status !== 'insufficient_evidence' ? 'snapshot_readiness_promotion' : null,
    snapshot.schoolReportingAllowed ? 'school_reporting_enabled' : null,
  ].filter(Boolean) as string[]

  return {
    packetId: `internal-qa:${internalQAPilotRunbookId}:2026-06-22`,
    packetVersion: internalQAEvidencePacketVersion,
    runbookId: internalQAPilotRunbookId,
    runbookVersion: internalQAPilotRunbookVersion,
    fixtureBundle: {
      bundleId: 'priority-repair-fixture-bundle-v1',
      itemCount: fixtures.length,
      requiredItemIdsPresent: fixtureIssues.every((issue) => !issue.startsWith('missing_required_item')),
      nonPromotionInvariantsPassed: fixtureIssues.every(
        (issue) => !issue.startsWith('unexpected_readiness_promotion'),
      ),
      missingOrInvalidFields: fixtureIssues,
    },
    attemptResults,
    selectionDecisions,
    repairEvidence: repairProofs,
    readinessSnapshot: {
      snapshotId: 'internal-qa-priority-repair-snapshot-v1',
      trustedAttemptCount: 0,
      practiceAttemptCount: snapshot.practiceAttemptCount,
      readinessBand: 'insufficient_evidence',
      officialReadinessClaim: false,
      exclusionCounts: snapshot.exclusionCounts,
    },
    claimEvidence: [
      {
        claimId: 'internal_qa_readiness_blocked',
        claimSurface: 'internal_qa',
        claimStrength: 'blocked',
        canCountTowardOfficialReadiness: false,
        canShowToSchool: false,
        blockedReasons: snapshot.blockedReasons,
      },
    ],
    metricIntents: [
      {
        metricId: 'QE-METRIC-001',
        trustScope: 'internal_qa',
        readinessEligible: false,
        schoolVisible: false,
        numerator: snapshot.trustedAttemptCount,
        denominator: snapshot.practiceAttemptCount,
        blockedOrLimitedReason: 'trusted_attempt_count_zero',
      },
      {
        metricId: 'QE-METRIC-006',
        trustScope: 'practice_only',
        readinessEligible: false,
        schoolVisible: false,
        numerator: repairProofs.filter((proof) => proof.repairOutcome === 'practice_repair_supported').length,
        denominator: repairProofs.length,
        blockedOrLimitedReason: 'draft_repair_not_official_transfer',
      },
    ],
    reportingPrivacyContext: {
      reportMode: 'internal_qa',
      dataScope: 'practice_only_summary',
      disclosureState: 'internal_only',
      canShowToSchool: false,
      canExport: false,
    },
    overallPass: releaseBlockers.length === 0,
    releaseBlockers,
  }
}

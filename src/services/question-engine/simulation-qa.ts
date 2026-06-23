import type { Question } from '../../app/types'
import { diagnoseAttempt } from './diagnosis'
import { buildLearnerMasteryVector } from './mastery'
import {
  normalizeQuestionToEngineItem,
  type QuestionEngineNormalizeOverrides,
} from './normalize'
import { buildReadinessSnapshot } from './readiness-snapshot'
import { routeRemediation } from './remediation'
import {
  calculateCalibrationScore,
  scoreAttempt,
  withConfidenceEscalation,
} from './scoring'
import { selectNextItem } from './selection'
import type {
  AttemptDiagnosis,
  ClinicalJudgmentStep,
  ConfidenceSignal,
  LearnerMasteryVector,
  MisconceptionId,
  NursingProcessStep,
  QuestionEngineItem,
  ReadinessBlockedReason,
  ReadinessSnapshot,
  RemediationEvent,
  SelectionDecision,
  SelectionReasonCode,
} from './types'

export const syntheticLearnerSimulationVersion = '2026-06-23-synthetic-learner-simulation-v1'

export type SyntheticLearnerCohortId =
  | 'balanced_ready_candidate'
  | 'priority_overconfident'
  | 'fragile_low_confidence'
  | 'coverage_gap_high_accuracy'
  | 'draft_only_high_accuracy'

type SyntheticItemPoolMode = 'balanced_trusted' | 'adaptive_practice' | 'coverage_limited' | 'draft_only'

export interface SyntheticLearnerProfile {
  learnerId: string
  cohortId: SyntheticLearnerCohortId
  attemptCount: number
  baseAccuracy: number
  itemPoolMode: SyntheticItemPoolMode
  weakClinicalJudgmentSteps: ClinicalJudgmentStep[]
  weakMisconceptionIds: MisconceptionId[]
  weakClientNeeds: string[]
  overconfidentMissRate: number
  lowConfidenceCorrectRate: number
  trustedOnly: boolean
}

export interface SyntheticQuestionFixture {
  fixtureId: string
  role: 'trusted_readiness' | 'practice_repair' | 'draft_practice'
  question: Question
  overrides: QuestionEngineNormalizeOverrides
  engineItem: QuestionEngineItem
}

export interface SyntheticSelectionTrace {
  attemptIndex: number
  activeRepairBeforeSelection: boolean
  selectedItemId: string | null
  primaryReasonCode: SelectionReasonCode
  selectionIntent: SelectionDecision['selectionIntent']
  targetClinicalJudgmentStep: string | null
  targetMisconceptionId: string | null
}

export interface SyntheticLearnerSimulationResult {
  learnerId: string
  cohortId: SyntheticLearnerCohortId
  attemptCount: number
  trustedAttemptCount: number
  accuracy: number
  highConfidenceMissCount: number
  lowConfidenceCorrectCount: number
  confidenceMismatchCount: number
  repairOpportunityCount: number
  repairSelectionCount: number
  repairSelectionRate: number
  readinessStatus: ReadinessSnapshot['status']
  readinessScoreAvailable: boolean
  readinessScore: number
  blockedReasons: ReadinessBlockedReason[]
  topWeakDimensionIds: string[]
  topConfidenceRiskIds: string[]
  selectionTrace: SyntheticSelectionTrace[]
  masteryVector: LearnerMasteryVector
  readinessSnapshot: ReadinessSnapshot
}

export interface SyntheticSimulationCohortSummary {
  cohortId: SyntheticLearnerCohortId
  learnerCount: number
  attemptCount: number
  avgAccuracy: number
  avgTrustedAttempts: number
  avgHighConfidenceMisses: number
  avgLowConfidenceCorrect: number
  avgConfidenceMismatchCount: number
  avgRepairSelectionRate: number
  readyCount: number
  insufficientEvidenceCount: number
  confidenceBlockedCount: number
  coverageBlockedCount: number
  trustedVolumeBlockedCount: number
  avgReadinessScore: number
  readinessScoreAvailableCount: number
  topWeakDimensionIds: string[]
  topConfidenceRiskIds: string[]
}

export interface SyntheticSimulationInvariant {
  invariantId: string
  passed: boolean
  severity: 'blocker' | 'warning'
  observed: string
}

export interface SyntheticEngineSimulationReport {
  reportId: string
  simulationVersion: typeof syntheticLearnerSimulationVersion
  dataMode: 'synthetic_only'
  learnerCount: number
  attemptCount: number
  itemCount: number
  trustedItemCount: number
  cohortSummaries: SyntheticSimulationCohortSummary[]
  invariants: SyntheticSimulationInvariant[]
  overallPass: boolean
  releaseBlockers: string[]
  sampleLearners: SyntheticLearnerSimulationResult[]
}

const clinicalJudgmentSteps: ClinicalJudgmentStep[] = [
  'Recognize cues',
  'Analyze cues',
  'Prioritize hypotheses',
  'Generate solutions',
  'Take action',
  'Evaluate outcomes',
]

const clientNeeds = [
  'Safe and Effective Care Environment',
  'Health Promotion and Maintenance',
  'Psychosocial Integrity',
  'Physiological Integrity',
]

const repairReasonCodes = new Set<SelectionReasonCode>([
  'active_safety_misconception',
  'active_high_confidence_miss',
  'mapped_misconception_repair_available',
  'repair_required_not_proven',
])

const misconceptionByStep: Record<ClinicalJudgmentStep, MisconceptionId> = {
  'Recognize cues': 'expected_finding_over_unexpected_change',
  'Analyze cues': 'single_improved_value_equals_stable',
  'Prioritize hypotheses': 'pain_before_perfusion_or_oxygenation',
  'Generate solutions': 'teaching_deadline_before_instability',
  'Take action': 'delegating_nursing_judgment',
  'Evaluate outcomes': 'failure_to_close_loop_after_intervention',
  'Not primary': 'unknown_misconception',
}

const nursingProcessByStep: Record<ClinicalJudgmentStep, NursingProcessStep> = {
  'Recognize cues': 'Assessment',
  'Analyze cues': 'Analysis',
  'Prioritize hypotheses': 'Analysis',
  'Generate solutions': 'Planning',
  'Take action': 'Implementation',
  'Evaluate outcomes': 'Evaluation',
  'Not primary': 'Not primary',
}

const roundMetric = (value: number) => Math.round(value * 1000) / 1000
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const hashToUnit = (seed: string) => {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 10000) / 10000
}

const utcMinute = (minute: number) =>
  new Date(Date.UTC(2026, 5, 23, 18, minute, 0)).toISOString()

const buildChoices = (step: ClinicalJudgmentStep, multiCorrect: boolean): Question['choices'] => {
  if (step === 'Take action') {
    return [
      { id: 'A', text: 'Assess the unstable client before assigning tasks.' },
      { id: 'B', text: multiCorrect ? 'Keep the delegated task limited to stable routine care.' : 'Delegate assessment of the unstable client to assistive personnel.' },
      { id: 'C', text: 'Ask assistive personnel to complete discharge teaching.' },
      { id: 'D', text: 'Delay the RN assessment until routine rounds.' },
    ]
  }

  if (step === 'Evaluate outcomes') {
    return [
      { id: 'A', text: 'Reassess the full respiratory pattern and work of breathing.' },
      { id: 'B', text: multiCorrect ? 'Compare the current response with the original priority cue.' : 'Document stability because one value improved.' },
      { id: 'C', text: 'Wait until the next scheduled assessment.' },
      { id: 'D', text: 'Reassure the client without reassessing.' },
    ]
  }

  return [
    { id: 'A', text: 'Prioritize the unstable cue and act before routine care.' },
    { id: 'B', text: multiCorrect ? 'Verify the safety cue before moving to lower-priority tasks.' : 'Treat reported pain before oxygenation or perfusion.' },
    { id: 'C', text: 'Finish discharge teaching because it is time-sensitive.' },
    { id: 'D', text: 'Complete routine documentation before reassessment.' },
  ]
}

const getDistractorMisconceptions = (
  step: ClinicalJudgmentStep,
  multiCorrect: boolean,
): Record<string, MisconceptionId> => {
  if (step === 'Take action') {
    return {
      ...(multiCorrect ? {} : { B: 'delegating_unstable_client_care' as const }),
      C: 'delegating_initial_teaching_or_evaluation',
      D: 'delayed_escalation_for_deterioration',
    }
  }

  if (step === 'Evaluate outcomes') {
    return {
      ...(multiCorrect ? {} : { B: 'single_improved_value_equals_stable' as const }),
      C: 'delayed_escalation_for_deterioration',
      D: 'reassurance_despite_instability',
    }
  }

  return {
    ...(multiCorrect ? {} : { B: 'pain_before_perfusion_or_oxygenation' as const }),
    C: 'teaching_deadline_before_instability',
    D: 'routine_task_before_deterioration',
  }
}

const makeQuestion = (
  id: string,
  clientNeed: string,
  step: ClinicalJudgmentStep,
  role: SyntheticQuestionFixture['role'],
  multiCorrect: boolean,
): Question => ({
  id,
  examTrack: 'nclex-rn',
  category: clientNeed,
  subcategory: `${step} simulation`,
  contentQuality: role === 'trusted_readiness' ? 'published' : 'authored-draft',
  authorType: role === 'trusted_readiness' ? 'sme-authored' : 'clinical-editor-draft',
  sourceRefs: role === 'trusted_readiness' ? ['Synthetic source-backed fixture map'] : [],
  sourceBacked: role === 'trusted_readiness',
  blueprintMapped: role === 'trusted_readiness',
  difficulty: step === 'Analyze cues' || step === 'Evaluate outcomes' ? 'advanced' : 'developing',
  format: multiCorrect ? 'select-all-that-apply' : 'multiple-choice',
  scenario: `Synthetic QA scenario for ${step}.`,
  prompt: `Synthetic QA ${step} item for ${clientNeed}.`,
  choices: buildChoices(step, multiCorrect),
  correctAnswer: multiCorrect ? ['A', 'B'] : ['A'],
  rationale: {
    whyCorrect: 'The safest response follows the priority cue and closes the clinical judgment loop.',
    whyOthers: 'The distractors represent common priority, delegation, or follow-through traps.',
  },
  nclexTip: 'Use cues, safety, and scope before routine task completion.',
  clinicalRelevance: 'Synthetic QA only; no real learner or patient data is used.',
  tags: ['synthetic-qa', step.toLowerCase().replaceAll(' ', '-')],
})

const makeFixture = (
  id: string,
  role: SyntheticQuestionFixture['role'],
  clientNeed: string,
  step: ClinicalJudgmentStep,
  index: number,
): SyntheticQuestionFixture => {
  const multiCorrect = index % 5 === 0
  const itemType = multiCorrect ? (index % 10 === 0 ? 'matrix' : 'sata') : 'multiple_choice'
  const misconception = misconceptionByStep[step]
  const question = makeQuestion(id, clientNeed, step, role, multiCorrect)
  const sourceStatus = role === 'trusted_readiness' ? 'source_checked' : 'source_needed'
  const reviewStatus = role === 'trusted_readiness' ? 'item_reviewed' : 'not_reviewed'
  const overrides: QuestionEngineNormalizeOverrides = {
    clientNeed,
    clinicalJudgmentStep: step,
    nursingProcessStep: nursingProcessByStep[step],
    itemType,
    scoringMethod: itemType === 'matrix' ? 'matrix_partial' : itemType === 'sata' ? 'all_or_nothing' : 'binary',
    sourceStatus,
    reviewStatus,
    rationaleQualityStatus: role === 'trusted_readiness' ? 'reviewed' : 'remediation_ready',
    contentOrigin: role === 'trusted_readiness' ? 'official_bank' : 'app_seed',
    generatedOnly: false,
    priorityFrameworks: step === 'Take action' ? ['delegation', 'scope_of_practice'] : ['ABCs', 'unstable_vs_stable'],
    safetyFlags: step === 'Take action' ? ['scope_of_practice'] : ['oxygenation'],
    safetySeverity: role === 'trusted_readiness'
      ? 'high'
      : step === 'Recognize cues' || step === 'Generate solutions'
        ? 'medium'
        : 'high',
    misconceptionTested: misconception === 'unknown_misconception' ? undefined : misconception,
    distractorMisconceptions: getDistractorMisconceptions(step, multiCorrect),
  }
  const engineItem = normalizeQuestionToEngineItem(question, overrides).engineItem

  return {
    fixtureId: id,
    role,
    question,
    overrides,
    engineItem,
  }
}

export const createSyntheticQuestionSimulationBank = (): SyntheticQuestionFixture[] => {
  const trusted = clinicalJudgmentSteps.flatMap((step, stepIndex) =>
    clientNeeds.map((clientNeed, needIndex) =>
      makeFixture(
        `SYN-RN-TRUSTED-${stepIndex + 1}-${needIndex + 1}`,
        'trusted_readiness',
        clientNeed,
        step,
        stepIndex * clientNeeds.length + needIndex,
      ),
    ),
  )

  const repair = clinicalJudgmentSteps.map((step, index) =>
    makeFixture(
      `SYN-RN-REPAIR-${index + 1}`,
      'practice_repair',
      clientNeeds[index % clientNeeds.length],
      step,
      index + 40,
    ),
  )

  const draft = clinicalJudgmentSteps.flatMap((step, stepIndex) =>
    [0, 1].map((offset) =>
      makeFixture(
        `SYN-RN-DRAFT-${stepIndex + 1}-${offset + 1}`,
        'draft_practice',
        clientNeeds[(stepIndex + offset) % clientNeeds.length],
        step,
        stepIndex * 2 + offset + 70,
      ),
    ),
  )

  return [...trusted, ...repair, ...draft]
}

export const createSyntheticLearnerProfiles = (learnerCount = 100): SyntheticLearnerProfile[] => {
  const cohortIds: SyntheticLearnerCohortId[] = [
    'balanced_ready_candidate',
    'priority_overconfident',
    'fragile_low_confidence',
    'coverage_gap_high_accuracy',
    'draft_only_high_accuracy',
  ]

  return Array.from({ length: learnerCount }, (_, index) => {
    const cohortId = cohortIds[index % cohortIds.length]
    const learnerId = `synthetic-${cohortId}-${String(Math.floor(index / cohortIds.length) + 1).padStart(2, '0')}`
    const common = {
      learnerId,
      cohortId,
      weakClientNeeds: [] as string[],
      weakMisconceptionIds: [] as MisconceptionId[],
      weakClinicalJudgmentSteps: [] as ClinicalJudgmentStep[],
    }

    if (cohortId === 'balanced_ready_candidate') {
      return {
        ...common,
        attemptCount: 72,
        baseAccuracy: 1,
        itemPoolMode: 'balanced_trusted',
        overconfidentMissRate: 0,
        lowConfidenceCorrectRate: 0,
        trustedOnly: true,
      }
    }

    if (cohortId === 'priority_overconfident') {
      return {
        ...common,
        attemptCount: 42,
        baseAccuracy: 0.76,
        itemPoolMode: 'adaptive_practice',
        weakClinicalJudgmentSteps: ['Prioritize hypotheses', 'Take action', 'Evaluate outcomes'],
        weakMisconceptionIds: [
          'pain_before_perfusion_or_oxygenation',
          'delegating_nursing_judgment',
          'single_improved_value_equals_stable',
        ],
        overconfidentMissRate: 0.88,
        lowConfidenceCorrectRate: 0.04,
        trustedOnly: false,
      }
    }

    if (cohortId === 'fragile_low_confidence') {
      return {
        ...common,
        attemptCount: 42,
        baseAccuracy: 0.86,
        itemPoolMode: 'adaptive_practice',
        weakClinicalJudgmentSteps: ['Analyze cues', 'Evaluate outcomes'],
        overconfidentMissRate: 0.08,
        lowConfidenceCorrectRate: 0.68,
        trustedOnly: false,
      }
    }

    if (cohortId === 'coverage_gap_high_accuracy') {
      return {
        ...common,
        attemptCount: 72,
        baseAccuracy: 0.95,
        itemPoolMode: 'coverage_limited',
        weakClientNeeds: ['Psychosocial Integrity', 'Physiological Integrity'],
        overconfidentMissRate: 0.05,
        lowConfidenceCorrectRate: 0.05,
        trustedOnly: true,
      }
    }

    return {
      ...common,
      attemptCount: 72,
      baseAccuracy: 0.96,
      itemPoolMode: 'draft_only',
      overconfidentMissRate: 0.04,
      lowConfidenceCorrectRate: 0.04,
      trustedOnly: false,
    }
  })
}

const getCandidateFixtures = (
  fixtures: SyntheticQuestionFixture[],
  profile: SyntheticLearnerProfile,
) => {
  if (profile.itemPoolMode === 'balanced_trusted') {
    return fixtures.filter((fixture) => fixture.role === 'trusted_readiness')
  }

  if (profile.itemPoolMode === 'coverage_limited') {
    return fixtures.filter(
      (fixture) =>
        fixture.role === 'trusted_readiness' &&
        fixture.engineItem.clientNeed === 'Safe and Effective Care Environment' &&
        ['Prioritize hypotheses', 'Take action'].includes(fixture.engineItem.clinicalJudgmentStep),
    )
  }

  if (profile.itemPoolMode === 'draft_only') {
    return fixtures.filter((fixture) => fixture.role === 'draft_practice')
  }

  return fixtures.filter((fixture) => fixture.role !== 'draft_practice')
}

const getCorrectProbability = (
  profile: SyntheticLearnerProfile,
  item: QuestionEngineItem,
  attemptIndex: number,
) => {
  const weakStepPenalty = profile.weakClinicalJudgmentSteps.includes(item.clinicalJudgmentStep) ? 0.24 : 0
  const weakNeedPenalty = profile.weakClientNeeds.includes(item.clientNeed) ? 0.18 : 0
  const misconceptionPenalty = Object.values(item.distractorMisconceptions).some((id) =>
    profile.weakMisconceptionIds.includes(id),
  ) ? 0.2 : 0
  const practiceGain = Math.min(0.1, attemptIndex * 0.002)
  const repairBoost = item.itemId.includes('REPAIR') ? 0.12 : 0

  return clamp01(profile.baseAccuracy - weakStepPenalty - weakNeedPenalty - misconceptionPenalty + practiceGain + repairBoost)
}

const chooseIncorrectAnswer = (
  profile: SyntheticLearnerProfile,
  item: QuestionEngineItem,
  attemptIndex: number,
) => {
  const preferred = Object.entries(item.distractorMisconceptions).find(([, misconceptionId]) =>
    profile.weakMisconceptionIds.includes(misconceptionId),
  )?.[0]
  if (preferred) return [preferred]

  const distractorIds = item.choices
    .map((choice) => choice.id)
    .filter((choiceId) => !item.correctAnswer.includes(choiceId))
  if (!distractorIds.length) return item.correctAnswer.slice(0, 1)

  const index = Math.floor(hashToUnit(`${profile.learnerId}:${item.itemId}:distractor:${attemptIndex}`) * distractorIds.length)
  return [distractorIds[Math.min(index, distractorIds.length - 1)]]
}

const chooseConfidence = (
  profile: SyntheticLearnerProfile,
  isCorrect: boolean,
  item: QuestionEngineItem,
  attemptIndex: number,
): 'low' | 'medium' | 'high' => {
  const seed = `${profile.learnerId}:${item.itemId}:confidence:${attemptIndex}`
  const roll = hashToUnit(seed)

  if (!isCorrect) {
    if (roll < profile.overconfidentMissRate) return 'high'
    return roll < 0.82 ? 'medium' : 'low'
  }

  if (roll < profile.lowConfidenceCorrectRate) return 'low'
  if (roll < profile.lowConfidenceCorrectRate + 0.24) return 'medium'
  return 'high'
}

const simulateAttempt = (
  profile: SyntheticLearnerProfile,
  fixture: SyntheticQuestionFixture,
  attemptIndex: number,
) => {
  const item = fixture.engineItem
  const correctProbability = getCorrectProbability(profile, item, attemptIndex)
  const isCorrect = hashToUnit(`${profile.learnerId}:${item.itemId}:score:${attemptIndex}`) < correctProbability
  const selectedAnswer = isCorrect
    ? item.correctAnswer
    : chooseIncorrectAnswer(profile, item, attemptIndex)
  const confidence = chooseConfidence(profile, isCorrect, item, attemptIndex)

  const attempt = {
    id: `${profile.learnerId}:attempt:${attemptIndex + 1}`,
    questionId: fixture.question.id,
    selectedAnswer,
    isCorrect,
    confidence,
    timeSpentSec: 45 + Math.floor(hashToUnit(`${profile.learnerId}:time:${attemptIndex}`) * 70),
    flagged: !isCorrect && confidence === 'high',
    completedAt: utcMinute(attemptIndex),
    sessionType: 'synthetic_simulation',
  }
  const scored = withConfidenceEscalation(
    scoreAttempt(fixture.engineItem, attempt.selectedAnswer),
    attempt.confidence,
  )
  const calibrationScore = calculateCalibrationScore(scored, attempt.confidence)
  const diagnosis = diagnoseAttempt(fixture.engineItem, attempt, scored, calibrationScore)

  return {
    diagnosis,
    remediationEvents: routeRemediation(diagnosis),
  }
}

const isActiveRepairContext = (diagnosis: AttemptDiagnosis | undefined) =>
  Boolean(
    diagnosis &&
      diagnosis.repairRequired &&
      !diagnosis.scoreResult.isCorrect &&
      (diagnosis.confidence === 'high' || diagnosis.confidenceEscalated),
  )

const countConfidenceSignals = (
  diagnoses: AttemptDiagnosis[],
  signal: ConfidenceSignal,
) => diagnoses.filter((diagnosis) => diagnosis.confidenceSignal === signal).length

const summarizeLearner = (
  profile: SyntheticLearnerProfile,
  diagnoses: AttemptDiagnosis[],
  remediationEvents: RemediationEvent[],
  selectionTrace: SyntheticSelectionTrace[],
): SyntheticLearnerSimulationResult => {
  const masteryVector = buildLearnerMasteryVector(diagnoses, remediationEvents)
  const readinessSnapshot = buildReadinessSnapshot(
    diagnoses,
    masteryVector,
    remediationEvents,
    {
      generatedAt: utcMinute(profile.attemptCount + 1),
      reconstructionStatus: 'not_required',
    },
  )
  const repairOpportunityCount = selectionTrace.filter((trace) => trace.activeRepairBeforeSelection).length
  const repairSelectionCount = selectionTrace.filter(
    (trace) => trace.activeRepairBeforeSelection && repairReasonCodes.has(trace.primaryReasonCode),
  ).length
  const correctCount = diagnoses.filter((diagnosis) => diagnosis.scoreResult.isCorrect).length

  return {
    learnerId: profile.learnerId,
    cohortId: profile.cohortId,
    attemptCount: diagnoses.length,
    trustedAttemptCount: readinessSnapshot.trustedAttemptCount,
    accuracy: roundMetric(correctCount / Math.max(diagnoses.length, 1)),
    highConfidenceMissCount: diagnoses.filter(
      (diagnosis) => diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect,
    ).length,
    lowConfidenceCorrectCount: countConfidenceSignals(diagnoses, 'fragile_correct'),
    confidenceMismatchCount: diagnoses.filter((diagnosis) => diagnosis.confidenceMismatch).length,
    repairOpportunityCount,
    repairSelectionCount,
    repairSelectionRate: roundMetric(repairSelectionCount / Math.max(repairOpportunityCount, 1)),
    readinessStatus: readinessSnapshot.status,
    readinessScoreAvailable: readinessSnapshot.readinessScoreAvailable,
    readinessScore: readinessSnapshot.readinessScore,
    blockedReasons: readinessSnapshot.blockedReasons,
    topWeakDimensionIds: readinessSnapshot.topWeakDimensions.map(
      (dimension) => `${dimension.dimensionType}:${dimension.dimensionId}`,
    ),
    topConfidenceRiskIds: readinessSnapshot.topConfidenceRisks.map(
      (dimension) => `${dimension.dimensionType}:${dimension.dimensionId}`,
    ),
    selectionTrace,
    masteryVector,
    readinessSnapshot,
  }
}

export const runSyntheticLearnerSimulation = (
  profile: SyntheticLearnerProfile,
  fixtures = createSyntheticQuestionSimulationBank(),
): SyntheticLearnerSimulationResult => {
  const candidateFixtures = getCandidateFixtures(fixtures, profile)
  const fixtureById = new Map(candidateFixtures.map((fixture) => [fixture.fixtureId, fixture]))
  const candidateItems = candidateFixtures.map((fixture) => fixture.engineItem)
  const diagnoses: AttemptDiagnosis[] = []
  const remediationEvents: RemediationEvent[] = []
  const selectionTrace: SyntheticSelectionTrace[] = []
  let highLoadStreak = 0

  for (let attemptIndex = 0; attemptIndex < profile.attemptCount; attemptIndex += 1) {
    const masteryVector = buildLearnerMasteryVector(diagnoses, remediationEvents)
    const activeRepairBeforeSelection = isActiveRepairContext(diagnoses.at(-1))
    const decision = selectNextItem(candidateItems, masteryVector, diagnoses, {
      trustMode: profile.trustedOnly ? 'readiness' : 'practice',
      highLoadStreak,
      recentWindowSize: 5,
    })
    const scriptedCoverageControl = profile.cohortId === 'balanced_ready_candidate'
    const selectedFixture = scriptedCoverageControl
      ? candidateFixtures[attemptIndex % candidateFixtures.length]
      : (decision.selectedItemId ? fixtureById.get(decision.selectedItemId) : undefined) ??
        candidateFixtures[attemptIndex % candidateFixtures.length]

    selectionTrace.push({
      attemptIndex,
      activeRepairBeforeSelection,
      selectedItemId: selectedFixture.fixtureId,
      primaryReasonCode: scriptedCoverageControl
        ? 'trusted_readiness_candidate'
        : decision.primaryReasonCode,
      selectionIntent: scriptedCoverageControl
        ? 'build_readiness_evidence'
        : decision.selectionIntent,
      targetClinicalJudgmentStep: selectedFixture.engineItem.clinicalJudgmentStep,
      targetMisconceptionId:
        selectedFixture.engineItem.misconceptionTested ??
        Object.values(selectedFixture.engineItem.distractorMisconceptions)[0] ??
        null,
    })

    const evidence = simulateAttempt(profile, selectedFixture, attemptIndex)
    diagnoses.push(evidence.diagnosis)
    remediationEvents.push(...evidence.remediationEvents)
    highLoadStreak = selectedFixture.engineItem.itemType === 'matrix' ? highLoadStreak + 1 : 0
  }

  return summarizeLearner(profile, diagnoses, remediationEvents, selectionTrace)
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

const topIds = (values: string[]) =>
  Object.entries(
    values.reduce<Record<string, number>>((counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1
      return counts
    }, {}),
  )
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([id]) => id)

const summarizeCohort = (
  cohortId: SyntheticLearnerCohortId,
  learners: SyntheticLearnerSimulationResult[],
): SyntheticSimulationCohortSummary => ({
  cohortId,
  learnerCount: learners.length,
  attemptCount: learners.reduce((sum, learner) => sum + learner.attemptCount, 0),
  avgAccuracy: roundMetric(average(learners.map((learner) => learner.accuracy))),
  avgTrustedAttempts: roundMetric(average(learners.map((learner) => learner.trustedAttemptCount))),
  avgHighConfidenceMisses: roundMetric(average(learners.map((learner) => learner.highConfidenceMissCount))),
  avgLowConfidenceCorrect: roundMetric(average(learners.map((learner) => learner.lowConfidenceCorrectCount))),
  avgConfidenceMismatchCount: roundMetric(average(learners.map((learner) => learner.confidenceMismatchCount))),
  avgRepairSelectionRate: roundMetric(average(learners.map((learner) => learner.repairSelectionRate))),
  readyCount: learners.filter((learner) => learner.readinessStatus === 'ready').length,
  insufficientEvidenceCount: learners.filter((learner) => learner.readinessStatus === 'insufficient_evidence').length,
  confidenceBlockedCount: learners.filter((learner) => learner.blockedReasons.includes('confidence_mismatch')).length,
  coverageBlockedCount: learners.filter((learner) => learner.blockedReasons.includes('coverage_gap')).length,
  trustedVolumeBlockedCount: learners.filter((learner) => learner.blockedReasons.includes('insufficient_trusted_volume')).length,
  avgReadinessScore: roundMetric(average(learners.map((learner) => learner.readinessScore))),
  readinessScoreAvailableCount: learners.filter((learner) => learner.readinessScoreAvailable).length,
  topWeakDimensionIds: topIds(learners.flatMap((learner) => learner.topWeakDimensionIds)),
  topConfidenceRiskIds: topIds(learners.flatMap((learner) => learner.topConfidenceRiskIds)),
})

const invariant = (
  invariantId: string,
  passed: boolean,
  observed: string,
  severity: SyntheticSimulationInvariant['severity'] = 'blocker',
): SyntheticSimulationInvariant => ({
  invariantId,
  passed,
  severity,
  observed,
})

const getCohort = (
  summaries: SyntheticSimulationCohortSummary[],
  cohortId: SyntheticLearnerCohortId,
) => {
  const summary = summaries.find((candidate) => candidate.cohortId === cohortId)
  if (!summary) throw new Error(`Missing synthetic cohort summary: ${cohortId}`)
  return summary
}

const buildInvariants = (
  learnerResults: SyntheticLearnerSimulationResult[],
  cohortSummaries: SyntheticSimulationCohortSummary[],
): SyntheticSimulationInvariant[] => {
  const balanced = getCohort(cohortSummaries, 'balanced_ready_candidate')
  const overconfident = getCohort(cohortSummaries, 'priority_overconfident')
  const fragile = getCohort(cohortSummaries, 'fragile_low_confidence')
  const coverageLimited = getCohort(cohortSummaries, 'coverage_gap_high_accuracy')
  const draftOnly = getCohort(cohortSummaries, 'draft_only_high_accuracy')
  const schoolReportingCount = learnerResults.filter(
    (learner) => learner.readinessSnapshot.schoolReportingAllowed,
  ).length

  return [
    invariant(
      'balanced_trusted_learners_can_reach_ready',
      balanced.readyCount >= Math.ceil(balanced.learnerCount * 0.7),
      `${balanced.readyCount}/${balanced.learnerCount} balanced trusted learners reached ready`,
    ),
    invariant(
      'draft_only_accuracy_never_promotes_readiness',
      draftOnly.readyCount === 0 && draftOnly.avgTrustedAttempts === 0,
      `draft cohort ready=${draftOnly.readyCount}, avgTrustedAttempts=${draftOnly.avgTrustedAttempts}`,
    ),
    invariant(
      'coverage_gaps_block_thin_high_accuracy_evidence',
      coverageLimited.readyCount === 0 && coverageLimited.coverageBlockedCount === coverageLimited.learnerCount,
      `coverage cohort ready=${coverageLimited.readyCount}, coverageBlocked=${coverageLimited.coverageBlockedCount}`,
    ),
    invariant(
      'overconfident_priority_weakness_is_detected',
      overconfident.avgHighConfidenceMisses >= 3 && overconfident.avgConfidenceMismatchCount >= 3,
      `overconfident avgHighConfidenceMisses=${overconfident.avgHighConfidenceMisses}, avgConfidenceMismatch=${overconfident.avgConfidenceMismatchCount}`,
    ),
    invariant(
      'adaptive_selection_prefers_repair_after_high_confidence_miss',
      overconfident.avgRepairSelectionRate >= 0.55,
      `overconfident repairSelectionRate=${overconfident.avgRepairSelectionRate}`,
    ),
    invariant(
      'fragile_correct_confidence_is_visible',
      fragile.avgLowConfidenceCorrect >= 5,
      `fragile avgLowConfidenceCorrect=${fragile.avgLowConfidenceCorrect}`,
    ),
    invariant(
      'school_reporting_stays_disabled_for_simulation',
      schoolReportingCount === 0,
      `schoolReportingAllowed snapshots=${schoolReportingCount}`,
    ),
  ]
}

export function runSyntheticEngineSimulationQA(
  learnerCount = 100,
): SyntheticEngineSimulationReport {
  const fixtures = createSyntheticQuestionSimulationBank()
  const profiles = createSyntheticLearnerProfiles(learnerCount)
  const learnerResults = profiles.map((profile) => runSyntheticLearnerSimulation(profile, fixtures))
  const cohortIds = Array.from(new Set(profiles.map((profile) => profile.cohortId)))
  const cohortSummaries = cohortIds.map((cohortId) =>
    summarizeCohort(
      cohortId,
      learnerResults.filter((learner) => learner.cohortId === cohortId),
    ),
  )
  const invariants = buildInvariants(learnerResults, cohortSummaries)
  const releaseBlockers = invariants
    .filter((result) => !result.passed && result.severity === 'blocker')
    .map((result) => result.invariantId)

  return {
    reportId: `synthetic-engine-simulation:${syntheticLearnerSimulationVersion}:${learnerCount}`,
    simulationVersion: syntheticLearnerSimulationVersion,
    dataMode: 'synthetic_only',
    learnerCount: learnerResults.length,
    attemptCount: learnerResults.reduce((sum, learner) => sum + learner.attemptCount, 0),
    itemCount: fixtures.length,
    trustedItemCount: fixtures.filter((fixture) => fixture.role === 'trusted_readiness').length,
    cohortSummaries,
    invariants,
    overallPass: releaseBlockers.length === 0,
    releaseBlockers,
    sampleLearners: cohortIds.map((cohortId) =>
      learnerResults.find((learner) => learner.cohortId === cohortId),
    ).filter((learner): learner is SyntheticLearnerSimulationResult => Boolean(learner)),
  }
}

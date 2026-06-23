import { describe, expect, it } from 'vitest'
import type { Question, MaterialQuestion } from '../../../app/types'
import type {
  ClinicalJudgmentStep,
  NursingProcessStep,
  QuestionEngineNormalizeOverrides,
  QuestionItemType,
  SafetySeverity,
} from '..'
import {
  buildQuestionEnginePersistenceBundle,
  buildRemediationTransferEvidence,
  buildEngineLearningSnapshot,
  buildLearnerMasteryVector,
  buildQuestionEngineValidationGate,
  buildQuestionEngineValidationRollup,
  calculateCalibrationScore,
  createAttemptEngineEvidence,
  evaluateRemediationTransfer,
  getDefaultScoringMethod,
  markRationaleViewed,
  markTeachingCompleted,
  normalizeMaterialQuestionToEngineItem,
  normalizeExamTrack,
  normalizeItemType,
  normalizeQuestionToEngineItem,
  scoreAttempt,
  selectNextItem,
  withConfidenceEscalation,
} from '..'
import {
  createInternalQAPriorityRepairFixtureBundle,
  runInternalQAPriorityRepairPilot,
} from '../internal-qa'

const priorityQuestion: Question = {
  id: 'qe-priority-1',
  examTrack: 'nclex-rn',
  category: 'Leadership / Prioritization / Delegation',
  subcategory: 'Priority clients',
  contentQuality: 'sme-review-ready',
  authorType: 'clinical-editor-draft',
  sourceRefs: ['Candidate source'],
  sourceBacked: true,
  blueprintMapped: true,
  difficulty: 'developing',
  format: 'multiple-choice',
  scenario: 'Four clients call at the beginning of shift.',
  prompt: 'Which client should the nurse see first?',
  choices: [
    { id: 'A', text: 'Client with new shortness of breath and oxygen saturation of 86%.' },
    { id: 'B', text: 'Client reporting pain rated 8/10 after surgery.' },
    { id: 'C', text: 'Client waiting for discharge teaching.' },
    { id: 'D', text: 'Client needing routine documentation updated.' },
  ],
  correctAnswer: ['A'],
  rationale: {
    whyCorrect: 'New oxygenation instability is the priority because it can deteriorate fastest.',
    whyOthers: 'Pain, teaching, and routine documentation matter after instability is addressed.',
  },
  nclexTip: 'Unstable clients outrank stable scheduled care.',
  clinicalRelevance: 'Start-of-shift prioritization protects safety.',
  tags: ['priority', 'oxygenation', 'unstable'],
}

const materialQuestion: MaterialQuestion = {
  id: 'material-qe-1',
  sourceMaterialId: 'material-1',
  sourceTitle: 'Uploaded lecture',
  prompt: 'What is the safest action?',
  choices: [
    { id: 'A', text: 'Assess first.' },
    { id: 'B', text: 'Wait.' },
  ],
  correctAnswer: ['A'],
  rationale: 'Assessment comes first.',
  createdAt: '2026-06-22T12:00:00.000Z',
}

const attempt = {
  id: 'attempt-1',
  questionId: priorityQuestion.id,
  selectedAnswer: ['B'],
  isCorrect: false,
  confidence: 'high' as const,
  timeSpentSec: 55,
  flagged: true,
  completedAt: '2026-06-22T12:00:00.000Z',
  sessionType: 'practice',
}

const lowConfidenceCorrectAttempt = {
  ...attempt,
  id: 'attempt-low-confidence-correct',
  selectedAnswer: ['A'],
  isCorrect: true,
  confidence: 'low' as const,
}

const trustedPriorityOverrides = {
  sourceStatus: 'source_checked',
  reviewStatus: 'item_reviewed',
  clinicalJudgmentStep: 'Prioritize hypotheses',
  nursingProcessStep: 'Analysis',
  rationaleQualityStatus: 'remediation_ready',
  generatedOnly: false,
  contentOrigin: 'official_bank',
} as const

const readinessClientNeeds = [
  'Safe and Effective Care Environment',
  'Health Promotion and Maintenance',
  'Psychosocial Integrity',
  'Physiological Integrity',
] as const

const readinessClinicalJudgmentSteps: ClinicalJudgmentStep[] = [
  'Recognize cues',
  'Analyze cues',
  'Prioritize hypotheses',
  'Generate solutions',
  'Take action',
  'Evaluate outcomes',
]

const nursingProcessForClinicalJudgmentStep = (
  step: ClinicalJudgmentStep,
): NursingProcessStep => {
  if (step === 'Recognize cues') return 'Assessment'
  if (step === 'Analyze cues' || step === 'Prioritize hypotheses') return 'Analysis'
  if (step === 'Generate solutions') return 'Planning'
  if (step === 'Take action') return 'Implementation'
  if (step === 'Evaluate outcomes') return 'Evaluation'
  return 'Not primary'
}

const readinessTimestamp = (index: number) =>
  new Date(Date.UTC(2026, 5, 22, 13, 0, index)).toISOString()

interface TrustedReadinessEvidenceOptions {
  clinicalJudgmentStep?: ClinicalJudgmentStep
  clientNeed?: string
  idSuffix?: string | number
  selectedAnswer?: string[]
  confidence?: 'low' | 'medium' | 'high'
  itemType?: QuestionItemType
  safetyFlags?: string[]
  safetySeverity?: SafetySeverity
  completedAt?: string
}

const makeTrustedReadinessEvidence = (
  index: number,
  options: TrustedReadinessEvidenceOptions = {},
) => {
  const clinicalJudgmentStep =
    options.clinicalJudgmentStep ??
    readinessClinicalJudgmentSteps[index % readinessClinicalJudgmentSteps.length]
  const itemType = options.itemType ?? (index % 15 === 0 ? 'matrix' : 'multiple_choice')
  const correctAnswer = itemType === 'matrix' ? ['A', 'B'] : ['A']
  const selectedAnswer = options.selectedAnswer ?? correctAnswer
  const itemId = `qe-readiness-${options.idSuffix ?? index}`
  const overrides: QuestionEngineNormalizeOverrides = {
    ...trustedPriorityOverrides,
    clientNeed: options.clientNeed ?? readinessClientNeeds[index % readinessClientNeeds.length],
    clinicalJudgmentStep,
    nursingProcessStep: nursingProcessForClinicalJudgmentStep(clinicalJudgmentStep),
    itemType,
    scoringMethod: itemType === 'matrix' ? 'matrix_partial' : 'binary',
    safetyFlags: options.safetyFlags ?? (index < 12 ? ['oxygenation'] : []),
    safetySeverity: options.safetySeverity ?? (index < 12 ? 'high' : 'medium'),
    misconceptionTested: 'pain_before_perfusion_or_oxygenation',
    distractorMisconceptions: { B: 'pain_before_perfusion_or_oxygenation' },
  }

  return createAttemptEngineEvidence(
    {
      ...priorityQuestion,
      id: itemId,
      category: overrides.clientNeed ?? priorityQuestion.category,
      subcategory: `Readiness ${clinicalJudgmentStep}`,
      prompt: `Trusted ${clinicalJudgmentStep} item ${index}`,
      correctAnswer,
    },
    {
      ...attempt,
      id: `attempt-readiness-${options.idSuffix ?? index}`,
      questionId: itemId,
      selectedAnswer,
      isCorrect: selectedAnswer.length === correctAnswer.length &&
        selectedAnswer.every((answerId) => correctAnswer.includes(answerId)),
      confidence: options.confidence ?? 'high',
      completedAt: options.completedAt ?? readinessTimestamp(index),
    },
    overrides,
  )
}

describe('question engine trust gates', () => {
  it('normalizes Phase 1 enum aliases to canonical safe values', () => {
    expect(normalizeExamTrack('nclex-rn')).toBe('RN')
    expect(normalizeExamTrack('ncsbn-pn')).toBe('PN')
    expect(normalizeExamTrack('teas')).toBe('practice_only')
    expect(normalizeItemType('drag-and-drop')).toBe('drag_drop')
    expect(getDefaultScoringMethod('drag_drop')).toBe('ordered_partial')
  })

  it('normalizes app questions conservatively', () => {
    const result = normalizeQuestionToEngineItem(priorityQuestion)

    expect(result.engineItem.sourceStatus).toBe('source_needed')
    expect(result.engineItem.reviewStatus).toBe('not_reviewed')
    expect(result.engineItem.readinessState).toBe('draft_only')
    expect(result.engineItem.countsTowardReadinessDefault).toBe(false)
    expect(result.warnings).toContain('source_status_defaulted')
    expect(result.warnings).toContain('review_status_defaulted')
    expect(result.warnings).toContain('source_backed_not_source_checked')
    expect(result.warnings).toContain('sme_review_ready_not_sme_verified')
  })

  it('defaults unknown source and review statuses to non-readiness evidence', () => {
    const result = normalizeQuestionToEngineItem(priorityQuestion, {
      sourceStatus: 'externally-sourced',
      reviewStatus: 'clinical-approved',
      clinicalJudgmentStep: 'Prioritize hypotheses',
      nursingProcessStep: 'Analysis',
      rationaleQualityStatus: 'remediation_ready',
      generatedOnly: false,
      contentOrigin: 'official_bank',
    })

    expect(result.engineItem.sourceStatus).toBe('source_needed')
    expect(result.engineItem.reviewStatus).toBe('not_reviewed')
    expect(result.engineItem.readinessState).toBe('draft_only')
    expect(result.engineItem.countsTowardReadinessDefault).toBe(false)
    expect(result.warnings).toContain('unknown_source_status')
    expect(result.warnings).toContain('unknown_review_status')
  })

  it('allows trusted synthetic items only when source, review, metadata, and rationale gates pass', () => {
    const result = normalizeQuestionToEngineItem(priorityQuestion, {
      sourceStatus: 'source_checked',
      reviewStatus: 'item_reviewed',
      clinicalJudgmentStep: 'Prioritize hypotheses',
      nursingProcessStep: 'Analysis',
      rationaleQualityStatus: 'remediation_ready',
      generatedOnly: false,
      contentOrigin: 'official_bank',
    })

    expect(result.engineItem.readinessState).toBe('readiness_eligible')
    expect(result.engineItem.countsTowardReadinessDefault).toBe(true)
    expect(result.readinessExclusionReasons).toEqual([])
  })

  it('excludes material-generated questions from official readiness', () => {
    const result = normalizeMaterialQuestionToEngineItem(materialQuestion)

    expect(result.engineItem.readinessState).toBe('draft_only')
    expect(result.engineItem.countsTowardReadinessDefault).toBe(false)
    expect(result.readinessExclusionReasons).toContain('user_uploaded_material')
  })

  it('blocks generated app content without labeling it as user-uploaded material', () => {
    const result = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-generated-starter-1',
      contentQuality: 'generated-starter',
      authorType: 'system-generated',
      sourceRefs: [],
      sourceBacked: false,
    })

    expect(result.engineItem.contentOrigin).toBe('generated_material')
    expect(result.readinessExclusionReasons).toContain('generated_only')
    expect(result.readinessExclusionReasons).not.toContain('user_uploaded_material')
    expect(result.engineItem.countsTowardReadinessDefault).toBe(false)
  })
})

describe('question engine scoring and diagnosis', () => {
  it('scores multiple-choice correct and incorrect attempts', () => {
    const item = normalizeQuestionToEngineItem(priorityQuestion).engineItem

    expect(scoreAttempt(item, ['A'])).toMatchObject({
      rawScore: 1,
      maxScore: 1,
      partialCreditScore: 1,
      isCorrect: true,
      selectedDistractorIds: [],
    })
    expect(scoreAttempt(item, ['B'])).toMatchObject({
      rawScore: 0,
      maxScore: 1,
      partialCreditScore: 0,
      isCorrect: false,
      selectedDistractorIds: ['B'],
    })
  })

  it('keeps V1 SATA scoring all-or-nothing', () => {
    const result = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-sata-1',
      format: 'select-all-that-apply',
      correctAnswer: ['A', 'D'],
    })
    const item = result.engineItem

    expect(item.itemType).toBe('sata')
    expect(item.scoringMethod).toBe('all_or_nothing')
    expect(scoreAttempt(item, ['A', 'D'])).toMatchObject({
      rawScore: 1,
      maxScore: 1,
      partialCreditScore: 1,
      isCorrect: true,
    })
    expect(scoreAttempt(item, ['A'])).toMatchObject({
      rawScore: 0,
      maxScore: 1,
      partialCreditScore: 0,
      isCorrect: false,
    })
  })

  it('calibrates confidence across the minimum Phase 1 matrix', () => {
    const item = normalizeQuestionToEngineItem(priorityQuestion).engineItem
    const correct = scoreAttempt(item, ['A'])
    const incorrect = scoreAttempt(item, ['B'])

    expect(calculateCalibrationScore(correct, 'high')).toBe(1)
    expect(calculateCalibrationScore(correct, 'low')).toBe(0.2)
    expect(calculateCalibrationScore(incorrect, 'low')).toBe(-0.2)
    expect(calculateCalibrationScore(incorrect, 'high')).toBe(-1)
    expect(withConfidenceEscalation(incorrect, 'high').confidenceEscalated).toBe(true)
  })

  it('scores binary items and escalates high-confidence misses', () => {
    const item = normalizeQuestionToEngineItem(priorityQuestion).engineItem
    const scored = withConfidenceEscalation(scoreAttempt(item, ['B']), 'high')
    const calibration = calculateCalibrationScore(scored, 'high')

    expect(scored.isCorrect).toBe(false)
    expect(scored.selectedDistractorIds).toEqual(['B'])
    expect(scored.confidenceEscalated).toBe(true)
    expect(calibration).toBe(-1)
  })

  it('maps a pain-first miss to targeted remediation', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = evidence.remediationEvents[0]

    expect(evidence.diagnosis.likelyMisconceptionId).toBe('pain_before_perfusion_or_oxygenation')
    expect(evidence.diagnosis.misconceptionFamily).toBe('priority_and_acuity')
    expect(evidence.diagnosis.diagnosisSource).toBe('option_map')
    expect(evidence.diagnosis.evidenceLevel).toBe('practice_hypothesis')
    expect(evidence.diagnosis.learnerCopyCertainty).toBe('likely')
    expect(evidence.diagnosis.performanceBand).toBe('incorrect')
    expect(evidence.diagnosis.confidenceSignal).toBe('overconfident_miss')
    expect(evidence.diagnosis.confidenceMismatch).toBe(true)
    expect(evidence.diagnosis.selectedAnswer).toEqual(['B'])
    expect(evidence.diagnosis.confidence).toBe('high')
    expect(evidence.diagnosis.weakAreaTags).toEqual(
      expect.arrayContaining([
        'clinical_judgment_step:Prioritize hypotheses',
        'misconception_family:priority_and_acuity',
        'misconception_id:pain_before_perfusion_or_oxygenation',
        'confidence_calibration:overconfident_miss',
      ]),
    )
    expect(evidence.diagnosis.countsTowardReadiness).toBe(false)
    expect(evidence.diagnosis.canCountTowardOfficialReadiness).toBe(false)
    expect(evidence.diagnosis.canShowAsDurableWeakArea).toBe(false)
    expect(evidence.diagnosis.itemTrustSnapshot).toMatchObject({
      itemId: priorityQuestion.id,
      sourceStatus: 'source_needed',
      reviewStatus: 'not_reviewed',
      readinessState: 'draft_only',
      countsTowardReadiness: false,
    })
    expect(remediation.routeId).toBe('priority_rescue_set')
    expect(remediation.status).toBe('assigned')
    expect(remediation.teachingStatus).toBe('not_started')
    expect(remediation.assignedAssetIds).toContain('REM-RN-MOC-PRIORITY-CLIENTS-0001')
    expect(remediation.assignedRepairItemIds).toContain('NC-RN-MOC-PRIORITY-REPAIR-0001')
    expect(remediation.repairAvailable).toBe(true)
    expect(remediation.repairRequired).toBe(true)
    expect(remediation.repairOutcome).toBe('not_attempted')
    expect(remediation.transferEvidenceLevel).toBe('none')
    expect(remediation.repairSuccess).toBe(false)
    expect(remediation.officialRepairEligible).toBe(false)
  })

  it('treats correct low-confidence answers as fragile knowledge, not misconception misses', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, lowConfidenceCorrectAttempt)
    const remediation = evidence.remediationEvents[0]

    expect(evidence.diagnosis.scoreResult.isCorrect).toBe(true)
    expect(evidence.diagnosis.likelyMisconceptionId).toBe('unknown_misconception')
    expect(evidence.diagnosis.diagnosisSource).toBe('unknown')
    expect(evidence.diagnosis.evidenceLevel).toBe('attempt_signal')
    expect(evidence.diagnosis.performanceBand).toBe('full')
    expect(evidence.diagnosis.confidenceSignal).toBe('fragile_correct')
    expect(evidence.diagnosis.confidenceMismatch).toBe(true)
    expect(evidence.diagnosis.repairRequired).toBe(false)
    expect(evidence.diagnosis.weakAreaTags).toContain('confidence_calibration:fragile_correct')
    expect(remediation.actionType).toBe('reinforcement')
    expect(remediation.repairRequired).toBe(false)
  })

  it('does not force a named diagnosis when the misconception source is unknown', () => {
    const unknownQuestion: Question = {
      ...priorityQuestion,
      id: 'qe-unknown-pattern-1',
      category: 'Physiological Integrity',
      subcategory: 'General safety',
      prompt: 'Which response needs follow-up?',
      choices: [
        { id: 'A', text: 'Response with expected finding.' },
        { id: 'B', text: 'Response needing more information.' },
      ],
      correctAnswer: ['A'],
      rationale: {
        whyCorrect: 'This is the best available response based on the provided cue.',
        whyOthers: 'The other response does not clearly map to one reviewed reasoning trap.',
      },
      tags: ['general-safety'],
      sourceBacked: false,
      blueprintMapped: false,
      sourceRefs: [],
    }
    const evidence = createAttemptEngineEvidence(unknownQuestion, {
      ...attempt,
      id: 'attempt-unknown-pattern',
      questionId: unknownQuestion.id,
      selectedAnswer: ['B'],
      isCorrect: false,
      confidence: 'high',
    })

    expect(evidence.diagnosis.likelyMisconceptionId).toBe('unknown_misconception')
    expect(evidence.diagnosis.misconceptionFamily).toBe('unknown')
    expect(evidence.diagnosis.diagnosisSource).toBe('unknown')
    expect(evidence.diagnosis.evidenceLevel).toBe('insufficient_evidence')
    expect(evidence.diagnosis.learnerCopyCertainty).toBe('insufficient')
    expect(evidence.diagnosis.canShowAsDurableWeakArea).toBe(false)
    expect(evidence.diagnosis.weakAreaTags).not.toContain('misconception_id:unknown_misconception')
    expect(evidence.remediationEvents[0].routeId).toBe('clinical_judgment_step_review')
  })

  it('preserves partial-credit diagnosis without treating mixed partial as a full miss', () => {
    const evidence = createAttemptEngineEvidence(
      {
        ...priorityQuestion,
        id: 'qe-matrix-partial-1',
        correctAnswer: ['A', 'B', 'C', 'D'],
      },
      {
        ...attempt,
        id: 'attempt-matrix-partial',
        questionId: 'qe-matrix-partial-1',
        selectedAnswer: ['A', 'B', 'C'],
        isCorrect: false,
        confidence: 'high',
      },
      {
        itemType: 'matrix',
        scoringMethod: 'matrix_partial',
        clinicalJudgmentStep: 'Evaluate outcomes',
        nursingProcessStep: 'Evaluation',
        misconceptionTested: 'single_improved_value_equals_stable',
        rationaleQualityStatus: 'remediation_ready',
      },
    )

    expect(evidence.diagnosis.scoreResult).toMatchObject({
      rawScore: 3,
      maxScore: 4,
      partialCreditScore: 0.75,
      isCorrect: false,
    })
    expect(evidence.diagnosis.performanceBand).toBe('mixed_partial')
    expect(evidence.diagnosis.isPartialCredit).toBe(true)
    expect(evidence.diagnosis.calibrationScore).toBe(-0.3)
    expect(evidence.diagnosis.confidenceSignal).toBe('overconfident_partial')
    expect(evidence.diagnosis.confidenceMismatch).toBe(true)
    expect(evidence.diagnosis.confidenceEscalated).toBe(false)
    expect(evidence.diagnosis.likelyMisconceptionId).toBe('single_improved_value_equals_stable')
    expect(evidence.diagnosis.diagnosisSource).toBe('item_map')
    expect(evidence.diagnosis.weakAreaTags).toEqual(
      expect.arrayContaining([
        'clinical_judgment_step:Evaluate outcomes',
        'misconception_family:escalation_and_follow_through',
        'confidence_calibration:overconfident_partial',
      ]),
    )
  })
})

describe('question engine remediation transfer proof', () => {
  it('records rationale views as engagement only, not repair success', () => {
    const triggerEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = triggerEvidence.remediationEvents[0]
    const viewed = markRationaleViewed(remediation, '2026-06-22T12:01:00.000Z')

    expect(viewed.status).toBe('viewed')
    expect(viewed.teachingStatus).toBe('viewed')
    expect(viewed.repairOutcome).toBe('view_only')
    expect(viewed.transferEvidenceLevel).toBe('engagement_only')
    expect(viewed.repairCompleted).toBe(false)
    expect(viewed.repairSuccess).toBe(false)
    expect(viewed.updatedAt).toBe('2026-06-22T12:01:00.000Z')
  })

  it('records completed teaching without transfer as not repaired', () => {
    const triggerEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = triggerEvidence.remediationEvents[0]
    const completed = markTeachingCompleted(remediation, '2026-06-22T12:02:00.000Z')

    expect(completed.status).toBe('completed_teaching')
    expect(completed.teachingStatus).toBe('completed')
    expect(completed.repairOutcome).toBe('teaching_completed_no_transfer')
    expect(completed.transferEvidenceLevel).toBe('engagement_only')
    expect(completed.repairSuccess).toBe(false)
  })

  it('blocks same-item repeats from proving repair even when answered correctly', () => {
    const triggerEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = triggerEvidence.remediationEvents[0]
    const repeatEvidence = createAttemptEngineEvidence(priorityQuestion, {
      ...attempt,
      id: 'attempt-same-item-repeat',
      selectedAnswer: ['A'],
      isCorrect: true,
      confidence: 'high',
      completedAt: '2026-06-22T12:05:00.000Z',
    })

    const repaired = evaluateRemediationTransfer(
      remediation,
      triggerEvidence.diagnosis,
      repeatEvidence.diagnosis,
      {
        transferDistance: 'same_item',
        repairMisconceptionId: 'pain_before_perfusion_or_oxygenation',
      },
    )

    expect(repaired.status).toBe('same_item_repeated')
    expect(repaired.repairOutcome).toBe('same_item_repeat')
    expect(repaired.transferEvidenceLevel).toBe('same_item_recall')
    expect(repaired.repairCompleted).toBe(true)
    expect(repaired.repairSuccess).toBe(false)
    expect(repaired.blockedReasons).toContain('same_item_repeat')
  })

  it('records draft parallel repair as practice transfer only', () => {
    const triggerEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = triggerEvidence.remediationEvents[0]
    const practiceRepairEvidence = createAttemptEngineEvidence({
      ...priorityQuestion,
      id: 'qe-priority-draft-repair-1',
      prompt: 'A different group of clients calls. Which one needs the nurse first?',
    }, {
      ...attempt,
      id: 'attempt-draft-repair-correct',
      questionId: 'qe-priority-draft-repair-1',
      selectedAnswer: ['A'],
      isCorrect: true,
      confidence: 'high',
      completedAt: '2026-06-22T12:06:00.000Z',
    }, {
      clinicalJudgmentStep: 'Prioritize hypotheses',
      nursingProcessStep: 'Analysis',
      rationaleQualityStatus: 'remediation_ready',
      misconceptionTested: 'pain_before_perfusion_or_oxygenation',
      distractorMisconceptions: { B: 'pain_before_perfusion_or_oxygenation' },
    })

    const repaired = evaluateRemediationTransfer(
      remediation,
      triggerEvidence.diagnosis,
      practiceRepairEvidence.diagnosis,
      { repairMisconceptionId: 'pain_before_perfusion_or_oxygenation' },
    )

    expect(repaired.status).toBe('parallel_practice_repaired')
    expect(repaired.repairOutcome).toBe('practice_repair_supported')
    expect(repaired.transferDistance).toBe('parallel_item_same_family')
    expect(repaired.transferEvidenceLevel).toBe('practice_transfer')
    expect(repaired.repairSuccess).toBe(false)
    expect(repaired.readinessRepairEligible).toBe(false)
    expect(repaired.blockedReasons).toEqual(
      expect.arrayContaining(['repair_item_not_trusted', 'repair_item_source_needed']),
    )
  })

  it('records official repair only from trusted parallel transfer with improved calibration', () => {
    const triggerEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = triggerEvidence.remediationEvents[0]
    const trustedRepairEvidence = createAttemptEngineEvidence({
      ...priorityQuestion,
      id: 'qe-priority-trusted-repair-1',
      prompt: 'A new priority scenario asks which client can deteriorate fastest.',
    }, {
      ...attempt,
      id: 'attempt-trusted-repair-correct',
      questionId: 'qe-priority-trusted-repair-1',
      selectedAnswer: ['A'],
      isCorrect: true,
      confidence: 'medium',
      completedAt: '2026-06-22T12:08:00.000Z',
    }, {
      ...trustedPriorityOverrides,
      misconceptionTested: 'pain_before_perfusion_or_oxygenation',
      distractorMisconceptions: { B: 'pain_before_perfusion_or_oxygenation' },
      priorityFrameworks: ['ABCs', 'unstable_vs_stable'],
      safetyFlags: ['oxygenation'],
      safetySeverity: 'high',
    })

    const repaired = evaluateRemediationTransfer(
      remediation,
      triggerEvidence.diagnosis,
      trustedRepairEvidence.diagnosis,
      { repairMisconceptionId: 'pain_before_perfusion_or_oxygenation' },
    )
    const transferEvidence = buildRemediationTransferEvidence(repaired)

    expect(repaired.status).toBe('officially_repaired')
    expect(repaired.repairOutcome).toBe('official_repair')
    expect(repaired.transferDistance).toBe('trusted_parallel_item')
    expect(repaired.transferEvidenceLevel).toBe('official_transfer')
    expect(repaired.repairSuccess).toBe(true)
    expect(repaired.readinessRepairEligible).toBe(true)
    expect(repaired.blockedReasons).toEqual([])
    expect(transferEvidence).toMatchObject({
      remediationEventId: remediation.id,
      repairItemId: 'qe-priority-trusted-repair-1',
      repairAttemptId: 'attempt-trusted-repair-correct',
      repairOutcome: 'official_repair',
      evidenceLevel: 'official_transfer',
      repairSuccess: true,
    })
  })

  it('keeps trusted low-confidence repair as supported but not officially repaired', () => {
    const triggerEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = triggerEvidence.remediationEvents[0]
    const fragileRepairEvidence = createAttemptEngineEvidence({
      ...priorityQuestion,
      id: 'qe-priority-trusted-fragile-repair-1',
    }, {
      ...attempt,
      id: 'attempt-trusted-fragile-repair',
      questionId: 'qe-priority-trusted-fragile-repair-1',
      selectedAnswer: ['A'],
      isCorrect: true,
      confidence: 'low',
      completedAt: '2026-06-22T12:09:00.000Z',
    }, {
      ...trustedPriorityOverrides,
      misconceptionTested: 'pain_before_perfusion_or_oxygenation',
      distractorMisconceptions: { B: 'pain_before_perfusion_or_oxygenation' },
    })

    const repaired = evaluateRemediationTransfer(
      remediation,
      triggerEvidence.diagnosis,
      fragileRepairEvidence.diagnosis,
      { repairMisconceptionId: 'pain_before_perfusion_or_oxygenation' },
    )

    expect(repaired.status).toBe('trusted_repair_supported')
    expect(repaired.repairOutcome).toBe('trusted_repair_supported')
    expect(repaired.transferEvidenceLevel).toBe('trusted_transfer_supported')
    expect(repaired.repairSuccess).toBe(false)
    expect(repaired.blockedReasons).toContain('confidence_not_improved')
  })

  it('blocks transfer proof when the repair item tests a different misconception', () => {
    const triggerEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = triggerEvidence.remediationEvents[0]
    const mismatchedRepairEvidence = createAttemptEngineEvidence({
      ...priorityQuestion,
      id: 'qe-delegation-trusted-repair-1',
      category: 'Safe and Effective Care Environment',
      subcategory: 'Delegation',
      prompt: 'Which task can the nurse delegate?',
      tags: ['delegation', 'scope'],
    }, {
      ...attempt,
      id: 'attempt-mismatched-repair',
      questionId: 'qe-delegation-trusted-repair-1',
      selectedAnswer: ['A'],
      isCorrect: true,
      confidence: 'high',
      completedAt: '2026-06-22T12:10:00.000Z',
    }, {
      ...trustedPriorityOverrides,
      clinicalJudgmentStep: 'Take action',
      nursingProcessStep: 'Implementation',
      misconceptionTested: 'delegating_nursing_judgment',
      distractorMisconceptions: { B: 'delegating_nursing_judgment' },
    })

    const repaired = evaluateRemediationTransfer(
      remediation,
      triggerEvidence.diagnosis,
      mismatchedRepairEvidence.diagnosis,
      { repairMisconceptionId: 'delegating_nursing_judgment' },
    )

    expect(repaired.status).toBe('unresolved')
    expect(repaired.repairOutcome).toBe('repair_blocked')
    expect(repaired.repairSuccess).toBe(false)
    expect(repaired.blockedReasons).toContain('misconception_mismatch')
  })

  it('lets official repair evidence improve the mastery vector instead of leaving active repair open', () => {
    const triggerEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const remediation = triggerEvidence.remediationEvents[0]
    const trustedRepairEvidence = createAttemptEngineEvidence({
      ...priorityQuestion,
      id: 'qe-priority-trusted-repair-mastery-1',
    }, {
      ...attempt,
      id: 'attempt-trusted-repair-mastery',
      questionId: 'qe-priority-trusted-repair-mastery-1',
      selectedAnswer: ['A'],
      isCorrect: true,
      confidence: 'high',
      completedAt: '2026-06-22T12:11:00.000Z',
    }, {
      ...trustedPriorityOverrides,
      misconceptionTested: 'pain_before_perfusion_or_oxygenation',
      distractorMisconceptions: { B: 'pain_before_perfusion_or_oxygenation' },
    })
    const repaired = evaluateRemediationTransfer(
      remediation,
      triggerEvidence.diagnosis,
      trustedRepairEvidence.diagnosis,
      { repairMisconceptionId: 'pain_before_perfusion_or_oxygenation' },
    )
    const vector = buildLearnerMasteryVector([triggerEvidence.diagnosis], [repaired])
    const priorityDimension = vector.dimensions['misconception_family:priority_and_acuity']

    expect(priorityDimension.remediationRepairedCount).toBe(1)
    expect(priorityDimension.activeRepairCount).toBe(0)
    expect(priorityDimension.unresolvedHighSeverityCount).toBe(0)
  })
})

describe('question engine mastery, selection, and snapshots', () => {
  it('builds mastery weakness from high-confidence misses', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const vector = buildLearnerMasteryVector(
      [evidence.diagnosis],
      evidence.remediationEvents,
    )
    const priorityDimension = vector.dimensions['misconception_family:priority_and_acuity']

    expect(priorityDimension.masteryLevel).toBe('fragile')
    expect(priorityDimension.highConfidenceMissCount).toBe(1)
    expect(priorityDimension.evidenceScope).toBe('practice_only')
    expect(priorityDimension.evidenceLevel).toBe('practice_hypothesis')
    expect(priorityDimension.practiceSignalCount).toBe(1)
    expect(priorityDimension.trustedSignalCount).toBe(0)
    expect(priorityDimension.activeRepairCount).toBe(1)
    expect(priorityDimension.selectionWeight).toBeGreaterThan(priorityDimension.readinessWeight)
    expect(vector.summary.highConfidenceMissCount).toBe(1)
    expect(vector.summary.practiceAttemptCount).toBe(1)
    expect(vector.summary.activeExclusionReasons).toContain('source_needed')
  })

  it('promotes repeated practice signals to practice-confirmed without readiness promotion', () => {
    const attempts = ['B', 'C', 'D'].map((answerId, index) => ({
      ...attempt,
      id: `attempt-practice-repeat-${index + 1}`,
      selectedAnswer: [answerId],
      completedAt: `2026-06-22T12:0${index}:00.000Z`,
    }))
    const evidences = attempts.map((practiceAttempt) =>
      createAttemptEngineEvidence(priorityQuestion, practiceAttempt),
    )
    const vector = buildLearnerMasteryVector(
      evidences.map((evidence) => evidence.diagnosis),
      evidences.flatMap((evidence) => evidence.remediationEvents),
    )
    const familyDimension = vector.dimensions['misconception_family:priority_and_acuity']

    expect(familyDimension.evidenceLevel).toBe('practice_confirmed')
    expect(familyDimension.recurrenceCount).toBe(2)
    expect(familyDimension.practiceAttemptCount).toBe(3)
    expect(familyDimension.trustedAttemptCount).toBe(0)
    expect(familyDimension.readinessWeight).toBe(0)
    expect(familyDimension.activeExclusionReasons).toEqual(
      expect.arrayContaining(['source_needed', 'not_reviewed']),
    )
    expect(vector.summary.recurringWeakAreaDimensionIds).toContain(
      'misconception_family:priority_and_acuity',
    )
    expect(vector.updatedAt).toBe('2026-06-22T12:02:00.000Z')
  })

  it('tracks correct low-confidence answers as calibration exposure, not safety misses', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, lowConfidenceCorrectAttempt)
    const vector = buildLearnerMasteryVector(
      [evidence.diagnosis],
      evidence.remediationEvents,
    )
    const calibrationDimension = vector.dimensions['confidence_calibration:fragile_correct']

    expect(calibrationDimension.attemptCount).toBe(1)
    expect(calibrationDimension.lowConfidenceCorrectCount).toBe(1)
    expect(calibrationDimension.highConfidenceMissCount).toBe(0)
    expect(calibrationDimension.confidenceMismatchScore).toBeCloseTo(0.85)
    expect(calibrationDimension.masteryLevel).toBe('fragile')
    expect(vector.summary.lowConfidenceCorrectCount).toBe(1)
    expect(vector.summary.confidenceMismatchCount).toBe(1)
  })

  it('keeps trusted and practice evidence separated in the mastery vector', () => {
    const practiceEvidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const trustedEvidence = createAttemptEngineEvidence(
      priorityQuestion,
      {
        ...lowConfidenceCorrectAttempt,
        id: 'attempt-trusted-correct',
        confidence: 'high',
        completedAt: '2026-06-22T12:10:00.000Z',
      },
      {
        sourceStatus: 'source_checked',
        reviewStatus: 'item_reviewed',
        clinicalJudgmentStep: 'Prioritize hypotheses',
        nursingProcessStep: 'Analysis',
        rationaleQualityStatus: 'remediation_ready',
        generatedOnly: false,
        contentOrigin: 'official_bank',
      },
    )
    const vector = buildLearnerMasteryVector(
      [practiceEvidence.diagnosis, trustedEvidence.diagnosis],
      [
        ...practiceEvidence.remediationEvents,
        ...trustedEvidence.remediationEvents,
      ],
    )
    const clinicalJudgmentDimension = vector.dimensions['clinical_judgment_step:Prioritize hypotheses']

    expect(clinicalJudgmentDimension.evidenceScope).toBe('mixed_separated')
    expect(clinicalJudgmentDimension.practiceAttemptCount).toBe(1)
    expect(clinicalJudgmentDimension.trustedAttemptCount).toBe(1)
    expect(clinicalJudgmentDimension.readinessAttemptCount).toBe(1)
    expect(clinicalJudgmentDimension.latestTrustedAttemptAt).toBe('2026-06-22T12:10:00.000Z')
    expect(clinicalJudgmentDimension.activeExclusionReasons).toContain('source_needed')
    expect(clinicalJudgmentDimension.readinessWeight).toBeLessThan(
      clinicalJudgmentDimension.selectionWeight,
    )
    expect(vector.summary.trustedAttemptCount).toBe(1)
    expect(vector.summary.activeReadinessBlockerCount).toBeGreaterThan(0)
  })

  it('updates broad safe dimensions only when misconception evidence is unknown', () => {
    const unknownEvidence = createAttemptEngineEvidence({
      ...priorityQuestion,
      id: 'qe-mastery-unknown-pattern-1',
      category: 'Physiological Integrity',
      subcategory: 'General safety',
      choices: [
        { id: 'A', text: 'Expected response.' },
        { id: 'B', text: 'Needs more assessment.' },
      ],
      correctAnswer: ['A'],
      rationale: {
        whyCorrect: 'The expected response is the safest available cue.',
        whyOthers: 'The other choice does not map to a reviewed misconception.',
      },
      tags: ['general-safety'],
      sourceBacked: false,
      blueprintMapped: false,
      sourceRefs: [],
    }, {
      ...attempt,
      id: 'attempt-mastery-unknown',
      questionId: 'qe-mastery-unknown-pattern-1',
      selectedAnswer: ['B'],
    })
    const vector = buildLearnerMasteryVector([unknownEvidence.diagnosis])

    expect(vector.dimensions['client_need:Physiological Integrity']).toBeDefined()
    expect(
      Object.keys(vector.dimensions).some((key) => key.startsWith('clinical_judgment_step:')),
    ).toBe(true)
    expect(vector.dimensions['misconception_family:unknown']).toBeUndefined()
    expect(vector.dimensions['misconception_id:unknown_misconception']).toBeUndefined()
  })

  it('selects a next item with an explainable decision', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const vector = buildLearnerMasteryVector(
      [evidence.diagnosis],
      evidence.remediationEvents,
    )
    const item = normalizeQuestionToEngineItem(priorityQuestion).engineItem
    const decision = selectNextItem([item], vector, [evidence.diagnosis])

    expect(decision.selectedItemId).toBe(priorityQuestion.id)
    expect(decision.primaryReasonCode).not.toBe('no_safe_candidate')
    expect(decision.learnerExplanationKey).toContain('next_item')
    expect(decision.candidatePoolSummary.eligibleCount).toBe(1)
    expect(decision.scoreComponentsByItemId[priorityQuestion.id]).toBeDefined()
    expect(decision.selectionVersion).toBe('2026-06-23-adaptive-selection-v1')
  })

  it('prioritizes an active high-confidence safety repair over generic weak practice', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const vector = buildLearnerMasteryVector(
      [evidence.diagnosis],
      evidence.remediationEvents,
    )
    const repairItem = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-priority-repair-parallel-1',
      prompt: 'A different group of clients call at the beginning of shift. Who is highest priority?',
    }, {
      clinicalJudgmentStep: 'Prioritize hypotheses',
      nursingProcessStep: 'Analysis',
      rationaleQualityStatus: 'remediation_ready',
      misconceptionTested: 'pain_before_perfusion_or_oxygenation',
      distractorMisconceptions: { B: 'pain_before_perfusion_or_oxygenation' },
      priorityFrameworks: ['ABCs', 'unstable_vs_stable'],
      safetyFlags: ['oxygenation'],
      safetySeverity: 'high',
    }).engineItem
    const genericItem = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-generic-delegation-1',
      category: 'Safe and Effective Care Environment',
      subcategory: 'Delegation',
      prompt: 'Which task is appropriate to delegate to assistive personnel?',
      tags: ['delegation', 'scope'],
    }, {
      clinicalJudgmentStep: 'Take action',
      nursingProcessStep: 'Implementation',
      rationaleQualityStatus: 'remediation_ready',
      misconceptionTested: 'delegating_nursing_judgment',
      distractorMisconceptions: { B: 'delegating_nursing_judgment' },
      priorityFrameworks: ['delegation'],
      safetyFlags: ['scope_of_practice'],
      safetySeverity: 'high',
    }).engineItem

    const decision = selectNextItem(
      [genericItem, repairItem],
      vector,
      [evidence.diagnosis],
    )

    expect(decision.selectedItemId).toBe('qe-priority-repair-parallel-1')
    expect(decision.selectionIntent).toBe('repair_misconception')
    expect(decision.primaryReasonCode).toBe('active_safety_misconception')
    expect(decision.scoreComponentsByItemId['qe-priority-repair-parallel-1'].misconceptionRepairWeight)
      .toBeGreaterThan(decision.scoreComponentsByItemId['qe-generic-delegation-1'].misconceptionRepairWeight)
  })

  it('penalizes recent exact repeats when a parallel item is available', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, lowConfidenceCorrectAttempt)
    const vector = buildLearnerMasteryVector(
      [evidence.diagnosis],
      evidence.remediationEvents,
    )
    const originalItem = normalizeQuestionToEngineItem(priorityQuestion).engineItem
    const parallelItem = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-priority-parallel-2',
      scenario: 'A charge nurse receives a new set of client updates.',
    }).engineItem

    const decision = selectNextItem(
      [originalItem, parallelItem],
      vector,
      [evidence.diagnosis],
    )

    expect(decision.selectedItemId).toBe('qe-priority-parallel-2')
    expect(decision.scoreComponentsByItemId[priorityQuestion.id].overusePenalty).toBeGreaterThan(0)
    expect(decision.scoreByItemId['qe-priority-parallel-2']).toBeGreaterThan(
      decision.scoreByItemId[priorityQuestion.id],
    )
  })

  it('separates readiness selection from draft practice candidates', () => {
    const vector = buildLearnerMasteryVector([])
    const draftItem = normalizeQuestionToEngineItem(priorityQuestion).engineItem
    const trustedItem = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-trusted-readiness-1',
    }, trustedPriorityOverrides).engineItem

    const decision = selectNextItem(
      [draftItem, trustedItem],
      vector,
      [],
      { trustMode: 'readiness' },
    )

    expect(decision.selectedItemId).toBe('qe-trusted-readiness-1')
    expect(decision.selectionIntent).toBe('build_readiness_evidence')
    expect(decision.primaryReasonCode).toBe('trusted_readiness_candidate')
    expect(decision.eligibleCandidateCount).toBe(1)
    expect(decision.excludedCandidateCount).toBe(1)
    expect(decision.exclusionCounts.trust_gate_exclusion).toBe(1)
    expect(decision.exclusionCounts.source_needed).toBe(1)
  })

  it('returns a no-candidate decision when readiness mode has only draft items', () => {
    const vector = buildLearnerMasteryVector([])
    const draftItem = normalizeQuestionToEngineItem(priorityQuestion).engineItem
    const decision = selectNextItem([draftItem], vector, [], { trustMode: 'readiness' })

    expect(decision.selectedItemId).toBeNull()
    expect(decision.selectionIntent).toBe('no_candidate')
    expect(decision.primaryReasonCode).toBe('insufficient_trusted_candidates')
    expect(decision.exclusionCounts.trust_gate_exclusion).toBe(1)
    expect(decision.exclusionCounts.not_reviewed).toBe(1)
  })

  it('uses fragile-correct confidence as reinforcement rather than safety repair', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, lowConfidenceCorrectAttempt)
    const vector = buildLearnerMasteryVector(
      [evidence.diagnosis],
      evidence.remediationEvents,
    )
    const reinforcementItem = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-priority-confidence-recheck-1',
    }).engineItem
    const unrelatedItem = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-evaluate-outcomes-1',
      prompt: 'Which response shows the intervention was effective?',
      tags: ['evaluate', 'follow-up'],
    }, {
      clinicalJudgmentStep: 'Evaluate outcomes',
      nursingProcessStep: 'Evaluation',
      rationaleQualityStatus: 'remediation_ready',
      safetySeverity: 'medium',
    }).engineItem

    const decision = selectNextItem(
      [unrelatedItem, reinforcementItem],
      vector,
      [evidence.diagnosis],
    )

    expect(decision.selectedItemId).toBe('qe-priority-confidence-recheck-1')
    expect(decision.selectionIntent).toBe('reinforce')
    expect(decision.primaryReasonCode).toBe('fragile_correct_reinforcement')
    expect(decision.primaryReasonCode).not.toBe('active_safety_misconception')
  })

  it('balances cognitive load after a high-load streak unless repair urgency overrides', () => {
    const vector = buildLearnerMasteryVector([])
    const highLoadItem = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-high-load-matrix-1',
    }, {
      clinicalJudgmentStep: 'Analyze cues',
      nursingProcessStep: 'Analysis',
      itemType: 'matrix',
      scoringMethod: 'matrix_partial',
      rationaleQualityStatus: 'remediation_ready',
      safetySeverity: 'medium',
    }).engineItem
    const lowerLoadItem = normalizeQuestionToEngineItem({
      ...priorityQuestion,
      id: 'qe-lower-load-mc-1',
    }, {
      clinicalJudgmentStep: 'Analyze cues',
      nursingProcessStep: 'Analysis',
      itemType: 'multiple_choice',
      scoringMethod: 'binary',
      rationaleQualityStatus: 'remediation_ready',
      safetySeverity: 'medium',
    }).engineItem

    const decision = selectNextItem(
      [highLoadItem, lowerLoadItem],
      vector,
      [],
      { highLoadStreak: 2 },
    )

    expect(decision.selectedItemId).toBe('qe-lower-load-mc-1')
    expect(decision.scoreComponentsByItemId['qe-high-load-matrix-1'].fatiguePenalty).toBeGreaterThan(0)
  })

  it('returns insufficient evidence until trusted coverage exists', () => {
    const evidence = createAttemptEngineEvidence(priorityQuestion, attempt)
    const snapshot = buildEngineLearningSnapshot(
      [evidence.diagnosis],
      evidence.remediationEvents,
    ).readinessSnapshot

    expect(snapshot.status).toBe('insufficient_evidence')
    expect(snapshot.trustedAttemptCount).toBe(0)
    expect(snapshot.exclusionCounts.source_needed).toBe(1)
  })

  it('does not let high draft accuracy masquerade as readiness evidence', () => {
    const evidences = Array.from({ length: 10 }, (_, index) =>
      createAttemptEngineEvidence({
        ...priorityQuestion,
        id: `qe-draft-correct-${index}`,
      }, {
        ...attempt,
        id: `attempt-draft-correct-${index}`,
        questionId: `qe-draft-correct-${index}`,
        selectedAnswer: ['A'],
        isCorrect: true,
        confidence: 'high',
        completedAt: readinessTimestamp(index),
      }),
    )

    const snapshot = buildEngineLearningSnapshot(
      evidences.map((evidence) => evidence.diagnosis),
      evidences.flatMap((evidence) => evidence.remediationEvents),
    ).readinessSnapshot

    expect(snapshot.status).toBe('insufficient_evidence')
    expect(snapshot.practiceAccuracy).toBe(1)
    expect(snapshot.readinessAccuracy).toBe(0)
    expect(snapshot.readinessScore).toBe(0)
    expect(snapshot.readinessScoreAvailable).toBe(false)
    expect(snapshot.fallbackToOverallAccuracy).toBe(false)
    expect(snapshot.showPracticeProgressSeparately).toBe(true)
    expect(snapshot.blockedReasons).toContain('insufficient_trusted_volume')
    expect(snapshot.contentTrustSummary).toMatchObject({
      trustedAttemptCount: 0,
      practiceAttemptCount: 10,
      excludedAttemptCount: 10,
    })
  })

  it('marks a balanced trusted evidence bundle as readiness eligible', () => {
    const evidences = Array.from({ length: 60 }, (_, index) =>
      makeTrustedReadinessEvidence(index),
    )

    const snapshot = buildEngineLearningSnapshot(
      evidences.map((evidence) => evidence.diagnosis),
      evidences.flatMap((evidence) => evidence.remediationEvents),
      {
        generatedAt: '2026-06-22T14:00:00.000Z',
        claimEvidenceRecordIds: ['claim-readiness-balanced-1'],
        reconstructionStatus: 'passed',
      },
    ).readinessSnapshot

    expect(snapshot.status).toBe('ready')
    expect(snapshot.readinessScoreAvailable).toBe(true)
    expect(snapshot.evidenceRequirementsMet).toBe(true)
    expect(snapshot.coverageRequirementsMet).toBe(true)
    expect(snapshot.snapshotScope).toBe('official_readiness')
    expect(snapshot.trustedAttemptCount).toBe(60)
    expect(snapshot.excludedAttemptCount).toBe(0)
    expect(snapshot.blockedReasons).toEqual([])
    expect(snapshot.coverageGaps).toEqual([])
    expect(snapshot.schoolReportingAllowed).toBe(false)
    expect(snapshot.fallbackToOverallAccuracy).toBe(false)
    expect(snapshot.claimEvidenceRecordIds).toEqual(['claim-readiness-balanced-1'])
    expect(snapshot.reconstructionStatus).toBe('passed')
    expect(snapshot.coverageSummary.clinicalJudgmentCoverage['Take action']).toBe(10)
    expect(snapshot.coverageSummary.safetyFlagCoverage.oxygenation).toBe(12)
    expect(snapshot.coverageSummary.itemTypeCoverage.matrix).toBe(4)
    expect(snapshot.generatedAt).toBe('2026-06-22T14:00:00.000Z')
  })

  it('blocks readiness when trusted volume exists but clinical judgment coverage is thin', () => {
    const stepsWithoutEvaluate = readinessClinicalJudgmentSteps.filter(
      (step) => step !== 'Evaluate outcomes',
    )
    const evidences = Array.from({ length: 60 }, (_, index) =>
      makeTrustedReadinessEvidence(index, {
        clinicalJudgmentStep: stepsWithoutEvaluate[index % stepsWithoutEvaluate.length],
      }),
    )

    const snapshot = buildEngineLearningSnapshot(
      evidences.map((evidence) => evidence.diagnosis),
      evidences.flatMap((evidence) => evidence.remediationEvents),
    ).readinessSnapshot

    expect(snapshot.status).toBe('insufficient_evidence')
    expect(snapshot.readinessScoreAvailable).toBe(false)
    expect(snapshot.blockedReasons).toEqual(expect.arrayContaining(['coverage_gap']))
    expect(snapshot.coverageGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimensionType: 'clinical_judgment_step',
          dimensionId: 'Evaluate outcomes',
          gapType: 'low_exposure',
        }),
      ]),
    )
  })

  it('requires client need spread before readiness can be shown', () => {
    const evidences = Array.from({ length: 60 }, (_, index) =>
      makeTrustedReadinessEvidence(index, {
        clientNeed: 'Safe and Effective Care Environment',
      }),
    )

    const snapshot = buildEngineLearningSnapshot(
      evidences.map((evidence) => evidence.diagnosis),
      evidences.flatMap((evidence) => evidence.remediationEvents),
    ).readinessSnapshot

    expect(snapshot.status).toBe('insufficient_evidence')
    expect(snapshot.blockedReasons).toEqual(
      expect.arrayContaining(['coverage_gap', 'client_need_spread']),
    )
    expect(snapshot.coverageGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimensionType: 'client_need',
          dimensionId: 'client_need_spread',
        }),
      ]),
    )
  })

  it('blocks readiness for major confidence calibration risk', () => {
    const evidences = Array.from({ length: 60 }, (_, index) => {
      const clinicalJudgmentStep =
        readinessClinicalJudgmentSteps[index % readinessClinicalJudgmentSteps.length]
      return makeTrustedReadinessEvidence(index, {
        clinicalJudgmentStep,
        confidence: clinicalJudgmentStep === 'Take action' ? 'low' : 'high',
      })
    })

    const snapshot = buildEngineLearningSnapshot(
      evidences.map((evidence) => evidence.diagnosis),
      evidences.flatMap((evidence) => evidence.remediationEvents),
    ).readinessSnapshot

    expect(snapshot.status).toBe('insufficient_evidence')
    expect(snapshot.readinessScoreAvailable).toBe(false)
    expect(snapshot.blockedReasons).toContain('confidence_mismatch')
    expect(snapshot.coverageGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimensionType: 'clinical_judgment_step',
          dimensionId: 'Take action',
          gapType: 'confidence_mismatch',
        }),
      ]),
    )
    expect(snapshot.topConfidenceRisks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimensionType: 'clinical_judgment_step',
          dimensionId: 'Take action',
        }),
      ]),
    )
  })

  it('blocks readiness until high-confidence safety misses have proven trusted repair', () => {
    const balancedEvidences = Array.from({ length: 60 }, (_, index) =>
      makeTrustedReadinessEvidence(index),
    )
    const safetyMiss = makeTrustedReadinessEvidence(61, {
      idSuffix: 'safety-miss',
      clinicalJudgmentStep: 'Prioritize hypotheses',
      selectedAnswer: ['B'],
      confidence: 'high',
      safetyFlags: ['oxygenation'],
      safetySeverity: 'high',
    })

    const snapshot = buildEngineLearningSnapshot(
      [...balancedEvidences, safetyMiss].map((evidence) => evidence.diagnosis),
      [
        ...balancedEvidences.flatMap((evidence) => evidence.remediationEvents),
        ...safetyMiss.remediationEvents,
      ],
    ).readinessSnapshot

    expect(snapshot.status).toBe('insufficient_evidence')
    expect(snapshot.blockedReasons).toEqual(
      expect.arrayContaining(['unresolved_safety_miss', 'repair_not_proven']),
    )
    expect(snapshot.safetyRecoverySummary.unrepairedSafetyMissCount).toBe(1)
    expect(snapshot.remediationSummary.unresolvedRepairCount).toBe(1)
    expect(snapshot.coverageGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gapType: 'unrepaired_safety_miss',
          severity: 'high',
        }),
      ]),
    )
  })

  it('accepts a high-confidence safety repair only after trusted transfer evidence', () => {
    const balancedEvidences = Array.from({ length: 60 }, (_, index) =>
      makeTrustedReadinessEvidence(index),
    )
    const safetyMiss = makeTrustedReadinessEvidence(61, {
      idSuffix: 'safety-miss-repaired',
      clinicalJudgmentStep: 'Prioritize hypotheses',
      selectedAnswer: ['B'],
      confidence: 'high',
      safetyFlags: ['oxygenation'],
      safetySeverity: 'high',
    })
    const repairEvidence = makeTrustedReadinessEvidence(62, {
      idSuffix: 'safety-transfer-repair',
      clinicalJudgmentStep: 'Prioritize hypotheses',
      selectedAnswer: ['A'],
      confidence: 'high',
      safetyFlags: ['oxygenation'],
      safetySeverity: 'high',
    })
    const repaired = evaluateRemediationTransfer(
      safetyMiss.remediationEvents[0],
      safetyMiss.diagnosis,
      repairEvidence.diagnosis,
      { repairMisconceptionId: 'pain_before_perfusion_or_oxygenation' },
    )

    const snapshot = buildEngineLearningSnapshot(
      [...balancedEvidences, safetyMiss, repairEvidence].map(
        (evidence) => evidence.diagnosis,
      ),
      [
        ...balancedEvidences.flatMap((evidence) => evidence.remediationEvents),
        repaired,
        ...repairEvidence.remediationEvents,
      ],
    ).readinessSnapshot

    expect(repaired.repairOutcome).toBe('official_repair')
    expect(snapshot.status).toBe('ready')
    expect(snapshot.blockedReasons).not.toContain('unresolved_safety_miss')
    expect(snapshot.blockedReasons).not.toContain('repair_not_proven')
    expect(snapshot.safetyRecoverySummary.unrepairedSafetyMissCount).toBe(0)
    expect(snapshot.remediationSummary.officialRepairCount).toBe(1)
  })

  it('blocks claim promotion when required claim evidence or reconstruction is missing', () => {
    const evidences = Array.from({ length: 60 }, (_, index) =>
      makeTrustedReadinessEvidence(index),
    )

    const snapshot = buildEngineLearningSnapshot(
      evidences.map((evidence) => evidence.diagnosis),
      evidences.flatMap((evidence) => evidence.remediationEvents),
      {
        requiredClaimsPresent: false,
        reconstructionStatus: 'failed',
      },
    ).readinessSnapshot

    expect(snapshot.status).toBe('insufficient_evidence')
    expect(snapshot.readinessScoreAvailable).toBe(false)
    expect(snapshot.blockedReasons).toEqual(
      expect.arrayContaining(['claim_evidence_missing', 'reconstruction_failed']),
    )
  })

  it('builds repository-ready persistence rows with reconstruction proof', () => {
    const evidences = Array.from({ length: 60 }, (_, index) =>
      makeTrustedReadinessEvidence(index),
    )
    const diagnoses = evidences.map((evidence) => evidence.diagnosis)
    const remediationEvents = evidences.flatMap((evidence) => evidence.remediationEvents)
    const { masteryVector, readinessSnapshot } = buildEngineLearningSnapshot(
      diagnoses,
      remediationEvents,
    )
    const bundle = buildQuestionEnginePersistenceBundle({
      userId: '00000000-0000-4000-8000-000000000001',
      examTrack: 'RN',
      diagnoses,
      remediationEvents,
      masteryVector,
      readinessSnapshot,
      questionItems: evidences.map((evidence) => evidence.adapterResult.engineItem),
      snapshotPeriodOrSessionId: 'session-balanced-trusted',
    })

    expect(bundle.attemptDiagnosisRows).toHaveLength(60)
    expect(bundle.attemptDiagnosisRows.every((row) => row.counts_toward_readiness)).toBe(true)
    expect(bundle.readinessSnapshotRow.readiness_score).toBe(readinessSnapshot.readinessScore)
    expect(bundle.readinessSnapshotRow.fallback_to_overall_accuracy).toBe(false)
    expect(bundle.claimEvidenceRecordRows[0]).toMatchObject({
      claim_strength: 'official_readiness_supported',
      can_show_to_school: false,
      can_count_toward_official_readiness: true,
    })
    expect(bundle.itemStatsRows.some((row) => 'user_id' in row)).toBe(false)
    expect(bundle.reconstructionResult.pass).toBe(true)
    expect(bundle.liveSchoolReportingEnabled).toBe(false)
  })

  it('persists insufficient readiness as null score with blocked claim evidence', () => {
    const evidence = createAttemptEngineEvidence({
      ...priorityQuestion,
      id: 'qe-draft-persistence-correct',
    }, {
      ...attempt,
      id: 'attempt-draft-persistence-correct',
      questionId: 'qe-draft-persistence-correct',
      selectedAnswer: ['A'],
      isCorrect: true,
      confidence: 'high',
    })
    const { masteryVector, readinessSnapshot } = buildEngineLearningSnapshot(
      [evidence.diagnosis],
      evidence.remediationEvents,
    )
    const bundle = buildQuestionEnginePersistenceBundle({
      userId: '00000000-0000-4000-8000-000000000002',
      examTrack: 'RN',
      diagnoses: [evidence.diagnosis],
      remediationEvents: evidence.remediationEvents,
      masteryVector,
      readinessSnapshot,
      snapshotPeriodOrSessionId: 'draft-only',
    })

    expect(bundle.attemptDiagnosisRows[0].counts_toward_readiness).toBe(false)
    expect(bundle.readinessSnapshotRow.readiness_band).toBe('insufficient_evidence')
    expect(bundle.readinessSnapshotRow.readiness_score).toBeNull()
    expect(bundle.readinessSnapshotRow.fallback_to_overall_accuracy).toBe(false)
    expect(bundle.claimEvidenceRecordRows[0]).toMatchObject({
      claim_strength: 'blocked',
      trust_label: 'insufficient_evidence',
      can_count_toward_official_readiness: false,
      can_show_to_school: false,
    })
    expect(bundle.reconstructionResult.pass).toBe(true)
  })

  it('runs the internal QA pilot packet without promoting draft evidence', () => {
    const fixtures = createInternalQAPriorityRepairFixtureBundle()
    const packet = runInternalQAPriorityRepairPilot()

    expect(fixtures).toHaveLength(12)
    expect(fixtures.filter((fixture) => fixture.group === 'ngn_priority_case')).toHaveLength(6)
    expect(fixtures.filter((fixture) => fixture.group === 'standalone_priority')).toHaveLength(3)
    expect(fixtures.filter((fixture) => fixture.group === 'parallel_repair')).toHaveLength(3)
    expect(packet.fixtureBundle.requiredItemIdsPresent).toBe(true)
    expect(packet.fixtureBundle.nonPromotionInvariantsPassed).toBe(true)
    expect(packet.releaseBlockers).toEqual([])
    expect(packet.overallPass).toBe(true)
    expect(packet.readinessSnapshot).toMatchObject({
      trustedAttemptCount: 0,
      readinessBand: 'insufficient_evidence',
      officialReadinessClaim: false,
    })
    expect(packet.selectionDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          triggerAttemptFixtureId: 'qe_attempt_pain_first_high_confidence',
          selectedItemId: 'NC-RN-MOC-PRIORITY-REPAIR-0001',
          selectedExpectedRepairItem: true,
        }),
        expect.objectContaining({
          triggerAttemptFixtureId: 'qe_attempt_delegation_to_uap_high_confidence',
          selectedItemId: 'NC-RN-MOC-DELEGATION-REPAIR-0001',
          selectedExpectedRepairItem: true,
        }),
        expect.objectContaining({
          triggerAttemptFixtureId: 'qe_attempt_partial_improvement_high_confidence',
          selectedItemId: 'NC-RN-MOC-EVALUATE-REPAIR-0001',
          selectedExpectedRepairItem: true,
        }),
      ]),
    )
    expect(packet.repairEvidence[0]).toMatchObject({
      repairOutcome: 'practice_repair_supported',
      repairEvidenceLevel: 'practice_transfer',
      officialRepairSuccess: false,
    })
    expect(packet.claimEvidence.every((claim) => !claim.canShowToSchool)).toBe(true)
    expect(packet.metricIntents.every((metric) => !metric.readinessEligible && !metric.schoolVisible)).toBe(true)
    expect(packet.reportingPrivacyContext).toMatchObject({
      disclosureState: 'internal_only',
      canShowToSchool: false,
      canExport: false,
    })
  })

  it('keeps Phase 9 live readiness blocked when validation evidence is missing', () => {
    const packet = runInternalQAPriorityRepairPilot()
    const rollup = buildQuestionEngineValidationRollup([])
    const gate = buildQuestionEngineValidationGate(packet, rollup)

    expect(packet.overallPass).toBe(true)
    expect(rollup.goNoGoRecommendation).toBe('delay')
    expect(gate.evidenceStage).toBe('stage_2_internal_qa_proven')
    expect(gate.learnerBetaReady).toBe(false)
    expect(gate.schoolPilotPackagingReady).toBe(false)
    expect(gate.liveSchoolReportingAllowed).toBe(false)
    expect(gate.officialReadinessClaimAllowed).toBe(false)
    expect(gate.blockers).toEqual(
      expect.arrayContaining([
        'student_validation_sample_missing',
        'faculty_program_validation_sample_missing',
        'live_school_reporting_privacy_review_missing',
        'official_readiness_claim_requires_trusted_content_rollout',
      ]),
    )
  })

  it('separates beta validation readiness from live school reporting approval', () => {
    const studentRecords = Array.from({ length: 5 }, (_, index) => ({
      participantId: `student-${index + 1}`,
      audience: 'student' as const,
      examTrack: 'RN' as const,
      consentScope: 'notes_only' as const,
      prototypePacketVersion: '2026-06-22-validation-stimulus-v1',
      deidentified: true,
      containsDirectIdentifiers: false,
      observations: [
        { taskId: 'high_confidence_miss' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
        { taskId: 'named_misconception' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
        { taskId: 'trust_labels' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
        { taskId: 'rationale_repair' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
        { taskId: 'pilot_value' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
      ],
    }))
    const facultyRecords = Array.from({ length: 3 }, (_, index) => ({
      participantId: `faculty-${index + 1}`,
      audience: index === 2 ? 'program_leader' as const : 'faculty' as const,
      examTrack: 'not_applicable' as const,
      consentScope: 'notes_only' as const,
      prototypePacketVersion: '2026-06-22-validation-stimulus-v1',
      deidentified: true,
      containsDirectIdentifiers: false,
      observations: [
        { taskId: 'faculty_risk_view' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
        { taskId: 'rationale_repair' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
        { taskId: 'trust_labels' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
        { taskId: 'report_privacy_boundary' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
        { taskId: 'pilot_value' as const, score: 2 as const, understandingMode: 'unaided' as const, followUpNeeded: false },
      ],
    }))
    const packet = runInternalQAPriorityRepairPilot()
    const rollup = buildQuestionEngineValidationRollup([...studentRecords, ...facultyRecords])
    const gate = buildQuestionEngineValidationGate(packet, rollup)

    expect(rollup.goNoGoRecommendation).toBe('proceed')
    expect(gate.learnerBetaReady).toBe(true)
    expect(gate.schoolPilotPackagingReady).toBe(true)
    expect(gate.evidenceStage).toBe('stage_5_school_pilot_reporting_supported')
    expect(gate.liveSchoolReportingAllowed).toBe(false)
    expect(gate.officialReadinessClaimAllowed).toBe(false)
    expect(gate.blockers).toEqual(
      expect.arrayContaining([
        'live_school_reporting_privacy_review_missing',
        'official_readiness_claim_requires_trusted_content_rollout',
      ]),
    )
  })
})

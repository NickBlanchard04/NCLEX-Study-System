import { describe, expect, it } from 'vitest'
import type { Question, MaterialQuestion } from '../../../app/types'
import {
  buildEngineLearningSnapshot,
  buildLearnerMasteryVector,
  calculateCalibrationScore,
  createAttemptEngineEvidence,
  normalizeMaterialQuestionToEngineItem,
  normalizeQuestionToEngineItem,
  scoreAttempt,
  selectNextItem,
  withConfidenceEscalation,
} from '..'

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

describe('question engine trust gates', () => {
  it('normalizes app questions conservatively', () => {
    const result = normalizeQuestionToEngineItem(priorityQuestion)

    expect(result.engineItem.sourceStatus).toBe('source_needed')
    expect(result.engineItem.reviewStatus).toBe('not_reviewed')
    expect(result.engineItem.readinessState).toBe('draft_only')
    expect(result.engineItem.countsTowardReadinessDefault).toBe(false)
    expect(result.warnings).toContain('source_backed_not_source_checked')
    expect(result.warnings).toContain('sme_review_ready_not_sme_verified')
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
})

describe('question engine scoring and diagnosis', () => {
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
    expect(evidence.diagnosis.countsTowardReadiness).toBe(false)
    expect(remediation.routeId).toBe('priority_rescue_set')
    expect(remediation.repairRequired).toBe(true)
    expect(remediation.officialRepairEligible).toBe(false)
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
    expect(vector.summary.highConfidenceMissCount).toBe(1)
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
})

import type { MaterialQuestion, Question } from '../../app/types'
import { diagnoseAttempt } from './diagnosis'
import { buildLearnerMasteryVector } from './mastery'
import {
  normalizeMaterialQuestionToEngineItem,
  normalizeQuestionToEngineItem,
  type QuestionEngineNormalizeOverrides,
} from './normalize'
import { buildReadinessSnapshot, type ReadinessSnapshotOptions } from './readiness-snapshot'
import { routeRemediation } from './remediation'
import {
  calculateCalibrationScore,
  scoreAttempt,
  withConfidenceEscalation,
} from './scoring'
import { selectNextItem } from './selection'
import type {
  AttemptDiagnosis,
  AttemptForDiagnosis,
  RemediationEvent,
} from './types'

export * from './diagnosis'
export * from './mastery'
export * from './normalize'
export * from './persistence'
export * from './readiness-gate'
export * from './readiness-snapshot'
export * from './remediation'
export * from './scoring'
export * from './selection'
export * from './types'
export * from './validation'

export function createAttemptEngineEvidence(
  question: Question,
  attempt: AttemptForDiagnosis,
  overrides?: QuestionEngineNormalizeOverrides,
) {
  const adapterResult = normalizeQuestionToEngineItem(question, overrides)
  const scored = withConfidenceEscalation(
    scoreAttempt(adapterResult.engineItem, attempt.selectedAnswer),
    attempt.confidence,
  )
  const calibrationScore = calculateCalibrationScore(scored, attempt.confidence)
  const diagnosis = diagnoseAttempt(adapterResult.engineItem, attempt, scored, calibrationScore)
  const remediationEvents = routeRemediation(diagnosis)

  return {
    adapterResult,
    diagnosis,
    remediationEvents,
  }
}

export function createMaterialAttemptEngineEvidence(
  question: MaterialQuestion,
  attempt: AttemptForDiagnosis,
) {
  const adapterResult = normalizeMaterialQuestionToEngineItem(question)
  const scored = withConfidenceEscalation(
    scoreAttempt(adapterResult.engineItem, attempt.selectedAnswer),
    attempt.confidence,
  )
  const calibrationScore = calculateCalibrationScore(scored, attempt.confidence)
  const diagnosis = diagnoseAttempt(adapterResult.engineItem, attempt, scored, calibrationScore)
  const remediationEvents = routeRemediation(diagnosis)

  return {
    adapterResult,
    diagnosis,
    remediationEvents,
  }
}

export function buildEngineLearningSnapshot(
  diagnoses: AttemptDiagnosis[],
  remediationEvents: RemediationEvent[] = [],
  readinessOptions: ReadinessSnapshotOptions = {},
) {
  const masteryVector = buildLearnerMasteryVector(diagnoses, remediationEvents)
  const readinessSnapshot = buildReadinessSnapshot(
    diagnoses,
    masteryVector,
    remediationEvents,
    readinessOptions,
  )

  return {
    masteryVector,
    readinessSnapshot,
  }
}

export function selectAdaptiveEngineItem(
  questions: Question[],
  diagnoses: AttemptDiagnosis[],
  remediationEvents: RemediationEvent[] = [],
) {
  const items = questions.map((question) => normalizeQuestionToEngineItem(question).engineItem)
  const { masteryVector } = buildEngineLearningSnapshot(diagnoses, remediationEvents)
  return selectNextItem(items, masteryVector, diagnoses)
}

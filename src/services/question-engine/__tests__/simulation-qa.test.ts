import { beforeAll, describe, expect, it } from 'vitest'
import {
  createSyntheticLearnerProfiles,
  createSyntheticQuestionSimulationBank,
  runSyntheticEngineSimulationQA,
  runSyntheticLearnerSimulation,
} from '../simulation-qa'

const getCohort = (
  report: ReturnType<typeof runSyntheticEngineSimulationQA>,
  cohortId: string,
) => {
  const cohort = report.cohortSummaries.find((summary) => summary.cohortId === cohortId)
  if (!cohort) throw new Error(`Missing cohort ${cohortId}`)
  return cohort
}

describe('synthetic question engine simulation QA', () => {
  let simulationReport: ReturnType<typeof runSyntheticEngineSimulationQA> | null = null

  beforeAll(() => {
    simulationReport = runSyntheticEngineSimulationQA()
  }, 20_000)

  const getSimulationReport = () => {
    if (!simulationReport) throw new Error('Synthetic simulation report was not initialized')
    return simulationReport
  }

  it('builds a deterministic 100-learner simulation report with passing engine sanity checks', () => {
    const report = getSimulationReport()

    expect(report).toMatchObject({
      dataMode: 'synthetic_only',
      learnerCount: 100,
      itemCount: 42,
      trustedItemCount: 24,
      overallPass: true,
      releaseBlockers: [],
    })
    expect(report.attemptCount).toBeGreaterThan(5_000)
    expect(report.cohortSummaries).toHaveLength(5)
    expect(report.invariants.every((invariant) => invariant.passed)).toBe(true)
    expect(report.sampleLearners).toHaveLength(5)
    expect(report.sampleLearners.every((learner) => !learner.readinessSnapshot.schoolReportingAllowed)).toBe(true)
  })

  it('separates strong readiness candidates from draft-only and coverage-thin practice signals', () => {
    const report = getSimulationReport()
    const balanced = getCohort(report, 'balanced_ready_candidate')
    const draftOnly = getCohort(report, 'draft_only_high_accuracy')
    const coverageLimited = getCohort(report, 'coverage_gap_high_accuracy')

    expect(balanced.readyCount).toBeGreaterThanOrEqual(14)
    expect(balanced.readinessScoreAvailableCount).toBeGreaterThanOrEqual(14)
    expect(balanced.avgTrustedAttempts).toBe(72)

    expect(draftOnly.avgAccuracy).toBeGreaterThan(0.9)
    expect(draftOnly.readyCount).toBe(0)
    expect(draftOnly.avgTrustedAttempts).toBe(0)
    expect(draftOnly.trustedVolumeBlockedCount).toBe(draftOnly.learnerCount)

    expect(coverageLimited.avgAccuracy).toBeGreaterThan(0.85)
    expect(coverageLimited.readyCount).toBe(0)
    expect(coverageLimited.coverageBlockedCount).toBe(coverageLimited.learnerCount)
  })

  it('detects overconfident priority weakness and routes the next item toward repair', () => {
    const report = getSimulationReport()
    const overconfident = getCohort(report, 'priority_overconfident')

    expect(overconfident.avgHighConfidenceMisses).toBeGreaterThanOrEqual(3)
    expect(overconfident.avgConfidenceMismatchCount).toBeGreaterThanOrEqual(3)
    expect(overconfident.avgRepairSelectionRate).toBeGreaterThanOrEqual(0.55)
    expect(overconfident.topConfidenceRiskIds.join(' ')).toContain('confidence_calibration')
  })

  it('keeps low-confidence correct answers visible as calibration work, not false mastery', () => {
    const report = getSimulationReport()
    const fragile = getCohort(report, 'fragile_low_confidence')

    expect(fragile.avgLowConfidenceCorrect).toBeGreaterThanOrEqual(5)
    expect(fragile.avgConfidenceMismatchCount).toBeGreaterThanOrEqual(5)
    expect(fragile.topConfidenceRiskIds.length).toBeGreaterThan(0)
  })

  it('can run one learner profile for targeted debugging without the aggregate harness', () => {
    const bank = createSyntheticQuestionSimulationBank()
    const profile = createSyntheticLearnerProfiles(5).find(
      (candidate) => candidate.cohortId === 'priority_overconfident',
    )
    if (!profile) throw new Error('Missing priority_overconfident profile')

    const learner = runSyntheticLearnerSimulation(profile, bank)

    expect(learner.learnerId).toContain('synthetic-priority_overconfident')
    expect(learner.attemptCount).toBe(profile.attemptCount)
    expect(learner.highConfidenceMissCount).toBeGreaterThan(0)
    expect(learner.selectionTrace.some((trace) => trace.activeRepairBeforeSelection)).toBe(true)
    expect(learner.selectionTrace.some((trace) => trace.primaryReasonCode === 'active_safety_misconception')).toBe(true)
  })
})

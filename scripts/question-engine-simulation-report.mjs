import { createServer } from 'vite'

const args = new Set(process.argv.slice(2))
const learnerArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--learners='))
const learnerCount = learnerArg
  ? Number.parseInt(learnerArg.split('=')[1] ?? '', 10)
  : 100
const outputJson = args.has('--json')

if (!Number.isInteger(learnerCount) || learnerCount <= 0) {
  console.error('Expected --learners to be a positive integer.')
  process.exit(1)
}

const formatPercent = (value) => `${Math.round(value * 1000) / 10}%`
const formatNumber = (value) =>
  Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000)

const pad = (value, width) => String(value).padEnd(width, ' ')

const printCohortTable = (cohortSummaries) => {
  const rows = cohortSummaries.map((cohort) => ({
    cohort: cohort.cohortId,
    learners: cohort.learnerCount,
    accuracy: formatPercent(cohort.avgAccuracy),
    trusted: formatNumber(cohort.avgTrustedAttempts),
    ready: `${cohort.readyCount}/${cohort.learnerCount}`,
    repair: formatPercent(cohort.avgRepairSelectionRate),
    blockers: [
      cohort.trustedVolumeBlockedCount ? `trusted volume ${cohort.trustedVolumeBlockedCount}` : null,
      cohort.coverageBlockedCount ? `coverage ${cohort.coverageBlockedCount}` : null,
      cohort.confidenceBlockedCount ? `confidence ${cohort.confidenceBlockedCount}` : null,
    ].filter(Boolean).join(', ') || 'none',
  }))
  const widths = {
    cohort: Math.max('cohort'.length, ...rows.map((row) => row.cohort.length)),
    learners: 'learners'.length,
    accuracy: 'accuracy'.length,
    trusted: 'trusted'.length,
    ready: 'ready'.length,
    repair: 'repair'.length,
  }

  console.log([
    pad('cohort', widths.cohort),
    pad('learners', widths.learners),
    pad('accuracy', widths.accuracy),
    pad('trusted', widths.trusted),
    pad('ready', widths.ready),
    pad('repair', widths.repair),
    'blockers',
  ].join('  '))
  console.log([
    '-'.repeat(widths.cohort),
    '-'.repeat(widths.learners),
    '-'.repeat(widths.accuracy),
    '-'.repeat(widths.trusted),
    '-'.repeat(widths.ready),
    '-'.repeat(widths.repair),
    '-'.repeat(8),
  ].join('  '))

  for (const row of rows) {
    console.log([
      pad(row.cohort, widths.cohort),
      pad(row.learners, widths.learners),
      pad(row.accuracy, widths.accuracy),
      pad(row.trusted, widths.trusted),
      pad(row.ready, widths.ready),
      pad(row.repair, widths.repair),
      row.blockers,
    ].join('  '))
  }
}

const printReport = (report) => {
  console.log('Question Engine Synthetic Simulation QA')
  console.log(`Report: ${report.reportId}`)
  console.log(`Mode: ${report.dataMode}`)
  console.log(`Learners: ${report.learnerCount}`)
  console.log(`Attempts: ${report.attemptCount}`)
  console.log(`Items: ${report.itemCount} total, ${report.trustedItemCount} trusted`)
  console.log(`Overall: ${report.overallPass ? 'PASS' : 'FAIL'}`)
  console.log('')

  console.log('Cohorts')
  printCohortTable(report.cohortSummaries)
  console.log('')

  console.log('Invariants')
  for (const invariant of report.invariants) {
    const marker = invariant.passed ? 'PASS' : invariant.severity === 'blocker' ? 'FAIL' : 'WARN'
    console.log(`[${marker}] ${invariant.invariantId}: ${invariant.observed}`)
  }
  console.log('')

  console.log('Sample Learners')
  for (const learner of report.sampleLearners) {
    const blockers = learner.blockedReasons.length ? learner.blockedReasons.join(', ') : 'none'
    console.log(
      `- ${learner.learnerId}: ${learner.readinessStatus}, accuracy ${formatPercent(learner.accuracy)}, trusted ${learner.trustedAttemptCount}, blockers: ${blockers}`,
    )
  }
  console.log('')

  if (report.releaseBlockers.length) {
    console.log(`Release blockers: ${report.releaseBlockers.join(', ')}`)
  } else {
    console.log('Release blockers: none')
  }
}

const server = await createServer({
  configFile: false,
  logLevel: 'silent',
  server: { middlewareMode: true },
})

try {
  const module = await server.ssrLoadModule('/src/services/question-engine/simulation-qa.ts')
  const report = module.runSyntheticEngineSimulationQA(learnerCount)

  if (outputJson) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report)
  }

  if (!report.overallPass) {
    process.exitCode = 1
  }
} finally {
  await server.close()
}

import { createServer } from 'vite'

const args = new Set(process.argv.slice(2))
const sourceArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--source='))
const source = sourceArg?.split('=')[1] ?? 'all'
const outputJson = args.has('--json')
const strict = args.has('--strict')

if (!['all', 'bank', 'quality-packs'].includes(source)) {
  console.error('Expected --source to be one of: all, bank, quality-packs.')
  process.exit(1)
}

const pad = (value, width) => String(value).padEnd(width, ' ')

const clean = (value = '') => value.replace(/\s+/g, ' ').trim()

const excerpt = (value = '', length = 96) => {
  const normalized = clean(value)
  if (normalized.length <= length) return normalized
  return `${normalized.slice(0, length - 3)}...`
}

const severityRank = {
  blocker: 4,
  review: 3,
  warning: 2,
  info: 1,
}

const flattenQualityPacks = (qualityQuestionPacks) =>
  Object.values(qualityQuestionPacks).flat()

const uniqById = (questions) => {
  const byId = new Map()
  for (const question of questions) {
    byId.set(question.id, question)
  }
  return Array.from(byId.values())
}

const selectQuestions = ({ questionBank, qualityQuestionPacks }) => {
  if (source === 'bank') return uniqById(questionBank)
  if (source === 'quality-packs') return uniqById(flattenQualityPacks(qualityQuestionPacks))
  return uniqById([...questionBank, ...flattenQualityPacks(qualityQuestionPacks)])
}

const getWorstSeverity = (issues) =>
  issues.reduce(
    (worst, issue) => (severityRank[issue.severity] > severityRank[worst] ? issue.severity : worst),
    'info',
  )

const compactIssueCounts = (issueCountsByCode) =>
  Object.entries(issueCountsByCode)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code, count]) => ({ code, count }))

const toCompactReport = (summary) => ({
  totalQuestions: summary.totalQuestions,
  displaySafeCount: summary.displaySafeCount,
  blockerCount: summary.blockerCount,
  reviewCount: summary.reviewCount,
  warningCount: summary.warningCount,
  issueCountsBySeverity: summary.issueCountsBySeverity,
  issueCountsByCode: summary.issueCountsByCode,
  itemsWithIssues: summary.items
    .filter((item) => item.issueCount > 0)
    .map((item) => ({
      id: item.question.id,
      examTrack: item.question.examTrack,
      category: item.question.category,
      prompt: item.question.prompt,
      action: item.action,
      displaySafe: item.displaySafe,
      issues: item.issues,
      recommendedActions: item.recommendedActions,
    })),
})

const printIssueTable = (items) => {
  const rows = items.map((item) => ({
    id: item.question.id,
    track: item.question.examTrack,
    severity: getWorstSeverity(item.issues),
    codes: Array.from(new Set(item.issues.map((issue) => issue.code))).join(', '),
    prompt: excerpt(item.question.prompt),
  }))

  if (!rows.length) {
    console.log('Items needing render attention: none')
    return
  }

  const widths = {
    id: Math.max('id'.length, ...rows.map((row) => row.id.length)),
    track: Math.max('track'.length, ...rows.map((row) => row.track.length)),
    severity: Math.max('severity'.length, ...rows.map((row) => row.severity.length)),
  }

  console.log([
    pad('id', widths.id),
    pad('track', widths.track),
    pad('severity', widths.severity),
    'issues',
  ].join('  '))
  console.log([
    '-'.repeat(widths.id),
    '-'.repeat(widths.track),
    '-'.repeat(widths.severity),
    '-'.repeat(40),
  ].join('  '))

  for (const row of rows) {
    console.log([
      pad(row.id, widths.id),
      pad(row.track, widths.track),
      pad(row.severity, widths.severity),
      row.codes,
    ].join('  '))
    console.log(`  ${row.prompt}`)
  }
}

const printReport = (summary) => {
  const itemsWithIssues = summary.items
    .filter((item) => item.issueCount > 0)
    .sort((a, b) => {
      const severityDelta = severityRank[getWorstSeverity(b.issues)] - severityRank[getWorstSeverity(a.issues)]
      return severityDelta || b.issueCount - a.issueCount || a.question.id.localeCompare(b.question.id)
    })

  console.log('Question Render Formatting QA')
  console.log(`Source: ${source}`)
  console.log(`Questions audited: ${summary.totalQuestions}`)
  console.log(`Display-safe: ${summary.displaySafeCount}/${summary.totalQuestions}`)
  console.log(
    `Issues: ${summary.blockerCount} blocker, ${summary.reviewCount} review, ${summary.warningCount} warning`,
  )
  console.log('')

  console.log('Top Issue Codes')
  const issueCounts = compactIssueCounts(summary.issueCountsByCode)
  if (!issueCounts.length) {
    console.log('- none')
  } else {
    issueCounts.slice(0, 12).forEach((issue) => {
      console.log(`- ${issue.code}: ${issue.count}`)
    })
  }
  console.log('')

  printIssueTable(itemsWithIssues.slice(0, 25))

  console.log('')
  if (summary.blockerCount > 0) {
    console.log('Release gate: FAIL - display blockers must be fixed before trust/readiness use.')
  } else if (strict && summary.reviewCount > 0) {
    console.log('Release gate: FAIL - strict mode requires review-level items to be resolved.')
  } else if (summary.reviewCount > 0) {
    console.log('Release gate: PASS WITH REVIEW QUEUE - no blockers, but render review items remain.')
  } else {
    console.log('Release gate: PASS - no display blockers or render-review items.')
  }
}

const server = await createServer({
  configFile: false,
  logLevel: 'silent',
  server: { middlewareMode: true },
})

try {
  const contentModule = await server.ssrLoadModule('/src/data/content.ts')
  const qualityModule = await server.ssrLoadModule('/src/data/quality-question-packs.ts')
  const auditModule = await server.ssrLoadModule('/src/services/question-render-quality.ts')

  const questions = selectQuestions({
    questionBank: contentModule.questionBank,
    qualityQuestionPacks: qualityModule.qualityQuestionPacks,
  })
  const summary = auditModule.auditQuestionRenderFormatting(questions)

  if (outputJson) {
    console.log(JSON.stringify(toCompactReport(summary), null, 2))
  } else {
    printReport(summary)
  }

  if (summary.blockerCount > 0 || (strict && summary.reviewCount > 0)) {
    process.exitCode = 1
  }
} finally {
  await server.close()
}

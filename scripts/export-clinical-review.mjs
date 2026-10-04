import { createServer } from 'vite'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

// A review worklist, not a clinical approval. Never changes production review flags.
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true } })
try {
  const content = await server.ssrLoadModule('/src/data/content.ts')
  const quality = await server.ssrLoadModule('/src/data/quality-question-packs.ts')
  const quick = JSON.parse(readFileSync('src/data/quick-study-bank.json', 'utf8'))
  const unique = new Map([...content.questionBank, ...Object.values(quality.qualityQuestionPacks).flat()].map((question) => [question.id, question]))
  const records = [...unique.values()].map((question) => ({ bank: 'exam-practice', question }))
  for (const question of quick.questions ?? []) records.push({ bank: 'quick-study', question })
  const items = records.map(({ bank, question }) => ({
    bank,
    questionId: question.id,
    contentHash: createHash('sha256').update(JSON.stringify(question)).digest('hex'),
    priority: /dose|dosage|calculation|insulin|heparin|pediatric|emergency|suicide/i.test(JSON.stringify(question)) ? 'high' : 'standard',
    recordedReviewStatus: question.clinicalReviewStatus ?? 'not_sme_reviewed',
    decision: 'pending',
    reviewerName: '',
    reviewerCredentials: '',
    reviewedAt: '',
    verifiedSourceUrls: [],
    checks: { clinicalAccuracy: false, oneDefensibleAnswer: false, plausibleDistractors: false, rationaleSupported: false, unitsAndRounding: false, wordingAndAccessibility: false },
    corrections: '',
    question,
  })).sort((a, b) => Number(b.priority === 'high') - Number(a.priority === 'high'))
  mkdirSync('output/clinical-review', { recursive: true })
  // Timestamp each export so a completed reviewer worklist is never overwritten.
  const file = `output/clinical-review/review-queue-${new Date().toISOString().replaceAll(':', '-')}.json`
  writeFileSync(file, JSON.stringify({
    notice: 'Pending human clinical review. Exporting does not confer approval or change learner-facing status.',
    approvalRequirements: ['Qualified nurse reviewer identity and credentials', 'Current authoritative source URLs', 'All checklist items completed or explained in corrections', 'Question content hash still matches reviewed version', 'Second independent calculation check for medication math', 'Explicit approval before changing production review flags'],
    total: items.length, sourceCatalog: quick.sources, items,
  }, null, 2))
  console.log(`Exported ${items.length} records (${items.filter((item) => item.priority === 'high').length} high-priority) to ${file}`)
} finally { await server.close() }

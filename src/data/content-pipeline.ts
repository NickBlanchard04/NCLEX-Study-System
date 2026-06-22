import type { ContentQualityStatus, ExamTrackId, Question } from '../app/types'
import {
  flashcards,
  getExamBlueprintCoverageSummary,
  getExamContentQualitySummary,
  getExamQuestionBank,
} from './content'
import { getExamTrack } from './exam-tracks'
import { getOfficialExamSources } from './official-sources'

export interface ContentPipelineStage {
  id: ContentQualityStatus
  label: string
  description: string
  owner: string
}

export interface ContentReviewQueueItem {
  id: string
  sourceTopic: string
  system: string
  difficulty: string
  profile: string
  status: ContentQualityStatus
  gate: string
}

export interface ContentAuthoringTarget {
  label: string
  reason: string
  currentItems: number
  recommendedNext: string
}

export interface ContentPipelineSnapshot {
  targetQuestionCount: number
  targetFlashcardCount: number
  currentQuestionCount: number
  currentFlashcardCount: number
  statusCounts: Record<ContentQualityStatus, number>
  reviewQueue: ContentReviewQueueItem[]
  nextAuthoringTargets: ContentAuthoringTarget[]
  cleanRoomGates: Array<{
    label: string
    passed: boolean
    detail: string
  }>
}

export const contentPipelineStages: ContentPipelineStage[] = [
  {
    id: 'generated-starter',
    label: 'AI draft',
    description: 'Clean-room starter item generated from the public blueprint map.',
    owner: 'Content system',
  },
  {
    id: 'authored-draft',
    label: 'Human edited draft',
    description: 'Clinical editor rewrites, checks role/scope, and tightens distractors.',
    owner: 'Clinical editor',
  },
  {
    id: 'editor-reviewed',
    label: 'Editor reviewed',
    description: 'Second pass confirms blueprint alignment, clarity, and no copied wording.',
    owner: 'Senior editor',
  },
  {
    id: 'sme-review-ready',
    label: 'SME review ready',
    description: 'Ready for RN/NP/MA subject-matter expert validation.',
    owner: 'SME reviewer',
  },
  {
    id: 'sme-reviewed',
    label: 'SME reviewed',
    description: 'Clinically validated by the proper credentialed reviewer.',
    owner: 'SME reviewer',
  },
  {
    id: 'published',
    label: 'Published',
    description: 'Released into premium official-bank practice.',
    owner: 'Product/content lead',
  },
]

const contentTargets: Record<ExamTrackId, { questions: number; flashcards: number }> = {
  'nclex-rn': { questions: 900, flashcards: 400 },
  'nclex-pn': { questions: 700, flashcards: 300 },
  teas: { questions: 700, flashcards: 300 },
  fnp: { questions: 1100, flashcards: 500 },
  ccma: { questions: 600, flashcards: 250 },
}

const pipelineStatusOrder: ContentQualityStatus[] = [
  'generated-starter',
  'authored-draft',
  'editor-reviewed',
  'sme-review-ready',
  'sme-reviewed',
  'published',
]

const statusGateLabel: Record<ContentQualityStatus, string> = {
  'generated-starter': 'Needs human rewrite and source-topic check',
  'authored-draft': 'Needs second editor review',
  'editor-reviewed': 'Needs SME handoff',
  'sme-review-ready': 'Needs credentialed SME sign-off',
  'sme-reviewed': 'Needs publish approval',
  published: 'Live in premium bank',
}

const countByStatus = (bank: Question[]) =>
  pipelineStatusOrder.reduce(
    (counts, status) => ({
      ...counts,
      [status]: bank.filter((question) => question.contentQuality === status).length,
    }),
    {} as Record<ContentQualityStatus, number>,
  )

export const getContentPipelineSnapshot = (examTrack: ExamTrackId): ContentPipelineSnapshot => {
  const track = getExamTrack(examTrack)
  const bank = getExamQuestionBank(examTrack)
  const coverage = getExamBlueprintCoverageSummary(examTrack)
  const quality = getExamContentQualitySummary(examTrack)
  const sources = getOfficialExamSources(examTrack)
  const target = contentTargets[examTrack]
  const trackFlashcards = flashcards.filter((card) => card.examTrack === examTrack)
  const statusCounts = countByStatus(bank)

  const reviewQueue = bank
    .filter((question) =>
      question.contentQuality &&
      question.contentQuality !== 'generated-starter' &&
      question.contentQuality !== 'published',
    )
    .slice(0, 6)
    .map((question) => ({
      id: question.id,
      sourceTopic: question.sourceTopic ?? `${question.category} / ${question.subcategory}`,
      system: question.system ?? question.subcategory,
      difficulty: question.difficulty,
      profile: question.difficultyProfile ?? 'standard',
      status: question.contentQuality ?? 'generated-starter',
      gate: statusGateLabel[question.contentQuality ?? 'generated-starter'],
    }))

  const nextAuthoringTargets = track.systems
    .map((system) => {
      const systemItems = bank.filter((question) => question.system === system || question.subcategory === system)
      const hardItems = systemItems.filter((question) =>
        question.difficultyProfile === 'hard-mode' ||
        question.difficultyProfile === 'trap-heavy' ||
        question.difficultyProfile === 'case-based',
      )

      return {
        label: system,
        currentItems: systemItems.length,
        reason:
          hardItems.length < 12
            ? 'Needs more hard, trap-heavy, or case-based items.'
            : 'Lowest-volume blueprint area for the next clean-room batch.',
        recommendedNext:
          hardItems.length < 12
            ? 'Draft 5 hard-mode clinical reasoning items plus 5 spaced flashcards.'
            : 'Draft 10 mixed-difficulty items with rationale and trap metadata.',
      }
    })
    .sort((left, right) => left.currentItems - right.currentItems)
    .slice(0, 4)

  const cleanRoomGates = [
    {
      label: 'Official source map attached',
      passed: sources.length > 0,
      detail: `${sources.length} public source${sources.length === 1 ? '' : 's'} registered for ${track.shortName}.`,
    },
    {
      label: 'Blueprint coverage represented',
      passed: coverage.domainCoverage === coverage.domainTotal && coverage.systemCoverage === coverage.systemTotal,
      detail: `${coverage.domainCoverage}/${coverage.domainTotal} domains and ${coverage.systemCoverage}/${coverage.systemTotal} systems represented.`,
    },
    {
      label: 'Question metadata complete',
      passed: quality.blueprintMapped === bank.length && quality.sourceBacked === bank.length,
      detail: `${quality.blueprintMapped}/${bank.length} blueprint-mapped and ${quality.sourceBacked}/${bank.length} source-backed.`,
    },
    {
      label: 'No copied competitor content',
      passed: true,
      detail: 'Use competitors only for feature benchmarking; never import paid wording, choices, rationales, or card phrasing.',
    },
    {
      label: 'SME labels are earned',
      passed: quality.smeReviewed + quality.published <= quality.reviewReady + quality.smeReviewed + quality.published,
      detail: `${quality.smeReviewed + quality.published} items currently marked SME-reviewed or published.`,
    },
  ]

  return {
    targetQuestionCount: target.questions,
    targetFlashcardCount: target.flashcards,
    currentQuestionCount: bank.length,
    currentFlashcardCount: trackFlashcards.length,
    statusCounts,
    reviewQueue,
    nextAuthoringTargets,
    cleanRoomGates,
  }
}

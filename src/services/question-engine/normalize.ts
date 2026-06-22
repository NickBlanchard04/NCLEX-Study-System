import type {
  ContentQualityStatus,
  MaterialQuestion,
  Question,
  QuestionFormat,
} from '../../app/types'
import { getReadinessDecision } from './readiness-gate'
import {
  questionEngineVersions,
  type ClinicalJudgmentStep,
  type ContentOrigin,
  type EngineWarningCode,
  type ExamTrackCode,
  type MisconceptionId,
  type NursingProcessStep,
  type QuestionEngineItem,
  type QuestionEngineItemAdapterResult,
  type QuestionItemType,
  type ReadinessExclusionReason,
  type ReviewStatus,
  type RationaleQualityStatus,
  type SafetySeverity,
  type ScoringMethod,
  type SourceStatus,
} from './types'

export interface QuestionEngineNormalizeOverrides {
  examTrack?: ExamTrackCode
  clientNeed?: string
  clinicalJudgmentStep?: ClinicalJudgmentStep
  nursingProcessStep?: NursingProcessStep
  itemType?: QuestionItemType
  scoringMethod?: ScoringMethod
  sourceStatus?: SourceStatus
  reviewStatus?: ReviewStatus
  rationaleQualityStatus?: RationaleQualityStatus
  contentOrigin?: ContentOrigin
  generatedOnly?: boolean
  revisionFlag?: boolean
  priorityFrameworks?: string[]
  safetyFlags?: string[]
  safetySeverity?: SafetySeverity
  distractorMisconceptions?: Record<string, MisconceptionId>
  misconceptionTested?: MisconceptionId
}

const nclexClientNeedHints = new Set([
  'Safe and Effective Care Environment',
  'Health Promotion and Maintenance',
  'Psychosocial Integrity',
  'Physiological Integrity',
])

export const normalizeExamTrack = (value?: string): ExamTrackCode => {
  const normalized = value?.toLowerCase().replaceAll('_', '-')
  if (normalized === 'nclex-rn' || normalized === 'rn' || normalized === 'ncsbn-rn') return 'RN'
  if (normalized === 'nclex-pn' || normalized === 'pn' || normalized === 'ncsbn-pn') return 'PN'
  return 'practice_only'
}

export const normalizeItemType = (format?: QuestionFormat | string): QuestionItemType => {
  const normalized = format?.toLowerCase().trim()
  if (normalized === 'multiple-choice' || normalized === 'multiple choice') return 'multiple_choice'
  if (normalized === 'select-all-that-apply' || normalized === 'select all that apply') return 'sata'
  if (normalized === 'drag-and-drop' || normalized === 'drag/drop') return 'drag_drop'
  if (normalized === 'ordered response') return 'ordered_response'
  if (normalized === 'dropdown') return 'dropdown'
  if (normalized === 'cloze' || normalized === 'cloze/drop-down') return 'cloze'
  if (normalized === 'matrix') return 'matrix'
  if (normalized === 'highlight') return 'highlight'
  if (normalized === 'bowtie') return 'bowtie'
  if (normalized === 'trend') return 'trend'
  return 'unknown_item_type'
}

export const getDefaultScoringMethod = (itemType: QuestionItemType): ScoringMethod => {
  if (itemType === 'multiple_choice') return 'binary'
  if (itemType === 'sata') return 'all_or_nothing'
  if (itemType === 'matrix') return 'matrix_partial'
  if (itemType === 'drag_drop' || itemType === 'ordered_response') return 'ordered_partial'
  if (itemType === 'highlight') return 'highlight_partial'
  if (itemType === 'cloze' || itemType === 'dropdown' || itemType === 'bowtie' || itemType === 'trend') {
    return 'partial_credit'
  }
  return 'not_scored'
}

const inferClinicalJudgmentStep = (question: Question): ClinicalJudgmentStep => {
  const haystack = `${question.category} ${question.subcategory} ${question.prompt} ${question.tags.join(' ')} ${question.testTakingTrap ?? ''}`.toLowerCase()
  if (haystack.includes('evaluate') || haystack.includes('response') || haystack.includes('follow')) {
    return 'Evaluate outcomes'
  }
  if (haystack.includes('delegate') || haystack.includes('uap') || haystack.includes('intervention') || haystack.includes('first action')) {
    return 'Take action'
  }
  if (haystack.includes('priority') || haystack.includes('who first') || haystack.includes('unstable')) {
    return 'Prioritize hypotheses'
  }
  if (haystack.includes('teaching') || haystack.includes('plan')) return 'Generate solutions'
  if (haystack.includes('trend') || haystack.includes('lab') || haystack.includes('analyze')) return 'Analyze cues'
  if (haystack.includes('assess') || haystack.includes('recognize')) return 'Recognize cues'
  return 'Not primary'
}

const inferNursingProcessStep = (clinicalJudgmentStep: ClinicalJudgmentStep): NursingProcessStep => {
  if (clinicalJudgmentStep === 'Recognize cues') return 'Assessment'
  if (clinicalJudgmentStep === 'Analyze cues' || clinicalJudgmentStep === 'Prioritize hypotheses') return 'Analysis'
  if (clinicalJudgmentStep === 'Generate solutions') return 'Planning'
  if (clinicalJudgmentStep === 'Take action') return 'Implementation'
  if (clinicalJudgmentStep === 'Evaluate outcomes') return 'Evaluation'
  return 'Not primary'
}

const inferSafety = (question: Question) => {
  const haystack = `${question.category} ${question.subcategory} ${question.prompt} ${question.tags.join(' ')} ${question.clinicalRelevance}`.toLowerCase()
  const safetyFlags = new Set<string>()
  const priorityFrameworks = new Set<string>()
  let safetySeverity: SafetySeverity = 'medium'

  if (haystack.includes('airway') || haystack.includes('oxygen') || haystack.includes('respir')) {
    safetyFlags.add('oxygenation')
    priorityFrameworks.add('ABCs')
    safetySeverity = 'high'
  }
  if (haystack.includes('perfusion') || haystack.includes('shock') || haystack.includes('hypotension')) {
    safetyFlags.add('perfusion')
    priorityFrameworks.add('unstable_vs_stable')
    safetySeverity = 'high'
  }
  if (haystack.includes('delegation') || haystack.includes('uap') || haystack.includes('lpn')) {
    safetyFlags.add('scope_of_practice')
    priorityFrameworks.add('delegation')
    safetySeverity = 'high'
  }
  if (haystack.includes('infection') || haystack.includes('sepsis')) safetyFlags.add('infection_risk')
  if (haystack.includes('fall')) safetyFlags.add('fall_risk')
  if (haystack.includes('med') || haystack.includes('toxicity') || haystack.includes('dose')) {
    safetyFlags.add('medication_safety')
    safetySeverity = safetySeverity === 'medium' ? 'high' : safetySeverity
  }
  if (haystack.includes('priority') || haystack.includes('who first')) priorityFrameworks.add('unstable_vs_stable')

  return {
    priorityFrameworks: Array.from(priorityFrameworks),
    safetyFlags: Array.from(safetyFlags),
    safetySeverity,
  }
}

const inferDistractorMisconceptions = (question: Question): Record<string, MisconceptionId> => {
  const byChoice: Record<string, MisconceptionId> = {}
  const haystack = `${question.category} ${question.subcategory} ${question.prompt} ${question.tags.join(' ')}`.toLowerCase()

  for (const choice of question.choices) {
    if (question.correctAnswer.includes(choice.id)) continue
    const text = choice.text.toLowerCase()
    if (text.includes('pain')) {
      byChoice[choice.id] = 'pain_before_perfusion_or_oxygenation'
    } else if (text.includes('teach') || text.includes('discharge')) {
      byChoice[choice.id] = 'teaching_deadline_before_instability'
    } else if (text.includes('document') || text.includes('routine') || text.includes('comfort')) {
      byChoice[choice.id] = 'routine_task_before_deterioration'
    } else if (text.includes('uap') || text.includes('assistive') || text.includes('delegate')) {
      byChoice[choice.id] = 'delegating_nursing_judgment'
    } else if (text.includes('reassess') || text.includes('later') || text.includes('wait')) {
      byChoice[choice.id] = 'delayed_escalation_for_deterioration'
    } else if (haystack.includes('priority') || haystack.includes('who first')) {
      byChoice[choice.id] = 'stable_need_over_unstable_client'
    }
  }

  return byChoice
}

const getContentOrigin = (contentQuality?: ContentQualityStatus): ContentOrigin => {
  if (contentQuality === 'generated-starter') return 'generated_material'
  if (contentQuality === 'sme-review-ready' || contentQuality === 'editor-reviewed') return 'quality_pack'
  if (contentQuality === 'sme-reviewed' || contentQuality === 'published') return 'official_bank'
  return 'app_seed'
}

const makeAdapterResult = (item: QuestionEngineItem): QuestionEngineItemAdapterResult => {
  const decision = getReadinessDecision(item)
  const engineItem = {
    ...item,
    readinessState: decision.readinessState,
    readinessExclusionReasons: decision.readinessExclusionReasons,
    countsTowardReadinessDefault: decision.countsTowardReadiness,
  }

  return {
    engineItem,
    warnings: engineItem.warnings,
    readinessExclusionReasons: engineItem.readinessExclusionReasons,
    adapterVersion: questionEngineVersions.adapter,
  }
}

export function normalizeQuestionToEngineItem(
  question: Question,
  overrides: QuestionEngineNormalizeOverrides = {},
): QuestionEngineItemAdapterResult {
  const warnings: EngineWarningCode[] = []
  const itemType = overrides.itemType ?? normalizeItemType(question.format)
  const scoringMethod = overrides.scoringMethod ?? getDefaultScoringMethod(itemType)
  const explicitClinicalJudgment = Boolean(overrides.clinicalJudgmentStep)
  const clinicalJudgmentStep = overrides.clinicalJudgmentStep ?? inferClinicalJudgmentStep(question)
  const explicitNursingProcess = Boolean(overrides.nursingProcessStep)
  const nursingProcessStep = overrides.nursingProcessStep ?? inferNursingProcessStep(clinicalJudgmentStep)
  const contentOrigin = overrides.contentOrigin ?? getContentOrigin(question.contentQuality)
  const generatedOnly =
    overrides.generatedOnly ?? (contentOrigin === 'generated_material' || question.authorType === 'system-generated')
  const inferredSafety = inferSafety(question)
  const sourceStatus = overrides.sourceStatus ?? 'source_needed'
  const reviewStatus = overrides.reviewStatus ?? 'not_reviewed'
  const candidateSourceRefs = question.sourceRefs ?? []
  const readinessExclusionReasons: ReadinessExclusionReason[] = []

  if (!explicitClinicalJudgment) {
    warnings.push(
      clinicalJudgmentStep === 'Not primary'
        ? 'missing_clinical_judgment_step'
        : 'clinical_judgment_step_inferred',
    )
    readinessExclusionReasons.push('missing_metadata')
  }
  if (!explicitNursingProcess) {
    warnings.push('missing_nursing_process_step')
    readinessExclusionReasons.push('missing_metadata')
  }
  if (candidateSourceRefs.length) warnings.push('source_refs_candidate_only')
  if (question.sourceBacked) warnings.push('source_backed_not_source_checked')
  if (question.contentQuality === 'sme-review-ready') warnings.push('sme_review_ready_not_sme_verified')
  if (question.blueprintMapped) warnings.push('blueprint_hint_not_coverage_proof')
  if (!overrides.rationaleQualityStatus) warnings.push('missing_rationale_quality_status')
  if (!overrides.distractorMisconceptions) warnings.push('missing_misconception_map')
  if (normalizeExamTrack(question.examTrack) === 'practice_only') warnings.push('practice_only_exam_track')
  if (!nclexClientNeedHints.has(question.category)) warnings.push('noncanonical_client_need')
  if (scoringMethod === 'not_scored') warnings.push('unknown_scoring')

  const item: QuestionEngineItem = {
    itemId: question.id,
    examTrack: overrides.examTrack ?? normalizeExamTrack(question.examTrack),
    appExamTrack: question.examTrack,
    clientNeed: overrides.clientNeed ?? question.category,
    subcategory: question.subcategory,
    bodySystem: question.system,
    topic: question.sourceTopic,
    clinicalJudgmentStep,
    nursingProcessStep,
    itemType,
    scoringMethod,
    choices: question.choices,
    correctAnswer: question.correctAnswer,
    distractorMisconceptions: overrides.distractorMisconceptions ?? inferDistractorMisconceptions(question),
    misconceptionTested: overrides.misconceptionTested,
    priorityFrameworks: overrides.priorityFrameworks ?? inferredSafety.priorityFrameworks,
    safetyFlags: overrides.safetyFlags ?? inferredSafety.safetyFlags,
    safetySeverity: overrides.safetySeverity ?? inferredSafety.safetySeverity,
    rationale: {
      correctExplanation: question.rationale.whyCorrect,
      distractorExplanations: question.rationale.whyOthers,
      qualityStatus: overrides.rationaleQualityStatus ?? 'basic',
    },
    learningTip: question.nclexTip,
    clinicalRelevanceNote: question.clinicalRelevance,
    tags: question.tags,
    sourceStatus,
    reviewStatus,
    readinessState: 'draft_only',
    readinessExclusionReasons,
    countsTowardReadinessDefault: false,
    contentOrigin,
    generatedOnly,
    revisionFlag: overrides.revisionFlag ?? reviewStatus === 'needs_revision',
    contentPipelineStatus: question.contentQuality,
    candidateSourceRefs,
    sourceHintPresent: Boolean(question.sourceBacked || candidateSourceRefs.length),
    blueprintMappedHint: Boolean(question.blueprintMapped),
    hasExplicitClinicalJudgmentStep: explicitClinicalJudgment,
    hasExplicitNursingProcessStep: explicitNursingProcess,
    warnings: Array.from(new Set(warnings)),
    rawAppQuestionId: question.id,
  }

  return makeAdapterResult(item)
}

export function normalizeMaterialQuestionToEngineItem(
  question: MaterialQuestion,
): QuestionEngineItemAdapterResult {
  const item: QuestionEngineItem = {
    itemId: question.id,
    examTrack: 'practice_only',
    clientNeed: 'Uploaded material',
    subcategory: question.sourceTitle,
    clinicalJudgmentStep: 'Not primary',
    nursingProcessStep: 'Not primary',
    itemType: 'multiple_choice',
    scoringMethod: 'binary',
    choices: question.choices,
    correctAnswer: question.correctAnswer,
    distractorMisconceptions: {},
    priorityFrameworks: [],
    safetyFlags: [],
    safetySeverity: 'low',
    rationale: {
      correctExplanation: question.rationale,
      qualityStatus: 'basic',
    },
    tags: ['uploaded-material'],
    sourceStatus: 'source_needed',
    reviewStatus: 'not_reviewed',
    readinessState: 'draft_only',
    readinessExclusionReasons: ['user_uploaded_material', 'source_needed', 'not_reviewed'],
    countsTowardReadinessDefault: false,
    contentOrigin: 'user_uploaded_material',
    generatedOnly: true,
    revisionFlag: false,
    candidateSourceRefs: [],
    sourceHintPresent: false,
    blueprintMappedHint: false,
    hasExplicitClinicalJudgmentStep: false,
    hasExplicitNursingProcessStep: false,
    warnings: [
      'missing_clinical_judgment_step',
      'missing_nursing_process_step',
      'missing_rationale_quality_status',
      'missing_misconception_map',
      'practice_only_exam_track',
    ],
    rawAppQuestionId: question.id,
  }

  return makeAdapterResult(item)
}

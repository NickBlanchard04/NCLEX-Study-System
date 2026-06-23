import { getMisconceptionDefinition } from './diagnosis'
import {
  questionEngineVersions,
  type AttemptDiagnosis,
  type LearnerMasteryVector,
  type MasteryDimensionStats,
  type MisconceptionFamily,
  type MisconceptionId,
  type QuestionEngineItem,
  type QuestionItemType,
  type SafetySeverity,
  type SelectionDecision,
  type SelectionExclusionReason,
  type SelectionReasonCode,
  type SelectionScoreComponents,
  type SelectionTargetDimensions,
} from './types'

export interface SelectionOptions {
  trustMode?: 'practice' | 'readiness'
  preferredMisconceptionFamily?: MisconceptionFamily | string
  preferredMisconceptionId?: MisconceptionId
  recentWindowSize?: number
  allowRecentExactRepeat?: boolean
  highLoadStreak?: number
}

interface ActiveRepairContext {
  misconceptionIds: Set<MisconceptionId>
  misconceptionFamilies: Set<MisconceptionFamily>
  clinicalJudgmentSteps: Set<string>
  fragileClinicalJudgmentSteps: Set<string>
  hasActiveSafetyRepair: boolean
  hasActiveHighConfidenceMiss: boolean
  hasUnprovenRepair: boolean
  hasUnknownMisconceptionProbe: boolean
}

interface CandidateDimension {
  dimensionType: string
  dimensionId: string
  impact: number
}

interface CandidateMeta {
  dimensions: CandidateDimension[]
  misconceptionIds: Set<MisconceptionId>
  misconceptionFamilies: Set<MisconceptionFamily>
  matchesActiveRepair: boolean
  matchesActiveSafetyRepair: boolean
  matchesActiveHighConfidenceMiss: boolean
  matchesUnknownProbe: boolean
  matchesFragileReinforcement: boolean
  isRecentExactRepeat: boolean
  isHighLoad: boolean
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const roundScore = (value: number) => Math.round(value * 1000) / 1000
const dimensionKey = (dimensionType: string, dimensionId: string) => `${dimensionType}:${dimensionId}`

const emptyTargetDimensions: SelectionTargetDimensions = {
  clientNeed: null,
  subcategory: null,
  clinicalJudgmentStep: null,
  nursingProcessStep: null,
  bodySystem: null,
  safetyFlag: null,
  misconceptionId: null,
  misconceptionFamily: null,
  itemType: null,
}

const highLoadItemTypes = new Set<QuestionItemType>([
  'matrix',
  'highlight',
  'drag_drop',
  'ordered_response',
  'bowtie',
  'trend',
])

const highSeverityValue: Record<SafetySeverity, number> = {
  low: 0.08,
  medium: 0.22,
  high: 0.72,
  critical: 1,
}

const increment = <T extends string>(counts: Partial<Record<T, number>>, key: T) => {
  counts[key] = (counts[key] ?? 0) + 1
}

const getTopExclusionReasons = (
  counts: Partial<Record<SelectionExclusionReason, number>>,
): SelectionExclusionReason[] =>
  (Object.entries(counts) as [SelectionExclusionReason, number][])
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([reason]) => reason)

const getDimension = (
  masteryVector: LearnerMasteryVector,
  dimensionType: string,
  dimensionId: string,
): MasteryDimensionStats | undefined => masteryVector.dimensions[dimensionKey(dimensionType, dimensionId)]

const weightedAverage = (
  dimensions: CandidateDimension[],
  getValue: (dimension: CandidateDimension, stats: MasteryDimensionStats | undefined) => number,
  masteryVector: LearnerMasteryVector,
  fallback: number,
) => {
  const totalImpact = dimensions.reduce((sum, dimension) => sum + dimension.impact, 0)
  if (!totalImpact) return fallback

  const total = dimensions.reduce((sum, dimension) => {
    const stats = getDimension(masteryVector, dimension.dimensionType, dimension.dimensionId)
    return sum + getValue(dimension, stats) * dimension.impact
  }, 0)

  return clamp01(total / totalImpact)
}

const getCandidateMisconceptionIds = (item: QuestionEngineItem): Set<MisconceptionId> =>
  new Set([
    ...Object.values(item.distractorMisconceptions),
    ...(item.misconceptionTested ? [item.misconceptionTested] : []),
  ])

const getCandidateMisconceptionFamilies = (
  ids: Set<MisconceptionId>,
): Set<MisconceptionFamily> =>
  new Set(Array.from(ids).map((id) => getMisconceptionDefinition(id).family))

const getCandidateDimensions = (
  item: QuestionEngineItem,
  misconceptionIds: Set<MisconceptionId>,
  misconceptionFamilies: Set<MisconceptionFamily>,
): CandidateDimension[] => {
  const dimensions = new Map<string, CandidateDimension>()
  const add = (dimensionType: string, dimensionId: string | undefined, impact: number) => {
    if (!dimensionId) return
    const key = dimensionKey(dimensionType, dimensionId)
    const existing = dimensions.get(key)
    dimensions.set(key, {
      dimensionType,
      dimensionId,
      impact: Math.max(existing?.impact ?? 0, impact),
    })
  }

  add('client_need', item.clientNeed, 0.28)
  add('subcategory', item.subcategory, 0.18)
  add('clinical_judgment_step', item.clinicalJudgmentStep, 0.3)
  add('item_type', item.itemType, 0.1)
  add('body_system', item.bodySystem, 0.08)

  for (const flag of item.safetyFlags) add('safety_flag', flag, 0.12)
  for (const framework of item.priorityFrameworks) add('priority_framework', framework, 0.12)
  for (const id of misconceptionIds) {
    if (id !== 'unknown_misconception') add('misconception_id', id, 0.22)
  }
  for (const family of misconceptionFamilies) {
    if (family !== 'unknown') add('misconception_family', family, 0.16)
  }

  return Array.from(dimensions.values())
}

const getActiveRepairContext = (recentDiagnoses: AttemptDiagnosis[]): ActiveRepairContext => {
  const context: ActiveRepairContext = {
    misconceptionIds: new Set(),
    misconceptionFamilies: new Set(),
    clinicalJudgmentSteps: new Set(),
    fragileClinicalJudgmentSteps: new Set(),
    hasActiveSafetyRepair: false,
    hasActiveHighConfidenceMiss: false,
    hasUnprovenRepair: false,
    hasUnknownMisconceptionProbe: false,
  }

  for (const diagnosis of recentDiagnoses) {
    if (diagnosis.confidenceSignal === 'fragile_correct') {
      context.fragileClinicalJudgmentSteps.add(diagnosis.clinicalJudgmentStep)
    }

    const incorrect = !diagnosis.scoreResult.isCorrect
    const highConfidenceMiss = incorrect && (diagnosis.confidence === 'high' || diagnosis.confidenceEscalated)
    const unprovenRepair = diagnosis.repairRequired && !diagnosis.repairCompleted
    const activeRepair = incorrect && (highConfidenceMiss || unprovenRepair)

    if (!activeRepair) continue

    context.hasUnprovenRepair ||= unprovenRepair
    context.hasActiveHighConfidenceMiss ||= highConfidenceMiss
    context.clinicalJudgmentSteps.add(diagnosis.clinicalJudgmentStep)

    if (diagnosis.likelyMisconceptionId === 'unknown_misconception') {
      context.hasUnknownMisconceptionProbe = true
    } else {
      context.misconceptionIds.add(diagnosis.likelyMisconceptionId)
    }

    if (diagnosis.misconceptionFamily !== 'unknown') {
      context.misconceptionFamilies.add(diagnosis.misconceptionFamily)
    }

    context.hasActiveSafetyRepair ||=
      diagnosis.safetySeverity === 'high' || diagnosis.safetySeverity === 'critical'
  }

  return context
}

const hasSetOverlap = <T>(left: Set<T>, right: Set<T>) => {
  for (const value of left) {
    if (right.has(value)) return true
  }
  return false
}

const getCandidateMeta = (
  item: QuestionEngineItem,
  context: ActiveRepairContext,
  recentItemIds: Set<string>,
): CandidateMeta => {
  const misconceptionIds = getCandidateMisconceptionIds(item)
  const misconceptionFamilies = getCandidateMisconceptionFamilies(misconceptionIds)
  const dimensions = getCandidateDimensions(item, misconceptionIds, misconceptionFamilies)
  const directMisconceptionMatch = hasSetOverlap(misconceptionIds, context.misconceptionIds)
  const familyMatch = hasSetOverlap(misconceptionFamilies, context.misconceptionFamilies)
  const clinicalJudgmentMatch = context.clinicalJudgmentSteps.has(item.clinicalJudgmentStep)
  const matchesActiveRepair = directMisconceptionMatch || familyMatch

  return {
    dimensions,
    misconceptionIds,
    misconceptionFamilies,
    matchesActiveRepair,
    matchesActiveSafetyRepair:
      context.hasActiveSafetyRepair &&
      matchesActiveRepair &&
      (item.safetySeverity === 'high' || item.safetySeverity === 'critical'),
    matchesActiveHighConfidenceMiss:
      context.hasActiveHighConfidenceMiss && (matchesActiveRepair || clinicalJudgmentMatch),
    matchesUnknownProbe:
      context.hasUnknownMisconceptionProbe &&
      clinicalJudgmentMatch &&
      item.distractorMisconceptions &&
      Object.keys(item.distractorMisconceptions).length > 0,
    matchesFragileReinforcement:
      context.fragileClinicalJudgmentSteps.has(item.clinicalJudgmentStep),
    isRecentExactRepeat: recentItemIds.has(item.itemId),
    isHighLoad:
      highLoadItemTypes.has(item.itemType) ||
      item.safetySeverity === 'critical',
  }
}

const getCoverageGapSignal = (stats: MasteryDimensionStats | undefined) => {
  if (!stats) return 0.82
  if (stats.exposureLevel === 'low') return 0.86
  if (stats.masteryLevel === 'fragile') return 0.55
  if (stats.evidenceScope === 'practice_only') return 0.42
  if (!stats.latestTrustedAttemptAt) return 0.34
  return 0.12
}

const getLowExposureSignal = (stats: MasteryDimensionStats | undefined) => {
  if (!stats) return 0.9
  if (stats.exposureLevel === 'low') return 0.75
  if (stats.exposureLevel === 'moderate') return 0.28
  return 0.04
}

const getReadinessSignal = (
  item: QuestionEngineItem,
  masteryVector: LearnerMasteryVector,
  trustMode: 'practice' | 'readiness',
) => {
  if (!item.countsTowardReadinessDefault) return trustMode === 'practice' ? 0.02 : 0
  if (trustMode === 'practice') return 0.08

  const readinessWeights = [
    getDimension(masteryVector, 'client_need', item.clientNeed)?.readinessWeight ?? 0,
    getDimension(masteryVector, 'clinical_judgment_step', item.clinicalJudgmentStep)
      ?.readinessWeight ?? 0,
    getDimension(masteryVector, 'item_type', item.itemType)?.readinessWeight ?? 0,
  ]
  const highestReadinessNeed = Math.max(...readinessWeights)

  return 0.58 + Math.max(0, 0.2 - highestReadinessNeed * 0.2)
}

const getDifficultyFitSignal = (
  item: QuestionEngineItem,
  meta: CandidateMeta,
  highLoadStreak: number,
) => {
  if (meta.matchesActiveSafetyRepair || meta.matchesActiveRepair) return 0.04
  if (highLoadStreak >= 2) return meta.isHighLoad ? 0 : 0.75
  if (item.itemType === 'multiple_choice' || item.itemType === 'sata') return 0.42
  return meta.isHighLoad ? 0.22 : 0.34
}

const getCandidateScoreComponents = (
  item: QuestionEngineItem,
  meta: CandidateMeta,
  masteryVector: LearnerMasteryVector,
  trustMode: 'practice' | 'readiness',
  options: SelectionOptions,
): SelectionScoreComponents => {
  const weaknessSignal = weightedAverage(
    meta.dimensions,
    (_dimension, stats) => stats?.selectionWeight ?? stats?.weaknessScore ?? (masteryVector.summary.attemptCount ? 0.22 : 0.42),
    masteryVector,
    0.35,
  )
  const coverageGapSignal = weightedAverage(
    meta.dimensions,
    (_dimension, stats) => getCoverageGapSignal(stats),
    masteryVector,
    0.5,
  )
  const lowExposureSignal = weightedAverage(
    meta.dimensions.filter((dimension) =>
      ['client_need', 'clinical_judgment_step', 'item_type', 'safety_flag'].includes(dimension.dimensionType),
    ),
    (_dimension, stats) => getLowExposureSignal(stats),
    masteryVector,
    0.45,
  )
  const clinicalJudgmentDimension = getDimension(
    masteryVector,
    'clinical_judgment_step',
    item.clinicalJudgmentStep,
  )
  const confidenceMismatchSignal = Math.max(
    clinicalJudgmentDimension?.confidenceMismatchScore ?? 0,
    meta.matchesFragileReinforcement ? 0.8 : 0,
  )
  const preferredFamilyMatch =
    Boolean(options.preferredMisconceptionFamily) &&
    Array.from(meta.misconceptionFamilies).some(
      (family) => family === options.preferredMisconceptionFamily,
    )
  const preferredIdMatch =
    Boolean(options.preferredMisconceptionId) &&
    meta.misconceptionIds.has(options.preferredMisconceptionId as MisconceptionId)
  const repairSignal = meta.matchesActiveSafetyRepair
    ? 1
    : meta.matchesActiveRepair
      ? 0.86
      : meta.matchesActiveHighConfidenceMiss
        ? 0.62
        : meta.matchesUnknownProbe
          ? 0.44
          : preferredIdMatch || preferredFamilyMatch
            ? 0.52
            : 0
  const recentRepeatPenalty = meta.isRecentExactRepeat
    ? options.allowRecentExactRepeat
      ? 0
      : meta.matchesActiveRepair
        ? 0.18
        : 0.46
    : 0
  const fatiguePenalty =
    options.highLoadStreak && options.highLoadStreak >= 2 && meta.isHighLoad && !meta.matchesActiveSafetyRepair
      ? 0.3
      : 0

  const components = {
    weaknessScore: weaknessSignal * 0.45,
    confidenceMismatchScore: clamp01(confidenceMismatchSignal) * 0.34,
    safetySeverityWeight: highSeverityValue[item.safetySeverity] * 0.28,
    misconceptionRepairWeight: repairSignal * 0.82,
    coverageGapWeight: coverageGapSignal * 0.26,
    lowExposureWeight: lowExposureSignal * 0.16,
    recencyGapWeight: meta.isRecentExactRepeat ? 0 : 0.04,
    readinessGateWeight: getReadinessSignal(item, masteryVector, trustMode) * 0.28,
    difficultyFitWeight: getDifficultyFitSignal(item, meta, options.highLoadStreak ?? 0) * 0.08,
    overusePenalty: recentRepeatPenalty,
    fatiguePenalty,
    total: 0,
  }

  const total =
    components.weaknessScore +
    components.confidenceMismatchScore +
    components.safetySeverityWeight +
    components.misconceptionRepairWeight +
    components.coverageGapWeight +
    components.lowExposureWeight +
    components.recencyGapWeight +
    components.readinessGateWeight +
    components.difficultyFitWeight -
    components.overusePenalty -
    components.fatiguePenalty

  return Object.fromEntries(
    Object.entries({ ...components, total }).map(([key, value]) => [key, roundScore(value)]),
  ) as unknown as SelectionScoreComponents
}

const getCandidateExclusionReasons = (
  item: QuestionEngineItem,
  trustMode: 'practice' | 'readiness',
): SelectionExclusionReason[] => {
  const reasons: SelectionExclusionReason[] = []

  if (item.readinessState === 'retired' || item.sourceStatus === 'retired' || item.reviewStatus === 'retired') {
    reasons.push('retired_item')
  }
  if (item.revisionFlag || item.reviewStatus === 'needs_revision') {
    reasons.push('revision_flagged')
  }

  if (trustMode === 'readiness' && !item.countsTowardReadinessDefault) {
    reasons.push('trust_gate_exclusion')
    reasons.push(...item.readinessExclusionReasons)
  }

  return Array.from(new Set(reasons))
}

const toTargetDimensions = (
  item: QuestionEngineItem,
  meta: CandidateMeta,
): SelectionTargetDimensions => {
  const misconceptionId =
    item.misconceptionTested ??
    Array.from(meta.misconceptionIds).find((id) => id !== 'unknown_misconception') ??
    null
  const misconceptionFamily = misconceptionId
    ? getMisconceptionDefinition(misconceptionId).family
    : Array.from(meta.misconceptionFamilies).find((family) => family !== 'unknown') ?? null

  return {
    clientNeed: item.clientNeed,
    subcategory: item.subcategory,
    clinicalJudgmentStep: item.clinicalJudgmentStep,
    nursingProcessStep: item.nursingProcessStep,
    bodySystem: item.bodySystem ?? null,
    safetyFlag: item.safetyFlags[0] ?? null,
    misconceptionId,
    misconceptionFamily,
    itemType: item.itemType,
  }
}

const getSecondaryReasons = (
  item: QuestionEngineItem,
  meta: CandidateMeta,
  components: SelectionScoreComponents,
  trustMode: 'practice' | 'readiness',
): SelectionReasonCode[] => {
  const reasons: SelectionReasonCode[] = []
  const add = (reason: SelectionReasonCode, condition = true) => {
    if (condition && !reasons.includes(reason)) reasons.push(reason)
  }

  add('active_safety_misconception', meta.matchesActiveSafetyRepair)
  add('active_high_confidence_miss', meta.matchesActiveHighConfidenceMiss)
  add('mapped_misconception_repair_available', meta.matchesActiveRepair)
  add('unknown_misconception_probe', meta.matchesUnknownProbe)
  add('fragile_correct_reinforcement', meta.matchesFragileReinforcement)
  add('overconfidence_recalibration', components.confidenceMismatchScore >= 0.18)
  add('trusted_readiness_candidate', trustMode === 'readiness' && item.countsTowardReadinessDefault)
  add('practice_only_candidate', trustMode === 'practice' && !item.countsTowardReadinessDefault)
  add('recent_exact_repeat', meta.isRecentExactRepeat)
  add('high_load_fatigue_guardrail', components.fatiguePenalty > 0)
  add('clinical_judgment_gap', components.coverageGapWeight >= 0.17)
  add('low_exposure', components.lowExposureWeight >= 0.1)
  add('difficulty_fit_pacing', components.difficultyFitWeight >= 0.04)

  return reasons
}

const choosePrimaryReason = (
  item: QuestionEngineItem,
  meta: CandidateMeta,
  components: SelectionScoreComponents,
  context: ActiveRepairContext,
  trustMode: 'practice' | 'readiness',
): SelectionReasonCode => {
  if (meta.matchesActiveSafetyRepair) return 'active_safety_misconception'
  if (meta.matchesActiveHighConfidenceMiss) return 'active_high_confidence_miss'
  if (context.hasUnprovenRepair && meta.matchesActiveRepair) return 'repair_required_not_proven'
  if (meta.matchesActiveRepair) return 'mapped_misconception_repair_available'
  if (meta.matchesUnknownProbe) return 'unknown_misconception_probe'
  if (trustMode === 'readiness' && item.countsTowardReadinessDefault) return 'trusted_readiness_candidate'
  if (meta.matchesFragileReinforcement) return 'fragile_correct_reinforcement'
  if (components.confidenceMismatchScore >= 0.18) return 'overconfidence_recalibration'
  if (components.coverageGapWeight >= 0.18) return 'clinical_judgment_gap'
  if (components.lowExposureWeight >= 0.1) return 'low_exposure'
  if (meta.isRecentExactRepeat) return 'recent_repeat_penalty'
  if (components.difficultyFitWeight >= 0.04) return 'difficulty_fit_pacing'
  if (item.countsTowardReadinessDefault) return 'trusted_readiness_evidence'
  return trustMode === 'practice' && !item.countsTowardReadinessDefault
    ? 'practice_only_candidate'
    : 'maintain_momentum'
}

const getSelectionIntent = (
  reasonCode: SelectionReasonCode,
  trustMode: 'practice' | 'readiness',
) => {
  if (
    reasonCode === 'active_safety_misconception' ||
    reasonCode === 'active_high_confidence_miss' ||
    reasonCode === 'repair_required_not_proven' ||
    reasonCode === 'mapped_misconception_repair_available' ||
    reasonCode === 'active_misconception_repair'
  ) {
    return 'repair_misconception'
  }

  if (reasonCode === 'fragile_correct_reinforcement') return 'reinforce'
  if (
    reasonCode === 'overconfidence_recalibration' ||
    reasonCode === 'confidence_mismatch' ||
    reasonCode === 'calibration_recheck_due'
  ) {
    return 'stabilize_confidence'
  }
  if (trustMode === 'readiness' && reasonCode === 'trusted_readiness_candidate') {
    return 'build_readiness_evidence'
  }
  if (
    reasonCode === 'clinical_judgment_gap' ||
    reasonCode === 'client_need_gap' ||
    reasonCode === 'item_type_gap' ||
    reasonCode === 'safety_flag_gap' ||
    reasonCode === 'low_exposure'
  ) {
    return 'fill_coverage_gap'
  }
  if (reasonCode === 'high_load_fatigue_guardrail') return 'reduce_fatigue'
  if (reasonCode === 'unknown_misconception_probe') return 'diagnose'

  return 'maintain_momentum'
}

export function selectNextItem(
  candidates: QuestionEngineItem[],
  masteryVector: LearnerMasteryVector,
  recentDiagnoses: AttemptDiagnosis[] = [],
  options: SelectionOptions = {},
): SelectionDecision {
  const trustMode = options.trustMode ?? 'practice'
  const recentWindowSize = options.recentWindowSize ?? 5
  const recentWindow = recentDiagnoses.slice(-recentWindowSize)
  const recentItemIds = new Set(recentWindow.map((diagnosis) => diagnosis.itemId))
  const activeContext = getActiveRepairContext(recentWindow)
  const exclusionCounts: Partial<Record<SelectionExclusionReason, number>> = {}
  const eligible: QuestionEngineItem[] = []

  for (const item of candidates) {
    const exclusionReasons = getCandidateExclusionReasons(item, trustMode)
    if (exclusionReasons.length) {
      for (const reason of exclusionReasons) increment(exclusionCounts, reason)
    } else {
      eligible.push(item)
    }
  }

  if (!eligible.length) {
    const readinessBlocked = trustMode === 'readiness' && candidates.length > 0
    const primaryReasonCode: SelectionReasonCode = readinessBlocked
      ? 'insufficient_trusted_candidates'
      : 'no_safe_candidate'

    return {
      selectedItemId: null,
      selectionIntent: 'no_candidate',
      primaryReasonCode,
      secondaryReasonCodes: readinessBlocked ? ['trust_gate_exclusion'] : [],
      trustMode,
      learnerExplanationKey: readinessBlocked
        ? 'next_item_insufficient_trusted_candidates'
        : 'no_safe_candidate_available',
      targetDimensions: emptyTargetDimensions,
      candidatePoolSummary: {
        candidateCount: candidates.length,
        eligibleCount: 0,
        excludedCount: candidates.length,
        topExclusionReasons: getTopExclusionReasons(exclusionCounts),
      },
      candidateCount: candidates.length,
      eligibleCandidateCount: 0,
      excludedCandidateCount: candidates.length,
      exclusionCounts,
      scoreByItemId: {},
      scoreComponentsByItemId: {},
      selectionVersion: questionEngineVersions.selection,
    }
  }

  const metaByItemId = Object.fromEntries(
    eligible.map((item) => [item.itemId, getCandidateMeta(item, activeContext, recentItemIds)]),
  )
  const scoreComponentsByItemId = Object.fromEntries(
    eligible.map((item) => [
      item.itemId,
      getCandidateScoreComponents(
        item,
        metaByItemId[item.itemId],
        masteryVector,
        trustMode,
        options,
      ),
    ]),
  )
  const scoreByItemId = Object.fromEntries(
    Object.entries(scoreComponentsByItemId).map(([itemId, components]) => [
      itemId,
      components.total,
    ]),
  )
  const selected = eligible.toSorted(
    (left, right) =>
      (scoreByItemId[right.itemId] ?? 0) - (scoreByItemId[left.itemId] ?? 0) ||
      left.itemId.localeCompare(right.itemId),
  )[0]
  const selectedMeta = metaByItemId[selected.itemId]
  const selectedComponents = scoreComponentsByItemId[selected.itemId]
  const primaryReasonCode = choosePrimaryReason(
    selected,
    selectedMeta,
    selectedComponents,
    activeContext,
    trustMode,
  )
  const secondaryReasonCodes = getSecondaryReasons(
    selected,
    selectedMeta,
    selectedComponents,
    trustMode,
  ).filter((reason) => reason !== primaryReasonCode)

  return {
    selectedItemId: selected.itemId,
    selectionIntent: getSelectionIntent(primaryReasonCode, trustMode),
    primaryReasonCode,
    secondaryReasonCodes,
    trustMode,
    learnerExplanationKey: `next_item_${primaryReasonCode}`,
    targetDimensions: toTargetDimensions(selected, selectedMeta),
    candidatePoolSummary: {
      candidateCount: candidates.length,
      eligibleCount: eligible.length,
      excludedCount: candidates.length - eligible.length,
      topExclusionReasons: getTopExclusionReasons(exclusionCounts),
    },
    candidateCount: candidates.length,
    eligibleCandidateCount: eligible.length,
    excludedCandidateCount: candidates.length - eligible.length,
    exclusionCounts,
    scoreByItemId,
    scoreComponentsByItemId,
    selectionVersion: questionEngineVersions.selection,
  }
}

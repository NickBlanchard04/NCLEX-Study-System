import type {
  ActiveSession,
  AnalyticsScope,
  AnalyticsSnapshot,
  CategoryStats,
  ConfidenceLevel,
  DashboardState,
  ExamTrackId,
  MasteryLevel,
  Note,
  QuestionAttempt,
  QuestionCategory,
  QuestionDifficulty,
  QuestionDifficultyProfile,
  QuestionFormat,
  Recommendation,
  StudyPlan,
  UserProfile,
  WeakAreaInsight,
} from '../app/types'
import {
  buildEngineLearningSnapshot,
  createAttemptEngineEvidence,
  selectAdaptiveEngineItem,
} from './question-engine'
import type {
  AttemptDiagnosis,
  RemediationEvent,
} from './question-engine/types'
import {
  getExamCategories,
  getExamQuestionBank,
  getExamStudyPlanTopics,
  questionBank,
} from '../data/content'

const confidenceScore: Record<ConfidenceLevel, number> = {
  low: 0.35,
  medium: 0.65,
  high: 1,
}

const categoryConceptMap: Record<QuestionCategory, string[]> = {
  'Fundamentals & Safety': ['fall prevention', 'least restrictive safety', 'post-op surveillance'],
  Pharmacology: ['toxicity recognition', 'high-risk labs', 'medication teaching'],
  'Adult Health / Med-Surg': ['fluid status trends', 'device emergencies', 'perfusion priorities'],
  'Maternal-Newborn': ['fetal oxygenation', 'postpartum hemorrhage', 'maternal warning signs'],
  Pediatrics: ['age-specific assessment', 'airway protection', 'family teaching'],
  'Mental Health': ['therapeutic communication', 'safety threats', 'behavioral containment'],
  'Leadership / Prioritization / Delegation': ['who to see first', 'stable versus unstable', 'role clarity'],
  'Lab Values / Clinical Judgment': ['trend recognition', 'dangerous labs', 'perfusion signals'],
}

export const questionLookup = Object.fromEntries(questionBank.map((question) => [question.id, question]))

const getProfileExamTrack = (profile: UserProfile): ExamTrackId => profile.examTrack ?? 'nclex-rn'

const getProfileAnalyticsScope = (profile: UserProfile): AnalyticsScope =>
  profile.preferences.analyticsScope ?? 'selected-track'

const getAttemptExamTrack = (attempt: QuestionAttempt): ExamTrackId =>
  attempt.examTrack ?? questionLookup[attempt.questionId]?.examTrack ?? 'nclex-rn'

const getScopedAttempts = (
  attempts: QuestionAttempt[],
  examTrack: ExamTrackId,
  analyticsScope: AnalyticsScope = 'selected-track',
) =>
  analyticsScope === 'all-tracks'
    ? attempts
    : attempts.filter((attempt) => getAttemptExamTrack(attempt) === examTrack)

const getVisibleCategories = (
  examTrack: ExamTrackId,
  analyticsScope: AnalyticsScope = 'selected-track',
) =>
  analyticsScope === 'all-tracks'
    ? Array.from(new Set(questionBank.map((question) => question.category)))
    : getExamCategories(examTrack)

const compareAnswers = (a: string[], b: string[]) => {
  const left = [...a].sort()
  const right = [...b].sort()
  return left.length === right.length && left.every((value, index) => value === right[index])
}

const startOfDay = (date: Date) => {
  const clone = new Date(date)
  clone.setHours(0, 0, 0, 0)
  return clone
}

export const getTodayCompleted = (attempts: QuestionAttempt[]) => {
  const today = startOfDay(new Date()).getTime()
  return attempts.filter((attempt) => startOfDay(new Date(attempt.completedAt)).getTime() === today).length
}

export const calculateStreak = (attempts: QuestionAttempt[]) => {
  const daySet = new Set(
    attempts.map((attempt) => startOfDay(new Date(attempt.completedAt)).toISOString()),
  )

  let streak = 0
  const cursor = startOfDay(new Date())
  while (daySet.has(cursor.toISOString())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

const getAttemptsByCategory = (attempts: QuestionAttempt[], category: QuestionCategory) =>
  attempts.filter((attempt) => questionLookup[attempt.questionId]?.category === category)

const getRecentTrend = (attempts: QuestionAttempt[]) => {
  const recent = attempts.slice(-4)
  const previous = attempts.slice(-8, -4)
  if (!recent.length || !previous.length) return 0
  const recentAccuracy = recent.filter((attempt) => attempt.isCorrect).length / recent.length
  const previousAccuracy = previous.filter((attempt) => attempt.isCorrect).length / previous.length
  return recentAccuracy - previousAccuracy
}

const getMasteryLevel = (
  accuracy: number,
  confidenceMismatchScore: number,
  attemptCount: number,
): MasteryLevel => {
  if (attemptCount < 3 || accuracy < 0.6 || confidenceMismatchScore > 0.45) return 'fragile'
  if (accuracy >= 0.8 && confidenceMismatchScore <= 0.25) return 'strong'
  return 'developing'
}

const getConceptsForCategory = (category: QuestionCategory) =>
  categoryConceptMap[category] ?? [
    category.toLowerCase(),
    'safe decision-making',
    'exam-specific prioritization',
  ]

const getEngineEvidenceFromAttempts = (
  attempts: QuestionAttempt[],
): { diagnoses: AttemptDiagnosis[]; remediationEvents: RemediationEvent[] } => {
  const diagnoses: AttemptDiagnosis[] = []
  const remediationEvents: RemediationEvent[] = []

  for (const attempt of attempts) {
    if (attempt.engineDiagnosis) {
      diagnoses.push(attempt.engineDiagnosis)
      remediationEvents.push(...(attempt.engineRemediationEvents ?? []))
      continue
    }

    const question = questionLookup[attempt.questionId]
    if (!question) continue

    const evidence = createAttemptEngineEvidence(question, attempt)
    diagnoses.push(evidence.diagnosis)
    remediationEvents.push(...evidence.remediationEvents)
  }

  return { diagnoses, remediationEvents }
}

export const getCategoryStats = (
  attempts: QuestionAttempt[],
  examTrack: ExamTrackId = 'nclex-rn',
  analyticsScope: AnalyticsScope = 'selected-track',
): CategoryStats[] => {
  const scopedAttempts = getScopedAttempts(attempts, examTrack, analyticsScope)
  const visibleCategories = getVisibleCategories(examTrack, analyticsScope)

  return visibleCategories.map((category) => {
    const categoryAttempts = getAttemptsByCategory(scopedAttempts, category)
    const attemptCount = categoryAttempts.length
    const correctCount = categoryAttempts.filter((attempt) => attempt.isCorrect).length
    const accuracy = attemptCount ? correctCount / attemptCount : 0
    const avgConfidence = attemptCount
      ? categoryAttempts.reduce((sum, attempt) => sum + confidenceScore[attempt.confidence], 0) / attemptCount
      : 0
    const highConfidenceMisses = categoryAttempts.filter(
      (attempt) => !attempt.isCorrect && attempt.confidence === 'high',
    ).length
    const lowConfidenceCorrects = categoryAttempts.filter(
      (attempt) => attempt.isCorrect && attempt.confidence === 'low',
    ).length
    const confidenceMismatchScore = attemptCount
      ? (highConfidenceMisses * 1.25 + lowConfidenceCorrects * 0.85) / attemptCount
      : 0.5
    const recentTrend = getRecentTrend(categoryAttempts)
    const flaggedCount = categoryAttempts.filter((attempt) => attempt.flagged).length
    const exposurePenalty = Math.max(0, 4 - attemptCount) / 4
    const weaknessScore =
      (1 - accuracy) * 0.45 +
      confidenceMismatchScore * 0.25 +
      Math.max(0, -recentTrend) * 0.15 +
      exposurePenalty * 0.1 +
      (flaggedCount / Math.max(attemptCount, 1)) * 0.05

    return {
      category,
      accuracy,
      attemptCount,
      avgConfidence,
      confidenceMismatchScore,
      recentTrend,
      masteryLevel: getMasteryLevel(accuracy, confidenceMismatchScore, attemptCount),
      weaknessScore,
      flaggedCount,
    }
  })
}

export const getWeakAreas = (
  attempts: QuestionAttempt[],
  examTrack: ExamTrackId = 'nclex-rn',
  analyticsScope: AnalyticsScope = 'selected-track',
): WeakAreaInsight[] =>
  getCategoryStats(attempts, examTrack, analyticsScope)
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .map((stats) => {
      const categoryAttempts = getAttemptsByCategory(attempts, stats.category)
      const missedQuestions = categoryAttempts
        .filter((attempt) => !attempt.isCorrect)
        .map((attempt) => questionLookup[attempt.questionId])
        .filter(Boolean)
      const commonMistakes = Array.from(
        new Set(missedQuestions.flatMap((question) => question.tags).slice(0, 3)),
      )
      const keyConcepts = getConceptsForCategory(stats.category)
      const suggestedAction =
        stats.confidenceMismatchScore > 0.4
          ? 'Slow down and retrain your decision pattern with guided rationales.'
          : stats.attemptCount < 3
            ? 'Build exposure with a short targeted set before doing a mixed quiz.'
            : 'Use a focused quiz plus flashcards to stabilize recall.'

      return {
        ...stats,
        commonMistakes: commonMistakes.length ? commonMistakes : keyConcepts,
        keyConcepts,
        suggestedAction,
      }
    })

const getRecentAccuracy = (attempts: QuestionAttempt[]) => {
  const recent = attempts.slice(-8)
  if (!recent.length) return 0
  return recent.filter((attempt) => attempt.isCorrect).length / recent.length
}

export const getRecommendedNextStep = (
  profile: UserProfile,
  attempts: QuestionAttempt[],
): Recommendation => {
  const examTrack = getProfileExamTrack(profile)
  const analyticsScope = getProfileAnalyticsScope(profile)
  const scopedAttempts = getScopedAttempts(attempts, examTrack, analyticsScope)
  const weakest = getWeakAreas(attempts, examTrack, analyticsScope)[0]
  const todayCompleted = getTodayCompleted(scopedAttempts)
  const streak = calculateStreak(scopedAttempts)
  const flaggedCount = scopedAttempts.filter((attempt) => attempt.flagged).length
  const recentAccuracy = getRecentAccuracy(scopedAttempts)

  if (todayCompleted < profile.dailyGoal && weakest && weakest.weaknessScore > 0.45) {
    return {
      title: `You struggled with ${weakest.category} yesterday. Let's fix that today.`,
      description: `A 10-minute targeted set in ${weakest.category} will give you the fastest confidence gain right now.`,
      actionLabel: 'Start Quick Study',
      route: '/quick-study',
      variant: 'focus',
    }
  }

  if (streak <= 1 && todayCompleted === 0) {
    return {
      title: 'Protect your streak with the shortest possible win.',
      description: 'Complete one 5-question Quick Study session to keep momentum alive before the day gets away from you.',
      actionLabel: 'Keep the streak',
      route: '/quick-study',
      variant: 'warning',
    }
  }

  if (recentAccuracy < 0.65) {
    return {
      title: 'Your recent score dipped. Tighten your strategy before more volume.',
      description: 'Use strategy training to reset how you prioritize safety, then return to mixed practice.',
      actionLabel: 'Review strategy',
      route: '/strategy-training',
      variant: 'warning',
    }
  }

  if (flaggedCount >= 4) {
    return {
      title: 'You have several flagged questions waiting for review.',
      description: 'Reviewing flagged misses is one of the fastest ways to turn confusion into points.',
      actionLabel: 'Review weak areas',
      route: '/weak-areas',
      variant: 'focus',
    }
  }

  return {
    title: 'You are building steady momentum.',
    description: 'A mixed practice set is the best next step to turn isolated wins into broader exam confidence.',
    actionLabel: 'Start practice',
    route: '/practice-questions',
    variant: 'success',
  }
}

export const getDashboardState = (
  profile: UserProfile,
  attempts: QuestionAttempt[],
): DashboardState => {
  const examTrack = getProfileExamTrack(profile)
  const analyticsScope = getProfileAnalyticsScope(profile)
  const scopedAttempts = getScopedAttempts(attempts, examTrack, analyticsScope)
  const weakestCategories = getWeakAreas(attempts, examTrack, analyticsScope).slice(0, 3)
  const streak = calculateStreak(scopedAttempts)
  const motivationalInsight = weakestCategories[0]
    ? weakestCategories[0].confidenceMismatchScore > 0.45
      ? `High-confidence misses in ${weakestCategories[0].category} mean your instincts need recalibration, not more random volume.`
      : `Low-confidence correct answers show you are close. Reinforce ${weakestCategories[0].category} today and it will stick.`
    : 'Small, focused sessions beat overwhelmed marathon studying.'

  return {
    todayCompleted: getTodayCompleted(scopedAttempts),
    dailyGoal: profile.dailyGoal,
    weakestCategories,
    recommendation: getRecommendedNextStep(profile, attempts),
    motivationalInsight,
    recentAccuracy: getRecentAccuracy(scopedAttempts),
    streak,
  }
}

const practiceSessionRoute: Record<ActiveSession['mode'], string> = {
  practice: '/practice-questions',
  'quick-study': '/quick-study',
  test: '/test-mode',
  'clinical-thinking': '/clinical-simulator',
}

const practiceSessionLabel: Record<ActiveSession['mode'], string> = {
  practice: 'Practice set',
  'quick-study': 'Quick Study',
  test: 'Test mode',
  'clinical-thinking': 'Clinical thinking',
}

const getSessionTopCategory = (session: ActiveSession) => {
  const categoryCounts = session.questionIds.reduce<Map<string, number>>((counts, questionId) => {
    const category = questionLookup[questionId]?.category
    if (!category) return counts
    counts.set(category, (counts.get(category) ?? 0) + 1)
    return counts
  }, new Map())
  return [...categoryCounts.entries()].toSorted((left, right) => right[1] - left[1])[0]?.[0] ?? 'Mixed'
}

export const getActiveSessionSummary = (session: ActiveSession | null) => {
  if (!session || session.endedAt || session.status === 'discarded' || session.deletedAt) return null
  return {
    id: session.id,
    mode: session.mode,
    label: practiceSessionLabel[session.mode],
    title: session.title,
    route: practiceSessionRoute[session.mode],
    answeredCount: session.responses.length,
    questionCount: session.questionIds.length,
    topCategory: getSessionTopCategory(session),
    lastActivityAt: session.lastActivityAt ?? session.updatedAt ?? session.startedAt,
  }
}

export const getPracticeHistory = (sessions: ActiveSession[], limit = 3) =>
  sessions
    .filter((session) => session.status === 'completed' || Boolean(session.endedAt))
    .filter((session) => !session.deletedAt && session.status !== 'discarded')
    .toSorted((left, right) =>
      (right.endedAt ?? right.updatedAt ?? right.startedAt).localeCompare(
        left.endedAt ?? left.updatedAt ?? left.startedAt,
      ),
    )
    .slice(0, limit)
    .map((session) => ({
      id: session.id,
      mode: session.mode,
      label: practiceSessionLabel[session.mode],
      title: session.title,
      score: session.score ?? 0,
      questionCount: session.questionIds.length,
      answeredCount: session.responses.length,
      completedAt: session.endedAt ?? session.updatedAt ?? session.startedAt,
      topCategory: getSessionTopCategory(session),
      route: practiceSessionRoute[session.mode],
    }))

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5)

const getEngineRankScores = (questions: typeof questionBank, attempts: QuestionAttempt[]) => {
  const { diagnoses, remediationEvents } = getEngineEvidenceFromAttempts(attempts)
  return selectAdaptiveEngineItem(questions, diagnoses, remediationEvents).scoreByItemId
}

const countAttemptsByQuestionId = (attempts: QuestionAttempt[]) =>
  attempts.reduce<Map<string, number>>((counts, attempt) => {
    counts.set(attempt.questionId, (counts.get(attempt.questionId) ?? 0) + 1)
    return counts
  }, new Map())

const questionQualityRank = (questionId: string) => {
  const quality = questionLookup[questionId]?.contentQuality
  if (quality === 'sme-reviewed') return 0
  if (quality === 'sme-review-ready') return 1
  if (quality === 'authored-draft') return 2
  return 3
}

const getAdaptiveDifficulty = (attempts: QuestionAttempt[], category?: QuestionCategory) => {
  const relevant = category
    ? attempts.filter((attempt) => questionLookup[attempt.questionId]?.category === category)
    : attempts
  const latest = relevant.slice(-2)
  if (
    latest.length === 2 &&
    latest.every((attempt) => attempt.isCorrect && attempt.confidence !== 'low')
  ) {
    return 'advanced'
  }
  if (latest.some((attempt) => !attempt.isCorrect && attempt.confidence === 'high')) {
    return 'foundation'
  }
  if (latest.filter((attempt) => !attempt.isCorrect).length >= 2) return 'foundation'
  return 'developing'
}

const createSession = (
  mode: ActiveSession['mode'],
  examTrack: ExamTrackId,
  title: string,
  subtitle: string,
  questionIds: string[],
  config: ActiveSession['config'],
): ActiveSession => {
  const startedAt = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    mode,
    examTrack,
    title,
    subtitle,
    questionIds,
    startedAt,
    currentIndex: 0,
    config,
    responses: [],
    status: 'active',
    lastActivityAt: startedAt,
  }
}

export const selectQuickStudyQuestionIds = (
  available: typeof questionBank,
  attempts: QuestionAttempt[],
  difficulty: QuestionDifficulty,
  questionCount = 5,
) => {
  const recentAttemptIds = attempts.slice(-8).map((attempt) => attempt.questionId)
  const recentIds = new Set(recentAttemptIds)
  const nonRecent = available.filter((question) => !recentIds.has(question.id))
  const recentBackfill = available
    .filter((question) => recentIds.has(question.id))
    .toSorted((left, right) => recentAttemptIds.indexOf(left.id) - recentAttemptIds.indexOf(right.id))
  const candidatePool =
    nonRecent.length >= questionCount ? nonRecent : [...nonRecent, ...recentBackfill]
  const engineScores = getEngineRankScores(candidatePool, attempts)
  const attemptCounts = countAttemptsByQuestionId(attempts)

  return candidatePool
    .toSorted((left, right) => {
      const engineDelta = (engineScores[right.id] ?? 0) - (engineScores[left.id] ?? 0)
      if (Math.abs(engineDelta) > 0.05) return engineDelta
      const qualityDelta = questionQualityRank(left.id) - questionQualityRank(right.id)
      if (qualityDelta !== 0) return qualityDelta
      const leftMatch = left.difficulty === difficulty ? 0 : 1
      const rightMatch = right.difficulty === difficulty ? 0 : 1
      if (leftMatch !== rightMatch) return leftMatch - rightMatch
      return (attemptCounts.get(left.id) ?? 0) - (attemptCounts.get(right.id) ?? 0)
    })
    .slice(0, questionCount)
    .map((question) => question.id)
}

export const generateQuickStudySession = (
  attempts: QuestionAttempt[],
  examTrack: ExamTrackId,
  preferredCategory?: QuestionCategory,
) => {
  const bank = getExamQuestionBank(examTrack)
  const scopedAttempts = getScopedAttempts(attempts, examTrack)
  const weakAreas = getWeakAreas(scopedAttempts, examTrack)
  const weakArea = preferredCategory
    ? weakAreas.find((item) => item.category === preferredCategory)
    : weakAreas[0]
  const category = weakArea?.category ?? weakAreas[0]?.category ?? getExamCategories(examTrack)[0]
  const available = bank.filter((question) => question.category === category)
  const difficulty = getAdaptiveDifficulty(scopedAttempts, category)
  const questionIds = selectQuickStudyQuestionIds(available, scopedAttempts, difficulty, 5)

  return createSession(
    'quick-study',
    examTrack,
    '10-minute rescue set',
    `${category} focus. Five questions, fast feedback, zero clutter.`,
    questionIds,
    {
      questionCount: 5,
      category,
      difficulty: 'adaptive',
      format: 'mixed',
    },
  )
}

interface PracticeFilters {
  category?: QuestionCategory | 'All'
  domain?: string | 'All'
  system?: string | 'All'
  board?: string | 'All'
  questionStatus?: 'unused' | 'incorrect' | 'all'
  format?: QuestionFormat | 'mixed'
  difficulty?: QuestionDifficulty | 'adaptive' | 'mixed'
  difficultyProfile?: QuestionDifficultyProfile | 'mixed'
  questionCount?: number
}

export const generatePracticeSet = (
  attempts: QuestionAttempt[],
  examTrack: ExamTrackId,
  filters: PracticeFilters,
) => {
  const bank = getExamQuestionBank(examTrack)
  const scopedAttempts = getScopedAttempts(attempts, examTrack)
  const attemptedIds = new Set(scopedAttempts.map((attempt) => attempt.questionId))
  const incorrectIds = new Set(scopedAttempts.filter((attempt) => !attempt.isCorrect).map((attempt) => attempt.questionId))
  const adaptiveDifficulty = getAdaptiveDifficulty(
    scopedAttempts,
    filters.category && filters.category !== 'All' ? filters.category : undefined,
  )
  const targetDifficulty =
    filters.difficulty && filters.difficulty !== 'adaptive' && filters.difficulty !== 'mixed'
      ? filters.difficulty
      : adaptiveDifficulty

  const filtered = bank.filter((question) => {
    const matchesCategory =
      !filters.category || filters.category === 'All' || question.category === filters.category
    const matchesDomain =
      !filters.domain || filters.domain === 'All' || question.domain === filters.domain
    const matchesSystem =
      !filters.system || filters.system === 'All' || question.system === filters.system
    const matchesBoard =
      !filters.board || filters.board === 'All' || question.board === filters.board
    const matchesStatus =
      !filters.questionStatus ||
      filters.questionStatus === 'all' ||
      (filters.questionStatus === 'unused' && !attemptedIds.has(question.id)) ||
      (filters.questionStatus === 'incorrect' && incorrectIds.has(question.id))
    const matchesFormat =
      !filters.format || filters.format === 'mixed' || question.format === filters.format
    const matchesDifficulty =
      !filters.difficulty ||
      filters.difficulty === 'adaptive' ||
      filters.difficulty === 'mixed' ||
      question.difficulty === filters.difficulty
    const matchesDifficultyProfile =
      !filters.difficultyProfile ||
      filters.difficultyProfile === 'mixed' ||
      question.difficultyProfile === filters.difficultyProfile
    return matchesCategory && matchesDomain && matchesSystem && matchesBoard && matchesStatus && matchesFormat && matchesDifficulty && matchesDifficultyProfile
  })

  const candidatePool = filtered.length ? filtered : bank
  const engineScores = getEngineRankScores(candidatePool, scopedAttempts)
  const ranked = shuffle(candidatePool).sort((left, right) => {
    const leftAttempts = scopedAttempts.filter((attempt) => attempt.questionId === left.id)
    const rightAttempts = scopedAttempts.filter((attempt) => attempt.questionId === right.id)
    const engineDelta = (engineScores[right.id] ?? 0) - (engineScores[left.id] ?? 0)
    if (Math.abs(engineDelta) > 0.05) return engineDelta
    const qualityDelta = questionQualityRank(left.id) - questionQualityRank(right.id)
    if (qualityDelta !== 0) return qualityDelta
    const leftDifficultyMatch = left.difficulty === targetDifficulty ? 0 : 1
    const rightDifficultyMatch = right.difficulty === targetDifficulty ? 0 : 1
    if (leftDifficultyMatch !== rightDifficultyMatch) return leftDifficultyMatch - rightDifficultyMatch
    return leftAttempts.length - rightAttempts.length
  })

  const questionCount = filters.questionCount ?? 10
  return createSession(
    'practice',
    examTrack,
    'Adaptive practice',
    filters.category && filters.category !== 'All'
      ? `${filters.category} focus with rationale-rich feedback.`
      : 'Mixed practice built around your current weak spots.',
    ranked.slice(0, questionCount).map((question) => question.id),
    {
      questionCount,
      category: filters.category && filters.category !== 'All' ? filters.category : 'Mixed',
      domain: filters.domain ?? 'All',
      system: filters.system ?? 'All',
      board: filters.board ?? 'All',
      questionStatus: filters.questionStatus ?? 'all',
      format: filters.format ?? 'mixed',
      difficulty: filters.difficulty ?? 'adaptive',
      difficultyProfile: filters.difficultyProfile ?? 'mixed',
    },
  )
}

interface TestConfig {
  questionCount: number
  timed: boolean
  noBacktracking: boolean
}

export const generateTestSession = (
  attempts: QuestionAttempt[],
  examTrack: ExamTrackId,
  config: TestConfig,
) => {
  const bank = getExamQuestionBank(examTrack)
  const weaknessByCategory = getWeakAreas(attempts, examTrack)
  const engineScores = getEngineRankScores(bank, getScopedAttempts(attempts, examTrack))
  const prioritized = shuffle(bank).sort((left, right) => {
    const engineDelta = (engineScores[right.id] ?? 0) - (engineScores[left.id] ?? 0)
    if (Math.abs(engineDelta) > 0.05) return engineDelta
    const leftWeight = weaknessByCategory.findIndex((item) => item.category === left.category) + 1
    const rightWeight =
      weaknessByCategory.findIndex((item) => item.category === right.category) + 1
    return leftWeight - rightWeight
  })

  return createSession(
    'test',
    examTrack,
    `${examTrack.toUpperCase()} test mode`,
    config.timed
      ? `${config.questionCount} questions. Timed, mixed, and focused on realistic exam pressure.`
      : `${config.questionCount} questions. Untimed, mixed, and built for exam stamina.`,
    prioritized.slice(0, config.questionCount).map((question) => question.id),
    {
      questionCount: config.questionCount,
      category: 'Mixed',
      format: 'mixed',
      difficulty: 'mixed',
      timed: config.timed,
      noBacktracking: config.noBacktracking,
      timeLimitMinutes: config.timed ? config.questionCount * 1.5 : undefined,
    },
  )
}

export const generateClinicalThinkingSession = (
  attempts: QuestionAttempt[],
  examTrack: ExamTrackId,
  focus: string,
) => {
  const focusTags =
    focus === 'Prioritization'
      ? ['priority', 'who first']
      : focus === 'Delegation'
        ? ['delegation', 'UAP', 'LPN']
        : focus === 'First Action'
          ? ['first action']
          : ['safety', 'priority']

  const filtered = getExamQuestionBank(examTrack).filter((question) =>
    question.tags.some((tag) =>
      focusTags.some((target) => tag.toLowerCase().includes(target.toLowerCase())),
    ),
  )

  const ranked = shuffle(filtered).sort((left, right) => {
    const leftAttempts = attempts.filter((attempt) => attempt.questionId === left.id)
    const rightAttempts = attempts.filter((attempt) => attempt.questionId === right.id)
    return leftAttempts.length - rightAttempts.length
  })

  return createSession(
    'clinical-thinking',
    examTrack,
    `${focus} drill`,
    'Patient-based judgment practice with fast rationale debriefs.',
    ranked.slice(0, 5).map((question) => question.id),
    {
      questionCount: 5,
      category: 'Mixed',
      format: 'mixed',
      difficulty: 'adaptive',
      focus,
    },
  )
}

export const buildStudyPlan = (
  profile: UserProfile,
  weakAreas: WeakAreaInsight[],
): StudyPlan => {
  const examTrack = getProfileExamTrack(profile)
  const topics = getExamStudyPlanTopics(examTrack)
  const today = new Date()
  const examDate = new Date(profile.examDate)
  const daysUntilExam = Math.max(
    7,
    Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const weeks = Math.max(1, Math.ceil(daysUntilExam / 7))
  const sessionMap = {
    steady: 1,
    focused: 2,
    accelerated: 3,
  }

  const topWeak = weakAreas.slice(0, 3).map((area) => area.category)
  const weeklyGoals = Array.from({ length: Math.min(weeks, 4) }, (_, index) => {
    const target = topWeak[index % Math.max(topWeak.length, 1)] ?? topics.weeklyThemes[index % topics.weeklyThemes.length]
    return `Week ${index + 1}: complete ${sessionMap[profile.studyIntensity] * 5} targeted ${examTrack.toUpperCase()} sessions with extra reps in ${target}.`
  })

  return {
    examDate: profile.examDate,
    intensity: profile.studyIntensity,
    weeklyGoals,
    dailyFocus: [
      `Day 1: Quick Study in ${topWeak[0] ?? topics.dailyTopics[0]}`,
      `Day 2: Strategy training + 10 ${examTrack.toUpperCase()} mixed questions`,
      `Day 3: Flashcards for ${topWeak[1] ?? topics.dailyTopics[1] ?? topics.dailyTopics[0]}`,
      `Day 4: ${topics.sessions[0] ?? 'Targeted practice'} drill`,
      `Day 5: ${examTrack.toUpperCase()} test mode for stamina`,
      'Day 6: Review flagged misses and notes',
      'Day 7: Recovery + confidence-building recap',
    ],
    recommendedSessions: [
      `1 ${examTrack.toUpperCase()} quick study session daily before the main study block`,
      '2 targeted practice sets per weak category each week',
      `1 timed ${examTrack.toUpperCase()} mixed test every weekend`,
    ],
  }
}

export const getAnalyticsSnapshot = (
  attempts: QuestionAttempt[],
  profile: UserProfile,
): AnalyticsSnapshot => {
  const examTrack = getProfileExamTrack(profile)
  const analyticsScope = getProfileAnalyticsScope(profile)
  const scopedAttempts = getScopedAttempts(attempts, examTrack, analyticsScope)
  const { diagnoses: engineDiagnoses, remediationEvents: engineRemediationEvents } =
    getEngineEvidenceFromAttempts(scopedAttempts)
  const { masteryVector: learnerMasteryVector, readinessSnapshot } =
    buildEngineLearningSnapshot(engineDiagnoses, engineRemediationEvents)
  const dailyBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const dayAttempts = scopedAttempts.filter(
      (attempt) =>
        startOfDay(new Date(attempt.completedAt)).toISOString() === startOfDay(date).toISOString(),
    )
    return {
      day: label,
      accuracy: dayAttempts.length
        ? dayAttempts.filter((attempt) => attempt.isCorrect).length / dayAttempts.length
        : 0,
      completed: dayAttempts.length,
      confidence: dayAttempts.length
        ? dayAttempts.reduce((sum, attempt) => sum + confidenceScore[attempt.confidence], 0) /
          dayAttempts.length
        : 0,
      mismatch: dayAttempts.length
        ? dayAttempts.filter(
            (attempt) =>
              (!attempt.isCorrect && attempt.confidence === 'high') ||
              (attempt.isCorrect && attempt.confidence === 'low'),
          ).length / dayAttempts.length
        : 0,
    }
  })

  const questionsCompleted = scopedAttempts.length
  const timeStudiedMinutes = Math.round(
    scopedAttempts.reduce((sum, attempt) => sum + attempt.timeSpentSec, 0) / 60,
  )

  return {
    overallAccuracy: questionsCompleted
      ? scopedAttempts.filter((attempt) => attempt.isCorrect).length / questionsCompleted
      : 0,
    categoryStats: getCategoryStats(attempts, examTrack, analyticsScope),
    confidenceTrend: dailyBuckets.map(({ day, confidence, mismatch }) => ({
      day,
      confidence,
      mismatch,
    })),
    dailyAccuracy: dailyBuckets.map(({ day, accuracy, completed }) => ({
      day,
      accuracy,
      completed,
    })),
    questionsCompleted,
    timeStudiedMinutes,
    streak: profile.streak || calculateStreak(scopedAttempts),
    highConfidenceMisses: scopedAttempts.filter(
      (attempt) => !attempt.isCorrect && attempt.confidence === 'high',
    ).length,
    engineDiagnoses,
    engineRemediationEvents,
    learnerMasteryVector,
    readinessSnapshot,
  }
}

export const getQuestionResult = (questionId: string, selectedAnswer: string[]) => {
  const question = questionLookup[questionId]
  if (!question) return false
  return compareAnswers(selectedAnswer, question.correctAnswer)
}

export const getMissReason = (questionId: string, selectedAnswer: string[]) => {
  const question = questionLookup[questionId]
  if (!question) {
    return 'This saved question is no longer available. Rebuild the practice set before using this result for review.'
  }
  const sourceTopic = question.sourceTopic ?? `${question.category} / ${question.subcategory}`
  const selectedLabels = question.choices
    .filter((choice) => selectedAnswer.includes(choice.id))
    .map((choice) => `${choice.id}. ${choice.text}`)

  if (question.testTakingTrap) {
    return `You missed this because the distractor pattern points to: ${question.testTakingTrap} Review ${sourceTopic} and re-answer one similar item before moving on.`
  }

  const selectedText = question.choices
    .filter((choice) => selectedAnswer.includes(choice.id))
    .map((choice) => choice.text.toLowerCase())
    .join(' ')
  const tags = question.tags.join(' ').toLowerCase()
  const haystack = `${selectedText} ${tags} ${question.prompt.toLowerCase()}`

  if (haystack.includes('hypogly') || haystack.includes('hypergly')) {
    return `You missed this because the symptoms of hypoglycemia and hyperglycemia got blended together. Anchor hypoglycemia to rapid onset, sweating, shakiness, and neuro changes. Review ${sourceTopic}.`
  }

  if (haystack.includes('priority') || haystack.includes('who first') || haystack.includes('first')) {
    return `You missed this because the answer choice felt urgent, but the exam wanted the patient or action with the most immediate safety threat. Review ${sourceTopic}.`
  }

  if (haystack.includes('delegation') || haystack.includes('uap') || haystack.includes('lpn')) {
    return `You missed this because role scope got fuzzy. Delegate stable, predictable tasks, but protect assessment, teaching, evaluation, and unstable decisions. Review ${sourceTopic}.`
  }

  if (haystack.includes('med') || haystack.includes('toxicity') || haystack.includes('dose')) {
    return `You missed this because the medication clue mattered more than the diagnosis label. Recheck side effects, toxicity signs, conversions, and hold parameters. Review ${sourceTopic}.`
  }

  if (haystack.includes('fluid') || haystack.includes('electrolyte') || haystack.includes('potassium')) {
    return `You missed this because the trend or lab danger sign was the priority. Ask what can cause dysrhythmia, shock, seizure, or respiratory compromise first. Review ${sourceTopic}.`
  }

  return `You missed this because the stem was testing reasoning, not recall. Re-read for the clue that changes the best answer${selectedLabels.length ? `; your selected answer was ${selectedLabels.join(', ')}` : ''}. Review ${sourceTopic}.`
}

export const getQuestionTutorInsight = (questionId: string) => {
  const question = questionLookup[questionId]
  const sourceTopic = question.sourceTopic ?? `${question.category} / ${question.subcategory}`
  const trustFlags = [
    question.blueprintMapped ? 'Blueprint mapped' : null,
    question.sourceBacked ? 'Source-backed' : null,
    question.contentQuality ? `Status: ${question.contentQuality.replaceAll('-', ' ')}` : null,
    question.updatedAt ? `Updated: ${question.updatedAt}` : null,
  ].filter(Boolean) as string[]

  return {
    sourceTopic,
    trap: question.testTakingTrap ?? 'Look for the distractor that skips the key assessment, safety, or rule-based clue.',
    reviewTarget: `Review ${sourceTopic}`,
    trustFlags,
  }
}

export const getQuestionCategoryBreakdown = (
  questionIds: string[],
  attempts: QuestionAttempt[],
) => {
  const byCategory = new Map<QuestionCategory, { correct: number; total: number }>()
  questionIds.forEach((questionId) => {
    const category = questionLookup[questionId].category
    const result = attempts.find((attempt) => attempt.questionId === questionId)
    const current = byCategory.get(category) ?? { correct: 0, total: 0 }
    byCategory.set(category, {
      correct: current.correct + (result?.isCorrect ? 1 : 0),
      total: current.total + 1,
    })
  })

  return Array.from(byCategory.entries()).map(([category, result]) => ({
    category,
    accuracy: result.total ? result.correct / result.total : 0,
    total: result.total,
  }))
}

export const getSessionAccuracy = (session: ActiveSession) =>
  session.responses.length
    ? session.responses.filter((response) => response.isCorrect).length / session.responses.length
    : 0

export const updateNote = (notes: Note[], note: Note) => {
  const existing = notes.find((entry) => entry.id === note.id)
  if (!existing) return [note, ...notes]
  return notes.map((entry) => (entry.id === note.id ? note : entry))
}

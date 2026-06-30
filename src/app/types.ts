import type {
  AttemptDiagnosis,
  LearnerMasteryVector,
  ReadinessSnapshot,
  RemediationEvent,
} from '../services/question-engine/types'

export type QuestionCategory = string
export type QuestionDifficulty = 'foundation' | 'developing' | 'advanced'
export type QuestionDifficultyProfile = 'standard' | 'hard-mode' | 'trap-heavy' | 'case-based'
export type QuestionFormat = 'multiple-choice' | 'select-all-that-apply'
export type ConfidenceLevel = 'low' | 'medium' | 'high'
export type StudyIntensity = 'steady' | 'focused' | 'accelerated'
export type ExamTrackId = 'nclex-rn' | 'nclex-pn' | 'teas' | 'fnp' | 'ccma'
export type AnalyticsScope = 'selected-track' | 'all-tracks'
export type ContentQualityStatus = 'generated-starter' | 'authored-draft' | 'editor-reviewed' | 'sme-review-ready' | 'sme-reviewed' | 'published'
export type ContentAuthorType = 'system-generated' | 'clinical-editor-draft' | 'sme-authored'
export type ContentVisibility = 'learner' | 'internal'
export type ContentStage = 'standard_bank' | 'beta_draft'
export type ClinicalReviewStatus = 'not_sme_reviewed' | 'sme_reviewed'
export type SourceReviewStatus = 'source_needed' | 'source_mapped' | 'source_checked'
export type SessionMode = 'practice' | 'quick-study' | 'test' | 'clinical-thinking'
export type PracticeSessionStatus = 'active' | 'completed' | 'discarded'
export type MasteryLevel = 'fragile' | 'developing' | 'strong'
export type FlashcardStatus = 'new' | 'needs-review' | 'known'
export type StudyMaterialFileType = 'pdf' | 'docx' | 'txt' | 'md' | 'link'
export type MaterialExtractionStatus = 'extracting' | 'ready' | 'error'
export type MaterialReviewStatus = 'pending-review' | 'approved'
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'
export type TycoonTaskUrgency = 'stable' | 'watch' | 'urgent' | 'critical'
export type TycoonTaskStatus = 'available' | 'completed' | 'deteriorating' | 'failed'
export type TycoonShiftStatus = 'idle' | 'running' | 'finished'
export type TycoonActionScope = 'RN-only' | 'UAP-safe' | 'Provider' | 'Charge RN' | 'System'
export type TycoonUpgradeEffect =
  | 'bed-capacity'
  | 'monitoring'
  | 'med-safety'
  | 'lab-speed'
  | 'staff-energy'
  | 'ehr-speed'
  | 'simulation-bonus'
export type SyncEventType =
  | 'profile'
  | 'attempt'
  | 'note'
  | 'flashcard-review'
  | 'material'
  | 'material-flashcard'
  | 'material-question'
  | 'material-quiz-session'
  | 'practice-session'

export interface AuthUser {
  id: string
  email: string
  name?: string
  nursingSchool?: string
  examTrack?: ExamTrackId
}

export interface AuthSession {
  accessToken: string
  expiresAt?: number
}

export interface SyncEvent {
  id: string
  entityType: SyncEventType
  entityId: string
  operation: 'upsert' | 'delete'
  payload?: unknown
  createdAt: string
  lastError?: string
}

export interface CloudOwnedEntity {
  userId?: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
  syncStatus?: SyncStatus
}

export interface AnswerChoice {
  id: string
  text: string
}

export interface Question {
  id: string
  examTrack: ExamTrackId
  category: QuestionCategory
  domain?: string
  system?: string
  board?: string
  contentQuality?: ContentQualityStatus
  contentFingerprint?: string
  authorType?: ContentAuthorType
  sourceRefs?: string[]
  sourceTopic?: string
  sourceStatus?: SourceReviewStatus
  sourceMapStatus?: string
  clinicalReviewStatus?: ClinicalReviewStatus
  learnerVisible?: boolean
  visibility?: ContentVisibility
  contentStage?: ContentStage
  countsTowardOfficialReadiness?: boolean
  sourceNeededClaims?: string[]
  remediationRouteIds?: string[]
  relatedFlashcardIds?: string[]
  sourcePackId?: string
  fixtureId?: string
  feedbackEnabled?: boolean
  testTakingTrap?: string
  blueprintMapped?: boolean
  sourceBacked?: boolean
  reviewedAt?: string
  updatedAt?: string
  subcategory: string
  difficulty: QuestionDifficulty
  difficultyProfile?: QuestionDifficultyProfile
  format: QuestionFormat
  scenario?: string
  prompt: string
  choices: AnswerChoice[]
  correctAnswer: string[]
  rationale: {
    whyCorrect: string
    whyOthers: string
  }
  nclexTip: string
  clinicalRelevance: string
  tags: string[]
}

export interface QuestionAttempt extends CloudOwnedEntity {
  id: string
  questionId: string
  examTrack?: ExamTrackId
  selectedAnswer: string[]
  isCorrect: boolean
  confidence: ConfidenceLevel
  timeSpentSec: number
  flagged: boolean
  completedAt: string
  sessionType: SessionMode
  sessionId?: string
  engineDiagnosis?: AttemptDiagnosis
  engineRemediationEvents?: RemediationEvent[]
}

export interface CategoryStats {
  category: QuestionCategory
  accuracy: number
  attemptCount: number
  avgConfidence: number
  confidenceMismatchScore: number
  recentTrend: number
  masteryLevel: MasteryLevel
  weaknessScore: number
  flaggedCount: number
}

export interface WeakAreaInsight extends CategoryStats {
  commonMistakes: string[]
  keyConcepts: string[]
  suggestedAction: string
}

export interface StudySession extends CloudOwnedEntity {
  id: string
  mode: SessionMode
  examTrack?: ExamTrackId
  title: string
  subtitle: string
  questionIds: string[]
  startedAt: string
  endedAt?: string
  score?: number
  status?: PracticeSessionStatus
  lastActivityAt?: string
}

export interface ActiveSession extends StudySession {
  currentIndex: number
  config: {
    questionCount: number
    category?: QuestionCategory | 'All' | 'Mixed'
    domain?: string | 'All'
    system?: string | 'All'
    board?: string | 'All'
    questionStatus?: 'unused' | 'incorrect' | 'all'
    format?: QuestionFormat | 'mixed'
    difficulty?: QuestionDifficulty | 'adaptive' | 'mixed'
    difficultyProfile?: QuestionDifficultyProfile | 'mixed'
    timed?: boolean
    noBacktracking?: boolean
    timeLimitMinutes?: number
    focus?: string
  }
  responses: SessionResponse[]
}

export interface SessionResponse {
  questionId: string
  selectedAnswer: string[]
  isCorrect: boolean
  confidence: ConfidenceLevel
  flagged: boolean
  submittedAt: string
  timeSpentSec: number
}

export interface Flashcard {
  id: string
  category: QuestionCategory | 'Strategy'
  examTrack?: ExamTrackId
  sourceTopic?: string
  sourceRefs?: string[]
  contentQuality?: ContentQualityStatus
  front: string
  back: string
  status: FlashcardStatus
}

export interface FlashcardReviewState {
  status: FlashcardStatus
  lastReviewedAt?: string
  nextReviewAt?: string
  lapses: number
  intervalDays: number
}

export interface MaterialAsset {
  id: string
  materialId: string
  title: string
  content: string
  order: number
}

export interface StudyMaterial extends CloudOwnedEntity {
  id: string
  filename: string
  displayTitle: string
  fileType: StudyMaterialFileType
  sourceUrl?: string
  storagePath?: string
  importedAt: string
  extractionStatus: MaterialExtractionStatus
  reviewStatus?: MaterialReviewStatus
  textLength: number
  tags: string[]
  sourceCategory?: QuestionCategory | 'General'
  error?: string
  preview: string
  assets: MaterialAsset[]
  generatedFlashcardIds: string[]
  generatedQuestionIds: string[]
  pendingFlashcards?: MaterialFlashcard[]
  pendingQuestions?: MaterialQuestion[]
}

export interface MaterialFlashcard extends CloudOwnedEntity {
  id: string
  sourceMaterialId: string
  sourceTitle: string
  front: string
  back: string
  status: FlashcardStatus
  createdAt: string
}

export interface MaterialQuestion extends CloudOwnedEntity {
  id: string
  sourceMaterialId: string
  sourceTitle: string
  prompt: string
  choices: AnswerChoice[]
  correctAnswer: string[]
  rationale: string
  createdAt: string
}

export interface GeneratedFromMaterialSessionConfig {
  materialId: string
  questionCount: number
  title: string
}

export interface MaterialQuizResponse {
  questionId: string
  selectedAnswer: string[]
  isCorrect: boolean
  submittedAt: string
}

export interface MaterialQuizSession extends CloudOwnedEntity {
  id: string
  materialId: string
  title: string
  questionIds: string[]
  startedAt: string
  currentIndex: number
  responses: MaterialQuizResponse[]
  endedAt?: string
  score?: number
}

export interface TycoonActionChoice {
  id: string
  label: string
  description: string
  scope: TycoonActionScope
  feedback: string
  clinicalReason: string
  energyCost?: number
}

export interface TycoonTask {
  id: string
  patientId: string
  patientName: string
  room: string
  title: string
  category:
    | 'vitals'
    | 'medication-check'
    | 'patient-education'
    | 'prioritization'
    | 'documentation'
    | 'infection-control'
    | 'delegation'
  safetyRisk: TycoonTaskUrgency
  status: TycoonTaskStatus
  rewardMoney: number
  rewardXp: number
  rewardReputation: number
  rewardSafety: number
  timeCost: number
  deadlineMinute: number
  correctActionId: string
  unsafePenalty: {
    money: number
    reputation: number
    patientSafety: number
    staffEnergy?: number
  }
  actions: TycoonActionChoice[]
  mapPosition: {
    x: number
    y: number
  }
}

export interface TycoonUpgrade {
  id: string
  name: string
  description: string
  cost: number
  effectType: TycoonUpgradeEffect
  effectValue: number
  maxLevel: number
}

export interface TycoonUnit {
  id: string
  name: string
  description: string
  unlockRequirement: string
  basePatients: number
  availableTaskIds: string[]
  availableUpgradeIds: string[]
}

export interface TycoonShiftEvent {
  id: string
  minute: number
  type: 'reward' | 'penalty' | 'deterioration' | 'upgrade' | 'shift'
  title: string
  message: string
  taskId?: string
}

export interface TycoonPayoutSummary {
  completedTasks: number
  mistakes: number
  safetyScore: number
  moneyEarned: number
  xpEarned: number
  reputationChange: number
  recommendation: string
}

export interface TycoonShift {
  id: string
  unitId: string
  startedAt: string
  endedAt?: string
  shiftMinute: number
  tasks: TycoonTask[]
  events: TycoonShiftEvent[]
  status: TycoonShiftStatus
  payoutSummary?: TycoonPayoutSummary
}

export interface TycoonGameState {
  money: number
  xp: number
  level: number
  reputation: number
  patientSafety: number
  staffEnergy: number
  currentUnitId: string
  unlockedUnitIds: string[]
  upgrades: Record<string, number>
  activeShift: TycoonShift | null
  completedShifts: TycoonShift[]
  selectedTaskId: string | null
}

export type SimulatorLevelId =
  | 'level-1'
  | 'level-2'
  | 'level-3'
  | 'level-4'
  | 'level-5'
  | 'level-6'

export interface SimulatorLevelAttempt {
  id: string
  levelId: SimulatorLevelId
  totalScore: number
  safetyScore: number
  completedObjectives: number
  totalObjectives: number
  passed: boolean
  perfect: boolean
  completedAt: string
}

export interface SimulatorProgressState {
  currentSimulatorLevel: SimulatorLevelId
  unlockedSimulatorLevels: SimulatorLevelId[]
  levelAttempts: SimulatorLevelAttempt[]
  bestLevelScores: Record<string, number>
  completedLevelObjectives: Record<string, string[]>
}

export interface StrategyLesson {
  id: string
  title: string
  framework: string
  summary: string
  bullets: string[]
  microScenario: {
    prompt: string
    bestResponse: string
  }
}

export interface StudyPlan {
  examDate: string
  intensity: StudyIntensity
  weeklyGoals: string[]
  dailyFocus: string[]
  recommendedSessions: string[]
}

export interface UserProfile extends CloudOwnedEntity {
  name: string
  nursingSchool?: string
  state?: string
  memberNumber?: number
  directoryVisible?: boolean
  profileImageDataUrl?: string
  examTrack: ExamTrackId
  examDate: string
  studyIntensity: StudyIntensity
  dailyGoal: number
  streak: number
  preferences: {
    reducedMotion: boolean
    notifications: boolean
    analyticsScope: AnalyticsScope
  }
}

export interface Note extends CloudOwnedEntity {
  id: string
  title: string
  body: string
  category: QuestionCategory | 'General'
  updatedAt: string
}

export interface Recommendation {
  title: string
  description: string
  actionLabel: string
  route: string
  variant: 'focus' | 'warning' | 'success'
}

export interface DashboardState {
  todayCompleted: number
  dailyGoal: number
  weakestCategories: WeakAreaInsight[]
  recommendation: Recommendation
  motivationalInsight: string
  recentAccuracy: number
  streak: number
}

export interface AnalyticsSnapshot {
  overallAccuracy: number
  categoryStats: CategoryStats[]
  confidenceTrend: Array<{ day: string; confidence: number; mismatch: number }>
  dailyAccuracy: Array<{ day: string; accuracy: number; completed: number }>
  questionsCompleted: number
  timeStudiedMinutes: number
  streak: number
  highConfidenceMisses: number
  engineDiagnoses: AttemptDiagnosis[]
  engineRemediationEvents: RemediationEvent[]
  learnerMasteryVector: LearnerMasteryVector
  readinessSnapshot: ReadinessSnapshot
}

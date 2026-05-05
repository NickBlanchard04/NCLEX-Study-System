export type QuestionCategory = string
export type QuestionDifficulty = 'foundation' | 'developing' | 'advanced'
export type QuestionFormat = 'multiple-choice' | 'select-all-that-apply'
export type ConfidenceLevel = 'low' | 'medium' | 'high'
export type StudyIntensity = 'steady' | 'focused' | 'accelerated'
export type ExamTrackId = 'nclex-rn' | 'nclex-pn' | 'fnp' | 'ccma'
export type AnalyticsScope = 'selected-track' | 'all-tracks'
export type ContentQualityStatus = 'generated-starter' | 'authored-draft' | 'sme-review-ready' | 'sme-reviewed'
export type ContentAuthorType = 'system-generated' | 'clinical-editor-draft' | 'sme-authored'
export type SessionMode = 'practice' | 'quick-study' | 'test' | 'clinical-thinking'
export type MasteryLevel = 'fragile' | 'developing' | 'strong'
export type FlashcardStatus = 'new' | 'needs-review' | 'known'
export type StudyMaterialFileType = 'pdf' | 'docx' | 'txt' | 'md' | 'link'
export type MaterialExtractionStatus = 'extracting' | 'ready' | 'error'
export type MaterialReviewStatus = 'pending-review' | 'approved'
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'
export type SyncEventType =
  | 'profile'
  | 'attempt'
  | 'note'
  | 'flashcard-review'
  | 'material'
  | 'material-flashcard'
  | 'material-question'
  | 'material-quiz-session'

export interface AuthUser {
  id: string
  email: string
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
  authorType?: ContentAuthorType
  sourceRefs?: string[]
  subcategory: string
  difficulty: QuestionDifficulty
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

export interface StudySession {
  id: string
  mode: SessionMode
  title: string
  subtitle: string
  questionIds: string[]
  startedAt: string
  endedAt?: string
  score?: number
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
}

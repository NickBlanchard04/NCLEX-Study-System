import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActiveSession,
  AuthSession,
  AuthUser,
  ConfidenceLevel,
  FlashcardReviewState,
  FlashcardStatus,
  GeneratedFromMaterialSessionConfig,
  MaterialFlashcard,
  MaterialQuestion,
  MaterialQuizSession,
  Note,
  QuestionAttempt,
  QuestionCategory,
  SimulatorLevelAttempt,
  SimulatorLevelId,
  SimulatorProgressState,
  StudyIntensity,
  StudyMaterial,
  SyncEvent,
  SyncStatus,
  TycoonGameState,
  UserProfile,
} from './types'
import type { BetaTermsConsent } from './beta-terms'
import { initialProfile, seededAttempts, seededFlashcardProgress, seededNotes } from '../data/seed'
import {
  deleteMaterialBundle,
  getMaterialFlashcards,
  getMaterialLibrary,
  getMaterialQuestions,
  saveMaterialBundle,
  updateMaterialFlashcard,
  updateStudyMaterialMeta as persistMaterialMeta,
} from '../services/material-db'
import {
  generateClinicalThinkingSession,
  generatePracticeSet,
  generateQuickStudySession,
  generateTestSession,
  getQuestionResult,
  questionLookup,
  updateNote,
} from '../services/study-system'
import { createAttemptEngineEvidence } from '../services/question-engine'
import { filterMaterialStudyTools } from '../services/material-quality'
import { generateMaterialToolsWithAi } from '../services/material-ai'
import {
  getCurrentAuthSnapshot,
  onAuthSnapshotChange,
  requestPasswordReset,
  signInWithPassword,
  signOutCurrentUser,
  signUpWithPassword,
  updateCurrentUserPassword,
} from '../services/auth-service'
import {
  deleteMaterialCloud,
  loadCloudState,
  saveAttempts,
  saveFlashcardReviews,
  saveMaterials,
  saveNotes,
  saveProfile,
  saveSyncEvents,
  uploadMaterialFile,
} from '../services/cloud-repositories'
import { trackAppEvent } from '../services/analytics-client'
import { isSupabaseConfigured } from '../services/supabase'
import { getSafeErrorCopy, reportSafeError } from '../services/safe-errors'
import {
  advanceTycoonShiftTime,
  completeTycoonTaskWithAction,
  createInitialTycoonState,
  finishTycoonShiftNow,
  purchaseTycoonUpgradeById,
  selectTycoonTaskById,
  startTycoonShiftForUnit,
} from '../services/tycoon-engine'

interface StudySystemState {
  authUser: AuthUser | null
  authSession: AuthSession | null
  authInitialized: boolean
  authConfigured: boolean
  authError: string | null
  passwordRecoveryRequired: boolean
  isDemoMode: boolean
  syncStatus: SyncStatus
  syncError: string | null
  syncEvents: SyncEvent[]
  migrationPromptVisible: boolean
  profile: UserProfile
  attempts: QuestionAttempt[]
  notes: Note[]
  flashcardProgress: Record<string, FlashcardStatus>
  flashcardReview: Record<string, FlashcardReviewState>
  materials: StudyMaterial[]
  materialFlashcards: MaterialFlashcard[]
  materialQuestions: MaterialQuestion[]
  materialsHydrated: boolean
  preferredMaterialFlashcardsId: null | string
  activeSession: ActiveSession | null
  activeMaterialQuizSession: MaterialQuizSession | null
  tycoon: TycoonGameState
  simulatorProgress: SimulatorProgressState
  initializeAuth: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    profile: Pick<UserProfile, 'name' | 'nursingSchool'> & { examTrack?: UserProfile['examTrack'] },
    betaTermsConsent?: BetaTermsConsent,
  ) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  continueAsDemo: () => void
  hydrateCloudState: () => Promise<void>
  migrateLocalDataToCloud: () => Promise<void>
  dismissMigrationPrompt: () => void
  syncNow: () => Promise<void>
  initializeMaterials: () => Promise<void>
  startQuickStudy: (category?: QuestionCategory) => void
  startPracticeSession: (filters: {
    category?: QuestionCategory | 'All'
    domain?: string | 'All'
    system?: string | 'All'
    board?: string | 'All'
    questionStatus?: 'unused' | 'incorrect' | 'all'
    format?: 'multiple-choice' | 'select-all-that-apply' | 'mixed'
    difficulty?: 'foundation' | 'developing' | 'advanced' | 'adaptive' | 'mixed'
    difficultyProfile?: 'standard' | 'hard-mode' | 'trap-heavy' | 'case-based' | 'mixed'
    questionCount?: number
  }) => void
  startTestSession: (config: {
    questionCount: number
    timed: boolean
    noBacktracking: boolean
  }) => void
  startClinicalThinking: (focus: string) => void
  goToSessionQuestion: (index: number) => void
  submitCurrentResponse: (payload: {
    selectedAnswer: string[]
    confidence: ConfidenceLevel
    flagged: boolean
    timeSpentSec: number
  }) => void
  nextQuestion: () => void
  previousQuestion: () => void
  finishSession: () => void
  abandonSession: () => void
  updateFlashcardStatus: (id: string, status: FlashcardStatus) => void
  updateMaterialFlashcardStatus: (id: string, status: FlashcardStatus) => Promise<void>
  importStudyMaterial: (file: File) => Promise<void>
  importStudyMaterialFromUrl: (url: string) => Promise<void>
  deleteStudyMaterial: (id: string) => Promise<void>
  updateStudyMaterialMeta: (id: string, updates: Partial<StudyMaterial>) => Promise<void>
  regenerateMaterialStudyTools: (id: string) => Promise<void>
  approveMaterialStudyTools: (
    id: string,
    flashcards: MaterialFlashcard[],
    questions: MaterialQuestion[],
  ) => Promise<void>
  startMaterialFlashcards: (materialId: string) => void
  clearMaterialFlashcardsPreference: () => void
  startMaterialQuiz: (
    materialId: string,
    config?: Partial<GeneratedFromMaterialSessionConfig>,
  ) => void
  submitMaterialQuizResponse: (questionId: string, selectedAnswer: string[]) => void
  nextMaterialQuizQuestion: () => void
  previousMaterialQuizQuestion: () => void
  finishMaterialQuiz: () => void
  abandonMaterialQuiz: () => void
  saveNote: (note: Note) => void
  deleteNote: (id: string) => void
  updateProfile: (updates: Partial<UserProfile>) => void
  setExamDate: (examDate: string) => void
  setStudyIntensity: (studyIntensity: StudyIntensity) => void
  startTycoonShift: (unitId: string) => void
  selectTycoonTask: (taskId: string) => void
  completeTycoonTask: (taskId: string, actionId: string) => void
  advanceTycoonTime: (minutes: number) => void
  purchaseTycoonUpgrade: (upgradeId: string) => void
  finishTycoonShift: () => void
  resetTycoonProgress: () => void
  selectSimulatorLevel: (levelId: SimulatorLevelId) => void
  recordSimulatorLevelAttempt: (attempt: SimulatorLevelAttempt, completedObjectiveIds: string[]) => void
  resetSimulatorProgress: () => void
  resetProgress: () => Promise<void>
}

const simulatorLevelOrder: SimulatorLevelId[] = [
  'level-1',
  'level-2',
  'level-3',
  'level-4',
  'level-5',
  'level-6',
]

const loadMaterialPipeline = () => import('../services/material-pipeline')

type MaterialPipelineModule = Awaited<ReturnType<typeof loadMaterialPipeline>>

const generateReviewReadyMaterialTools = async (
  material: StudyMaterial,
  pipeline: Pick<
    MaterialPipelineModule,
    'generateCleanFlashcardsFromMaterial' | 'generateCleanQuestionsFromMaterial'
  >,
) => {
  const aiTools = await generateMaterialToolsWithAi(material).catch((error) => {
    reportSafeError('material-ai-generation', error)
    return null
  })
  const localFlashcards = pipeline.generateCleanFlashcardsFromMaterial(material)
  const localQuestions = pipeline.generateCleanQuestionsFromMaterial(material, localFlashcards)
  const localTools = filterMaterialStudyTools(localFlashcards, localQuestions)

  if (!aiTools?.flashcards.length && !aiTools?.questions.length) {
    return localTools
  }

  const aiToolsAfterReview = filterMaterialStudyTools(aiTools.flashcards, aiTools.questions)
  const aiHasEnoughCards =
    aiToolsAfterReview.flashcards.length >= Math.min(3, Math.max(1, localTools.flashcards.length))
  const aiHasEnoughQuestions =
    aiToolsAfterReview.questions.length >= Math.min(2, Math.max(1, localTools.questions.length))

  return aiHasEnoughCards && aiHasEnoughQuestions ? aiToolsAfterReview : localTools
}

const createInitialSimulatorProgress = (): SimulatorProgressState => ({
  currentSimulatorLevel: 'level-1',
  unlockedSimulatorLevels: ['level-1'],
  levelAttempts: [],
  bestLevelScores: {},
  completedLevelObjectives: {},
})

const createDefaultExamDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 56)
  return date.toISOString().slice(0, 10)
}

const createFreshProfile = ({
  email,
  name,
  nursingSchool,
  examTrack,
}: {
  email: string
  name?: string
  nursingSchool?: string
  examTrack?: UserProfile['examTrack']
}): UserProfile => ({
  name: name?.trim() || email.split('@')[0] || 'New learner',
  nursingSchool: nursingSchool?.trim() || undefined,
  directoryVisible: true,
  examTrack: examTrack ?? 'nclex-rn',
  examDate: createDefaultExamDate(),
  studyIntensity: 'focused',
  dailyGoal: 15,
  streak: 0,
  preferences: {
    reducedMotion: false,
    notifications: true,
    analyticsScope: 'selected-track',
  },
})

const createFreshProfileForAuthUser = (user: AuthUser) => {
  const authMetadataIsSeeded =
    user.name === initialProfile.name &&
    user.nursingSchool === initialProfile.nursingSchool &&
    user.examTrack === initialProfile.examTrack

  return createFreshProfile({
    email: user.email,
    name: authMetadataIsSeeded ? undefined : user.name,
    nursingSchool: authMetadataIsSeeded ? undefined : user.nursingSchool,
    examTrack: user.examTrack,
  })
}

const createCleanAccountState = (profile: UserProfile) => ({
  profile,
  attempts: [] as QuestionAttempt[],
  notes: [] as Note[],
  flashcardProgress: {} as Record<string, FlashcardStatus>,
  flashcardReview: {} as Record<string, FlashcardReviewState>,
  materials: [] as StudyMaterial[],
  materialFlashcards: [] as MaterialFlashcard[],
  materialQuestions: [] as MaterialQuestion[],
  materialsHydrated: true,
  activeSession: null as ActiveSession | null,
  activeMaterialQuizSession: null as MaterialQuizSession | null,
  preferredMaterialFlashcardsId: null as null | string,
  tycoon: createInitialTycoonState(),
  simulatorProgress: createInitialSimulatorProgress(),
  syncEvents: [] as SyncEvent[],
  migrationPromptVisible: false,
})

const isSeedProfile = (profile: UserProfile | null | undefined) =>
  profile?.name === initialProfile.name &&
  profile.nursingSchool === initialProfile.nursingSchool &&
  profile.examTrack === initialProfile.examTrack

const findRunnableMaterialQuizSession = (
  sessions: MaterialQuizSession[],
  materials: StudyMaterial[],
  questions: MaterialQuestion[],
) => {
  const materialIds = new Set(materials.map((material) => material.id))
  const questionIds = new Set(questions.map((question) => question.id))

  return (
    sessions.find((session) => {
      if (!materialIds.has(session.materialId)) return false
      if (session.endedAt) return true

      const currentQuestionId = session.questionIds[session.currentIndex]
      return Boolean(currentQuestionId && questionIds.has(currentQuestionId))
    }) ?? null
  )
}

const baseState = {
  authUser: null as AuthUser | null,
  authSession: null as AuthSession | null,
  authInitialized: false,
  authConfigured: isSupabaseConfigured,
  authError: null as string | null,
  passwordRecoveryRequired: false,
  isDemoMode: false,
  syncStatus: 'idle' as SyncStatus,
  syncError: null as string | null,
  syncEvents: [] as SyncEvent[],
  migrationPromptVisible: false,
  profile: initialProfile,
  attempts: seededAttempts,
  notes: seededNotes,
  flashcardProgress: seededFlashcardProgress,
  flashcardReview: {} as Record<string, FlashcardReviewState>,
  materials: [] as StudyMaterial[],
  materialFlashcards: [] as MaterialFlashcard[],
  materialQuestions: [] as MaterialQuestion[],
  materialsHydrated: false,
  preferredMaterialFlashcardsId: null as null | string,
  activeSession: null as ActiveSession | null,
  activeMaterialQuizSession: null as MaterialQuizSession | null,
  tycoon: createInitialTycoonState(),
  simulatorProgress: createInitialSimulatorProgress(),
}

const getNextReviewState = (
  previous: FlashcardReviewState | undefined,
  status: FlashcardStatus,
): FlashcardReviewState => {
  const now = new Date()
  const lapses = status === 'needs-review' ? (previous?.lapses ?? 0) + 1 : previous?.lapses ?? 0
  const intervalDays =
    status === 'known'
      ? Math.max(1, (previous?.intervalDays ?? 0) * 2 || 1)
      : status === 'needs-review' && lapses >= 2
        ? 1
        : 0
  const nextReview = new Date(now)

  if (status === 'known') {
    nextReview.setDate(nextReview.getDate() + intervalDays)
  } else if (status === 'needs-review' && lapses >= 2) {
    nextReview.setDate(nextReview.getDate() + 1)
  } else {
    nextReview.setHours(nextReview.getHours() + 3)
  }

  return {
    status,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextReview.toISOString(),
    lapses,
    intervalDays,
  }
}

const makeSyncEvent = (
  entityType: SyncEvent['entityType'],
  entityId: string,
  operation: SyncEvent['operation'] = 'upsert',
  payload?: unknown,
): SyncEvent => ({
  id: crypto.randomUUID(),
  entityType,
  entityId,
  operation,
  payload,
  createdAt: new Date().toISOString(),
})

export const useStudySystemStore = create<StudySystemState>()(
  persist(
    (set, get) => ({
      ...baseState,
      initializeAuth: async () => {
        if (get().authInitialized) return

        if (!isSupabaseConfigured) {
          set({
            authConfigured: false,
            authInitialized: true,
            isDemoMode: false,
            syncStatus: 'idle',
          })
          return
        }

        try {
          const snapshot = await getCurrentAuthSnapshot()
          set({
            ...(snapshot.user ? createCleanAccountState(createFreshProfileForAuthUser(snapshot.user)) : {}),
            authUser: snapshot.user,
            authSession: snapshot.session,
            authConfigured: true,
            authInitialized: true,
            isDemoMode: false,
            authError: null,
            passwordRecoveryRequired: snapshot.event === 'PASSWORD_RECOVERY' && Boolean(snapshot.user),
          })

          onAuthSnapshotChange((nextSnapshot) => {
            const shouldPrepareCleanAccount =
              Boolean(nextSnapshot.user) &&
              (nextSnapshot.event === 'SIGNED_IN' || nextSnapshot.event === 'PASSWORD_RECOVERY')
            set({
              ...(shouldPrepareCleanAccount && nextSnapshot.user
                ? createCleanAccountState(createFreshProfileForAuthUser(nextSnapshot.user))
                : {}),
              authUser: nextSnapshot.user,
              authSession: nextSnapshot.session,
              isDemoMode: false,
              passwordRecoveryRequired:
                nextSnapshot.event === 'PASSWORD_RECOVERY'
                  ? true
                  : nextSnapshot.user
                    ? get().passwordRecoveryRequired
                    : false,
            })
            if (nextSnapshot.user) {
              void get().hydrateCloudState()
            }
          })

          if (snapshot.user) {
            await get().hydrateCloudState()
          }
        } catch (error) {
          reportSafeError('auth-initialize', error)
          set({
            authInitialized: true,
            authError: getSafeErrorCopy('auth-initialize'),
            isDemoMode: false,
          })
        }
      },
      signIn: async (email, password) => {
        set({ authError: null, syncStatus: 'syncing' })
        try {
          const snapshot = await signInWithPassword(email, password)
          if (!snapshot.user) {
            throw new Error('Could not sign in.')
          }
          set({
            ...createCleanAccountState(createFreshProfileForAuthUser(snapshot.user)),
            authUser: snapshot.user,
            authSession: snapshot.session,
            isDemoMode: false,
            authError: null,
            passwordRecoveryRequired: false,
          })
          await get().hydrateCloudState()
        } catch (error) {
          reportSafeError('auth-sign-in', error)
          set({
            authError: getSafeErrorCopy('auth-sign-in'),
            syncStatus: 'error',
          })
          throw error
        }
      },
      signUp: async (email, password, profileInput, betaTermsConsent) => {
        set({ authError: null, syncStatus: 'syncing' })
        const freshProfile = createFreshProfile({
          email,
          name: profileInput.name,
          nursingSchool: profileInput.nursingSchool,
          examTrack: profileInput.examTrack,
        })
        try {
          const snapshot = await signUpWithPassword(email, password, freshProfile, betaTermsConsent)
          void trackAppEvent(
            'signup_completed',
            {
              page_path: '/',
              exam_track: freshProfile.examTrack,
              feature_name: 'Beta Account',
            },
            { userId: snapshot.user?.id, isDemoUser: false },
          )
          if (!snapshot.user || !snapshot.session) {
            set({
              ...createCleanAccountState(freshProfile),
              authUser: null,
              authSession: null,
              isDemoMode: false,
              authError: null,
              syncStatus: 'idle',
              passwordRecoveryRequired: false,
            })
            return
          }

          set({
            ...createCleanAccountState(freshProfile),
            authUser: snapshot.user,
            authSession: snapshot.session,
            isDemoMode: false,
            authError: null,
            passwordRecoveryRequired: false,
          })
          if (snapshot.user) {
            await saveProfile(snapshot.user.id, freshProfile)
            set({ syncStatus: 'idle', syncError: null })
          }
        } catch (error) {
          reportSafeError('auth-sign-up', error)
          set({
            authError: getSafeErrorCopy('auth-sign-up'),
            syncStatus: 'error',
          })
          throw error
        }
      },
      signOut: async () => {
        try {
          if (get().authUser) {
            await get().syncNow()
          }
          await signOutCurrentUser()
        } finally {
          const signedOutProfile = createFreshProfile({
            email: 'learner@example.com',
            name: 'New learner',
          })
          set({
            ...createCleanAccountState(signedOutProfile),
            authUser: null,
            authSession: null,
            authInitialized: true,
            authConfigured: isSupabaseConfigured,
            isDemoMode: false,
            syncStatus: 'idle',
            syncError: null,
            authError: null,
            migrationPromptVisible: false,
            passwordRecoveryRequired: false,
          })
        }
      },
      requestPasswordReset: async (email) => {
        set({ authError: null })
        try {
          await requestPasswordReset(email)
        } catch (error) {
          reportSafeError('auth-reset-password', error)
          set({ authError: getSafeErrorCopy('auth-reset-password') })
          throw error
        }
      },
      updatePassword: async (password) => {
        set({ authError: null, syncStatus: 'syncing' })
        try {
          await updateCurrentUserPassword(password)
          set({
            authError: null,
            passwordRecoveryRequired: false,
            syncStatus: 'idle',
          })
        } catch (error) {
          reportSafeError('auth-update-password', error)
          set({
            authError: getSafeErrorCopy('auth-update-password'),
            syncStatus: 'error',
          })
          throw error
        }
      },
      continueAsDemo: () => {
        const state = get()
        void trackAppEvent(
          'demo_started',
          {
            page_path: '/',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            feature_name: 'Local Demo',
            is_demo_user: true,
          },
          { userId: state.authUser?.id, isDemoUser: true },
        )
        set({
          authInitialized: true,
          authConfigured: isSupabaseConfigured,
          isDemoMode: false,
          authError: 'Local demo access is disabled during open beta. Please sign in or create a cloud account.',
          migrationPromptVisible: false,
        })
      },
      hydrateCloudState: async () => {
        const user = get().authUser
        if (!user) return
        set({ syncStatus: 'syncing', syncError: null })
        try {
          const cloud = await loadCloudState(user.id)
          const cloudHasLearningData =
            cloud.attempts.length > 0 ||
            cloud.notes.length > 0 ||
            Object.keys(cloud.flashcardReview).length > 0 ||
            cloud.materials.length > 0 ||
            cloud.materialFlashcards.length > 0 ||
            cloud.materialQuestions.length > 0 ||
            cloud.materialQuizSessions.length > 0
          const cloudProfileIsSeeded = isSeedProfile(cloud.profile)
          const cloudHasData = Boolean(cloud.profile && !cloudProfileIsSeeded) || cloudHasLearningData

          if (!cloudHasData) {
            const freshProfile = createFreshProfileForAuthUser(user)
            set({
              ...createCleanAccountState(freshProfile),
              syncStatus: 'idle',
              syncError: null,
            })
            await saveProfile(user.id, freshProfile)
            return
          }

          const profile = cloudProfileIsSeeded
            ? createFreshProfileForAuthUser(user)
            : cloud.profile ?? createFreshProfileForAuthUser(user)

          set((state) => ({
            ...createCleanAccountState(profile),
            attempts: cloud.attempts,
            notes: cloud.notes,
            flashcardReview: cloud.flashcardReview,
            flashcardProgress: Object.fromEntries(
              Object.entries(cloud.flashcardReview).map(([id, review]) => [id, review.status]),
            ),
            materials: cloud.materials,
            materialFlashcards: cloud.materialFlashcards,
            materialQuestions: cloud.materialQuestions,
            activeMaterialQuizSession: findRunnableMaterialQuizSession(
              cloud.materialQuizSessions,
              cloud.materials,
              cloud.materialQuestions,
            ),
            passwordRecoveryRequired: state.passwordRecoveryRequired,
            syncStatus: 'idle',
            syncError: null,
            migrationPromptVisible: false,
          }))
          if (cloudProfileIsSeeded) {
            await saveProfile(user.id, profile)
          }
        } catch (error) {
          reportSafeError('cloud-hydrate', error)
          set({
            syncStatus: navigator.onLine ? 'error' : 'offline',
            syncError: getSafeErrorCopy('cloud-hydrate'),
          })
        }
      },
      migrateLocalDataToCloud: async () => {
        const user = get().authUser
        if (!user) return
        await get().syncNow()
        set({ migrationPromptVisible: false })
      },
      dismissMigrationPrompt: () => set({ migrationPromptVisible: false }),
      syncNow: async () => {
        const state = get()
        const user = state.authUser
        if (!user || state.isDemoMode || !isSupabaseConfigured) return

        set({ syncStatus: 'syncing', syncError: null })
        try {
          await Promise.all([
            saveProfile(user.id, state.profile),
            saveAttempts(user.id, state.attempts),
            saveNotes(user.id, state.notes),
            saveFlashcardReviews(user.id, state.flashcardReview),
            saveMaterials(
              user.id,
              state.materials,
              state.materialFlashcards,
              state.materialQuestions,
              state.activeMaterialQuizSession,
            ),
            saveSyncEvents(user.id, state.syncEvents),
          ])
          set({ syncStatus: 'idle', syncError: null, syncEvents: [] })
        } catch (error) {
          reportSafeError('cloud-sync', error)
          set((current) => ({
            syncStatus: navigator.onLine ? 'error' : 'offline',
            syncError: getSafeErrorCopy('cloud-sync'),
            syncEvents: current.syncEvents.length
              ? current.syncEvents
              : [makeSyncEvent('profile', user.id, 'upsert', current.profile)],
          }))
        }
      },
      initializeMaterials: async () => {
        if (get().materialsHydrated) return
        if (isSupabaseConfigured && !get().isDemoMode) {
          set({ materialsHydrated: true })
          return
        }
        const [materials, materialFlashcards, materialQuestions] = await Promise.all([
          getMaterialLibrary(),
          getMaterialFlashcards(),
          getMaterialQuestions(),
        ])

        let nextMaterials = materials
        let nextFlashcards = materialFlashcards
        let nextQuestions = materialQuestions
        const {
          generateCleanFlashcardsFromMaterial,
          generateCleanQuestionsFromMaterial,
          materialNeedsRepair,
          repairStudyMaterialContent,
        } = await loadMaterialPipeline()
        const repairs = materials.filter((material) => materialNeedsRepair(material, materialFlashcards))

        for (const material of repairs) {
          const repairedMaterial = repairStudyMaterialContent(material)
          const { flashcards, questions } = await generateReviewReadyMaterialTools(repairedMaterial, {
            generateCleanFlashcardsFromMaterial,
            generateCleanQuestionsFromMaterial,
          })
          const nextMaterial = {
            ...repairedMaterial,
            generatedFlashcardIds: flashcards.map((item) => item.id),
            generatedQuestionIds: questions.map((item) => item.id),
          }

          await saveMaterialBundle({
            material: nextMaterial,
            flashcards,
            questions,
          })

          nextMaterials = nextMaterials.map((item) => (item.id === material.id ? nextMaterial : item))
          nextFlashcards = [
            ...flashcards,
            ...nextFlashcards.filter((item) => item.sourceMaterialId !== material.id),
          ]
          nextQuestions = [
            ...questions,
            ...nextQuestions.filter((item) => item.sourceMaterialId !== material.id),
          ]
        }

        if (isSupabaseConfigured && !get().isDemoMode) {
          set({ materialsHydrated: true })
          return
        }

        set({
          materials: nextMaterials,
          materialFlashcards: nextFlashcards,
          materialQuestions: nextQuestions,
          materialsHydrated: true,
        })
      },
      startQuickStudy: (category) => {
        const state = get()
        void trackAppEvent(
          'quiz_started',
          {
            page_path: '/quick-study',
            feature_name: 'Quick Study',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            question_category: category,
            is_demo_user: state.isDemoMode,
          },
          { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
        )
        set((state) => ({
          activeSession: generateQuickStudySession(state.attempts, state.profile.examTrack ?? 'nclex-rn', category),
        }))
      },
      startPracticeSession: (filters) => {
        const state = get()
        void trackAppEvent(
          'quiz_started',
          {
            page_path: '/practice-questions',
            feature_name: 'Question Bank',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            question_category: typeof filters.category === 'string' ? filters.category : undefined,
            is_demo_user: state.isDemoMode,
          },
          { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
        )
        set((state) => ({
          activeSession: generatePracticeSet(state.attempts, state.profile.examTrack ?? 'nclex-rn', filters),
        }))
      },
      startTestSession: (config) => {
        const state = get()
        void trackAppEvent(
          'quiz_started',
          {
            page_path: '/test-mode',
            feature_name: 'Test Mode',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            is_demo_user: state.isDemoMode,
            metadata: {
              question_count: config.questionCount,
              timed: config.timed,
              no_backtracking: config.noBacktracking,
            },
          },
          { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
        )
        set((state) => ({
          activeSession: generateTestSession(state.attempts, state.profile.examTrack ?? 'nclex-rn', config),
        }))
      },
      startClinicalThinking: (focus) => {
        const state = get()
        void trackAppEvent(
          'quiz_started',
          {
            page_path: '/clinical-simulator',
            feature_name: 'Clinical Thinking',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            question_category: focus,
            is_demo_user: state.isDemoMode,
          },
          { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
        )
        set((state) => ({
          activeSession: generateClinicalThinkingSession(state.attempts, state.profile.examTrack ?? 'nclex-rn', focus),
        }))
      },
      goToSessionQuestion: (index) =>
        set((state) =>
          state.activeSession
            ? {
                activeSession: {
                  ...state.activeSession,
                  currentIndex: index,
                },
              }
            : state,
        ),
      submitCurrentResponse: ({ selectedAnswer, confidence, flagged, timeSpentSec }) => {
        const currentSession = get().activeSession
        const currentQuestionId = currentSession?.questionIds[currentSession.currentIndex]
        if (!currentSession || !currentQuestionId) return
        if (currentSession.responses.some((entry) => entry.questionId === currentQuestionId)) return
        const analyticsQuestion = questionLookup[currentQuestionId]
        const analyticsIsCorrect = getQuestionResult(currentQuestionId, selectedAnswer)
        set((state) => {
          if (!state.activeSession) return state
          const questionId = state.activeSession.questionIds[state.activeSession.currentIndex]
          const isCorrect = getQuestionResult(questionId, selectedAnswer)
          const response = {
            questionId,
            selectedAnswer,
            isCorrect,
            confidence,
            flagged,
            timeSpentSec,
            submittedAt: new Date().toISOString(),
          }

          if (state.activeSession.responses.some((entry) => entry.questionId === questionId)) {
            return state
          }

          const attempt: QuestionAttempt = {
            id: crypto.randomUUID(),
            questionId,
            examTrack: state.profile.examTrack ?? 'nclex-rn',
            selectedAnswer,
            isCorrect,
            confidence,
            timeSpentSec,
            flagged,
            completedAt: response.submittedAt,
            sessionType: state.activeSession.mode,
          }
          const question = questionLookup[questionId]
          const engineEvidence = question
            ? createAttemptEngineEvidence(question, attempt)
            : null
          const attemptWithEngine: QuestionAttempt = engineEvidence
            ? {
                ...attempt,
                isCorrect: engineEvidence.diagnosis.scoreResult.isCorrect,
                engineDiagnosis: engineEvidence.diagnosis,
                engineRemediationEvents: engineEvidence.remediationEvents,
              }
            : attempt

          return {
            attempts: [...state.attempts, attemptWithEngine],
            syncEvents: [
              ...state.syncEvents,
              makeSyncEvent('attempt', attemptWithEngine.id, 'upsert', attemptWithEngine),
            ],
            activeSession: {
              ...state.activeSession,
              responses: [...state.activeSession.responses, response],
            },
          }
        })
        const state = get()
        void trackAppEvent(
          'question_answered',
          {
            page_path: state.activeSession?.mode === 'quick-study' ? '/quick-study' : '/practice-questions',
            feature_name: state.activeSession?.mode === 'quick-study' ? 'Quick Study' : state.activeSession?.mode === 'test' ? 'Test Mode' : 'Question Bank',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            question_category: analyticsQuestion?.category,
            question_result: analyticsIsCorrect ? 'correct' : 'incorrect',
            confidence_level: confidence,
            time_spent_seconds: timeSpentSec,
            is_demo_user: state.isDemoMode,
          },
          { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
        )
        void trackAppEvent(
          'confidence_selected',
          {
            page_path: state.activeSession?.mode === 'quick-study' ? '/quick-study' : '/practice-questions',
            feature_name: 'Confidence Tracking',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            question_category: analyticsQuestion?.category,
            question_result: analyticsIsCorrect ? 'correct' : 'incorrect',
            confidence_level: confidence,
            time_spent_seconds: timeSpentSec,
            is_demo_user: state.isDemoMode,
          },
          { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
        )
        void get().syncNow()
      },
      nextQuestion: () =>
        set((state) => {
          if (!state.activeSession) return state
          return {
            activeSession: {
              ...state.activeSession,
              currentIndex: Math.min(
                state.activeSession.currentIndex + 1,
                state.activeSession.questionIds.length - 1,
              ),
            },
          }
        }),
      previousQuestion: () =>
        set((state) => {
          if (!state.activeSession) return state
          return {
            activeSession: {
              ...state.activeSession,
              currentIndex: Math.max(state.activeSession.currentIndex - 1, 0),
            },
          }
        }),
      finishSession: () => {
        const currentSession = get().activeSession
        if (currentSession) {
          const score =
            currentSession.responses.length === 0
              ? 0
              : currentSession.responses.filter((response) => response.isCorrect).length / currentSession.responses.length
          const state = get()
          void trackAppEvent(
            'quiz_completed',
            {
              page_path: currentSession.mode === 'quick-study' ? '/quick-study' : currentSession.mode === 'test' ? '/test-mode' : '/practice-questions',
              feature_name: currentSession.mode === 'quick-study' ? 'Quick Study' : currentSession.mode === 'test' ? 'Test Mode' : 'Question Bank',
              exam_track: state.profile.examTrack ?? 'nclex-rn',
              time_spent_seconds: Math.max(0, Math.round((Date.now() - new Date(currentSession.startedAt).getTime()) / 1000)),
              is_demo_user: state.isDemoMode,
              metadata: {
                question_count: currentSession.questionIds.length,
                response_count: currentSession.responses.length,
                score_percent: Math.round(score * 100),
              },
            },
            { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
          )
        }
        set((state) =>
          state.activeSession
            ? {
                activeSession: {
                  ...state.activeSession,
                  endedAt: new Date().toISOString(),
                  score:
                    state.activeSession.responses.length === 0
                      ? 0
                      : state.activeSession.responses.filter((response) => response.isCorrect).length /
                        state.activeSession.responses.length,
                },
              }
            : state,
        )
      },
      abandonSession: () => set({ activeSession: null }),
      updateFlashcardStatus: (id, status) => {
        const state = get()
        void trackAppEvent(
          'flashcard_reviewed',
          {
            page_path: '/flashcards',
            feature_name: 'Flashcards',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            is_demo_user: state.isDemoMode,
            metadata: { review_status: status },
          },
          { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
        )
        set((state) => ({
          flashcardProgress: {
            ...state.flashcardProgress,
            [id]: status,
          },
          flashcardReview: {
            ...state.flashcardReview,
            [id]: getNextReviewState(state.flashcardReview[id], status),
          },
          syncEvents: [...state.syncEvents, makeSyncEvent('flashcard-review', id)],
        }))
        void get().syncNow()
      },
      updateMaterialFlashcardStatus: async (id, status) => {
        const updated = await updateMaterialFlashcard(id, { status })
        if (!updated) return
        const currentState = get()
        void trackAppEvent(
          'flashcard_reviewed',
          {
            page_path: '/my-materials',
            feature_name: 'Material Flashcards',
            exam_track: currentState.profile.examTrack ?? 'nclex-rn',
            question_category: updated.category,
            is_demo_user: currentState.isDemoMode,
            metadata: { review_status: status },
          },
          { userId: currentState.authUser?.id, isDemoUser: currentState.isDemoMode },
        )
        set((state) => ({
          materialFlashcards: state.materialFlashcards.map((item) =>
            item.id === id ? updated : item,
          ),
          flashcardReview: {
            ...state.flashcardReview,
            [id]: getNextReviewState(state.flashcardReview[id], status),
          },
          syncEvents: [...state.syncEvents, makeSyncEvent('material-flashcard', id, 'upsert', updated)],
        }))
        void get().syncNow()
      },
      importStudyMaterial: async (file) => {
        const importStartedAt = Date.now()
        const startingState = get()
        void trackAppEvent(
          'material_upload_started',
          {
            page_path: '/my-materials',
            feature_name: 'Material Upload',
            exam_track: startingState.profile.examTrack ?? 'nclex-rn',
            is_demo_user: startingState.isDemoMode,
          },
          { userId: startingState.authUser?.id, isDemoUser: startingState.isDemoMode },
        )
        const {
          createErroredMaterial,
          createPendingStudyMaterial,
          createStudyMaterialRecord,
          extractMaterialText,
          generateCleanFlashcardsFromMaterial,
          generateCleanQuestionsFromMaterial,
        } = await loadMaterialPipeline()
        const pending = createPendingStudyMaterial(file)
        set((state) => ({
          materials: [pending, ...state.materials.filter((item) => item.id !== pending.id)],
        }))

        try {
          const extracted = await extractMaterialText(file)
          const storagePath =
            get().authUser && !get().isDemoMode
              ? await uploadMaterialFile(get().authUser!.id, pending.id, file).catch((error) => {
                  reportSafeError('cloud-file-upload', error)
                  set({
                    syncStatus: 'error',
                    syncError: getSafeErrorCopy('cloud-file-upload'),
                  })
                  return undefined
                })
              : undefined
          const material = {
            ...createStudyMaterialRecord(file, extracted, pending.id),
            storagePath,
          }
          const { flashcards, questions } = await generateReviewReadyMaterialTools(material, {
            generateCleanFlashcardsFromMaterial,
            generateCleanQuestionsFromMaterial,
          })
          const nextMaterial = {
            ...material,
            reviewStatus: 'pending-review' as const,
            generatedFlashcardIds: [],
            generatedQuestionIds: [],
            pendingFlashcards: flashcards,
            pendingQuestions: questions,
          }

          await saveMaterialBundle({
            material: nextMaterial,
            flashcards: [],
            questions: [],
          })

          set((state) => ({
            materials: [nextMaterial, ...state.materials.filter((item) => item.id !== pending.id)],
            syncEvents: [...state.syncEvents, makeSyncEvent('material', nextMaterial.id, 'upsert', nextMaterial)],
          }))
          const completedState = get()
          void trackAppEvent(
            'material_upload_completed',
            {
              page_path: '/my-materials',
              feature_name: 'Material Upload',
              exam_track: completedState.profile.examTrack ?? 'nclex-rn',
              time_spent_seconds: Math.round((Date.now() - importStartedAt) / 1000),
              is_demo_user: completedState.isDemoMode,
              metadata: {
                generated_flashcards: flashcards.length,
                generated_questions: questions.length,
              },
            },
            { userId: completedState.authUser?.id, isDemoUser: completedState.isDemoMode },
          )
          void get().syncNow()
        } catch (error) {
          reportSafeError('material-file-import', error)
          const failedState = get()
          void trackAppEvent(
            'material_upload_failed',
            {
              page_path: '/my-materials',
              feature_name: 'Material Upload',
              exam_track: failedState.profile.examTrack ?? 'nclex-rn',
              time_spent_seconds: Math.round((Date.now() - importStartedAt) / 1000),
              is_demo_user: failedState.isDemoMode,
              metadata: { error_category: 'file_import' },
            },
            { userId: failedState.authUser?.id, isDemoUser: failedState.isDemoMode },
          )
          const failure = createErroredMaterial(
            pending,
            getSafeErrorCopy('material-file-import'),
          )
          await saveMaterialBundle({ material: failure, flashcards: [], questions: [] })
          set((state) => ({
            materials: [failure, ...state.materials.filter((item) => item.id !== pending.id)],
            syncEvents: [...state.syncEvents, makeSyncEvent('material', failure.id, 'upsert', failure)],
          }))
          void get().syncNow()
        }
      },
      importStudyMaterialFromUrl: async (url) => {
        const importStartedAt = Date.now()
        const startingState = get()
        void trackAppEvent(
          'material_upload_started',
          {
            page_path: '/my-materials',
            feature_name: 'Material Link Import',
            exam_track: startingState.profile.examTrack ?? 'nclex-rn',
            is_demo_user: startingState.isDemoMode,
          },
          { userId: startingState.authUser?.id, isDemoUser: startingState.isDemoMode },
        )
        const {
          createErroredMaterial,
          createPendingStudyMaterialFromUrl,
          createStudyMaterialRecordFromUrl,
          extractMaterialTextFromUrl,
          generateCleanFlashcardsFromMaterial,
          generateCleanQuestionsFromMaterial,
        } = await loadMaterialPipeline()
        const pending = createPendingStudyMaterialFromUrl(url)
        set((state) => ({
          materials: [pending, ...state.materials.filter((item) => item.id !== pending.id)],
        }))

        try {
          const extracted = await extractMaterialTextFromUrl(url)
          const material = createStudyMaterialRecordFromUrl(url, extracted, pending.id)
          const { flashcards, questions } = await generateReviewReadyMaterialTools(material, {
            generateCleanFlashcardsFromMaterial,
            generateCleanQuestionsFromMaterial,
          })
          const nextMaterial = {
            ...material,
            reviewStatus: 'pending-review' as const,
            generatedFlashcardIds: [],
            generatedQuestionIds: [],
            pendingFlashcards: flashcards,
            pendingQuestions: questions,
          }

          await saveMaterialBundle({
            material: nextMaterial,
            flashcards: [],
            questions: [],
          })

          set((state) => ({
            materials: [nextMaterial, ...state.materials.filter((item) => item.id !== pending.id)],
            syncEvents: [...state.syncEvents, makeSyncEvent('material', nextMaterial.id, 'upsert', nextMaterial)],
          }))
          const completedState = get()
          void trackAppEvent(
            'material_upload_completed',
            {
              page_path: '/my-materials',
              feature_name: 'Material Link Import',
              exam_track: completedState.profile.examTrack ?? 'nclex-rn',
              time_spent_seconds: Math.round((Date.now() - importStartedAt) / 1000),
              is_demo_user: completedState.isDemoMode,
              metadata: {
                generated_flashcards: flashcards.length,
                generated_questions: questions.length,
              },
            },
            { userId: completedState.authUser?.id, isDemoUser: completedState.isDemoMode },
          )
          void get().syncNow()
        } catch (error) {
          reportSafeError('material-link-import', error)
          const failedState = get()
          void trackAppEvent(
            'material_upload_failed',
            {
              page_path: '/my-materials',
              feature_name: 'Material Link Import',
              exam_track: failedState.profile.examTrack ?? 'nclex-rn',
              time_spent_seconds: Math.round((Date.now() - importStartedAt) / 1000),
              is_demo_user: failedState.isDemoMode,
              metadata: { error_category: 'link_import' },
            },
            { userId: failedState.authUser?.id, isDemoUser: failedState.isDemoMode },
          )
          const message = getSafeErrorCopy('material-link-import')
          const failure = createErroredMaterial(
            pending,
            message,
          )
          await saveMaterialBundle({ material: failure, flashcards: [], questions: [] })
          set((state) => ({
            materials: [failure, ...state.materials.filter((item) => item.id !== pending.id)],
            syncEvents: [...state.syncEvents, makeSyncEvent('material', failure.id, 'upsert', failure)],
          }))
          void get().syncNow()
          throw new Error(message, { cause: error })
        }
      },
      deleteStudyMaterial: async (id) => {
        await deleteMaterialBundle(id)
        if (get().authUser && !get().isDemoMode) {
          await deleteMaterialCloud(get().authUser!.id, id).catch((error) => {
            reportSafeError('cloud-material-delete', error)
            set({
              syncStatus: 'error',
              syncError: getSafeErrorCopy('cloud-material-delete'),
            })
          })
        }
        set((state) => ({
          materials: state.materials.filter((item) => item.id !== id),
          materialFlashcards: state.materialFlashcards.filter((item) => item.sourceMaterialId !== id),
          materialQuestions: state.materialQuestions.filter((item) => item.sourceMaterialId !== id),
          syncEvents: [...state.syncEvents, makeSyncEvent('material', id, 'delete')],
          preferredMaterialFlashcardsId:
            state.preferredMaterialFlashcardsId === id ? null : state.preferredMaterialFlashcardsId,
          activeMaterialQuizSession:
            state.activeMaterialQuizSession?.materialId === id ? null : state.activeMaterialQuizSession,
        }))
        void get().syncNow()
      },
      updateStudyMaterialMeta: async (id, updates) => {
        const updated = await persistMaterialMeta(id, updates)
        if (!updated) return
        set((state) => ({
          materials: state.materials.map((item) => (item.id === id ? updated : item)),
          syncEvents: [...state.syncEvents, makeSyncEvent('material', id, 'upsert', updated)],
        }))
        void get().syncNow()
      },
      regenerateMaterialStudyTools: async (id) => {
        const {
          generateCleanFlashcardsFromMaterial,
          generateCleanQuestionsFromMaterial,
          repairStudyMaterialContent,
        } = await loadMaterialPipeline()
        const material = get().materials.find((item) => item.id === id)
        if (!material || material.extractionStatus !== 'ready') return

        const repairedMaterial = repairStudyMaterialContent(material)
        const { flashcards, questions } = await generateReviewReadyMaterialTools(repairedMaterial, {
          generateCleanFlashcardsFromMaterial,
          generateCleanQuestionsFromMaterial,
        })
        const nextMaterial = {
          ...repairedMaterial,
          reviewStatus: 'pending-review' as const,
          pendingFlashcards: flashcards,
          pendingQuestions: questions,
          error: undefined,
        }

        await saveMaterialBundle({
          material: nextMaterial,
          flashcards: get().materialFlashcards.filter((item) => item.sourceMaterialId === id),
          questions: get().materialQuestions.filter((item) => item.sourceMaterialId === id),
        })

        set((state) => ({
          materials: state.materials.map((item) => (item.id === id ? nextMaterial : item)),
          syncEvents: [...state.syncEvents, makeSyncEvent('material', id, 'upsert', nextMaterial)],
        }))
        void get().syncNow()
      },
      approveMaterialStudyTools: async (id, flashcards, questions) => {
        const material = get().materials.find((item) => item.id === id)
        if (!material || material.extractionStatus !== 'ready') return

        const { flashcards: reviewReadyFlashcards, questions: reviewReadyQuestions } =
          filterMaterialStudyTools(flashcards, questions)

        const approvedFlashcards = reviewReadyFlashcards.map((card) => ({
          ...card,
          sourceMaterialId: id,
          sourceTitle: material.displayTitle,
          createdAt: card.createdAt || new Date().toISOString(),
        }))
        const approvedQuestions = reviewReadyQuestions.map((question) => ({
          ...question,
          sourceMaterialId: id,
          sourceTitle: material.displayTitle,
          createdAt: question.createdAt || new Date().toISOString(),
        }))
        const nextMaterial = {
          ...material,
          reviewStatus: 'approved' as const,
          generatedFlashcardIds: approvedFlashcards.map((item) => item.id),
          generatedQuestionIds: approvedQuestions.map((item) => item.id),
          pendingFlashcards: [],
          pendingQuestions: [],
        }

        await saveMaterialBundle({
          material: nextMaterial,
          flashcards: approvedFlashcards,
          questions: approvedQuestions,
        })

        set((state) => ({
          materials: state.materials.map((item) => (item.id === id ? nextMaterial : item)),
          materialFlashcards: [
            ...approvedFlashcards,
            ...state.materialFlashcards.filter((item) => item.sourceMaterialId !== id),
          ],
          materialQuestions: [
            ...approvedQuestions,
            ...state.materialQuestions.filter((item) => item.sourceMaterialId !== id),
          ],
          syncEvents: [
            ...state.syncEvents,
            makeSyncEvent('material', id, 'upsert', nextMaterial),
            ...approvedFlashcards.map((item) => makeSyncEvent('material-flashcard', item.id, 'upsert', item)),
            ...approvedQuestions.map((item) => makeSyncEvent('material-question', item.id, 'upsert', item)),
          ],
        }))
        void get().syncNow()
      },
      startMaterialFlashcards: (materialId) => set({ preferredMaterialFlashcardsId: materialId }),
      clearMaterialFlashcardsPreference: () => set({ preferredMaterialFlashcardsId: null }),
      startMaterialQuiz: (materialId, config) => {
        const state = get()
        const material = state.materials.find((item) => item.id === materialId)
        void trackAppEvent(
          'quiz_started',
          {
            page_path: '/my-materials',
            feature_name: 'Material Quiz',
            exam_track: state.profile.examTrack ?? 'nclex-rn',
            is_demo_user: state.isDemoMode,
            metadata: {
              question_count: config?.questionCount ?? 5,
              has_material: Boolean(material),
            },
          },
          { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
        )
        set((state) => {
          const material = state.materials.find((item) => item.id === materialId)
          const questions = state.materialQuestions.filter((item) => item.sourceMaterialId === materialId)
          const questionCount = Math.min(config?.questionCount ?? 5, questions.length)
          if (!material || !questionCount) return state

          return {
            activeMaterialQuizSession: {
              id: crypto.randomUUID(),
              materialId,
              title: config?.title ?? `Study from ${material.displayTitle}`,
              questionIds: questions.slice(0, questionCount).map((item) => item.id),
              startedAt: new Date().toISOString(),
              currentIndex: 0,
              responses: [],
            },
          }
        })
      },
      submitMaterialQuizResponse: (questionId, selectedAnswer) => {
        const currentState = get()
        const currentQuestion = currentState.materialQuestions.find((item) => item.id === questionId)
        if (!currentState.activeMaterialQuizSession || !currentQuestion) return
        if (currentState.activeMaterialQuizSession.responses.some((item) => item.questionId === questionId)) return
        const analyticsIsCorrect =
          [...selectedAnswer].sort().join('|') === [...currentQuestion.correctAnswer].sort().join('|')
        set((state) => {
          if (!state.activeMaterialQuizSession) return state
          const question = state.materialQuestions.find((item) => item.id === questionId)
          if (!question) return state
          if (state.activeMaterialQuizSession.responses.some((item) => item.questionId === questionId)) {
            return state
          }

          const isCorrect =
            [...selectedAnswer].sort().join('|') === [...question.correctAnswer].sort().join('|')

          return {
            activeMaterialQuizSession: {
              ...state.activeMaterialQuizSession,
              responses: [
                ...state.activeMaterialQuizSession.responses,
                {
                  questionId,
                  selectedAnswer,
                  isCorrect,
                  submittedAt: new Date().toISOString(),
                },
              ],
            },
            syncEvents: [
              ...state.syncEvents,
              makeSyncEvent('material-quiz-session', state.activeMaterialQuizSession.id),
            ],
          }
        })
        const nextState = get()
        void trackAppEvent(
          'question_answered',
          {
            page_path: '/my-materials',
            feature_name: 'Material Quiz',
            exam_track: nextState.profile.examTrack ?? 'nclex-rn',
            question_category: currentQuestion.sourceTitle,
            question_result: analyticsIsCorrect ? 'correct' : 'incorrect',
            is_demo_user: nextState.isDemoMode,
          },
          { userId: nextState.authUser?.id, isDemoUser: nextState.isDemoMode },
        )
        void get().syncNow()
      },
      nextMaterialQuizQuestion: () =>
        set((state) => {
          if (!state.activeMaterialQuizSession) return state
          return {
            activeMaterialQuizSession: {
              ...state.activeMaterialQuizSession,
              currentIndex: Math.min(
                state.activeMaterialQuizSession.currentIndex + 1,
                state.activeMaterialQuizSession.questionIds.length - 1,
              ),
            },
          }
        }),
      previousMaterialQuizQuestion: () =>
        set((state) => {
          if (!state.activeMaterialQuizSession) return state
          return {
            activeMaterialQuizSession: {
              ...state.activeMaterialQuizSession,
              currentIndex: Math.max(state.activeMaterialQuizSession.currentIndex - 1, 0),
            },
          }
        }),
      finishMaterialQuiz: () => {
        const currentSession = get().activeMaterialQuizSession
        const startedAt = currentSession?.startedAt ? new Date(currentSession.startedAt).getTime() : Date.now()
        set((state) => {
          if (!state.activeMaterialQuizSession) return state
          const responses = state.activeMaterialQuizSession.responses
          return {
            activeMaterialQuizSession: {
              ...state.activeMaterialQuizSession,
              endedAt: new Date().toISOString(),
              score: responses.length
                ? responses.filter((item) => item.isCorrect).length / responses.length
                : 0,
            },
            syncEvents: [
              ...state.syncEvents,
              makeSyncEvent('material-quiz-session', state.activeMaterialQuizSession.id),
            ],
          }
        })
        if (currentSession) {
          const state = get()
          const responses = currentSession.responses
          void trackAppEvent(
            'quiz_completed',
            {
              page_path: '/my-materials',
              feature_name: 'Material Quiz',
              exam_track: state.profile.examTrack ?? 'nclex-rn',
              time_spent_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
              is_demo_user: state.isDemoMode,
              metadata: {
                question_count: currentSession.questionIds.length,
                response_count: responses.length,
                score_percent: responses.length
                  ? Math.round((responses.filter((item) => item.isCorrect).length / responses.length) * 100)
                  : 0,
              },
            },
            { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
          )
        }
        void get().syncNow()
      },
      abandonMaterialQuiz: () => {
        set({ activeMaterialQuizSession: null })
        void get().syncNow()
      },
      saveNote: (note) => {
        const existingNote = get().notes.some((item) => item.id === note.id)
        const stampedNote = {
          ...note,
          updatedAt: new Date().toISOString(),
          createdAt: note.createdAt ?? new Date().toISOString(),
        }
        set((state) => ({
          notes: updateNote(state.notes, {
            ...stampedNote,
          }),
          syncEvents: [...state.syncEvents, makeSyncEvent('note', stampedNote.id, 'upsert', stampedNote)],
        }))
        if (!existingNote) {
          const state = get()
          void trackAppEvent(
            'note_created',
            {
              page_path: '/notes',
              feature_name: 'Notes',
              exam_track: state.profile.examTrack ?? 'nclex-rn',
              is_demo_user: state.isDemoMode,
            },
            { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
          )
        }
        void get().syncNow()
      },
      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          syncEvents: [...state.syncEvents, makeSyncEvent('note', id, 'delete')],
        }))
        void get().syncNow()
      },
      updateProfile: (updates) => {
        const previousTrack = get().profile.examTrack
        set((state) => ({
          profile: {
            ...state.profile,
            examTrack: state.profile.examTrack ?? 'nclex-rn',
            ...updates,
            updatedAt: new Date().toISOString(),
            preferences: {
              ...state.profile.preferences,
              analyticsScope: state.profile.preferences.analyticsScope ?? 'selected-track',
              ...updates.preferences,
            },
          },
          syncEvents: [...state.syncEvents, makeSyncEvent('profile', state.authUser?.id ?? 'local-profile')],
        }))
        if (updates.examTrack && updates.examTrack !== previousTrack) {
          const state = get()
          void trackAppEvent(
            'exam_track_selected',
            {
              page_path: '/settings',
              feature_name: 'Exam Track',
              exam_track: updates.examTrack,
              is_demo_user: state.isDemoMode,
            },
            { userId: state.authUser?.id, isDemoUser: state.isDemoMode },
          )
        }
        void get().syncNow()
      },
      setExamDate: (examDate) => {
        set((state) => ({
          profile: { ...state.profile, examDate, updatedAt: new Date().toISOString() },
          syncEvents: [...state.syncEvents, makeSyncEvent('profile', state.authUser?.id ?? 'local-profile')],
        }))
        void get().syncNow()
      },
      setStudyIntensity: (studyIntensity) => {
        set((state) => ({
          profile: { ...state.profile, studyIntensity, updatedAt: new Date().toISOString() },
          syncEvents: [...state.syncEvents, makeSyncEvent('profile', state.authUser?.id ?? 'local-profile')],
        }))
        void get().syncNow()
      },
      startTycoonShift: (unitId) =>
        set((state) => ({
          tycoon: startTycoonShiftForUnit(state.tycoon, unitId),
        })),
      selectTycoonTask: (taskId) =>
        set((state) => ({
          tycoon: selectTycoonTaskById(state.tycoon, taskId),
        })),
      completeTycoonTask: (taskId, actionId) =>
        set((state) => ({
          tycoon: completeTycoonTaskWithAction(state.tycoon, taskId, actionId),
        })),
      advanceTycoonTime: (minutes) =>
        set((state) => ({
          tycoon: advanceTycoonShiftTime(state.tycoon, minutes),
        })),
      purchaseTycoonUpgrade: (upgradeId) =>
        set((state) => ({
          tycoon: purchaseTycoonUpgradeById(state.tycoon, upgradeId),
        })),
      finishTycoonShift: () =>
        set((state) => ({
          tycoon: finishTycoonShiftNow(state.tycoon),
        })),
      resetTycoonProgress: () => set({ tycoon: createInitialTycoonState() }),
      selectSimulatorLevel: (levelId) =>
        set((state) => {
          if (!state.simulatorProgress.unlockedSimulatorLevels.includes(levelId)) return state
          return {
            simulatorProgress: {
              ...state.simulatorProgress,
              currentSimulatorLevel: levelId,
            },
          }
        }),
      recordSimulatorLevelAttempt: (attempt, completedObjectiveIds) =>
        set((state) => {
          const currentProgress = state.simulatorProgress
          const currentIndex = simulatorLevelOrder.indexOf(attempt.levelId)
          const nextLevel = simulatorLevelOrder[currentIndex + 1]
          const unlockedSimulatorLevels =
            attempt.passed && nextLevel
              ? Array.from(new Set([...currentProgress.unlockedSimulatorLevels, nextLevel]))
              : currentProgress.unlockedSimulatorLevels

          return {
            simulatorProgress: {
              ...currentProgress,
              unlockedSimulatorLevels,
              currentSimulatorLevel: attempt.levelId,
              levelAttempts: [attempt, ...currentProgress.levelAttempts].slice(0, 50),
              bestLevelScores: {
                ...currentProgress.bestLevelScores,
                [attempt.levelId]: Math.max(currentProgress.bestLevelScores[attempt.levelId] ?? 0, attempt.totalScore),
              },
              completedLevelObjectives: {
                ...currentProgress.completedLevelObjectives,
                [attempt.levelId]: Array.from(
                  new Set([...(currentProgress.completedLevelObjectives[attempt.levelId] ?? []), ...completedObjectiveIds]),
                ),
              },
            },
          }
        }),
      resetSimulatorProgress: () => set({ simulatorProgress: createInitialSimulatorProgress() }),
      resetProgress: async () => {
        const materials = await getMaterialLibrary()
        await Promise.all(materials.map((item) => deleteMaterialBundle(item.id)))
        set(baseState)
      },
    }),
    {
      name: 'nclex-study-system',
      partialize: (state) => ({
        isDemoMode: state.isDemoMode,
        syncEvents: state.syncEvents,
        profile: state.profile,
        attempts: state.attempts,
        notes: state.notes,
        flashcardProgress: state.flashcardProgress,
        flashcardReview: state.flashcardReview,
        activeSession: state.activeSession,
        preferredMaterialFlashcardsId: state.preferredMaterialFlashcardsId,
        activeMaterialQuizSession: state.activeMaterialQuizSession,
        tycoon: state.tycoon,
        simulatorProgress: state.simulatorProgress,
      }),
    },
  ),
)

import type {
  FlashcardReviewState,
  MaterialFlashcard,
  MaterialQuestion,
  MaterialQuizSession,
  Note,
  ActiveSession,
  QuestionAttempt,
  SessionResponse,
  StudyMaterial,
  SyncEvent,
  UserProfile,
} from '../app/types'
import { isSupabaseConfigured, supabase } from './supabase'

const nowIso = () => new Date().toISOString()

const requireClient = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Cloud sync is unavailable until Supabase environment variables are configured.')
  }
  return supabase
}

const withOwnership = <T extends object>(userId: string, entity: T) => ({
  ...entity,
  userId,
  updatedAt: 'updatedAt' in entity && typeof entity.updatedAt === 'string' ? entity.updatedAt : nowIso(),
  createdAt: 'createdAt' in entity && typeof entity.createdAt === 'string' ? entity.createdAt : nowIso(),
})

export interface CloudStateBundle {
  profile: UserProfile | null
  attempts: QuestionAttempt[]
  notes: Note[]
  flashcardReview: Record<string, FlashcardReviewState>
  materials: StudyMaterial[]
  materialFlashcards: MaterialFlashcard[]
  materialQuestions: MaterialQuestion[]
  materialQuizSessions: MaterialQuizSession[]
  practiceSessions: ActiveSession[]
}

const mapPracticeResponse = (row: Record<string, unknown>): SessionResponse => ({
  questionId: String(row.question_id),
  selectedAnswer: Array.isArray(row.selected_answer) ? row.selected_answer as string[] : [],
  isCorrect: Boolean(row.is_correct),
  confidence: (row.confidence as SessionResponse['confidence']) ?? 'medium',
  timeSpentSec: Number(row.time_spent_sec) || 0,
  flagged: Boolean(row.flagged),
  submittedAt: String(row.submitted_at ?? row.updated_at ?? row.created_at ?? nowIso()),
})

const mapPracticeSession = (
  row: Record<string, unknown>,
  responses: Record<string, unknown>[],
): ActiveSession => ({
  id: String(row.id),
  userId: String(row.user_id),
  mode: row.mode as ActiveSession['mode'],
  examTrack: row.exam_track as ActiveSession['examTrack'],
  title: String(row.title),
  subtitle: String(row.subtitle),
  questionIds: Array.isArray(row.question_ids) ? row.question_ids as string[] : [],
  startedAt: String(row.started_at),
  endedAt: row.ended_at ? String(row.ended_at) : undefined,
  score: typeof row.score === 'number' ? row.score : row.score === null || row.score === undefined ? undefined : Number(row.score),
  status: row.status as ActiveSession['status'],
  lastActivityAt: String(row.last_activity_at ?? row.updated_at ?? row.started_at),
  currentIndex: Number(row.current_index) || 0,
  config: row.config as ActiveSession['config'],
  responses: responses.map(mapPracticeResponse),
  createdAt: String(row.created_at ?? row.started_at),
  updatedAt: String(row.updated_at ?? row.last_activity_at ?? row.started_at),
})

export async function loadCloudState(userId: string): Promise<CloudStateBundle> {
  const client = requireClient()
  const [
    profileResult,
    attemptsResult,
    notesResult,
    reviewsResult,
    materialsResult,
    flashcardsResult,
    questionsResult,
    quizSessionsResult,
    practiceSessionsResult,
    practiceResponsesResult,
  ] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('question_attempts').select('*').eq('user_id', userId).is('deleted_at', null),
    client.from('notes').select('*').eq('user_id', userId).is('deleted_at', null),
    client.from('flashcard_reviews').select('*').eq('user_id', userId).is('deleted_at', null),
    client.from('study_materials').select('*').eq('user_id', userId).is('deleted_at', null),
    client.from('material_flashcards').select('*').eq('user_id', userId).is('deleted_at', null),
    client.from('material_questions').select('*').eq('user_id', userId).is('deleted_at', null),
    client.from('material_quiz_sessions').select('*').eq('user_id', userId).is('deleted_at', null),
    client.from('practice_sessions').select('*').eq('user_id', userId).is('deleted_at', null),
    client.from('practice_session_responses').select('*').eq('user_id', userId).is('deleted_at', null),
  ])

  const firstError = [
    profileResult.error,
    attemptsResult.error,
    notesResult.error,
    reviewsResult.error,
    materialsResult.error,
    flashcardsResult.error,
    questionsResult.error,
    quizSessionsResult.error,
    practiceSessionsResult.error,
    practiceResponsesResult.error,
  ].find(Boolean)
  if (firstError) throw firstError

  const flashcardReview = Object.fromEntries(
    (reviewsResult.data ?? []).map((row) => [
      row.flashcard_id,
      {
        status: row.status,
        lastReviewedAt: row.last_reviewed_at ?? undefined,
        nextReviewAt: row.next_review_at ?? undefined,
        lapses: row.lapses ?? 0,
        intervalDays: row.interval_days ?? 0,
      } satisfies FlashcardReviewState,
    ]),
  )

  const profilePreferences = profileResult.data?.preferences as
    | (UserProfile['preferences'] & { profileImageDataUrl?: string })
    | undefined

  const responsesBySessionId = (practiceResponsesResult.data ?? []).reduce<Record<string, Record<string, unknown>[]>>(
    (groups, row) => {
      const sessionId = String(row.session_id)
      groups[sessionId] = [...(groups[sessionId] ?? []), row]
      return groups
    },
    {},
  )

  return {
    profile: profileResult.data
      ? {
          name: profileResult.data.name,
          nursingSchool: profileResult.data.nursing_school ?? undefined,
          state: profileResult.data.profile_state ?? undefined,
          memberNumber:
            typeof profileResult.data.member_number === 'number'
              ? profileResult.data.member_number
              : Number(profileResult.data.member_number) || undefined,
          directoryVisible: profileResult.data.directory_visible ?? true,
          profileImageDataUrl: profilePreferences?.profileImageDataUrl,
          examTrack: profileResult.data.exam_track,
          examDate: profileResult.data.exam_date,
          studyIntensity: profileResult.data.study_intensity,
          dailyGoal: profileResult.data.daily_goal,
          streak: profileResult.data.streak,
          preferences: {
            reducedMotion: profilePreferences?.reducedMotion ?? false,
            notifications: profilePreferences?.notifications ?? true,
            analyticsScope: profilePreferences?.analyticsScope ?? 'selected-track',
            onboardingCompletedAt: profilePreferences?.onboardingCompletedAt,
          },
          userId,
          createdAt: profileResult.data.created_at,
          updatedAt: profileResult.data.updated_at,
        }
      : null,
    attempts: (attemptsResult.data ?? []).map((row) => ({
      id: row.id,
      questionId: row.question_id,
      examTrack: row.exam_track,
      selectedAnswer: row.selected_answer,
      isCorrect: row.is_correct,
      confidence: row.confidence,
      timeSpentSec: row.time_spent_sec,
      flagged: row.flagged,
      completedAt: row.completed_at,
      sessionType: row.session_type,
      sessionId: row.session_id ?? undefined,
      engineDiagnosis: row.engine_diagnosis ?? undefined,
      engineRemediationEvents: row.engine_remediation_events ?? undefined,
      userId,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    notes: (notesResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      userId,
    })),
    flashcardReview,
    materials: (materialsResult.data ?? []).map((row) => ({
      ...(row.material as StudyMaterial),
      userId,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    materialFlashcards: (flashcardsResult.data ?? []).map((row) => ({
      ...(row.flashcard as MaterialFlashcard),
      userId,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    materialQuestions: (questionsResult.data ?? []).map((row) => ({
      ...(row.question as MaterialQuestion),
      userId,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    materialQuizSessions: (quizSessionsResult.data ?? []).map((row) => ({
      ...(row.session as MaterialQuizSession),
      userId,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    practiceSessions: (practiceSessionsResult.data ?? [])
      .map((row) => mapPracticeSession(row, responsesBySessionId[String(row.id)] ?? []))
      .toSorted((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')),
  }
}

export async function saveProfile(userId: string, profile: UserProfile) {
  const client = requireClient()
  const owned = withOwnership(userId, profile)
  const preferences = {
    ...owned.preferences,
    ...(owned.profileImageDataUrl ? { profileImageDataUrl: owned.profileImageDataUrl } : {}),
  }
  const { error } = await client.from('profiles').upsert({
    id: userId,
    name: owned.name,
    nursing_school: owned.nursingSchool ?? null,
    profile_state: owned.state?.trim() || null,
    directory_visible: owned.directoryVisible ?? true,
    exam_track: owned.examTrack,
    exam_date: owned.examDate,
    study_intensity: owned.studyIntensity,
    daily_goal: owned.dailyGoal,
    streak: owned.streak,
    preferences,
    updated_at: owned.updatedAt,
  })
  if (error) throw error
}

export async function saveAttempts(userId: string, attempts: QuestionAttempt[]) {
  if (!attempts.length) return
  const client = requireClient()
  const rows = attempts.map((attempt) => {
    const owned = withOwnership(userId, attempt)
    return {
      id: owned.id,
      user_id: userId,
      question_id: owned.questionId,
      exam_track: owned.examTrack,
      selected_answer: owned.selectedAnswer,
      is_correct: owned.isCorrect,
      confidence: owned.confidence,
      time_spent_sec: owned.timeSpentSec,
      flagged: owned.flagged,
      completed_at: owned.completedAt,
      session_type: owned.sessionType,
      session_id: owned.sessionId ?? null,
      engine_diagnosis: owned.engineDiagnosis ?? null,
      engine_remediation_events: owned.engineRemediationEvents ?? [],
      created_at: owned.createdAt,
      updated_at: owned.updatedAt,
    }
  })
  const { error } = await client.from('question_attempts').upsert(rows)
  if (error) throw error
}

export async function savePracticeSessions(userId: string, sessions: ActiveSession[]) {
  if (!sessions.length) return
  const client = requireClient()
  const sessionRows = sessions.map((session) => {
    const owned = withOwnership(userId, session)
    const status = owned.deletedAt
      ? 'discarded'
      : owned.status ?? (owned.endedAt ? 'completed' : 'active')
    return {
      id: owned.id,
      user_id: userId,
      mode: owned.mode,
      exam_track: owned.examTrack ?? 'nclex-rn',
      title: owned.title,
      subtitle: owned.subtitle,
      question_ids: owned.questionIds,
      current_index: owned.currentIndex,
      config: owned.config,
      started_at: owned.startedAt,
      ended_at: owned.endedAt ?? null,
      score: owned.score ?? null,
      status,
      last_activity_at: owned.lastActivityAt ?? owned.updatedAt ?? nowIso(),
      created_at: owned.createdAt ?? owned.startedAt,
      updated_at: owned.updatedAt ?? nowIso(),
      deleted_at: owned.deletedAt ?? null,
    }
  })
  const responseRows = sessions.flatMap((session) =>
    session.responses.map((response) => ({
      user_id: userId,
      session_id: session.id,
      question_id: response.questionId,
      selected_answer: response.selectedAnswer,
      is_correct: response.isCorrect,
      confidence: response.confidence,
      time_spent_sec: response.timeSpentSec,
      flagged: response.flagged,
      submitted_at: response.submittedAt,
      updated_at: session.updatedAt ?? session.lastActivityAt ?? nowIso(),
      deleted_at: session.deletedAt ?? null,
    })),
  )

  const operations = [client.from('practice_sessions').upsert(sessionRows)]
  if (responseRows.length) {
    operations.push(
      client
        .from('practice_session_responses')
        .upsert(responseRows, { onConflict: 'user_id,session_id,question_id' }),
    )
  }

  const results = await Promise.all(operations)
  const error = results.find((result) => result.error)?.error
  if (error) throw error
}

export async function saveNotes(userId: string, notes: Note[]) {
  const client = requireClient()
  const rows = notes.map((note) => ({
    id: note.id,
    user_id: userId,
    title: note.title,
    body: note.body,
    category: note.category,
    created_at: note.createdAt ?? note.updatedAt ?? nowIso(),
    updated_at: note.updatedAt ?? nowIso(),
  }))
  const { error } = rows.length
    ? await client.from('notes').upsert(rows)
    : await client.from('notes').select('id').eq('user_id', userId).limit(1)
  if (error) throw error
}

export async function saveFlashcardReviews(
  userId: string,
  reviews: Record<string, FlashcardReviewState>,
) {
  const rows = Object.entries(reviews).map(([flashcardId, review]) => ({
    id: `${userId}:${flashcardId}`,
    user_id: userId,
    flashcard_id: flashcardId,
    status: review.status,
    last_reviewed_at: review.lastReviewedAt ?? null,
    next_review_at: review.nextReviewAt ?? null,
    lapses: review.lapses,
    interval_days: review.intervalDays,
    updated_at: review.lastReviewedAt ?? nowIso(),
  }))
  if (!rows.length) return
  const client = requireClient()
  const { error } = await client.from('flashcard_reviews').upsert(rows)
  if (error) throw error
}

export async function saveMaterials(
  userId: string,
  materials: StudyMaterial[],
  flashcards: MaterialFlashcard[],
  questions: MaterialQuestion[],
  quizSession?: MaterialQuizSession | null,
) {
  const client = requireClient()
  const materialRows = materials.map((material) => ({
    id: material.id,
    user_id: userId,
    material: withOwnership(userId, material),
    created_at: material.createdAt ?? material.importedAt,
    updated_at: material.updatedAt ?? nowIso(),
  }))
  const flashcardRows = flashcards.map((flashcard) => ({
    id: flashcard.id,
    user_id: userId,
    source_material_id: flashcard.sourceMaterialId,
    flashcard: withOwnership(userId, flashcard),
    created_at: flashcard.createdAt,
    updated_at: flashcard.updatedAt ?? nowIso(),
  }))
  const questionRows = questions.map((question) => ({
    id: question.id,
    user_id: userId,
    source_material_id: question.sourceMaterialId,
    question: withOwnership(userId, question),
    created_at: question.createdAt,
    updated_at: question.updatedAt ?? nowIso(),
  }))

  const operations = []
  if (materialRows.length) operations.push(client.from('study_materials').upsert(materialRows))
  if (flashcardRows.length) operations.push(client.from('material_flashcards').upsert(flashcardRows))
  if (questionRows.length) operations.push(client.from('material_questions').upsert(questionRows))
  if (quizSession) {
    operations.push(
      client.from('material_quiz_sessions').upsert({
        id: quizSession.id,
        user_id: userId,
        material_id: quizSession.materialId,
        session: withOwnership(userId, quizSession),
        created_at: quizSession.createdAt ?? quizSession.startedAt,
        updated_at: quizSession.updatedAt ?? nowIso(),
      }),
    )
  } else if (quizSession === null) {
    operations.push(
      client
        .from('material_quiz_sessions')
        .update({ deleted_at: nowIso() })
        .eq('user_id', userId)
        .is('deleted_at', null),
    )
  }

  const results = await Promise.all(operations)
  const error = results.find((result) => result.error)?.error
  if (error) throw error
}

export async function deleteMaterialCloud(userId: string, materialId: string) {
  const client = requireClient()
  const deletedAt = nowIso()
  const results = await Promise.all([
    client.from('study_materials').update({ deleted_at: deletedAt }).eq('user_id', userId).eq('id', materialId),
    client
      .from('material_flashcards')
      .update({ deleted_at: deletedAt })
      .eq('user_id', userId)
      .eq('source_material_id', materialId),
    client
      .from('material_questions')
      .update({ deleted_at: deletedAt })
      .eq('user_id', userId)
      .eq('source_material_id', materialId),
    client
      .from('material_quiz_sessions')
      .update({ deleted_at: deletedAt })
      .eq('user_id', userId)
      .eq('material_id', materialId),
  ])
  const error = results.find((result) => result.error)?.error
  if (error) throw error
}

export async function uploadMaterialFile(userId: string, materialId: string, file: File) {
  const client = requireClient()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `${userId}/${materialId}/${safeName}`
  const { error } = await client.storage.from('study-materials').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw error
  return path
}

export async function saveSyncEvents(userId: string, events: SyncEvent[]) {
  if (!events.length) return
  const client = requireClient()
  const { error } = await client.from('sync_events').upsert(
    events.map((event) => ({
      id: event.id,
      user_id: userId,
      entity_type: event.entityType,
      entity_id: event.entityId,
      operation: event.operation,
      payload: event.payload ?? null,
      last_error: event.lastError ?? null,
      created_at: event.createdAt,
    })),
  )
  if (error) throw error
}

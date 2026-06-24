import type {
  FlashcardStatus,
  Note,
  QuestionAttempt,
  UserProfile,
} from '../app/types'

const dayOffset = (daysAgo: number, hour: number) => {
  const date = new Date()
  date.setHours(hour, 15, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

export const initialProfile: UserProfile = {
  name: 'Sarah Johnson',
  nursingSchool: 'University of Pennsylvania School of Nursing',
  state: 'Pennsylvania',
  directoryVisible: true,
  examTrack: 'nclex-rn',
  examDate: (() => {
    const date = new Date()
    date.setDate(date.getDate() + 56)
    return date.toISOString().slice(0, 10)
  })(),
  studyIntensity: 'focused',
  dailyGoal: 15,
  streak: 14,
  preferences: {
    reducedMotion: false,
    notifications: true,
    analyticsScope: 'selected-track',
  },
}

export const seededAttempts: QuestionAttempt[] = [
  { id: 'att-1', questionId: 'lead-1', selectedAnswer: ['B'], isCorrect: false, confidence: 'high', timeSpentSec: 56, flagged: true, completedAt: dayOffset(4, 20), sessionType: 'quick-study' },
  { id: 'att-2', questionId: 'lead-4', selectedAnswer: ['A'], isCorrect: true, confidence: 'medium', timeSpentSec: 42, flagged: false, completedAt: dayOffset(4, 20), sessionType: 'quick-study' },
  { id: 'att-3', questionId: 'pharm-1', selectedAnswer: ['B'], isCorrect: true, confidence: 'high', timeSpentSec: 38, flagged: false, completedAt: dayOffset(3, 7), sessionType: 'practice' },
  { id: 'att-4', questionId: 'lab-1', selectedAnswer: ['A'], isCorrect: true, confidence: 'medium', timeSpentSec: 49, flagged: false, completedAt: dayOffset(3, 7), sessionType: 'practice' },
  { id: 'att-5', questionId: 'adult-5', selectedAnswer: ['A', 'B'], isCorrect: false, confidence: 'high', timeSpentSec: 81, flagged: true, completedAt: dayOffset(3, 7), sessionType: 'practice' },
  { id: 'att-6', questionId: 'psych-2', selectedAnswer: ['A'], isCorrect: true, confidence: 'medium', timeSpentSec: 51, flagged: false, completedAt: dayOffset(2, 19), sessionType: 'practice' },
  { id: 'att-7', questionId: 'ob-1', selectedAnswer: ['A'], isCorrect: true, confidence: 'low', timeSpentSec: 45, flagged: false, completedAt: dayOffset(2, 19), sessionType: 'practice' },
  { id: 'att-8', questionId: 'lead-2', selectedAnswer: ['A'], isCorrect: false, confidence: 'high', timeSpentSec: 63, flagged: true, completedAt: dayOffset(2, 19), sessionType: 'practice' },
  { id: 'att-9', questionId: 'lead-5', selectedAnswer: ['A', 'C', 'D'], isCorrect: false, confidence: 'medium', timeSpentSec: 86, flagged: true, completedAt: dayOffset(2, 19), sessionType: 'practice' },
  { id: 'att-10', questionId: 'fund-2', selectedAnswer: ['A', 'B', 'D'], isCorrect: true, confidence: 'medium', timeSpentSec: 71, flagged: false, completedAt: dayOffset(1, 6), sessionType: 'test' },
  { id: 'att-11', questionId: 'adult-2', selectedAnswer: ['A'], isCorrect: true, confidence: 'high', timeSpentSec: 47, flagged: false, completedAt: dayOffset(1, 6), sessionType: 'test' },
  { id: 'att-12', questionId: 'lead-3', selectedAnswer: ['A'], isCorrect: true, confidence: 'low', timeSpentSec: 54, flagged: false, completedAt: dayOffset(1, 6), sessionType: 'test' },
  { id: 'att-13', questionId: 'lab-2', selectedAnswer: ['A'], isCorrect: true, confidence: 'medium', timeSpentSec: 52, flagged: false, completedAt: dayOffset(1, 6), sessionType: 'test' },
  { id: 'att-14', questionId: 'ob-5', selectedAnswer: ['A', 'B'], isCorrect: false, confidence: 'medium', timeSpentSec: 75, flagged: false, completedAt: dayOffset(1, 6), sessionType: 'test' },
  { id: 'att-15', questionId: 'lead-1', selectedAnswer: ['A'], isCorrect: true, confidence: 'medium', timeSpentSec: 39, flagged: false, completedAt: dayOffset(0, 7), sessionType: 'quick-study' },
  { id: 'att-16', questionId: 'lead-4', selectedAnswer: ['D'], isCorrect: false, confidence: 'high', timeSpentSec: 41, flagged: true, completedAt: dayOffset(0, 7), sessionType: 'quick-study' },
  { id: 'att-17', questionId: 'pharm-5', selectedAnswer: ['A', 'B', 'E'], isCorrect: true, confidence: 'medium', timeSpentSec: 60, flagged: false, completedAt: dayOffset(0, 7), sessionType: 'quick-study' },
  { id: 'att-18', questionId: 'adult-3', selectedAnswer: ['A'], isCorrect: true, confidence: 'high', timeSpentSec: 58, flagged: false, completedAt: dayOffset(0, 7), sessionType: 'quick-study' },
]

export const seededNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Prioritization trap',
    category: 'Leadership / Prioritization / Delegation',
    body: 'When I miss prioritization, it is usually because I choose the task that feels urgent instead of the client who is unstable. Start with who can crash next.',
    updatedAt: dayOffset(1, 21),
  },
  {
    id: 'note-2',
    title: 'Magnesium toxicity anchor',
    category: 'Pharmacology',
    body: 'Absent reflexes + low respirations = think magnesium toxicity and calcium gluconate.',
    updatedAt: dayOffset(3, 8),
  },
  {
    id: 'note-3',
    title: 'Postpartum red flags',
    category: 'Maternal-Newborn',
    body: 'Heavy bleeding, unilateral leg pain, fever, severe headache. If it sounds dangerous at home, it probably needs reporting.',
    updatedAt: dayOffset(2, 22),
  },
]

export const seededFlashcardProgress: Record<string, FlashcardStatus> = {
  'fc-1': 'known',
  'fc-2': 'needs-review',
  'fc-4': 'known',
  'fc-10': 'known',
  'fc-15': 'needs-review',
  'fc-22': 'needs-review',
}

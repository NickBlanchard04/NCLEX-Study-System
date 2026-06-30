import type { AnswerChoice, ExamTrackId, Flashcard, Question } from '../app/types'

const makeChoices = (...choices: string[]): AnswerChoice[] =>
  choices.map((text, index) => ({
    id: String.fromCharCode(65 + index),
    text,
  }))

const trustState = {
  sourceStatus: 'source_needed',
  sourceMapStatus: 'candidate_mapped_not_verified',
  clinicalReviewStatus: 'not_sme_reviewed',
  learnerVisible: false,
  visibility: 'internal',
  contentStage: 'beta_draft',
  countsTowardOfficialReadiness: false,
  feedbackEnabled: true,
} satisfies Pick<
  Question,
  | 'sourceStatus'
  | 'sourceMapStatus'
  | 'clinicalReviewStatus'
  | 'learnerVisible'
  | 'visibility'
  | 'contentStage'
  | 'countsTowardOfficialReadiness'
  | 'feedbackEnabled'
>

const sourceRefs = [
  'NCSBN 2026 NCLEX-RN Test Plan',
  'NCSBN National Guidelines for Nursing Delegation',
  'ANA Principles for Delegation',
  'CDC sepsis clinical-care materials',
  'NCBI Bookshelf sepsis/shock references',
]

const sharedQuestionFields = {
  examTrack: 'nclex-rn',
  category: 'Leadership / Prioritization / Delegation',
  domain: 'Safe and Effective Care Environment',
  system: 'Management of Care',
  board: 'NCSBN NCLEX-RN',
  contentQuality: 'authored-draft',
  authorType: 'clinical-editor-draft',
  sourceRefs,
  sourceTopic: 'Safe and Effective Care Environment / Management of Care',
  blueprintMapped: true,
  sourceBacked: false,
  updatedAt: '2026-06-28',
  difficulty: 'developing',
  difficultyProfile: 'case-based',
  format: 'multiple-choice',
  sourcePackId: 'SP-RN-PRIORITY-CLIENTS-0001',
  fixtureId: 'FIXTURE-SP-RN-PRIORITY-CLIENTS-0001',
  remediationRouteIds: ['REM-RN-MOC-PRIORITY-CLIENTS-0001'],
  tags: [
    'internal fixture',
    'beta draft',
    'source needed',
    'not sme reviewed',
    'prioritization',
    'delegation',
  ],
  ...trustState,
} satisfies Partial<Question>

export const internalPriorityClientsStandaloneQuestions: Question[] = [
  {
    ...sharedQuestionFields,
    id: 'NC-RN-MOC-PRIORITY-CLIENTS-0001',
    subcategory: 'Management of Care',
    scenario:
      'The RN receives start-of-shift report on four adult medical-surgical clients. Client A has pneumonia with BP 86/52 mm Hg, SpO2 88% on 2 L NC, RR 30/min, and new confusion. Client B has stable postoperative pain. Client C needs diabetes discharge teaching. Client D has stable UTI toileting and comfort needs.',
    prompt: 'Which client should the RN assess first?',
    choices: makeChoices(
      'Client with pneumonia, BP 86/52 mm Hg, SpO2 88% on 2 L NC, RR 30/min, and new confusion.',
      'Postoperative client with incisional pain rated 7 out of 10 and stable vital signs.',
      'Client with newly diagnosed diabetes who needs insulin pen teaching before discharge.',
      'Client with uncomplicated UTI who requests help to the bathroom and fresh linens.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'The pneumonia client is unstable because hypotension, hypoxia, tachypnea, and new confusion indicate possible clinical deterioration.',
      whyOthers:
        'Pain, teaching, toileting, and linen needs require follow-up but are stable compared with threats to oxygenation, perfusion, and mental status.',
    },
    nclexTip:
      'Prioritize the client with acute instability over stable pain, teaching, toileting, or comfort needs.',
    clinicalRelevance:
      'Start-of-shift prioritization protects unstable clients from delayed recognition and escalation.',
    testTakingTrap: 'Choosing stable pain, teaching, or comfort before the client with unstable physiologic cues.',
    sourceNeededClaims: [
      'vital sign thresholds',
      'clinical deterioration wording',
      'stable need priority',
    ],
    relatedFlashcardIds: [
      'FC-RN-MOC-PRIORITY-CLIENTS-0001',
      'FC-RN-MOC-PRIORITY-CLIENTS-0002',
      'FC-RN-MOC-PRIORITY-CLIENTS-0005',
      'FC-RN-MOC-PRIORITY-CLIENTS-0006',
    ],
  },
  {
    ...sharedQuestionFields,
    id: 'NC-RN-MOC-PRIORITY-CLIENTS-0002',
    subcategory: 'Delegation to UAP during prioritization',
    scenario:
      'The RN is assessing an unstable client with pneumonia and possible clinical deterioration related to infection. One UAP is available to help with other stable clients.',
    prompt: 'Which task is appropriate to delegate to the UAP?',
    choices: makeChoices(
      'Assist the stable client with UTI to the bathroom if mobility status allows, and report dizziness or any change in condition.',
      'Assess whether the client with pneumonia needs rapid response activation.',
      'Teach the client with diabetes how to use an insulin pen.',
      "Evaluate whether the postoperative client's pain improved after medication.",
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Toileting assistance for a stable client is a routine, predictable task that may be delegated when mobility/fall-risk status, UAP competence, and facility policy allow.',
      whyOthers:
        'Assessment, escalation decisions, initial teaching, and evaluation of response to medication require RN judgment.',
    },
    nclexTip:
      'Delegate stable, routine, predictable care with clear instructions; keep assessment, teaching, evaluation, and escalation decisions with the RN.',
    clinicalRelevance:
      'Safe delegation lets the RN focus on unstable clients while maintaining accountability for delegated care.',
    testTakingTrap: 'Delegating nursing judgment instead of a stable, routine, predictable task.',
    sourceNeededClaims: [
      'delegation scope',
      'RN accountability after delegation',
      'UAP reporting instructions',
    ],
    relatedFlashcardIds: [
      'FC-RN-MOC-PRIORITY-CLIENTS-0003',
      'FC-RN-MOC-PRIORITY-CLIENTS-0004',
    ],
  },
  {
    ...sharedQuestionFields,
    id: 'NC-RN-RRP-PRIORITY-CLIENTS-0003',
    category: 'Adult Health / Med-Surg',
    domain: 'Physiological Integrity',
    system: 'Reduction of Risk Potential',
    subcategory: 'Escalation cues in suspected deterioration',
    difficulty: 'foundation',
    scenario:
      'During the morning shift, a UAP reports findings from several clients to the RN.',
    prompt: "Which report from the UAP requires the RN's immediate follow-up?",
    choices: makeChoices(
      'The client with pneumonia is more confused and the blood pressure machine reads 84/50 mm Hg.',
      'The postoperative client says the incision hurts when coughing.',
      'The client waiting for diabetes teaching says they are nervous about going home.',
      'The client with UTI asked for another cup of water.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Worsening mental status and hypotension are unstable findings requiring immediate RN assessment and escalation.',
      whyOthers:
        'Incisional pain with coughing, anxiety about discharge teaching, and a water request need follow-up but are not the immediate physiologic deterioration cue.',
    },
    nclexTip:
      'Immediate follow-up is required when a UAP reports new hypotension, worsening mental status, or other signs of instability.',
    clinicalRelevance:
      'Responding promptly to UAP reports of deterioration closes the safety loop during team nursing.',
    testTakingTrap: 'Treating routine comfort or teaching needs as more urgent than new hypotension and confusion.',
    sourceNeededClaims: [
      'hypotension threshold',
      'mental status change escalation',
      'UAP report follow-up',
    ],
    relatedFlashcardIds: [
      'FC-RN-MOC-PRIORITY-CLIENTS-0001',
      'FC-RN-MOC-PRIORITY-CLIENTS-0002',
      'FC-RN-MOC-PRIORITY-CLIENTS-0005',
      'FC-RN-MOC-PRIORITY-CLIENTS-0006',
    ],
  },
]

export const internalDraftFixtureQuestionsByTrack: Partial<Record<ExamTrackId, Question[]>> = {
  'nclex-rn': internalPriorityClientsStandaloneQuestions,
}

export const internalPriorityClientsFlashcards: Flashcard[] = [
  {
    id: 'FC-RN-MOC-PRIORITY-CLIENTS-0001',
    examTrack: 'nclex-rn',
    category: 'Leadership / Prioritization / Delegation',
    sourceTopic: 'Safe and Effective Care Environment / Management of Care',
    sourceRefs,
    contentQuality: 'authored-draft',
    front: 'What is the first prioritization question when an RN receives report on multiple clients?',
    back: 'Ask which client is unstable or could deteriorate fastest. New airway, breathing, circulation, neurologic, or perfusion changes usually outrank stable pain, teaching, and comfort needs.',
    status: 'new',
  },
  {
    id: 'FC-RN-MOC-PRIORITY-CLIENTS-0002',
    examTrack: 'nclex-rn',
    category: 'Leadership / Prioritization / Delegation',
    sourceTopic: 'Safe and Effective Care Environment / Management of Care',
    sourceRefs,
    contentQuality: 'authored-draft',
    front: 'Which findings make a pneumonia client the priority?',
    back: 'Hypoxia, tachypnea, hypotension, tachycardia, fever, new confusion, and low urine output suggest possible deterioration and require immediate RN follow-up. Source verification needed.',
    status: 'new',
  },
  {
    id: 'FC-RN-MOC-PRIORITY-CLIENTS-0003',
    examTrack: 'nclex-rn',
    category: 'Leadership / Prioritization / Delegation',
    sourceTopic: 'Safe and Effective Care Environment / Management of Care',
    sourceRefs,
    contentQuality: 'authored-draft',
    front: 'What tasks are generally appropriate for UAP when clients are stable?',
    back: 'Routine vital signs, toileting assistance, hygiene, linen changes, ambulation assistance if within the plan, and reporting observations. Facility policy and competence still matter.',
    status: 'new',
  },
  {
    id: 'FC-RN-MOC-PRIORITY-CLIENTS-0004',
    examTrack: 'nclex-rn',
    category: 'Leadership / Prioritization / Delegation',
    sourceTopic: 'Safe and Effective Care Environment / Management of Care',
    sourceRefs,
    contentQuality: 'authored-draft',
    front: 'What should the RN not delegate to UAP?',
    back: 'Assessment, clinical judgment, teaching, medication administration, evaluation of outcomes, unstable-client care decisions, and decisions to escalate care.',
    status: 'new',
  },
  {
    id: 'FC-RN-MOC-PRIORITY-CLIENTS-0005',
    examTrack: 'nclex-rn',
    category: 'Leadership / Prioritization / Delegation',
    sourceTopic: 'Safe and Effective Care Environment / Management of Care',
    sourceRefs,
    contentQuality: 'authored-draft',
    front: 'Why does stable postoperative pain usually come after possible clinical deterioration related to infection?',
    back: 'Pain matters and needs timely care, but hypotension, hypoxia, new confusion, and low urine output can signal life-threatening deterioration and require immediate RN follow-up and escalation.',
    status: 'new',
  },
  {
    id: 'FC-RN-MOC-PRIORITY-CLIENTS-0006',
    examTrack: 'nclex-rn',
    category: 'Leadership / Prioritization / Delegation',
    sourceTopic: 'Safe and Effective Care Environment / Management of Care',
    sourceRefs,
    contentQuality: 'authored-draft',
    front: 'What is a high-confidence miss trap in prioritization questions?',
    back: 'Picking the loudest or most familiar need, such as pain or discharge teaching, instead of the client with the most unstable physiologic cues.',
    status: 'new',
  },
]

export const internalDraftContentFixturesEnabled =
  import.meta.env.VITE_ENABLE_INTERNAL_CONTENT_FIXTURES === 'true'

export const getInternalDraftFixtureQuestions = (examTrack: ExamTrackId): Question[] => {
  if (!internalDraftContentFixturesEnabled) return []
  return internalDraftFixtureQuestionsByTrack[examTrack] ?? []
}

export const getInternalDraftFixtureFlashcards = (): Flashcard[] => {
  if (!internalDraftContentFixturesEnabled) return []
  return internalPriorityClientsFlashcards
}

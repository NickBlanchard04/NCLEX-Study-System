import type { ExamTrackId } from '../app/types'

export interface ExamTrack {
  id: ExamTrackId
  shortName: string
  title: string
  subtitle: string
  status: 'live' | 'content-expansion'
  questionTarget: string
  boards: string[]
  domains: string[]
  systems: string[]
  testingFormats: string[]
  resources: string[]
  diagnosticDimensions: string[]
}

export const examTracks: ExamTrack[] = [
  {
    id: 'nclex-rn',
    shortName: 'NCLEX-RN',
    title: 'NCLEX-RN Registered Nurse Prep',
    subtitle: 'Clinical judgment, patient safety, prioritization, delegation, and Next Gen NCLEX-style practice.',
    status: 'live',
    questionTarget: 'Core NCLEX-style question bank active',
    boards: ['NCSBN NCLEX-RN'],
    domains: ['Management of Care', 'Safety and Infection Control', 'Health Promotion', 'Psychosocial Integrity', 'Physiological Integrity'],
    systems: ['Fundamentals', 'Pharmacology', 'Med-Surg', 'Pediatrics', 'OB', 'Mental Health', 'Leadership'],
    testingFormats: ['Multiple choice', 'Select all that apply', 'Prioritization', 'Delegation', 'Case study', 'Clinical judgment'],
    resources: ['Strategy training', 'Quick Study', 'Exam simulation', 'Weak-area remediation', 'Spaced flashcards'],
    diagnosticDimensions: ['Category accuracy', 'Confidence mismatch', 'High-confidence misses', 'Daily progress', 'Readiness trend'],
  },
  {
    id: 'nclex-pn',
    shortName: 'NCLEX-PN',
    title: 'NCLEX-PN Practical Nurse Prep',
    subtitle: 'PN-scope safety, medication administration, foundational care, and practical-nursing decision-making.',
    status: 'content-expansion',
    questionTarget: 'PN-specific scope bank planned',
    boards: ['NCSBN NCLEX-PN'],
    domains: ['Coordinated Care', 'Safety and Infection Control', 'Health Promotion', 'Psychosocial Integrity', 'Physiological Integrity'],
    systems: ['Fundamentals', 'Medication Administration', 'Adult Care', 'Maternal-Newborn', 'Pediatrics', 'Mental Health'],
    testingFormats: ['Multiple choice', 'Select all that apply', 'Priority care', 'Scope-of-practice decisions', 'Clinical scenario'],
    resources: ['PN scope guide', 'Medication safety cards', 'Basic care plans', 'Delegation boundaries', 'Timed PN practice'],
    diagnosticDimensions: ['PN scope accuracy', 'Medication safety', 'Care coordination', 'Stable vs unstable decisions'],
  },
  {
    id: 'fnp',
    shortName: 'FNP',
    title: 'Family Nurse Practitioner Board Prep',
    subtitle: 'AANP and ANCC blueprint coverage with primary care, diagnosis, management, prescribing, and clinical reasoning.',
    status: 'content-expansion',
    questionTarget: '1,100+ FNP practice questions target',
    boards: ['AANP', 'ANCC'],
    domains: ['Assessment', 'Diagnosis', 'Planning', 'Implementation', 'Evaluation', 'Professional Role'],
    systems: ['Cardiology', 'Pulmonary', 'Endocrine', 'Psychiatry', 'Women’s Health', 'Pediatrics', 'Pharmacology', 'Geriatrics'],
    testingFormats: ['Custom practice tests', 'Tutor mode', 'Timed mode', 'Unused questions', 'Incorrect-question retakes', 'Board-specific practice'],
    resources: [
      'AANP & ANCC blueprint map',
      'In-depth answer explanations',
      'Specialist NP-authored rationales',
      'Vivid clinical illustration slots',
      'Spaced-repetition flashcards',
      'Digital notebook',
      'One-time reset option',
      'Mobile-access layout',
    ],
    diagnosticDimensions: ['Domain', 'Body system', 'Board blueprint', 'Question status', 'Tutor vs timed performance', 'Retention'],
  },
  {
    id: 'ccma',
    shortName: 'CCMA',
    title: 'Certified Clinical Medical Assistant Prep',
    subtitle: 'Clinical assisting, EKG, phlebotomy, patient care, admin workflow, and safety fundamentals.',
    status: 'content-expansion',
    questionTarget: 'CCMA question bank planned',
    boards: ['NHA CCMA-style coverage'],
    domains: ['Foundational Knowledge', 'Clinical Patient Care', 'Patient Care Coordination', 'Administrative Assisting', 'Communication', 'Safety'],
    systems: ['EKG', 'Phlebotomy', 'Vital Signs', 'Infection Control', 'Medical Terminology', 'Billing Basics'],
    testingFormats: ['Multiple choice', 'Scenario questions', 'Procedure sequencing', 'Terminology recall', 'Safety checks'],
    resources: ['Procedure checklists', 'Medical terminology cards', 'EKG basics', 'Phlebotomy order of draw', 'Patient intake workflows'],
    diagnosticDimensions: ['Procedure readiness', 'Terminology accuracy', 'Safety misses', 'Admin vs clinical performance'],
  },
]

export const getExamTrack = (id: ExamTrackId) =>
  examTracks.find((track) => track.id === id) ?? examTracks[0]


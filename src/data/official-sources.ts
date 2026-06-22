import type { ExamTrackId } from '../app/types'

export interface OfficialExamSource {
  id: string
  examTrack: ExamTrackId
  publisher: string
  label: string
  url: string
  sourceType: 'test-plan' | 'content-outline' | 'blueprint' | 'candidate-resource'
  effectiveWindow?: string
  notes: string
}

export const officialExamSources: Record<ExamTrackId, OfficialExamSource[]> = {
  'nclex-rn': [
    {
      id: 'ncsbn-2026-rn-test-plan',
      examTrack: 'nclex-rn',
      publisher: 'NCSBN',
      label: '2026 NCLEX-RN Test Plan',
      url: 'https://www.ncsbn.org/public-files/2026_RN_Test-Plan_English-F.pdf',
      sourceType: 'test-plan',
      effectiveWindow: 'Effective April 1, 2026 through March 31, 2029',
      notes: 'Official RN client-needs categories, clinical judgment guidance, sample item formats, and item-writing guidance.',
    },
    {
      id: 'ncsbn-test-plans-page',
      examTrack: 'nclex-rn',
      publisher: 'NCSBN',
      label: 'NCLEX Test Plans Library',
      url: 'https://www.ncsbn.org/exams/testplans.page',
      sourceType: 'candidate-resource',
      effectiveWindow: 'Current public NCLEX test-plan hub',
      notes: 'Public landing page for current RN and PN test-plan downloads and effective windows.',
    },
  ],
  'nclex-pn': [
    {
      id: 'ncsbn-2026-pn-test-plan',
      examTrack: 'nclex-pn',
      publisher: 'NCSBN',
      label: '2026 NCLEX-PN Test Plan',
      url: 'https://ncsbn.org/public-files/2026_PN_Test%20Plan-F.pdf',
      sourceType: 'test-plan',
      effectiveWindow: 'Effective April 1, 2026 through March 31, 2029',
      notes: 'Official PN client-needs categories, clinical judgment guidance, sample item formats, and item-writing guidance.',
    },
    {
      id: 'ncsbn-pn-publication',
      examTrack: 'nclex-pn',
      publisher: 'NCSBN',
      label: '2026 NCLEX-PN Test Plan Publication',
      url: 'https://www.ncsbn.org/publications/2026-nclex-pn-test-plan',
      sourceType: 'candidate-resource',
      effectiveWindow: 'Published 2025',
      notes: 'NCSBN publication page describing the PN test plan and download route.',
    },
  ],
  teas: [
    {
      id: 'ati-teas-exam-details',
      examTrack: 'teas',
      publisher: 'ATI',
      label: 'ATI TEAS Exam Details',
      url: 'https://www.atitesting.com/teas/exam-details',
      sourceType: 'content-outline',
      effectiveWindow: 'TEAS Version 7',
      notes: 'Public ATI section timing, section names, question counts, and covered subcontent areas.',
    },
    {
      id: 'ati-teas7-content-outline',
      examTrack: 'teas',
      publisher: 'ATI',
      label: 'ATI TEAS Version 7 Content Outline',
      url: 'https://www.atitesting.com/docs/default-source/teas-resources/ati_teas7_content_outline.pdf?sfvrsn=a043f912_3%2F',
      sourceType: 'content-outline',
      effectiveWindow: 'TEAS Version 7',
      notes: 'Public ATI outline for Reading, Math, Science, and English and Language Usage.',
    },
  ],
  fnp: [
    {
      id: 'aanpcb-fnp-blueprint',
      examTrack: 'fnp',
      publisher: 'AANPCB / NPCB',
      label: 'FNP Examination Blueprint',
      url: 'https://www.aanpcert.org/certs/fnp',
      sourceType: 'blueprint',
      effectiveWindow: '2024 FNP examination blueprint',
      notes: 'Public AANPCB/NPCB FNP domain, task, and lifespan distribution blueprint.',
    },
    {
      id: 'ancc-fnp-certification-page',
      examTrack: 'fnp',
      publisher: 'ANCC',
      label: 'Family Nurse Practitioner Certification',
      url: 'https://www.nursingworld.org/our-certifications/family-nurse-practitioner/',
      sourceType: 'candidate-resource',
      effectiveWindow: 'Includes current and upcoming test content outlines',
      notes: 'ANCC source page for FNP test content outlines, reference lists, sample questions, and candidate resources.',
    },
    {
      id: 'ancc-fnp-2022-outline',
      examTrack: 'fnp',
      publisher: 'ANCC',
      label: 'FNP Test Content Outline',
      url: 'https://www.nursingworld.org/globalassets/certification/certification-specialty-pages/resources/test-content-outlines/ancc-22-fnp-tco-2021-final-for-web-posting_updated-08122022.pdf',
      sourceType: 'content-outline',
      effectiveWindow: 'Effective September 28, 2022',
      notes: 'ANCC FNP domain percentages, question counts, and secondary classifications.',
    },
  ],
  ccma: [
    {
      id: 'nha-ccma-2022-test-plan',
      examTrack: 'ccma',
      publisher: 'NHA',
      label: 'Certified Clinical Medical Assistant Test Plan',
      url: 'https://www.nhanow.com/docs/default-source/test-plans/nha_ccma_test_plan_2022.pdf',
      sourceType: 'test-plan',
      effectiveWindow: 'Based on 2022 job analysis',
      notes: 'Official NHA CCMA domain outline, scored/pretest item counts, time limit, and detailed task/knowledge statements.',
    },
    {
      id: 'nha-exam-test-plans',
      examTrack: 'ccma',
      publisher: 'NHA',
      label: 'NHA Exam Test Plans',
      url: 'https://knowledge.nhanow.com/nha-exam-test-plans',
      sourceType: 'candidate-resource',
      effectiveWindow: 'Current public NHA test-plan hub',
      notes: 'NHA page for exam blueprints and test outlines across certifications.',
    },
  ],
}

export const getOfficialExamSources = (examTrack: ExamTrackId) => officialExamSources[examTrack]

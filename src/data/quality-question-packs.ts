import type { AnswerChoice, ExamTrackId, Question, QuestionDifficultyProfile } from '../app/types'

const makeChoices = (...choices: string[]): AnswerChoice[] =>
  choices.map((text, index) => ({
    id: String.fromCharCode(65 + index),
    text,
  }))

type QualityQuestion = Question & {
  contentQuality: 'sme-review-ready'
  authorType: 'clinical-editor-draft'
  sourceTopic: string
  testTakingTrap: string
  blueprintMapped: true
  sourceBacked: true
  updatedAt: string
}

const qualityQuestion = (
  question: Omit<QualityQuestion, 'blueprintMapped' | 'sourceBacked' | 'updatedAt' | 'sourceTopic' | 'testTakingTrap'> &
    Partial<Pick<QualityQuestion, 'sourceTopic' | 'testTakingTrap'>>,
): QualityQuestion => ({
  blueprintMapped: true,
  sourceBacked: true,
  sourceTopic: `${question.category} / ${question.subcategory}`,
  testTakingTrap: question.rationale.whyOthers,
  updatedAt: '2026-06-18',
  difficultyProfile: inferQualityDifficultyProfile(question),
  ...question,
})

const inferQualityDifficultyProfile = (
  question: Pick<Question, 'difficulty' | 'format'> & { scenario?: string },
): QuestionDifficultyProfile => {
  if (question.scenario) return 'case-based'
  if (question.format === 'select-all-that-apply') return 'trap-heavy'
  if (question.difficulty === 'advanced') return 'hard-mode'
  return 'standard'
}

const refs = {
  nclex: ['NCSBN 2026 NCLEX test plan'],
  teas: ['ATI TEAS 7 public exam details and content areas'],
  fnp: ['AANPCB FNP blueprint', 'ANCC FNP test content outline'],
  ccma: ['NHA CCMA test plan'],
}

const nclexRnQuestions: QualityQuestion[] = [
  qualityQuestion({
    id: 'rn-quality-001',
    examTrack: 'nclex-rn',
    category: 'Management of Care',
    domain: 'Management of Care',
    system: 'Prioritization',
    board: 'NCSBN NCLEX-RN',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.nclex,
    subcategory: 'Change in condition',
    difficulty: 'advanced',
    format: 'multiple-choice',
    scenario:
      'The nurse receives report on four clients. One client with heart failure has new confusion and crackles halfway up both lung fields.',
    prompt: 'Which client should the nurse assess first?',
    choices: makeChoices(
      'The client with heart failure who has new confusion and crackles.',
      'The client requesting discharge teaching after an uncomplicated appendectomy.',
      'The client with chronic arthritis asking for a scheduled analgesic.',
      'The client awaiting routine morning laboratory collection.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'New confusion plus crackles suggests worsening oxygenation/perfusion and possible acute decompensation, so this client is the priority.',
      whyOthers:
        'Teaching, scheduled comfort care, and routine labs matter but do not indicate the same immediate physiologic threat.',
    },
    nclexTip: 'Prioritize the client with active deterioration over routine needs, even when the routine need is important.',
    clinicalRelevance:
      'Early recognition of worsening heart failure can prevent respiratory failure and higher-level rescue.',
    tags: ['priority', 'heart failure', 'oxygenation', 'clinical judgment'],
  }),
  qualityQuestion({
    id: 'rn-quality-002',
    examTrack: 'nclex-rn',
    category: 'Safety and Infection Control',
    domain: 'Safety and Infection Control',
    system: 'Infection Prevention',
    board: 'NCSBN NCLEX-RN',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.nclex,
    subcategory: 'Isolation precautions',
    difficulty: 'developing',
    format: 'select-all-that-apply',
    scenario: 'A client is admitted with profuse watery diarrhea and suspected Clostridioides difficile infection.',
    prompt: 'Which actions should the nurse implement? Select all that apply.',
    choices: makeChoices(
      'Place the client on contact precautions.',
      'Use soap and water for hand hygiene after care.',
      'Clean high-touch surfaces with an approved sporicidal disinfectant.',
      'Use alcohol-based sanitizer as the only required hand hygiene.',
      'Share a bedside commode with another client who has diarrhea.',
    ),
    correctAnswer: ['A', 'B', 'C'],
    rationale: {
      whyCorrect:
        'C. difficile requires contact precautions, soap-and-water hand hygiene, and sporicidal environmental cleaning to reduce spore transmission.',
      whyOthers:
        'Alcohol sanitizer alone is not preferred for spores, and shared equipment increases transmission risk.',
    },
    nclexTip: 'Infection-control SATA items reward matching the organism to the correct transmission controls.',
    clinicalRelevance:
      'Strict isolation practice protects vulnerable patients and reduces unit outbreaks.',
    tags: ['infection control', 'C difficile', 'SATA', 'safety'],
  }),
]

const nclexPnQuestions: QualityQuestion[] = [
  qualityQuestion({
    id: 'pn-quality-001',
    examTrack: 'nclex-pn',
    category: 'Coordinated Care',
    domain: 'Coordinated Care',
    system: 'Scope of Practice',
    board: 'NCSBN NCLEX-PN',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.nclex,
    subcategory: 'Reporting changes',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A practical nurse is caring for a stable postoperative client. The client suddenly reports shortness of breath and has a respiratory rate of 30/min.',
    prompt: 'What should the PN do first?',
    choices: makeChoices(
      'Stay with the client, collect focused respiratory data, and notify the RN immediately.',
      'Document the finding and reassess at the next scheduled vital-sign time.',
      'Teach the client pursed-lip breathing and leave to notify dietary.',
      'Ask the UAP to decide whether oxygen is needed.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'A sudden respiratory change is not predictable care. The PN should collect focused data, maintain safety, and promptly notify the RN.',
      whyOthers:
        'Waiting, leaving for unrelated tasks, or delegating clinical judgment delays escalation for a potentially unstable client.',
    },
    nclexTip: 'NCLEX-PN scope questions often turn on recognizing when predictable care has become a change in condition.',
    clinicalRelevance:
      'Prompt PN-to-RN escalation is a major safety behavior in team nursing.',
    tags: ['PN scope', 'respiratory', 'reporting', 'priority'],
  }),
  qualityQuestion({
    id: 'pn-quality-002',
    examTrack: 'nclex-pn',
    category: 'Medication Administration',
    domain: 'Physiological Integrity',
    system: 'Medication Administration',
    board: 'NCSBN NCLEX-PN',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.nclex,
    subcategory: 'Insulin safety',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'The PN is preparing to administer rapid-acting insulin. The breakfast tray has not arrived, and the client reports feeling shaky.',
    prompt: 'Which action is safest?',
    choices: makeChoices(
      'Check the blood glucose and hold administration until food availability and results are clarified.',
      'Administer the insulin now because rapid-acting insulin works quickly.',
      'Ask the family to bring food later and proceed with the dose.',
      'Document refusal even though the client did not refuse the medication.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Rapid-acting insulin without confirmed food intake can worsen hypoglycemia. The PN should verify glucose and clarify timing before giving it.',
      whyOthers:
        'Giving the medication without food or data increases risk, and documenting refusal is inaccurate.',
    },
    nclexTip: 'Medication safety questions often reward pausing when timing, labs, or symptoms do not match safe administration.',
    clinicalRelevance:
      'Bedside medication checks prevent avoidable hypoglycemia in inpatient and long-term care settings.',
    tags: ['insulin', 'medication safety', 'hypoglycemia'],
  }),
]

const fnpQuestions: QualityQuestion[] = [
  qualityQuestion({
    id: 'fnp-quality-001',
    examTrack: 'fnp',
    category: 'Diagnosis',
    domain: 'Diagnosis',
    system: 'Cardiology',
    board: 'AANP',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.fnp,
    subcategory: 'Chest pain differential',
    difficulty: 'advanced',
    format: 'multiple-choice',
    scenario:
      'A 58-year-old patient reports substernal chest pressure radiating to the jaw for 20 minutes with diaphoresis and nausea. Blood pressure is 162/92 mm Hg.',
    prompt: 'Which action is the best next step?',
    choices: makeChoices(
      'Activate emergency evaluation for possible acute coronary syndrome.',
      'Schedule an outpatient lipid panel and follow up in 2 weeks.',
      'Prescribe a proton pump inhibitor for presumed reflux.',
      'Reassure the patient because nausea commonly accompanies anxiety.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'The symptom pattern is concerning for acute coronary syndrome and requires urgent emergency evaluation rather than outpatient workup.',
      whyOthers:
        'Delayed testing, empiric reflux treatment, or reassurance misses a potentially life-threatening diagnosis.',
    },
    nclexTip: 'FNP board questions often test whether you recognize red flags that move care from clinic to emergency evaluation.',
    clinicalRelevance:
      'Primary care clinicians must rapidly identify symptoms that require emergency referral instead of routine office management.',
    tags: ['cardiology', 'AANP', 'acute coronary syndrome', 'red flags'],
  }),
  qualityQuestion({
    id: 'fnp-quality-002',
    examTrack: 'fnp',
    category: 'Implementation',
    domain: 'Implementation',
    system: 'Endocrine',
    board: 'ANCC',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.fnp,
    subcategory: 'Diabetes medication safety',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A patient with type 2 diabetes has an A1C of 8.4%. The eGFR is 24 mL/min/1.73 m2. The patient asks about starting metformin.',
    prompt: 'Which response is most appropriate?',
    choices: makeChoices(
      'Explain that metformin is generally avoided at this level of renal function and discuss safer alternatives.',
      'Start metformin at the maximum dose because the A1C is above goal.',
      'Prescribe metformin only on days when the patient eats breakfast.',
      'Tell the patient renal function does not affect diabetes medication selection.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Low eGFR substantially changes metformin safety. The NP should avoid unsafe prescribing and choose therapy appropriate for renal function.',
      whyOthers:
        'Maximum dosing or ignoring renal function increases harm; meal timing does not correct the renal safety issue.',
    },
    nclexTip: 'FNP pharmacology questions often hinge on contraindications, renal function, pregnancy status, or drug interactions.',
    clinicalRelevance:
      'Safe prescribing requires pairing the diagnosis with patient-specific labs and risk factors.',
    tags: ['endocrine', 'ANCC', 'pharmacology', 'renal dosing'],
  }),
]

const teasQuestions: QualityQuestion[] = [
  qualityQuestion({
    id: 'teas-quality-001',
    examTrack: 'teas',
    category: 'Science',
    domain: 'Science',
    system: 'Human Anatomy and Physiology',
    board: 'ATI TEAS 7 public exam blueprint',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.teas,
    subcategory: 'Cellular respiration',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A pre-nursing student is reviewing cell organelles before a timed TEAS science section.',
    prompt: 'Which organelle is most directly responsible for producing most of the cell\'s ATP?',
    choices: makeChoices(
      'Mitochondrion',
      'Golgi apparatus',
      'Ribosome',
      'Lysosome',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'The mitochondrion is the primary site of aerobic cellular respiration, which produces most ATP used for cellular energy.',
      whyOthers:
        'The Golgi apparatus modifies and packages products, ribosomes synthesize proteins, and lysosomes contain digestive enzymes.',
    },
    nclexTip: 'TEAS science rewards matching structure to function, not just recognizing vocabulary.',
    clinicalRelevance:
      'Cell energy concepts support later understanding of oxygenation, perfusion, and tissue injury in nursing coursework.',
    tags: ['TEAS', 'science', 'A&P', 'cell organelles', 'ATP'],
  }),
  qualityQuestion({
    id: 'teas-quality-002',
    examTrack: 'teas',
    category: 'Mathematics',
    domain: 'Mathematics',
    system: 'Measurement and Data',
    board: 'ATI TEAS 7 public exam blueprint',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.teas,
    subcategory: 'Unit conversion',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A student is checking a dosage-calculation style conversion during TEAS math practice.',
    prompt: 'A medication label lists 0.75 grams. How many milligrams is this?',
    choices: makeChoices(
      '750 mg',
      '75 mg',
      '7.5 mg',
      '7,500 mg',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'One gram equals 1,000 milligrams, so 0.75 g x 1,000 = 750 mg.',
      whyOthers:
        '75 mg and 7.5 mg move the decimal too far left; 7,500 mg moves it too far right.',
    },
    nclexTip: 'Estimate before calculating: less than 1 gram should be less than 1,000 mg but more than 100 mg when it is 0.75 g.',
    clinicalRelevance:
      'Accurate metric conversion is foundational for safe dosage calculations in nursing school.',
    tags: ['TEAS', 'math', 'measurement', 'metric conversion'],
  }),
  qualityQuestion({
    id: 'teas-quality-003',
    examTrack: 'teas',
    category: 'Reading',
    domain: 'Reading',
    system: 'Key Ideas and Details',
    board: 'ATI TEAS 7 public exam blueprint',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.teas,
    subcategory: 'Main idea',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A passage explains that sleep supports memory consolidation, immune function, and emotional regulation. It also notes that chronic sleep restriction can impair attention and decision-making.',
    prompt: 'Which statement best captures the main idea of the passage?',
    choices: makeChoices(
      'Sleep contributes to several body and brain functions that affect daily performance.',
      'Memory consolidation is the only proven benefit of sleep.',
      'Sleep restriction improves decision-making when stress is high.',
      'Immune function is unrelated to sleep habits.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'The passage describes multiple benefits of sleep and connects poor sleep with impaired performance.',
      whyOthers:
        'The other options are too narrow or directly contradict the passage.',
    },
    nclexTip: 'For reading main-idea items, choose the answer broad enough to cover the whole passage but specific enough to match its focus.',
    clinicalRelevance:
      'Nursing students use main-idea reading skills to interpret textbooks, patient education, and policy information accurately.',
    tags: ['TEAS', 'reading', 'main idea', 'evidence'],
  }),
  qualityQuestion({
    id: 'teas-quality-004',
    examTrack: 'teas',
    category: 'English and Language Usage',
    domain: 'English and Language Usage',
    system: 'Conventions of Standard English',
    board: 'ATI TEAS 7 public exam blueprint',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.teas,
    subcategory: 'Subject-verb agreement',
    difficulty: 'foundation',
    format: 'multiple-choice',
    prompt: 'Which sentence uses correct subject-verb agreement?',
    choices: makeChoices(
      'The list of symptoms includes fever, cough, and fatigue.',
      'The list of symptoms include fever, cough, and fatigue.',
      'The symptoms in the list includes fever, cough, and fatigue.',
      'The nurse and the patient discusses the symptoms.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'The subject is singular, "list," so the singular verb "includes" is correct.',
      whyOthers:
        'The other options mismatch singular and plural subjects with the wrong verb form.',
    },
    nclexTip: 'Ignore prepositional phrases between the subject and verb; identify the true subject first.',
    clinicalRelevance:
      'Clear grammar supports safe documentation, patient instructions, and professional communication.',
    tags: ['TEAS', 'English', 'grammar', 'subject-verb agreement'],
  }),
]

const ccmaQuestions: QualityQuestion[] = [
  qualityQuestion({
    id: 'ccma-quality-001',
    examTrack: 'ccma',
    category: 'Clinical Patient Care',
    domain: 'Clinical Patient Care',
    system: 'Vital Signs',
    board: 'NHA CCMA-style coverage',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.ccma,
    subcategory: 'Abnormal vital sign escalation',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'During rooming, a medical assistant obtains a blood pressure of 198/112 mm Hg. The patient reports a severe headache.',
    prompt: 'What should the medical assistant do?',
    choices: makeChoices(
      'Notify the provider or licensed clinician immediately and keep the patient safe.',
      'Tell the patient to drive home and rest.',
      'Diagnose hypertension and prescribe medication.',
      'Delete the reading because it is probably an error.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'A severely elevated blood pressure with symptoms is an urgent finding. The assistant should report immediately and stay within scope.',
      whyOthers:
        'Sending the patient away, diagnosing, prescribing, or deleting data is unsafe and outside scope.',
    },
    nclexTip: 'CCMA questions often test abnormal finding recognition and proper escalation, not independent diagnosis.',
    clinicalRelevance:
      'Front-office and rooming workflows can identify patients who need immediate clinical attention.',
    tags: ['vital signs', 'scope', 'high risk', 'CCMA'],
  }),
  qualityQuestion({
    id: 'ccma-quality-002',
    examTrack: 'ccma',
    category: 'Safety',
    domain: 'Safety',
    system: 'Phlebotomy',
    board: 'NHA CCMA-style coverage',
    contentQuality: 'sme-review-ready',
    authorType: 'clinical-editor-draft',
    sourceRefs: refs.ccma,
    subcategory: 'Specimen identification',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A medical assistant collects a blood specimen. Another patient label is found on the counter beside the tubes.',
    prompt: 'Which action is safest?',
    choices: makeChoices(
      'Stop and verify the patient identifiers and specimen labels before sending the sample.',
      'Send the specimen because the tubes look correct.',
      'Ask another patient to confirm the label.',
      'Guess the correct label based on appointment order.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Specimen identity must be verified before processing. Labeling errors can lead to wrong results and patient harm.',
      whyOthers:
        'Visual guessing, appointment order, or another patient’s input cannot safely verify specimen identity.',
    },
    nclexTip: 'When identifiers are uncertain, stop the workflow and verify before continuing.',
    clinicalRelevance:
      'Accurate specimen labeling is a core outpatient safety process.',
    tags: ['phlebotomy', 'specimen', 'patient identifiers', 'safety'],
  }),
]

export const qualityQuestionPacks: Record<ExamTrackId, QualityQuestion[]> = {
  'nclex-rn': nclexRnQuestions,
  'nclex-pn': nclexPnQuestions,
  teas: teasQuestions,
  fnp: fnpQuestions,
  ccma: ccmaQuestions,
}

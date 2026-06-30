import type {
  AnswerChoice,
  ExamTrackId,
  Flashcard,
  Question,
  QuestionCategory,
  QuestionDifficultyProfile,
  StrategyLesson,
} from '../app/types'
import { examTracks, getExamTrack } from './exam-tracks'
import {
  getInternalDraftFixtureFlashcards,
  getInternalDraftFixtureQuestions,
} from './internal-draft-fixtures'
import { qualityQuestionPacks } from './quality-question-packs'

const makeChoices = (...choices: string[]): AnswerChoice[] =>
  choices.map((text, index) => ({
    id: String.fromCharCode(65 + index),
    text,
  }))

type QuestionDraft = Omit<Question, 'examTrack'> & Partial<Pick<Question, 'examTrack' | 'domain' | 'system' | 'board'>>

const inferDifficultyProfile = (question: Pick<Question, 'difficulty' | 'format'> & { scenario?: string }): QuestionDifficultyProfile => {
  if (question.scenario) return 'case-based'
  if (question.format === 'select-all-that-apply') return 'trap-heavy'
  if (question.difficulty === 'advanced') return 'hard-mode'
  return 'standard'
}

const q = (question: QuestionDraft): Question => ({
  examTrack: 'nclex-rn',
  domain: question.category,
  system: question.subcategory,
  board: 'NCSBN NCLEX-RN',
  contentQuality: 'authored-draft',
  authorType: 'clinical-editor-draft',
  sourceRefs: ['NCSBN 2026 NCLEX test plan'],
  sourceTopic: `${question.category} / ${question.subcategory}`,
  testTakingTrap: 'Choosing a routine task before stabilizing or assessing the immediate safety issue.',
  blueprintMapped: true,
  sourceBacked: true,
  updatedAt: '2026-06-18',
  difficultyProfile: inferDifficultyProfile(question),
  ...question,
})

export const categories: QuestionCategory[] = [
  'Fundamentals & Safety',
  'Pharmacology',
  'Adult Health / Med-Surg',
  'Maternal-Newborn',
  'Pediatrics',
  'Mental Health',
  'Leadership / Prioritization / Delegation',
  'Lab Values / Clinical Judgment',
]

const nclexRnBaseQuestions: Question[] = [
  q({
    id: 'fund-1',
    category: 'Fundamentals & Safety',
    subcategory: 'Post-op safety',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A client is 8 hours post-op after an abdominal hysterectomy and reports dizziness when standing.',
    prompt: 'What is the nurse’s first action?',
    choices: makeChoices(
      'Ambulate the client quickly to build tolerance.',
      'Assist the client back to bed and obtain orthostatic vital signs.',
      'Offer a PRN opioid for incisional pain.',
      'Document the finding as expected after surgery.',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'Dizziness with position changes raises concern for orthostatic hypotension and fall risk, so stabilizing the client and assessing circulation comes first.',
      whyOthers:
        'Rapid ambulation increases fall risk, pain medication does not address the safety issue, and documenting without intervention delays assessment of a potentially unstable patient.',
    },
    nclexTip: 'When safety and assessment compete with comfort, stabilize and assess first.',
    clinicalRelevance:
      'New nurses frequently prevent injuries by pausing mobility plans when a patient shows signs of hemodynamic instability.',
    tags: ['falls', 'orthostatic hypotension', 'post-op'],
  }),
  q({
    id: 'fund-2',
    category: 'Fundamentals & Safety',
    subcategory: 'Central line care',
    difficulty: 'developing',
    format: 'select-all-that-apply',
    prompt: 'Which actions should the nurse include to reduce central-line associated bloodstream infection risk?',
    choices: makeChoices(
      'Scrub the hub before accessing the line.',
      'Change dressings using sterile technique.',
      'Disconnect tubing routinely to assess the site more closely.',
      'Review whether the line is still needed each day.',
      'Use clean gloves instead of sterile gloves for dressing changes.',
    ),
    correctAnswer: ['A', 'B', 'D'],
    rationale: {
      whyCorrect:
        'Hub disinfection, sterile dressing care, and daily necessity review directly lower CLABSI risk by limiting contamination and unnecessary device days.',
      whyOthers:
        'Routine disconnection increases contamination risk, and sterile gloves are appropriate for sterile dressing changes rather than clean gloves alone.',
    },
    nclexTip: 'For SATA, verify each option independently instead of hunting for a pattern.',
    clinicalRelevance:
      'Device maintenance is a daily patient safety task that meaningfully changes infection rates on inpatient units.',
    tags: ['infection prevention', 'central line', 'SATA'],
  }),
  q({
    id: 'fund-3',
    category: 'Fundamentals & Safety',
    subcategory: 'Respiratory depression',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A postoperative client received IV morphine 20 minutes ago. The respiratory rate is now 8/min and oxygen saturation is 89% on room air.',
    prompt: 'Which action should the nurse take first?',
    choices: makeChoices(
      'Apply oxygen and stimulate the client while assessing responsiveness.',
      'Document the finding and reassess in 30 minutes.',
      'Administer the next scheduled dose of pain medication later than planned.',
      'Encourage the client to cough and deep breathe independently.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'This client may be experiencing opioid-induced respiratory depression, so the nurse first supports airway and breathing while preparing for further intervention.',
      whyOthers:
        'Waiting delays response to hypoventilation, adjusting future pain medication does not address the current emergency, and independent coughing is unrealistic when the client is sedated.',
    },
    nclexTip: 'A breathing problem moves to the front of the line, even when another explanation seems obvious.',
    clinicalRelevance:
      'Recognizing early opioid oversedation prevents rapid deterioration and the need for higher-level rescue.',
    tags: ['airway', 'opioids', 'first action'],
  }),
  q({
    id: 'fund-4',
    category: 'Fundamentals & Safety',
    subcategory: 'Restraints',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A confused older adult is attempting to climb out of bed repeatedly after admission with pneumonia.',
    prompt: 'Which intervention should the nurse try before requesting restraints?',
    choices: makeChoices(
      'Ask the provider to prescribe bilateral wrist restraints.',
      'Place the client near the nurses’ station and use a bed alarm.',
      'Lower the bed rails on both sides and leave the room dark.',
      'Administer a sedative to ensure the client sleeps through the night.',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'Least restrictive safety measures such as closer observation and a bed alarm should be attempted before restraints.',
      whyOthers:
        'Restraints are not first-line, dark isolation can worsen delirium, and sedation for convenience increases fall and aspiration risk.',
    },
    nclexTip: 'On restraint questions, look for the safest least restrictive option.',
    clinicalRelevance:
      'Delirious patients do better with environmental support and observation than with reflexive restraint use.',
    tags: ['restraints', 'delirium', 'safety'],
  }),
  q({
    id: 'fund-5',
    category: 'Fundamentals & Safety',
    subcategory: 'Fire safety',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'Smoke is coming from a trash can in a client room while the client is still inside the room.',
    prompt: 'Which action should the nurse take first?',
    choices: makeChoices(
      'Pull the fire alarm.',
      'Rescue the client from the room.',
      'Close the door and windows.',
      'Use the nearest fire extinguisher.',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'The first step in RACE is rescue, so removing the client from immediate danger comes before alarm activation or extinguishing.',
      whyOthers:
        'Alarm, containment, and extinguishing are important, but they follow rescue when a patient is still at risk.',
    },
    nclexTip: 'Memorized frameworks help only when you apply the order exactly under pressure.',
    clinicalRelevance:
      'Emergencies on the floor reward calm sequencing; patient removal often buys the team the time it needs.',
    tags: ['RACE', 'emergency', 'priority'],
  }),
  q({
    id: 'pharm-1',
    category: 'Pharmacology',
    subcategory: 'Cardiac glycosides',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A client scheduled for digoxin has nausea and reports seeing yellow halos around lights. The apical pulse is 54/min.',
    prompt: 'What should the nurse do?',
    choices: makeChoices(
      'Administer the medication with food.',
      'Hold the digoxin and notify the provider.',
      'Recheck the pulse after ambulation.',
      'Give the medication and document the visual changes.',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'Bradycardia plus visual disturbances and nausea suggest possible digoxin toxicity, so the nurse should hold the dose and escalate.',
      whyOthers:
        'Food does not fix toxicity, ambulation could worsen instability, and administering the drug despite toxicity cues is unsafe.',
    },
    nclexTip: 'When medication side effects line up with toxicity, do not “wait and see.”',
    clinicalRelevance:
      'Medication safety often depends on pattern recognition before the drug reaches the patient.',
    tags: ['digoxin', 'toxicity', 'med safety'],
  }),
  q({
    id: 'pharm-2',
    category: 'Pharmacology',
    subcategory: 'Anticoagulation',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A client taking warfarin for atrial fibrillation has today’s INR result of 4.6.',
    prompt: 'Which action is most appropriate?',
    choices: makeChoices(
      'Administer the warfarin and encourage leafy green vegetables.',
      'Hold the dose and notify the provider of the elevated INR.',
      'Give aspirin instead of warfarin today.',
      'Schedule the client for an intramuscular vitamin K injection without notifying anyone.',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'An INR this high increases bleeding risk and warrants holding warfarin with provider notification for further guidance.',
      whyOthers:
        'Giving the dose worsens risk, substituting aspirin adds bleeding risk, and vitamin K requires an order and the IM route can cause hematoma.',
    },
    nclexTip: 'Abnormal lab plus high-risk medication usually means pause first, then clarify.',
    clinicalRelevance:
      'Safe anticoagulation management depends on rapid response to changing lab values.',
    tags: ['warfarin', 'INR', 'bleeding risk'],
  }),
  q({
    id: 'pharm-3',
    category: 'Pharmacology',
    subcategory: 'Insulin',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A client receiving regular insulin becomes diaphoretic, shaky, and confused.',
    prompt: 'Which action should the nurse take first?',
    choices: makeChoices(
      'Check the client’s blood glucose level.',
      'Administer long-acting insulin.',
      'Encourage the client to walk to improve circulation.',
      'Document the symptoms as anxiety.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'These findings suggest hypoglycemia, and confirming the blood glucose quickly guides immediate treatment.',
      whyOthers:
        'Long-acting insulin could worsen hypoglycemia, activity is unsafe, and labeling this anxiety misses a potentially urgent metabolic problem.',
    },
    nclexTip: 'When a medication has a classic adverse effect, confirm the related assessment data promptly.',
    clinicalRelevance:
      'Hypoglycemia can deteriorate fast, so bedside recognition and response matter more than perfect certainty.',
    tags: ['insulin', 'hypoglycemia', 'assessment first'],
  }),
  q({
    id: 'pharm-4',
    category: 'Pharmacology',
    subcategory: 'Obstetric medications',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A client with severe preeclampsia is receiving magnesium sulfate. Deep tendon reflexes are absent and the respiratory rate is 10/min.',
    prompt: 'Which medication should the nurse anticipate administering?',
    choices: makeChoices(
      'Calcium gluconate',
      'Naloxone',
      'Oxytocin',
      'Terbutaline',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Absent reflexes and respiratory depression suggest magnesium toxicity, and calcium gluconate is the antidote.',
      whyOthers:
        'Naloxone reverses opioids, oxytocin treats uterine atony, and terbutaline is used for uterine tachysystole rather than magnesium toxicity.',
    },
    nclexTip: 'Antidote questions become easier when you anchor on the toxicity pattern, not the drug name alone.',
    clinicalRelevance:
      'Magnesium sulfate is common in maternity care, and toxicity recognition protects both parent and fetus.',
    tags: ['magnesium sulfate', 'toxicity', 'obstetrics'],
  }),
  q({
    id: 'pharm-5',
    category: 'Pharmacology',
    subcategory: 'ACE inhibitors',
    difficulty: 'developing',
    format: 'select-all-that-apply',
    prompt: 'Which teaching points should the nurse include for a client starting lisinopril?',
    choices: makeChoices(
      'Rise slowly from sitting or lying positions.',
      'Report swelling of the lips or tongue immediately.',
      'Expect a persistent cough and ignore it.',
      'Use salt substitutes freely.',
      'Monitor for dizziness when beginning therapy.',
    ),
    correctAnswer: ['A', 'B', 'E'],
    rationale: {
      whyCorrect:
        'Orthostatic hypotension, angioedema, and dizziness are important safety concerns with ACE inhibitors.',
      whyOthers:
        'A persistent cough should be reported rather than ignored, and salt substitutes may contain potassium that can worsen hyperkalemia risk.',
    },
    nclexTip: 'Medication teaching answers often combine safety warning signs with practical self-management.',
    clinicalRelevance:
      'Early teaching reduces preventable adverse events once patients leave the controlled inpatient setting.',
    tags: ['ACE inhibitors', 'teaching', 'SATA'],
  }),
  q({
    id: 'adult-1',
    category: 'Adult Health / Med-Surg',
    subcategory: 'Heart failure',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A client with heart failure reports worsening shortness of breath and has new bilateral crackles at the lung bases.',
    prompt: 'Which assessment finding is most concerning?',
    choices: makeChoices(
      'A weight gain of 2.2 lb in 24 hours',
      'Requesting to sleep with one pillow',
      'Dry mucous membranes',
      'Urine output of 900 mL over 24 hours',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Rapid weight gain suggests fluid retention and worsening heart failure, especially when paired with crackles and dyspnea.',
      whyOthers:
        'One pillow is less concerning than orthopnea, dry mucous membranes do not fit the picture, and 900 mL urine output is not the most urgent clue here.',
    },
    nclexTip: 'For chronic disease questions, sudden trend changes matter more than isolated mild findings.',
    clinicalRelevance:
      'Daily weight trends help nurses detect fluid overload before a full respiratory crisis develops.',
    tags: ['heart failure', 'fluid overload', 'trends'],
  }),
  q({
    id: 'adult-2',
    category: 'Adult Health / Med-Surg',
    subcategory: 'Chest tube',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A client with a chest tube after a pneumothorax suddenly has the tubing disconnected from the drainage system.',
    prompt: 'What should the nurse do first?',
    choices: makeChoices(
      'Place the end of the chest tube in sterile water.',
      'Clamp the chest tube immediately.',
      'Remove the chest tube dressing.',
      'Raise the drainage system above the client’s chest.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Placing the tube end in sterile water helps maintain a water seal and reduces the risk of air re-entering the pleural space.',
      whyOthers:
        'Routine clamping can create a tension pneumothorax risk, removing the dressing adds no benefit, and lifting the drainage system impairs drainage.',
    },
    nclexTip: 'Device emergencies usually have one move that preserves the system temporarily until full repair is possible.',
    clinicalRelevance:
      'Knowing the bedside fix for chest tube disconnection prevents panic and buys time for replacement.',
    tags: ['chest tube', 'first action', 'pneumothorax'],
  }),
  q({
    id: 'adult-3',
    category: 'Adult Health / Med-Surg',
    subcategory: 'DKA',
    difficulty: 'advanced',
    format: 'multiple-choice',
    scenario:
      'A client is admitted with diabetic ketoacidosis. Blood glucose is 520 mg/dL, potassium is 4.9 mEq/L, and the client is tachycardic and dry.',
    prompt: 'Which prescription should the nurse expect first?',
    choices: makeChoices(
      'Start isotonic IV fluids.',
      'Administer sodium polystyrene sulfonate.',
      'Give oral hypoglycemic medication.',
      'Restrict fluids until glucose improves.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Initial DKA treatment begins with volume replacement because dehydration and poor perfusion are immediate priorities.',
      whyOthers:
        'The potassium level is not the immediate target, oral agents are not appropriate for acute DKA, and fluid restriction worsens the underlying problem.',
    },
    nclexTip: 'In metabolic emergencies, ask what supports perfusion first before chasing every lab.',
    clinicalRelevance:
      'Early fluid resuscitation is a core step in stabilizing DKA before insulin fully corrects the crisis.',
    tags: ['DKA', 'fluids', 'priority'],
  }),
  q({
    id: 'adult-4',
    category: 'Adult Health / Med-Surg',
    subcategory: 'COPD',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A client with COPD exacerbation has an oxygen saturation of 86% and is visibly dyspneic.',
    prompt: 'Which oxygen delivery method should the nurse anticipate first?',
    choices: makeChoices(
      'Nonrebreather mask at 15 L/min',
      'Nasal cannula at 1 to 2 L/min',
      'Simple face mask at 10 L/min',
      'Venturi mask delivering 60% oxygen immediately for everyone with COPD',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'Low-flow oxygen by nasal cannula is a common cautious starting point while reassessing response in COPD exacerbation.',
      whyOthers:
        'A nonrebreather may overshoot initial needs, a simple mask at 10 L/min is less controlled, and blanket high-concentration oxygen is not the safest first default.',
    },
    nclexTip: 'Do not let a disease label make you ignore the client’s need for oxygen, but start thoughtfully.',
    clinicalRelevance:
      'COPD care balances oxygenation with close reassessment rather than withholding support.',
    tags: ['COPD', 'oxygen', 'assessment'],
  }),
  q({
    id: 'adult-5',
    category: 'Adult Health / Med-Surg',
    subcategory: 'GI bleeding',
    difficulty: 'advanced',
    format: 'select-all-that-apply',
    scenario:
      'A client admitted with an upper GI bleed becomes restless and cool to touch.',
    prompt: 'Which findings support concern for worsening hypovolemic shock?',
    choices: makeChoices(
      'Heart rate of 128/min',
      'Blood pressure of 84/50 mm Hg',
      'Urine output of 15 mL in the last hour',
      'Warm flushed skin',
      'Bounding peripheral pulses',
    ),
    correctAnswer: ['A', 'B', 'C'],
    rationale: {
      whyCorrect:
        'Tachycardia, hypotension, and low urine output are classic indicators of poor perfusion from volume loss.',
      whyOthers:
        'Warm flushed skin and bounding pulses do not fit worsening hypovolemic shock; the client is more likely cool with weak pulses.',
    },
    nclexTip: 'Shock questions reward clustering signs of perfusion failure rather than reacting to one number.',
    clinicalRelevance:
      'Nurses often catch decompensation first by noticing the combination of mental status change, urine drop, and vital sign trends.',
    tags: ['shock', 'GI bleed', 'SATA'],
  }),
  q({
    id: 'ob-1',
    category: 'Maternal-Newborn',
    subcategory: 'Fetal monitoring',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A laboring client has recurrent late decelerations on the fetal monitor.',
    prompt: 'Which action should the nurse take first?',
    choices: makeChoices(
      'Reposition the client to the left side.',
      'Increase the oxytocin infusion.',
      'Prepare for immediate discharge.',
      'Encourage the client to push with each contraction.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Late decelerations suggest uteroplacental insufficiency, and repositioning is an immediate bedside intervention to improve perfusion.',
      whyOthers:
        'Increasing oxytocin can worsen the pattern, discharge is unsafe, and pushing is not the first response to fetal distress.',
    },
    nclexTip: 'For labor strips, start with simple intrauterine resuscitation steps before jumping to advanced actions.',
    clinicalRelevance:
      'Rapid bedside responses to fetal monitor changes can improve fetal oxygenation while the team mobilizes.',
    tags: ['late decelerations', 'fetal monitoring', 'first action'],
  }),
  q({
    id: 'ob-2',
    category: 'Maternal-Newborn',
    subcategory: 'Postpartum hemorrhage',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A postpartum client has a boggy uterus and saturated perineal pad 20 minutes after delivery.',
    prompt: 'Which action should the nurse take first?',
    choices: makeChoices(
      'Massage the fundus.',
      'Call the newborn nursery.',
      'Place the client flat and leave the uterus alone.',
      'Ask the client to ambulate to the bathroom.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'A boggy uterus points to uterine atony, and fundal massage is the immediate first nursing action.',
      whyOthers:
        'Calling elsewhere delays care, leaving the uterus alone ignores the cause, and ambulating an actively bleeding client is unsafe.',
    },
    nclexTip: 'When a postpartum finding points clearly to a cause, choose the action that directly addresses that cause.',
    clinicalRelevance:
      'Quick identification and treatment of uterine atony can prevent severe postpartum hemorrhage.',
    tags: ['postpartum hemorrhage', 'atony', 'priority'],
  }),
  q({
    id: 'ob-3',
    category: 'Maternal-Newborn',
    subcategory: 'Preeclampsia',
    difficulty: 'developing',
    format: 'multiple-choice',
    prompt: 'Which finding in a client with preeclampsia requires immediate provider notification?',
    choices: makeChoices(
      '2+ dependent edema',
      'Persistent severe headache with blurred vision',
      'Mild nausea after breakfast',
      'Urine output of 40 mL/hr',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'Severe headache and visual changes are signs of worsening severe preeclampsia and risk for seizure or cerebral complications.',
      whyOthers:
        'Edema alone is less specific, mild nausea is less urgent, and 40 mL/hr urine output is not the most alarming finding listed.',
    },
    nclexTip: 'Neurologic symptoms in pregnancy often move a question from “watch” to “act now.”',
    clinicalRelevance:
      'Escalating severe preeclampsia promptly helps prevent maternal and fetal injury.',
    tags: ['preeclampsia', 'warning signs', 'maternal safety'],
  }),
  q({
    id: 'ob-4',
    category: 'Maternal-Newborn',
    subcategory: 'Newborn transition',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A term newborn is jittery 2 hours after birth. The blood glucose is 38 mg/dL.',
    prompt: 'Which intervention should the nurse anticipate first?',
    choices: makeChoices(
      'Initiate feeding promptly per protocol.',
      'Keep the newborn NPO and recheck in 6 hours.',
      'Place the newborn under a warmer only.',
      'Administer oral iron supplements.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'For a stable newborn with low glucose, prompt feeding is a common first step to raise blood sugar.',
      whyOthers:
        'Delaying nutrition prolongs hypoglycemia, warming alone does not correct glucose, and iron is unrelated.',
    },
    nclexTip: 'Newborn questions often reward knowing the first low-tech intervention before the invasive one.',
    clinicalRelevance:
      'Early feeding helps correct transitional hypoglycemia and supports safer newborn adaptation.',
    tags: ['newborn', 'hypoglycemia', 'feeding'],
  }),
  q({
    id: 'ob-5',
    category: 'Maternal-Newborn',
    subcategory: 'Postpartum teaching',
    difficulty: 'developing',
    format: 'select-all-that-apply',
    prompt: 'Which postpartum findings should the nurse teach a client to report immediately after discharge?',
    choices: makeChoices(
      'Heavy bleeding that soaks a pad in an hour',
      'Unilateral calf pain or swelling',
      'Mild fatigue after nighttime feedings',
      'Fever of 100.8°F (38.2°C)',
      'Lochia becoming lighter over time',
    ),
    correctAnswer: ['A', 'B', 'D'],
    rationale: {
      whyCorrect:
        'Heavy bleeding, possible DVT symptoms, and fever are warning signs that require prompt evaluation.',
      whyOthers:
        'Mild fatigue is common, and lochia that lightens over time is an expected recovery trend.',
    },
    nclexTip: 'Discharge teaching questions usually separate expected recovery from red-flag complications.',
    clinicalRelevance:
      'Clear postpartum teaching reduces dangerous delays once clients are home with fewer monitoring supports.',
    tags: ['postpartum teaching', 'SATA', 'warning signs'],
  }),
  q({
    id: 'peds-1',
    category: 'Pediatrics',
    subcategory: 'Epiglottitis',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A child with suspected epiglottitis is drooling, leaning forward, and has inspiratory stridor.',
    prompt: 'Which nursing action is priority?',
    choices: makeChoices(
      'Inspect the throat with a tongue blade.',
      'Keep the child calm and prepare for airway support.',
      'Lay the child flat for a full assessment.',
      'Offer oral fluids to soothe the throat.',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'The airway is the priority in suspected epiglottitis, and minimizing agitation while preparing for advanced airway management is safest.',
      whyOthers:
        'Throat inspection can trigger airway obstruction, lying flat worsens distress, and oral intake increases aspiration risk.',
    },
    nclexTip: 'With pediatric airway threats, avoid actions that agitate the child or instrument the airway unnecessarily.',
    clinicalRelevance:
      'Children can decompensate quickly, so calm airway-focused care is essential.',
    tags: ['epiglottitis', 'airway', 'pediatrics'],
  }),
  q({
    id: 'peds-2',
    category: 'Pediatrics',
    subcategory: 'Dehydration',
    difficulty: 'foundation',
    format: 'multiple-choice',
    prompt: 'Which finding best suggests moderate dehydration in an infant?',
    choices: makeChoices(
      'Tears with crying and moist mucous membranes',
      'Sunken fontanel and decreased wet diapers',
      'Bounding pulses and warm flushed skin',
      'Bradycardia with hypertension',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'A sunken fontanel with fewer wet diapers reflects volume loss and reduced tissue hydration in infants.',
      whyOthers:
        'Moist mucous membranes suggest better hydration, bounding pulses are inconsistent, and bradycardia with hypertension is not the typical dehydration picture.',
    },
    nclexTip: 'Pediatric questions often depend on age-specific signs, not adult dehydration cues alone.',
    clinicalRelevance:
      'Recognizing dehydration early helps nurses intervene before pediatric shock develops.',
    tags: ['dehydration', 'infant', 'assessment'],
  }),
  q({
    id: 'peds-3',
    category: 'Pediatrics',
    subcategory: 'Kawasaki disease',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A child with Kawasaki disease is receiving aspirin and IV immunoglobulin.',
    prompt: 'Which assessment finding is most important for the nurse to monitor long term?',
    choices: makeChoices(
      'Coronary artery complications',
      'Permanent hearing loss',
      'Liver failure in every child',
      'Vision loss from retinal detachment',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Kawasaki disease is closely associated with coronary artery involvement, so cardiac follow-up is crucial.',
      whyOthers:
        'The other complications listed are not the key long-term concern that drives follow-up in Kawasaki disease.',
    },
    nclexTip: 'Some disease questions hinge on the major long-term complication rather than the current rash or fever.',
    clinicalRelevance:
      'Teaching families why cardiology follow-up matters improves continuity after discharge.',
    tags: ['Kawasaki', 'cardiac', 'teaching'],
  }),
  q({
    id: 'peds-4',
    category: 'Pediatrics',
    subcategory: 'Oncology precautions',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A child receiving chemotherapy has an absolute neutrophil count of 400/mm3.',
    prompt: 'Which action should the nurse take?',
    choices: makeChoices(
      'Allow fresh flowers in the room for comfort.',
      'Use neutropenic precautions and monitor for fever.',
      'Schedule live-virus vaccines during hospitalization.',
      'Encourage raw sushi to improve appetite.',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'Severe neutropenia requires infection prevention and vigilant fever monitoring because infection signs may be subtle.',
      whyOthers:
        'Flowers, raw foods, and live vaccines increase infection risk in immunocompromised children.',
    },
    nclexTip: 'When you see neutropenia, think infection prevention before comfort items.',
    clinicalRelevance:
      'Bedside infection prevention is one of the most important nursing roles in pediatric oncology.',
    tags: ['neutropenia', 'infection prevention', 'pediatrics'],
  }),
  q({
    id: 'peds-5',
    category: 'Pediatrics',
    subcategory: 'Heart failure',
    difficulty: 'advanced',
    format: 'select-all-that-apply',
    prompt: 'Which findings would the nurse expect in an infant with heart failure?',
    choices: makeChoices(
      'Poor feeding with diaphoresis',
      'Tachypnea',
      'Weight gain from fluid retention',
      'Bradycardia during crying',
      'Bounding energy during feeds',
    ),
    correctAnswer: ['A', 'B', 'C'],
    rationale: {
      whyCorrect:
        'Infants with heart failure often tire during feeds, breathe fast, and retain fluid as the heart struggles to meet demand.',
      whyOthers:
        'Bradycardia during crying is not expected, and infants in heart failure usually have less endurance rather than more during feeds.',
    },
    nclexTip: 'Translate adult concepts into infant behavior: feeding is often the exertional test.',
    clinicalRelevance:
      'Subtle feeding cues are often the earliest signs of pediatric cardiac compromise.',
    tags: ['heart failure', 'infant', 'SATA'],
  }),
  q({
    id: 'psych-1',
    category: 'Mental Health',
    subcategory: 'Suicide risk',
    difficulty: 'foundation',
    format: 'multiple-choice',
    scenario:
      'A client says, “Everyone would be better off without me.”',
    prompt: 'Which response by the nurse is best?',
    choices: makeChoices(
      '“You should not say things like that.”',
      '“Are you thinking about harming yourself right now?”',
      '“Try to focus on the positive things in life.”',
      '“I will come back later when you feel calmer.”',
    ),
    correctAnswer: ['B'],
    rationale: {
      whyCorrect:
        'Directly assessing suicidal intent is therapeutic and necessary for safety planning.',
      whyOthers:
        'Judgment, false reassurance, and delaying the conversation can shut down disclosure and increase risk.',
    },
    nclexTip: 'Asking directly about suicide does not create the idea; it uncovers risk.',
    clinicalRelevance:
      'Clear suicide assessment is a core nursing safety skill across settings, not just psychiatry units.',
    tags: ['suicide', 'therapeutic communication', 'priority'],
  }),
  q({
    id: 'psych-2',
    category: 'Mental Health',
    subcategory: 'Mania',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A client experiencing mania is loudly interrupting a group session and pacing the room.',
    prompt: 'Which intervention is most appropriate?',
    choices: makeChoices(
      'Set clear, concise limits and redirect to a low-stimulation activity.',
      'Debate the client’s grandiose ideas in front of the group.',
      'Allow unlimited activity to avoid upsetting the client.',
      'Assign the client to lead the group discussion.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Mania responds best to calm, consistent limit setting and reduced stimulation.',
      whyOthers:
        'Public debate escalates conflict, unlimited activity worsens overstimulation, and leadership roles can intensify manic behavior.',
    },
    nclexTip: 'In mania, structure and brevity work better than lengthy reasoning.',
    clinicalRelevance:
      'Behavioral containment protects the client, peers, and unit flow without escalating power struggles.',
    tags: ['mania', 'limit setting', 'environment'],
  }),
  q({
    id: 'psych-3',
    category: 'Mental Health',
    subcategory: 'Alcohol withdrawal',
    difficulty: 'advanced',
    format: 'multiple-choice',
    scenario:
      'A hospitalized client with alcohol use disorder is tremulous, anxious, and diaphoretic 10 hours after the last drink.',
    prompt: 'Which intervention is priority?',
    choices: makeChoices(
      'Assess withdrawal severity and prepare to administer a benzodiazepine per protocol.',
      'Offer coffee to improve alertness.',
      'Encourage the client to walk the hallway alone.',
      'Delay treatment until hallucinations begin.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Alcohol withdrawal can escalate rapidly, and evidence-based symptom assessment followed by benzodiazepine treatment prevents complications such as seizures.',
      whyOthers:
        'Coffee worsens symptoms, unsupervised ambulation is unsafe, and waiting for hallucinations delays needed treatment.',
    },
    nclexTip: 'Withdrawal questions often hinge on preventing the dangerous next step, not reacting after it happens.',
    clinicalRelevance:
      'Early withdrawal management reduces ICU transfer and seizure risk.',
    tags: ['alcohol withdrawal', 'priority', 'safety'],
  }),
  q({
    id: 'psych-4',
    category: 'Mental Health',
    subcategory: 'Psychosis',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A client with schizophrenia says, “The voices are telling me to hurt my roommate.”',
    prompt: 'What should the nurse do first?',
    choices: makeChoices(
      'Ask whether the client has a plan and move the client to a safe setting.',
      'Tell the client the voices are not real and leave the room.',
      'Ignore the statement to avoid reinforcing hallucinations.',
      'Offer art supplies and return in an hour.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Command hallucinations with potential violence create an immediate safety concern, so assessment and environmental protection come first.',
      whyOthers:
        'Dismissing or ignoring the statement delays safety action, and distraction alone is inadequate when there is a threat of harm.',
    },
    nclexTip: 'When hallucinations create a safety threat, treat the safety threat first.',
    clinicalRelevance:
      'Psychiatric nursing is still safety nursing; threat assessment and calm containment matter.',
    tags: ['hallucinations', 'violence risk', 'first action'],
  }),
  q({
    id: 'psych-5',
    category: 'Mental Health',
    subcategory: 'Therapeutic communication',
    difficulty: 'foundation',
    format: 'select-all-that-apply',
    prompt: 'Which nurse statements demonstrate therapeutic communication?',
    choices: makeChoices(
      '“Tell me more about what worries you most right now.”',
      '“Everything will be fine, so don’t think about it.”',
      '“It sounds like you felt ignored during the discharge meeting.”',
      '“Why would you make that choice?”',
      '“We can talk through the next step together.”',
    ),
    correctAnswer: ['A', 'C', 'E'],
    rationale: {
      whyCorrect:
        'Open-ended exploration, reflection, and collaboration are therapeutic and help clients feel heard.',
      whyOthers:
        'False reassurance minimizes concerns, and “why” questions can sound blaming or defensive.',
    },
    nclexTip: 'Therapeutic communication usually sounds calm, curious, and nonjudgmental.',
    clinicalRelevance:
      'The language nurses use often determines whether a client shares the information needed for safe care.',
    tags: ['communication', 'SATA', 'mental health'],
  }),
  q({
    id: 'lead-1',
    category: 'Leadership / Prioritization / Delegation',
    subcategory: 'Prioritization',
    difficulty: 'advanced',
    format: 'multiple-choice',
    prompt: 'Which client should the nurse assess first?',
    choices: makeChoices(
      'A client with pneumonia who now has oxygen saturation of 88% on 2 L nasal cannula',
      'A client scheduled for discharge asking for printed instructions',
      'A client with chronic back pain requesting a PRN analgesic',
      'A client awaiting transport to radiology',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Worsening oxygenation reflects an airway and breathing concern, making this client the priority assessment.',
      whyOthers:
        'The remaining clients have needs, but none are showing current physiologic deterioration.',
    },
    nclexTip: 'When choosing “who first,” unstable respiratory status usually outranks routine workflow tasks.',
    clinicalRelevance:
      'Shift management gets easier when nurses anchor prioritization in deterioration risk rather than task order.',
    tags: ['prioritization', 'airway', 'who first'],
  }),
  q({
    id: 'lead-2',
    category: 'Leadership / Prioritization / Delegation',
    subcategory: 'Delegation',
    difficulty: 'developing',
    format: 'multiple-choice',
    prompt: 'Which task is most appropriate for the nurse to delegate to an experienced LPN/LVN?',
    choices: makeChoices(
      'Initial teaching for a client newly diagnosed with diabetes',
      'Assessment of a client admitted with chest pain',
      'Reinforcement of teaching for a stable client learning colostomy care',
      'Development of the plan of care for a new postoperative admission',
    ),
    correctAnswer: ['C'],
    rationale: {
      whyCorrect:
        'Reinforcement for a stable client is within the common LPN/LVN role, unlike initial assessment, initial teaching, or care planning.',
      whyOthers:
        'The other tasks require RN-level assessment, teaching initiation, or care plan development.',
    },
    nclexTip: 'Delegate stable, predictable, and non-initial tasks.',
    clinicalRelevance:
      'Clear delegation keeps the team efficient without offloading RN judgment responsibilities.',
    tags: ['delegation', 'LPN', 'stable predictable'],
  }),
  q({
    id: 'lead-3',
    category: 'Leadership / Prioritization / Delegation',
    subcategory: 'Assignment',
    difficulty: 'advanced',
    format: 'multiple-choice',
    prompt: 'Which client assignment is best for a float nurse from the postpartum unit?',
    choices: makeChoices(
      'A client 1 day after an uncomplicated vaginal delivery receiving routine care',
      'A client with fresh tracheostomy requiring suctioning',
      'A client with unstable GI bleeding awaiting transfer to ICU',
      'A client with diabetic ketoacidosis on an insulin infusion',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'The uncomplicated postpartum client is the most stable and closely matches the float nurse’s background.',
      whyOthers:
        'The remaining assignments involve high acuity or specialty care that should stay with experienced staff on the unit.',
    },
    nclexTip: 'Safe assignments consider both patient stability and staff competency.',
    clinicalRelevance:
      'Assignment decisions can prevent near-misses before the shift even gets moving.',
    tags: ['assignment', 'staffing', 'safety'],
  }),
  q({
    id: 'lead-4',
    category: 'Leadership / Prioritization / Delegation',
    subcategory: 'First action',
    difficulty: 'advanced',
    format: 'multiple-choice',
    scenario:
      'The nurse receives four new updates at the same time during morning rounds.',
    prompt: 'Which update requires the nurse’s immediate action?',
    choices: makeChoices(
      'A postoperative client reports calf pain and has sudden shortness of breath',
      'A stable client wants help ordering breakfast',
      'A client with chronic anxiety asks for a blanket',
      'A client ready for discharge needs the IV removed',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Calf pain plus sudden shortness of breath suggests possible pulmonary embolism, a life-threatening emergency.',
      whyOthers:
        'The other needs are appropriate to address later but do not suggest immediate life-threatening deterioration.',
    },
    nclexTip: 'Cluster the clues. NCLEX often gives two linked findings that point to the real emergency.',
    clinicalRelevance:
      'Recognizing a possible embolic event quickly can dramatically change outcomes.',
    tags: ['pulmonary embolism', 'priority', 'first action'],
  }),
  q({
    id: 'lead-5',
    category: 'Leadership / Prioritization / Delegation',
    subcategory: 'Clinical judgment',
    difficulty: 'advanced',
    format: 'select-all-that-apply',
    prompt: 'Which clients can the charge nurse assign to an experienced unlicensed assistive personnel (UAP)?',
    choices: makeChoices(
      'A stable client needing vital signs before breakfast',
      'A newly admitted client requiring admission assessment',
      'A client 2 days after stroke who needs assistance with bathing',
      'A client receiving a blood transfusion',
      'A stable postoperative client needing help ambulating to the bathroom',
    ),
    correctAnswer: ['A', 'C', 'E'],
    rationale: {
      whyCorrect:
        'Routine vitals, hygiene assistance, and stable ambulation tasks are appropriate UAP activities when the client is predictable.',
      whyOthers:
        'Admission assessment and blood transfusion care require RN judgment and monitoring.',
    },
    nclexTip: 'UAP tasks are generally routine, standard, and low-interpretation.',
    clinicalRelevance:
      'Strong delegation keeps RNs available for surveillance, teaching, and unstable patients.',
    tags: ['delegation', 'UAP', 'SATA'],
  }),
  q({
    id: 'lab-1',
    category: 'Lab Values / Clinical Judgment',
    subcategory: 'Electrolytes',
    difficulty: 'developing',
    format: 'multiple-choice',
    scenario:
      'A client receiving furosemide has a potassium level of 2.8 mEq/L and reports palpitations.',
    prompt: 'What is the priority action?',
    choices: makeChoices(
      'Notify the provider and place the client on cardiac monitoring.',
      'Encourage the client to rest and recheck labs tomorrow.',
      'Administer the next dose of furosemide.',
      'Tell the client that mild palpitations are expected.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'Severe hypokalemia with palpitations can trigger dysrhythmias, so escalation and monitoring are priorities.',
      whyOthers:
        'Waiting, giving more diuretic, or minimizing symptoms puts the client at avoidable risk.',
    },
    nclexTip: 'Dangerous labs become priorities when symptoms suggest the lab is already affecting the patient.',
    clinicalRelevance:
      'Electrolyte trends are a common early warning sign on medical floors.',
    tags: ['potassium', 'dysrhythmia', 'priority'],
  }),
  q({
    id: 'lab-2',
    category: 'Lab Values / Clinical Judgment',
    subcategory: 'Sepsis',
    difficulty: 'advanced',
    format: 'multiple-choice',
    scenario:
      'A client with suspected sepsis has a lactate level of 4.8 mmol/L and is increasingly confused.',
    prompt: 'How should the nurse interpret this finding?',
    choices: makeChoices(
      'The elevated lactate suggests poor tissue perfusion and a higher risk for deterioration.',
      'The value confirms only mild dehydration with no urgency.',
      'The lab is expected in sepsis and does not affect treatment priorities.',
      'The result is unrelated to the client’s mental status change.',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'High lactate in sepsis reflects impaired perfusion and correlates with serious illness that requires prompt response.',
      whyOthers:
        'Downplaying the finding misses its significance as a marker of shock and worsening oxygen delivery.',
    },
    nclexTip: 'When a lab points to perfusion failure, connect it directly to the bedside picture.',
    clinicalRelevance:
      'Nurses frequently translate sepsis labs into urgency when mental status and perfusion begin to change.',
    tags: ['sepsis', 'lactate', 'clinical judgment'],
  }),
  q({
    id: 'lab-3',
    category: 'Lab Values / Clinical Judgment',
    subcategory: 'Acute coronary syndrome',
    difficulty: 'advanced',
    format: 'multiple-choice',
    scenario:
      'A client with chest discomfort has a rising troponin level over three hours.',
    prompt: 'What does the trend most strongly suggest?',
    choices: makeChoices(
      'Ongoing myocardial injury',
      'Improving anxiety symptoms',
      'Normal muscle fatigue after exercise',
      'No cardiac concern because only one trend matters',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'A rising troponin trend supports cardiac muscle injury and should heighten concern for acute coronary syndrome.',
      whyOthers:
        'Anxiety and routine fatigue do not cause this clinically relevant cardiac enzyme trend, and trends absolutely matter.',
    },
    nclexTip: 'Serial values are often more meaningful than one borderline result.',
    clinicalRelevance:
      'Trend interpretation helps nurses escalate cardiac symptoms before the client worsens.',
    tags: ['troponin', 'ACS', 'trends'],
  }),
  q({
    id: 'lab-4',
    category: 'Lab Values / Clinical Judgment',
    subcategory: 'Bleeding risk',
    difficulty: 'developing',
    format: 'select-all-that-apply',
    prompt: 'Which findings increase concern for bleeding in a client receiving heparin?',
    choices: makeChoices(
      'Black tarry stool',
      'Platelet count of 78,000/mm3',
      'New flank pain',
      'Hemoglobin of 15.2 g/dL',
      'Small bruise at an old venipuncture site only',
    ),
    correctAnswer: ['A', 'B', 'C'],
    rationale: {
      whyCorrect:
        'Melena, thrombocytopenia, and flank pain can indicate clinically significant bleeding or heparin complications.',
      whyOthers:
        'A normal hemoglobin is not a bleeding sign by itself, and a tiny localized bruise alone is less alarming than the other findings.',
    },
    nclexTip: 'Look for bleeding in the stool, hidden spaces, and the platelet count when anticoagulants are involved.',
    clinicalRelevance:
      'Anticoagulated clients can bleed internally before they look dramatic from the doorway.',
    tags: ['heparin', 'bleeding', 'SATA'],
  }),
  q({
    id: 'lab-5',
    category: 'Lab Values / Clinical Judgment',
    subcategory: 'ABG interpretation',
    difficulty: 'advanced',
    format: 'multiple-choice',
    scenario:
      'A client with vomiting has ABGs of pH 7.49, PaCO2 47 mm Hg, and HCO3 34 mEq/L.',
    prompt: 'How should the nurse interpret these results?',
    choices: makeChoices(
      'Metabolic alkalosis with partial respiratory compensation',
      'Metabolic acidosis with no compensation',
      'Respiratory acidosis with full compensation',
      'Normal ABG values',
    ),
    correctAnswer: ['A'],
    rationale: {
      whyCorrect:
        'The elevated pH and bicarbonate indicate metabolic alkalosis, while the mildly elevated PaCO2 reflects compensatory hypoventilation.',
      whyOthers:
        'The values do not fit acidosis, fully compensated states return pH to normal, and these results are not normal.',
    },
    nclexTip: 'ABGs become easier when you match the pH with the system moving in the same direction first.',
    clinicalRelevance:
      'Accurate acid-base interpretation supports safer responses to vomiting, diuretics, and respiratory disease.',
    tags: ['ABG', 'metabolic alkalosis', 'clinical judgment'],
  }),
]

interface TrackQuestionBlueprint {
  categories: string[]
  systems: string[]
  boards: string[]
  scenarioLeads: string[]
  interventions: string[]
  distractors: string[]
  tips: string[]
}

const trackQuestionBlueprints: Record<ExamTrackId, TrackQuestionBlueprint> = {
  'nclex-rn': {
    categories: ['Management of Care', 'Safety and Infection Control', 'Health Promotion', 'Psychosocial Integrity', 'Physiological Integrity'],
    systems: ['Fundamentals', 'Pharmacology', 'Med-Surg', 'Pediatrics', 'OB', 'Mental Health', 'Leadership', 'Lab Values'],
    boards: ['NCSBN NCLEX-RN'],
    scenarioLeads: [
      'A newly licensed RN is caring for a client with changing assessment findings.',
      'A nurse receives report on four clients at the start of shift.',
      'A client asks which finding should be reported immediately.',
      'The nurse is reviewing orders, labs, and safety risks before giving care.',
    ],
    interventions: [
      'assess airway, breathing, circulation, and current vital signs before delegating tasks',
      'hold the high-risk intervention and notify the provider using focused clinical data',
      'prioritize the unstable client and reassess after the first safety action',
      'use infection-control and fall-prevention steps before continuing routine care',
    ],
    distractors: [
      'document the finding and wait until the next scheduled assessment',
      'delegate the initial clinical judgment to assistive personnel',
      'provide teaching before stabilizing the immediate safety concern',
      'continue the routine task because the finding may be expected',
    ],
    tips: [
      'NCLEX-RN rewards safe prioritization over memorized task completion.',
      'When the client is changing, assess and stabilize before teaching or documenting.',
      'Delegation questions usually protect RN assessment and clinical judgment.',
    ],
  },
  'nclex-pn': {
    categories: ['Coordinated Care', 'Safety and Infection Control', 'Health Promotion', 'Psychosocial Integrity', 'Physiological Integrity', 'Medication Administration'],
    systems: ['Fundamentals', 'Medication Administration', 'Adult Care', 'Maternal-Newborn', 'Pediatrics', 'Mental Health'],
    boards: ['NCSBN NCLEX-PN'],
    scenarioLeads: [
      'A practical nurse is caring for a stable client with a predictable care need.',
      'The PN is reinforcing teaching after the RN completed initial education.',
      'A client receiving routine medication reports a new symptom.',
      'The PN is coordinating care and must recognize which finding needs RN follow-up.',
    ],
    interventions: [
      'collect focused data and report the change to the RN or provider per scope',
      'reinforce the teaching plan using the instructions already provided',
      'verify medication safety checks before administration',
      'perform the predictable procedure while watching for reportable changes',
    ],
    distractors: [
      'complete an initial assessment independently without notifying the RN',
      'change the care plan without provider or RN input',
      'ignore the symptom because the client was stable at report',
      'delegate medication administration to unlicensed assistive personnel',
    ],
    tips: [
      'NCLEX-PN questions often test scope, safe reporting, and predictable care.',
      'PNs reinforce and monitor; initial assessment and major care-plan changes are protected.',
      'Medication questions hinge on the right client, drug, dose, route, time, and reason.',
    ],
  },
  teas: {
    categories: ['Reading', 'Mathematics', 'Science', 'English and Language Usage'],
    systems: [
      'Key Ideas and Details',
      'Craft and Structure',
      'Integration of Knowledge and Ideas',
      'Numbers and Algebra',
      'Measurement and Data',
      'Human Anatomy and Physiology',
      'Biology',
      'Chemistry',
      'Scientific Reasoning',
      'Conventions of Standard English',
      'Knowledge of Language',
      'Vocabulary and Writing',
    ],
    boards: ['ATI TEAS 7 public exam blueprint'],
    scenarioLeads: [
      'A nursing program applicant is working through a timed TEAS readiness item.',
      'A student reviews a short academic passage, data display, or science concept before answering.',
      'A pre-nursing student is practicing under exam-like pacing and must avoid a common distractor.',
      'A learner compares answer choices that test entry-level academic readiness for health science coursework.',
    ],
    interventions: [
      'identify the central idea, evidence, or conclusion before choosing an answer',
      'apply the rule or formula, then check units, labels, and reasonableness',
      'connect the science concept to the body system, experiment, or data trend being tested',
      'choose the grammatically correct and clearest expression for the sentence context',
    ],
    distractors: [
      'choose an answer that sounds familiar but is not supported by the passage or data',
      'skip unit conversion and solve with the wrong scale',
      'confuse a related biology term with the process actually described',
      'select a grammatically awkward option because it uses more advanced vocabulary',
    ],
    tips: [
      'TEAS questions often punish rushing; prove the answer from the passage, data, rule, or concept.',
      'For math and science, estimate first so unreasonable choices stand out.',
      'For English, prefer the clearest correct sentence over the fanciest wording.',
    ],
  },
  fnp: {
    categories: ['Assessment', 'Diagnosis', 'Planning', 'Implementation', 'Evaluation', 'Professional Role'],
    systems: ['Cardiology', 'Pulmonary', 'Endocrine', 'Psychiatry', 'Women’s Health', 'Pediatrics', 'Pharmacology', 'Geriatrics'],
    boards: ['AANP', 'ANCC'],
    scenarioLeads: [
      'A family nurse practitioner evaluates a patient in primary care with evolving symptoms.',
      'An adult patient presents for follow-up after an abnormal screening result.',
      'A patient asks about medication options, adverse effects, and next-step monitoring.',
      'The NP reviews history, exam findings, diagnostics, and guideline-based management choices.',
    ],
    interventions: [
      'identify the most likely diagnosis and choose the safest evidence-based next step',
      'order the appropriate diagnostic test and plan follow-up based on risk',
      'select first-line management while screening for contraindications',
      'educate the patient on red flags, adherence, and when to seek urgent care',
    ],
    distractors: [
      'start a high-risk medication without confirming assessment data',
      'delay follow-up despite red-flag symptoms',
      'choose a test that does not answer the clinical question',
      'treat the symptom without considering the differential diagnosis',
    ],
    tips: [
      'FNP boards reward differential diagnosis plus safe, guideline-based management.',
      'AANP and ANCC questions often combine assessment, prescribing, and follow-up planning.',
      'When options look similar, choose the one that changes management safely.',
    ],
  },
  ccma: {
    categories: ['Foundational Knowledge', 'Clinical Patient Care', 'Patient Care Coordination', 'Administrative Assisting', 'Communication', 'Safety'],
    systems: ['EKG', 'Phlebotomy', 'Vital Signs', 'Infection Control', 'Medical Terminology', 'Billing Basics'],
    boards: ['NHA CCMA-style coverage'],
    scenarioLeads: [
      'A certified clinical medical assistant prepares a patient for an outpatient visit.',
      'The medical assistant is performing a procedure and must follow safety standards.',
      'A patient has a question during intake before the provider enters the room.',
      'The assistant is documenting clinical data and coordinating the next workflow step.',
    ],
    interventions: [
      'verify patient identity and follow the correct procedure sequence',
      'recognize the abnormal finding and notify the licensed clinician promptly',
      'use clear patient-centered communication while staying within scope',
      'document the result accurately and prepare the room for the next step',
    ],
    distractors: [
      'interpret the diagnosis and independently change the treatment plan',
      'skip hand hygiene because gloves will be worn',
      'document before confirming the patient identifier',
      'give medication advice beyond medical assistant scope',
    ],
    tips: [
      'CCMA items often test procedure order, scope, and patient safety.',
      'If a finding is abnormal, report it; do not diagnose or ignore it.',
      'Administrative accuracy matters because wrong identifiers and codes create safety risks.',
    ],
  },
}

const generatedQuestionCount = 250
const difficultyCycle = ['foundation', 'developing', 'advanced'] as const
const fingerprintText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b(?:focus area|blueprint)\s*:[^.]+\.?/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const createQuestionFingerprint = (...parts: string[]) =>
  parts
    .map(fingerprintText)
    .filter(Boolean)
    .join('|')

const makeGeneratedQuestion = (
  examTrack: ExamTrackId,
  index: number,
): Question => {
  const blueprint = trackQuestionBlueprints[examTrack]
  const category = blueprint.categories[index % blueprint.categories.length]
  const system = blueprint.systems[index % blueprint.systems.length]
  const board = blueprint.boards[index % blueprint.boards.length]
  const scenario = blueprint.scenarioLeads[index % blueprint.scenarioLeads.length]
  const intervention = blueprint.interventions[index % blueprint.interventions.length]
  const wrong = blueprint.distractors
  const isSata = index % 5 === 0
  const isPriority = index % 7 === 0
  const isCase = index % 6 === 0
  const difficulty = difficultyCycle[index % difficultyCycle.length]
  const difficultyProfile: QuestionDifficultyProfile = isCase
    ? 'case-based'
    : isSata || isPriority
      ? 'trap-heavy'
      : difficulty === 'advanced'
        ? 'hard-mode'
        : 'standard'
  const stemFocus = isPriority
    ? 'Which action has the highest priority?'
    : isCase
      ? 'Which decision best reflects safe clinical judgment?'
      : 'Which response is most appropriate?'
  const scenarioText = scenario
  const promptText = isSata
    ? 'Which actions should be included? Select all that apply.'
    : stemFocus
  const correctChoice = `Use the ${system} findings to ${intervention}.`

  return {
    id: `${examTrack}-q-${String(index + 1).padStart(3, '0')}`,
    examTrack,
    category,
    domain: category,
    system,
    board,
    contentQuality: 'generated-starter',
    contentFingerprint: createQuestionFingerprint(examTrack, category, system, scenarioText, promptText, correctChoice),
    authorType: 'system-generated',
    sourceRefs:
      examTrack === 'fnp'
        ? ['AANPCB FNP blueprint', 'ANCC FNP test content outline']
        : examTrack === 'teas'
          ? ['ATI TEAS 7 public exam details and content areas']
          : examTrack === 'ccma'
          ? ['NHA CCMA test plan']
          : ['NCSBN 2026 NCLEX test plan'],
    sourceTopic: `${category} / ${system}`,
    testTakingTrap: wrong[index % wrong.length],
    blueprintMapped: true,
    sourceBacked: true,
    updatedAt: '2026-06-18',
    subcategory: system,
    difficulty,
    difficultyProfile,
    format: isSata ? 'select-all-that-apply' : 'multiple-choice',
    scenario: scenarioText,
    prompt: promptText,
    choices: isSata
      ? makeChoices(
          correctChoice,
          'Pause and verify safety cues before moving to routine tasks.',
          wrong[(index + 1) % wrong.length],
          'Document relevant findings and communicate changes clearly.',
          wrong[(index + 2) % wrong.length],
        )
      : makeChoices(
          correctChoice,
          wrong[index % wrong.length],
          wrong[(index + 1) % wrong.length],
          wrong[(index + 2) % wrong.length],
        ),
    correctAnswer: isSata ? ['A', 'B', 'D'] : ['A'],
    rationale: {
      whyCorrect:
        `This answer prioritizes the relevant ${system} cues and supports safe, exam-relevant decision-making.`,
      whyOthers:
        'The distractors either delay needed action, move outside the role being tested, or skip the assessment and safety logic needed for clinical judgment.',
    },
    nclexTip: blueprint.tips[index % blueprint.tips.length],
    clinicalRelevance:
      `In real practice, ${category.toLowerCase()} questions matter because they connect knowledge to safe decisions, communication, and follow-up.`,
    tags: [
      category.toLowerCase(),
      system.toLowerCase(),
      board.toLowerCase(),
      isPriority ? 'priority' : 'clinical judgment',
      isSata ? 'SATA' : 'single best answer',
    ],
  }
}

const buildTrackBank = (examTrack: ExamTrackId): Question[] => {
  const qualityPack = qualityQuestionPacks[examTrack]
  const internalDraftQuestions = getInternalDraftFixtureQuestions(examTrack)
  const generated = Array.from({ length: generatedQuestionCount }, (_, index) =>
    makeGeneratedQuestion(examTrack, index),
  )

  if (examTrack !== 'nclex-rn') {
    const qualityIds = new Set([...qualityPack, ...internalDraftQuestions].map((question) => question.id))
    return [
      ...internalDraftQuestions,
      ...qualityPack,
      ...generated
        .filter((question) => !qualityIds.has(question.id))
        .slice(0, generatedQuestionCount - qualityPack.length - internalDraftQuestions.length),
    ]
  }

  const authoredRnQuestions = [...internalDraftQuestions, ...qualityPack, ...nclexRnBaseQuestions]
  const generatedIds = new Set(authoredRnQuestions.map((question) => question.id))
  return [
    ...authoredRnQuestions,
    ...generated.filter((question) => !generatedIds.has(question.id)).slice(0, generatedQuestionCount - authoredRnQuestions.length),
  ]
}

export const examQuestionBanks: Record<ExamTrackId, Question[]> = {
  'nclex-rn': buildTrackBank('nclex-rn'),
  'nclex-pn': buildTrackBank('nclex-pn'),
  teas: buildTrackBank('teas'),
  fnp: buildTrackBank('fnp'),
  ccma: buildTrackBank('ccma'),
}

export const questionBank: Question[] = Object.values(examQuestionBanks).flat()

export const getExamQuestionBank = (examTrack: ExamTrackId) => examQuestionBanks[examTrack]

export const getExamContentQualitySummary = (examTrack: ExamTrackId) => {
  const bank = getExamQuestionBank(examTrack)
  return {
    total: bank.length,
    generatedStarter: bank.filter((question) => question.contentQuality === 'generated-starter').length,
    authoredDraft: bank.filter((question) => question.contentQuality === 'authored-draft').length,
    editorReviewed: bank.filter((question) => question.contentQuality === 'editor-reviewed').length,
    reviewReady: bank.filter((question) => question.contentQuality === 'sme-review-ready').length,
    smeReviewed: bank.filter((question) => question.contentQuality === 'sme-reviewed').length,
    published: bank.filter((question) => question.contentQuality === 'published').length,
    sourceBacked: bank.filter((question) => question.sourceBacked).length,
    blueprintMapped: bank.filter((question) => question.blueprintMapped).length,
  }
}

export const getExamBlueprintCoverageSummary = (examTrack: ExamTrackId) => {
  const bank = getExamQuestionBank(examTrack)
  const track = getExamTrack(examTrack)
  const coveredDomains = track.domains.filter((domain) =>
    bank.some((question) => question.domain === domain || question.category === domain),
  )
  const coveredSystems = track.systems.filter((system) =>
    bank.some((question) => question.system === system || question.subcategory === system),
  )
  const profileCounts = {
    standard: bank.filter((question) => question.difficultyProfile === 'standard').length,
    hardMode: bank.filter((question) => question.difficultyProfile === 'hard-mode').length,
    trapHeavy: bank.filter((question) => question.difficultyProfile === 'trap-heavy').length,
    caseBased: bank.filter((question) => question.difficultyProfile === 'case-based').length,
  }
  const formatCounts = {
    multipleChoice: bank.filter((question) => question.format === 'multiple-choice').length,
    sata: bank.filter((question) => question.format === 'select-all-that-apply').length,
    scenario: bank.filter((question) => question.scenario).length,
  }

  return {
    domainCoverage: coveredDomains.length,
    domainTotal: track.domains.length,
    systemCoverage: coveredSystems.length,
    systemTotal: track.systems.length,
    uncoveredDomains: track.domains.filter((domain) => !coveredDomains.includes(domain)),
    uncoveredSystems: track.systems.filter((system) => !coveredSystems.includes(system)),
    profileCounts,
    formatCounts,
  }
}

export const getExamCategories = (examTrack: ExamTrackId): QuestionCategory[] =>
  trackQuestionBlueprints[examTrack].categories

export const getExamSystems = (examTrack: ExamTrackId) => trackQuestionBlueprints[examTrack].systems

export const getExamDashboardCopy = (examTrack: ExamTrackId) => {
  const track = getExamTrack(examTrack)
  const labels: Record<ExamTrackId, { greeting: string; examLabel: string; priorityPrefix: string }> = {
    'nclex-rn': {
      greeting: 'Welcome back, Future RN',
      examLabel: 'NCLEX-RN readiness check',
      priorityPrefix: 'Strengthen clinical judgment',
    },
    'nclex-pn': {
      greeting: 'Welcome back, Future PN',
      examLabel: 'NCLEX-PN readiness check',
      priorityPrefix: 'Tighten PN-scope safety',
    },
    teas: {
      greeting: 'Welcome back, Future Nursing Student',
      examLabel: 'TEAS readiness check',
      priorityPrefix: 'Build entrance-exam confidence',
    },
    fnp: {
      greeting: 'Welcome back, Future FNP',
      examLabel: 'FNP board readiness check',
      priorityPrefix: 'Master AANP/ANCC primary care reasoning',
    },
    ccma: {
      greeting: 'Welcome back, Future CCMA',
      examLabel: 'CCMA readiness check',
      priorityPrefix: 'Lock in clinical assisting workflow',
    },
  }
  return {
    ...labels[examTrack],
    subtitle: track.subtitle,
  }
}

export const getExamStudyPlanTopics = (examTrack: ExamTrackId) => {
  const track = getExamTrack(examTrack)
  return {
    weeklyThemes: track.domains,
    dailyTopics: track.systems,
    sessions: track.testingFormats,
    resources: track.resources,
  }
}

const authoredFlashcards: Flashcard[] = [
  { id: 'fc-1', category: 'Pharmacology', front: 'Digoxin hold parameter', back: 'Hold and assess if apical pulse is below the ordered threshold, commonly <60/min in adults.', status: 'new' },
  { id: 'fc-2', category: 'Lab Values / Clinical Judgment', front: 'Critical potassium concern', back: 'Low or high potassium can trigger dysrhythmias, so pair the lab with symptoms and ECG risk.', status: 'new' },
  { id: 'fc-3', category: 'Fundamentals & Safety', front: 'RACE sequence', back: 'Rescue, Alarm, Contain, Extinguish/Evacuate.', status: 'new' },
  { id: 'fc-4', category: 'Leadership / Prioritization / Delegation', front: 'ABCs on NCLEX', back: 'Airway outranks breathing only when airway is threatened; otherwise address the most immediate oxygenation or circulation risk.', status: 'new' },
  { id: 'fc-5', category: 'Strategy', front: 'Maslow shortcut', back: 'Physiologic needs usually outrank safety, love/belonging, esteem, and self-actualization unless immediate danger changes the picture.', status: 'new' },
  { id: 'fc-6', category: 'Maternal-Newborn', front: 'Late deceleration first response', back: 'Reposition, stop uterotonic causes if needed, support oxygenation, and escalate.', status: 'new' },
  { id: 'fc-7', category: 'Pediatrics', front: 'Epiglottitis red flag', back: 'Do not inspect the throat; keep the child calm and protect the airway.', status: 'new' },
  { id: 'fc-8', category: 'Mental Health', front: 'Suicide assessment principle', back: 'Ask directly about thoughts, plan, and intent instead of using vague language.', status: 'new' },
  { id: 'fc-9', category: 'Adult Health / Med-Surg', front: 'Chest tube disconnection fix', back: 'Place the tube end in sterile water to re-establish a temporary water seal.', status: 'new' },
  { id: 'fc-10', category: 'Pharmacology', front: 'Magnesium sulfate antidote', back: 'Calcium gluconate.', status: 'new' },
  { id: 'fc-11', category: 'Lab Values / Clinical Judgment', front: 'Normal lactate takeaway', back: 'Rising lactate suggests worsening perfusion; do not treat it as “just another lab.”', status: 'new' },
  { id: 'fc-12', category: 'Fundamentals & Safety', front: 'Least restrictive safety measure', back: 'Try environmental and observation-based interventions before restraints when possible.', status: 'new' },
  { id: 'fc-13', category: 'Adult Health / Med-Surg', front: 'DKA first priority', back: 'Restore circulating volume with isotonic fluids, then continue treatment sequencing.', status: 'new' },
  { id: 'fc-14', category: 'Maternal-Newborn', front: 'Boggy fundus means', back: 'Likely uterine atony until proven otherwise; massage first while escalating care.', status: 'new' },
  { id: 'fc-15', category: 'Leadership / Prioritization / Delegation', front: 'LPN/LVN delegation', back: 'Stable, predictable clients and reinforcement tasks are common LPN/LVN assignments.', status: 'new' },
  { id: 'fc-16', category: 'Leadership / Prioritization / Delegation', front: 'UAP delegation', back: 'Routine, standard, low-interpretation tasks for stable clients.', status: 'new' },
  { id: 'fc-17', category: 'Pharmacology', front: 'Warfarin bleeding clue', back: 'An elevated INR plus bleeding symptoms warrants prompt follow-up and often holding the dose.', status: 'new' },
  { id: 'fc-18', category: 'Adult Health / Med-Surg', front: 'Heart failure daily metric', back: 'Daily weight is one of the fastest ways to detect fluid retention trends.', status: 'new' },
  { id: 'fc-19', category: 'Pediatrics', front: 'Infant heart failure clue', back: 'Poor feeding with sweating is a classic early sign.', status: 'new' },
  { id: 'fc-20', category: 'Mental Health', front: 'Therapeutic communication tone', back: 'Open-ended, reflective, collaborative, and nonjudgmental.', status: 'new' },
  { id: 'fc-21', category: 'Lab Values / Clinical Judgment', front: 'ABG quick read', back: 'Match the pH first, then see which system points in the same direction.', status: 'new' },
  { id: 'fc-22', category: 'Strategy', front: 'High-confidence miss', back: 'Treat it as a dangerous blind spot, not just a normal wrong answer.', status: 'new' },
  { id: 'fc-23', category: 'Strategy', front: 'Low-confidence correct', back: 'You are close, but the knowledge is unstable and should be reinforced soon.', status: 'new' },
  { id: 'fc-24', category: 'Fundamentals & Safety', front: 'Post-op opioid red flag', back: 'Slow respirations and low oxygen saturation after opioids require immediate airway and breathing support.', status: 'new' },
  { id: 'fc-25', category: 'Maternal-Newborn', front: 'Postpartum call-now symptoms', back: 'Heavy bleeding, fever, unilateral calf pain, and severe headache are not routine recovery symptoms.', status: 'new' },
  { id: 'fc-26', category: 'Pharmacology', front: 'ACE inhibitor caution', back: 'Watch for cough, dizziness, hyperkalemia risk, and angioedema.', status: 'new' },
  { id: 'fc-27', category: 'Lab Values / Clinical Judgment', front: 'Troponin trend', back: 'A rising troponin suggests ongoing myocardial injury even if symptoms fluctuate.', status: 'new' },
  { id: 'fc-28', category: 'Leadership / Prioritization / Delegation', front: 'Who do you see first?', back: 'The client with active deterioration, especially airway, breathing, circulation, or sudden neuro change.', status: 'new' },
  { id: 'teas-fc-1', examTrack: 'teas', category: 'Science', sourceTopic: 'Human Anatomy and Physiology / Cell organelles', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Mitochondria function', back: 'Mitochondria produce most cellular ATP through aerobic cellular respiration.', status: 'new' },
  { id: 'teas-fc-2', examTrack: 'teas', category: 'Science', sourceTopic: 'Human Anatomy and Physiology / Respiratory system', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Alveoli purpose', back: 'Alveoli are tiny air sacs where oxygen and carbon dioxide exchange with blood capillaries.', status: 'new' },
  { id: 'teas-fc-3', examTrack: 'teas', category: 'Science', sourceTopic: 'Biology / DNA and RNA', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'DNA vs RNA sugar', back: 'DNA contains deoxyribose; RNA contains ribose.', status: 'new' },
  { id: 'teas-fc-4', examTrack: 'teas', category: 'Science', sourceTopic: 'Chemistry / pH', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'pH below 7 means', back: 'A pH below 7 is acidic; a pH above 7 is basic or alkaline.', status: 'new' },
  { id: 'teas-fc-5', examTrack: 'teas', category: 'Mathematics', sourceTopic: 'Measurement and Data / Metric conversion', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: '1 gram equals how many milligrams?', back: '1 gram equals 1,000 milligrams.', status: 'new' },
  { id: 'teas-fc-6', examTrack: 'teas', category: 'Mathematics', sourceTopic: 'Numbers and Algebra / Percent change', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Percent change formula', back: 'Percent change = (new value - original value) / original value x 100.', status: 'new' },
  { id: 'teas-fc-7', examTrack: 'teas', category: 'Reading', sourceTopic: 'Key Ideas and Details / Main idea', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Main idea strategy', back: 'Choose the answer that covers the whole passage, not one detail or an unsupported conclusion.', status: 'new' },
  { id: 'teas-fc-8', examTrack: 'teas', category: 'Reading', sourceTopic: 'Craft and Structure / Author purpose', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Author purpose clues', back: 'Look for whether the passage mainly informs, persuades, explains, compares, or entertains.', status: 'new' },
  { id: 'teas-fc-9', examTrack: 'teas', category: 'English and Language Usage', sourceTopic: 'Conventions of Standard English / Subject-verb agreement', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Subject-verb agreement shortcut', back: 'Ignore interrupting phrases and match the verb to the true subject.', status: 'new' },
  { id: 'teas-fc-10', examTrack: 'teas', category: 'English and Language Usage', sourceTopic: 'Knowledge of Language / Clear wording', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Best sentence choice', back: 'Prefer clear, concise, grammatically correct wording over unnecessarily complicated phrasing.', status: 'new' },
  { id: 'teas-fc-11', examTrack: 'teas', category: 'Science', sourceTopic: 'Scientific Reasoning / Variables', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Independent variable', back: 'The independent variable is what the experimenter changes on purpose.', status: 'new' },
  { id: 'teas-fc-12', examTrack: 'teas', category: 'Science', sourceTopic: 'Scientific Reasoning / Controls', sourceRefs: ['ATI TEAS 7 public exam details and content areas'], contentQuality: 'authored-draft', front: 'Control group purpose', back: 'A control group gives a comparison point so the effect of the independent variable can be judged.', status: 'new' },
]

const sourceRefsForTrack = (examTrack: ExamTrackId) =>
  examTrack === 'fnp'
    ? ['AANPCB FNP blueprint', 'ANCC FNP test content outline']
    : examTrack === 'teas'
      ? ['ATI TEAS 7 public exam details and content areas']
      : examTrack === 'ccma'
        ? ['NHA CCMA test plan']
        : examTrack === 'nclex-pn'
          ? ['NCSBN 2026 NCLEX-PN test plan']
          : ['NCSBN 2026 NCLEX-RN test plan']

const makeTrackStarterFlashcards = (examTrack: ExamTrackId): Flashcard[] => {
  const track = getExamTrack(examTrack)
  const blueprint = trackQuestionBlueprints[examTrack]
  return blueprint.systems.flatMap((system, index) => {
    const category = blueprint.categories[index % blueprint.categories.length]
    const sourceTopic = `${category} / ${system}`
    return [
      {
        id: `${examTrack}-system-fc-${String(index + 1).padStart(2, '0')}-priority`,
        examTrack,
        category,
        sourceTopic,
        sourceRefs: sourceRefsForTrack(examTrack),
        contentQuality: 'generated-starter',
        front: `${track.shortName}: ${system} priority question`,
        back: `Ask what finding, rule, or patient-safety risk changes the next best action for ${system}.`,
        status: 'new',
      },
      {
        id: `${examTrack}-system-fc-${String(index + 1).padStart(2, '0')}-trap`,
        examTrack,
        category,
        sourceTopic,
        sourceRefs: sourceRefsForTrack(examTrack),
        contentQuality: 'generated-starter',
        front: `${system}: common trap`,
        back: `Do not choose the familiar-sounding option until it fits the ${track.shortName} blueprint cue and the safest role-appropriate action.`,
        status: 'new',
      },
      {
        id: `${examTrack}-system-fc-${String(index + 1).padStart(2, '0')}-review`,
        examTrack,
        category,
        sourceTopic,
        sourceRefs: sourceRefsForTrack(examTrack),
        contentQuality: 'generated-starter',
        front: `${system}: review target`,
        back: `Review the key definitions, warning signs, calculations, or workflow sequence tied to ${sourceTopic}.`,
        status: 'new',
      },
    ]
  })
}

const normalizedAuthoredFlashcards = authoredFlashcards.map((card): Flashcard => ({
  examTrack: 'nclex-rn',
  sourceTopic: `${card.category}`,
  sourceRefs: sourceRefsForTrack('nclex-rn'),
  contentQuality: 'authored-draft',
  ...card,
}))

export const flashcards: Flashcard[] = [
  ...getInternalDraftFixtureFlashcards(),
  ...normalizedAuthoredFlashcards,
  ...examTracks.flatMap((track) => makeTrackStarterFlashcards(track.id)),
]

export const strategyLessons: StrategyLesson[] = [
  {
    id: 'strat-1',
    title: 'Think Safety Before Sympathy',
    framework: 'ABCs + Immediate Risk',
    summary: 'When two answer choices both sound caring, pick the one that prevents the next bad outcome first.',
    bullets: [
      'Ask who can deteriorate in the next few minutes.',
      'Respiratory compromise outranks comfort tasks.',
      'Active bleeding, sepsis, and acute neuro changes move fast.',
    ],
    microScenario: {
      prompt: 'One client wants discharge papers and another is short of breath with new crackles. Who first?',
      bestResponse: 'See the short-of-breath client first because active deterioration outranks routine discharge flow.',
    },
  },
  {
    id: 'strat-2',
    title: 'Use Maslow Without Overthinking It',
    framework: 'Physiologic before psychosocial',
    summary: 'Maslow works best when the options are otherwise similar. It is a tiebreaker, not a script.',
    bullets: [
      'Physiologic needs often outrank anxiety, education, and comfort.',
      'Safety concerns can outrank longer-term needs.',
      'Do not ignore unstable clinical cues just because a psychosocial option sounds therapeutic.',
    ],
    microScenario: {
      prompt: 'A client is anxious about surgery, but another client has a potassium of 2.8 with palpitations.',
      bestResponse: 'Address the potassium problem first because physiologic instability outranks supportive conversation.',
    },
  },
  {
    id: 'strat-3',
    title: 'Eliminate Answers That Add Risk',
    framework: 'Unsafe options go first',
    summary: 'Many NCLEX questions become easier when you remove options that delay care, increase harm, or ignore assessment.',
    bullets: [
      'Cross out answers that postpone obvious safety action.',
      'Be cautious with “document and reassess later.”',
      'Avoid answers that escalate stimulation, movement, or exposure when the client is unstable.',
    ],
    microScenario: {
      prompt: 'A sedated client has a respiratory rate of 8. Which option is easiest to eliminate first?',
      bestResponse: 'Any option that delays airway and breathing support should be eliminated immediately.',
    },
  },
  {
    id: 'strat-4',
    title: 'Delegate What Is Stable and Predictable',
    framework: 'Right task, right patient, right person',
    summary: 'Delegation questions are really judgment questions. Protect the work that requires RN assessment and teaching.',
    bullets: [
      'Initial assessments stay with the RN.',
      'Stable routine tasks often go to UAP.',
      'Reinforcement for stable clients may go to LPN/LVN depending on scope.',
    ],
    microScenario: {
      prompt: 'Can a UAP take vitals on a stable client before breakfast?',
      bestResponse: 'Yes, because the task is routine and the client is predictable.',
    },
  },
  {
    id: 'strat-5',
    title: 'Read Clinical Trends, Not Just Single Data Points',
    framework: 'Trend > isolated number',
    summary: 'NCLEX rewards nurses who see the story across symptoms, labs, and vital sign movement.',
    bullets: [
      'Rapid weight gain plus crackles points to fluid overload.',
      'Rising troponin matters more than one vague chest pain comment alone.',
      'Low-confidence correct answers still deserve reinforcement if the trend is shaky.',
    ],
    microScenario: {
      prompt: 'Why is a rising lactate plus confusion more urgent than either clue alone?',
      bestResponse: 'Together they suggest worsening perfusion and real-time deterioration.',
    },
  },
]

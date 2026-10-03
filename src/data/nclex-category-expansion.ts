import type { Question } from '../app/types'

// Quizlet's public topic index informed topic selection, not question wording or answer keys.
export const categoryExpansionTopicReference = 'https://quizlet.com/content/nclex-topics'
const sources = {
  delegation: 'https://ncsbn.org/public-files/NGND-PosPaper_06.pdf',
  precautions: 'https://www.cdc.gov/infection-control/hcp/basics/standard-precautions.html',
  injections: 'https://www.cdc.gov/injection-safety/hcp/clinical-guidance/index.html',
  sleep: 'https://safetosleep.nichd.nih.gov/reduce-risk/safe-sleep-environment',
  folate: 'https://www.cdc.gov/folic-acid/about/intake-and-sources.html',
  suicide: 'https://www.nimh.nih.gov/health/publications/5-action-steps-to-help-someone-having-thoughts-of-suicide',
  glucose: 'https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia',
}

type Entry = {
  category: string
  topic: string
  source: keyof typeof sources
  scenario: string
  prompt: string
  // Each option carries its own explanation. Correct positions vary without runtime shuffling.
  options: [string, string][]
  correct: number
}

const entries: Entry[] = [
  {
    category: 'Management of Care', topic: 'Delegation competence', source: 'delegation',
    scenario: 'An assistant says they have never used the unit’s new transfer device. A stable client needs assistance to a chair.',
    prompt: 'What should the RN do before delegating the transfer?', correct: 1,
    options: [
      ['Ask the assistant to learn while moving the client.', 'The client should not be used for unsupervised equipment training.'],
      ['Verify training and competence with the device.', 'Delegation requires demonstrated competence.'],
      ['Delegate because the client is stable.', 'Stability alone does not establish staff competence.'],
      ['Ask the client to explain how the device works.', 'A client’s explanation does not validate staff skills.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Delegation communication', source: 'delegation',
    scenario: 'An RN delegates a routine temperature measurement and gives a time for completion.',
    prompt: 'Which additional instruction is most important?', correct: 3,
    options: [
      ['Record the result only if it is normal.', 'Abnormal results also require documentation and communication.'],
      ['Ask another assistant to interpret the result.', 'Interpretation requires nursing judgment.'],
      ['Wait for the next shift to report concerns.', 'This could delay a response.'],
      ['Explain which findings to report promptly and how to reach the RN.', 'Clear reporting instructions support safe follow-up.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Changing circumstances', source: 'delegation',
    scenario: 'Before a delegated walk, an assistant reports that a previously stable client now feels faint.',
    prompt: 'Which action should the RN take?', correct: 0,
    options: [
      ['Pause the walk and assess the client.', 'Changed circumstances require reassessment of delegation.'],
      ['Continue the original walking plan.', 'The original plan may no longer be safe.'],
      ['Ask the assistant to determine the cause.', 'Determining the cause requires nursing judgment.'],
      ['Document the report after the walk.', 'Documentation alone does not address the change.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Delegation follow-up', source: 'delegation',
    scenario: 'An assistant reports completing delegated care for a stable client.',
    prompt: 'What responsibility remains with the RN?', correct: 2,
    options: [
      ['Assume the outcome was satisfactory.', 'Completion alone does not establish the outcome.'],
      ['Transfer all accountability to the assistant.', 'Delegation does not transfer overall nursing accountability.'],
      ['Follow up with the assistant and evaluate the client’s response.', 'The RN retains responsibility for follow-up.'],
      ['Ask the family to evaluate staff performance instead.', 'Family feedback does not replace nursing evaluation.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Scope and policy', source: 'delegation',
    scenario: 'A float RN is considering delegating an unfamiliar task on a new unit.',
    prompt: 'What should guide the decision?', correct: 1,
    options: [
      ['The practice on the RN’s previous unit alone.', 'Local requirements may differ.'],
      ['Applicable nursing rules, facility policy, client needs, and staff competence.', 'Delegation must fit both regulatory and clinical conditions.'],
      ['The assistant’s willingness alone.', 'Willingness does not establish authorization or competence.'],
      ['Which choice will finish the work fastest.', 'Speed does not establish safe delegation.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Standard precautions', source: 'precautions',
    scenario: 'A newly admitted client has no known infection.',
    prompt: 'Which infection-prevention approach is appropriate?', correct: 2,
    options: [
      ['Delay precautions until cultures return.', 'Unknown infection status does not remove risk.'],
      ['Use precautions only if a fever develops.', 'Fever is not required for transmission risk.'],
      ['Apply standard precautions during care.', 'Standard precautions apply to every client.'],
      ['Use airborne isolation for every admission.', 'Airborne isolation is not a universal requirement.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Exposure risk', source: 'precautions',
    scenario: 'The nurse prepares for a procedure that may splash body fluids.',
    prompt: 'What should determine the choice of protective equipment?', correct: 0,
    options: [
      ['The anticipated exposure during the procedure.', 'PPE selection is based on exposure risk.'],
      ['Whether the client appears healthy.', 'Appearance does not establish exposure risk.'],
      ['The client’s room number.', 'Room assignment does not determine protection.'],
      ['Whether the procedure takes less than a minute.', 'Brief procedures can still cause exposure.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Shared equipment', source: 'precautions',
    scenario: 'A reusable blood pressure cuff is visibly soiled after use.',
    prompt: 'What should happen before it is used for another client?', correct: 3,
    options: [
      ['Cover the soiled area with a towel.', 'Covering does not remove contamination.'],
      ['Place it in a clean drawer.', 'Storage does not decontaminate equipment.'],
      ['Use it only on intact skin without cleaning.', 'Intact skin does not eliminate cross-contamination.'],
      ['Clean and disinfect it according to the device instructions.', 'Reusable equipment needs appropriate decontamination.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Syringe safety', source: 'injections',
    scenario: 'A staff member changes the needle on a used syringe and prepares to use it for another client.',
    prompt: 'How should the nurse respond?', correct: 1,
    options: [
      ['Allow reuse if no blood is visible.', 'Contamination may not be visible.'],
      ['Stop the procedure and obtain a new sterile syringe and needle.', 'Changing the needle does not make a used syringe safe for another client.'],
      ['Allow reuse for clients with the same diagnosis.', 'A shared diagnosis does not make reuse safe.'],
      ['Rinse the syringe with sterile water.', 'Rinsing does not restore sterility.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Medication vial safety', source: 'injections',
    scenario: 'A single-dose vial has medication remaining after a dose is prepared for one client.',
    prompt: 'What is the safest action for the remaining medication?', correct: 2,
    options: [
      ['Save it for the next client.', 'Single-dose vials are not shared between clients.'],
      ['Combine it with another partly used vial.', 'Pooling leftovers risks contamination.'],
      ['Discard the remainder according to policy.', 'Do not retain single-dose leftovers for later use.'],
      ['Refrigerate it to make it suitable for multiple clients.', 'Refrigeration does not change its single-dose designation.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Infant sleep surface', source: 'sleep',
    scenario: 'A parent is preparing a sleep space for a newborn.',
    prompt: 'Which setup should the nurse recommend?', correct: 0,
    options: [
      ['A firm, flat crib mattress with a fitted sheet.', 'A firm, flat sleep surface reduces sleep hazards.'],
      ['A soft pillow inside a bassinet.', 'Pillows add a suffocation hazard.'],
      ['An adult bed with a thick comforter.', 'Adult bedding is not a safe infant sleep surface.'],
      ['A couch cushion surrounded by rolled towels.', 'Couches and loose objects are unsafe for infant sleep.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Crib safety', source: 'sleep',
    scenario: 'A parent places stuffed animals and a loose blanket in the newborn’s crib.',
    prompt: 'Which change should the nurse recommend?', correct: 3,
    options: [
      ['Move the toys to the foot of the crib.', 'Soft objects still remain in the sleep space.'],
      ['Use a heavier blanket to prevent movement.', 'Heavier bedding does not improve sleep safety.'],
      ['Place the toys beside the infant’s head.', 'Objects near the face can obstruct breathing.'],
      ['Remove the toys and loose blanket from the crib.', 'Keep soft objects and loose bedding out of the sleep area.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Sleep positioning', source: 'sleep',
    scenario: 'A parent asks how to position a healthy newborn for a nap.',
    prompt: 'Which instruction is appropriate?', correct: 1,
    options: [
      ['Place the infant on the stomach for daytime sleep.', 'Daytime sleep requires the same safe positioning.'],
      ['Place the infant on the back for sleep.', 'Back positioning is recommended when placing an infant to sleep.'],
      ['Keep the infant on the side with a wedge.', 'Side positioning and wedges are not recommended.'],
      ['Alternate between the stomach and side.', 'Neither is the recommended initial sleep position.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Preconception nutrition', source: 'folate',
    scenario: 'A client who could become pregnant asks about routine folic acid intake. No high-risk condition is identified.',
    prompt: 'Which daily amount matches the general CDC recommendation?', correct: 2,
    options: [
      ['40 micrograms.', 'This is below the general recommendation.'],
      ['40 milligrams.', 'This is not the routine recommended amount.'],
      ['400 micrograms.', 'CDC recommends 400 micrograms daily for those who could become pregnant.'],
      ['400 milligrams.', 'Milligrams and micrograms are not interchangeable.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Early prevention', source: 'folate',
    scenario: 'A client plans to wait until pregnancy is confirmed before considering folic acid.',
    prompt: 'Which response best explains why earlier intake matters?', correct: 0,
    options: [
      ['Neural tube development occurs early, sometimes before pregnancy is recognized.', 'Adequate intake before pregnancy supports early neural tube development.'],
      ['Folic acid is useful only during labor.', 'Its preventive role begins much earlier.'],
      ['Folic acid replaces all prenatal care.', 'A nutrient does not replace prenatal assessment.'],
      ['Neural tube development begins after birth.', 'The neural tube develops during early pregnancy.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Direct assessment', source: 'suicide',
    scenario: 'A client says, “I do not see a reason to keep living.”',
    prompt: 'Which response best clarifies the immediate safety concern?', correct: 3,
    options: [
      ['Everyone feels discouraged sometimes.', 'This minimizes the concern.'],
      ['Let us talk about something positive.', 'Changing topics avoids safety assessment.'],
      ['You would never hurt yourself, right?', 'A leading question can discourage disclosure.'],
      ['Are you thinking about ending your life?', 'Direct questioning helps identify suicide risk.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Supportive communication', source: 'suicide',
    scenario: 'A client begins describing thoughts of suicide during an assessment.',
    prompt: 'Which approach supports further disclosure?', correct: 1,
    options: [
      ['Explain that these thoughts disappoint the family.', 'Guilt can discourage honest communication.'],
      ['Listen calmly and acknowledge the client’s distress.', 'Nonjudgmental listening supports disclosure.'],
      ['Debate whether the client has a reason to feel this way.', 'Debating feelings does not establish support.'],
      ['Promise that the thoughts will disappear tomorrow.', 'This reassurance cannot be guaranteed.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Safety planning', source: 'suicide',
    scenario: 'During a team-led safety plan, a client identifies access to a firearm at home.',
    prompt: 'Which action belongs in the plan?', correct: 2,
    options: [
      ['Avoid discussing the firearm to prevent discomfort.', 'Avoidance leaves a specific risk unaddressed.'],
      ['Rely only on a promise not to use it.', 'A promise does not reduce access.'],
      ['Collaborate on reducing access to lethal means.', 'Reducing access is a component of suicide prevention.'],
      ['Replace follow-up appointments with a written pledge.', 'A pledge does not replace ongoing care.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Crisis resources', source: 'suicide',
    scenario: 'A U.S. client preparing for discharge asks for a crisis support number. There is no immediate medical emergency.',
    prompt: 'Which resource should the nurse include?', correct: 0,
    options: [
      ['Call or text 988 for the Suicide & Crisis Lifeline.', '988 connects people with crisis support in the United States.'],
      ['Use only the clinic’s routine scheduling voicemail.', 'Routine voicemail is not immediate crisis support.'],
      ['Wait until the next scheduled appointment.', 'A crisis may require help before then.'],
      ['Use social media comments as the primary crisis service.', 'Comments are not a dependable crisis response.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Continuity after crisis', source: 'suicide',
    scenario: 'A client has completed acute crisis treatment and is returning home with a care plan.',
    prompt: 'Which action supports continued recovery?', correct: 3,
    options: [
      ['Stop contact because discharge means all risk has ended.', 'Discharge does not eliminate the need for support.'],
      ['Cancel follow-up if the client sounds cheerful.', 'Appearance alone does not justify ending follow-up.'],
      ['Discourage contact with trusted support people.', 'Isolation reduces available support.'],
      ['Arrange follow-up and reinforce connections with trusted supports.', 'Ongoing supportive contact is part of prevention.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Hypoglycemia treatment', source: 'glucose',
    scenario: 'An alert adult with diabetes has a glucose level of 62 mg/dL and can swallow safely. The protocol calls for oral treatment.',
    prompt: 'Which option is appropriate initially?', correct: 1,
    options: [
      ['A glass of water.', 'Water supplies no glucose.'],
      ['Glucose tablets totaling 15 grams of carbohydrate.', 'Fast-acting carbohydrate treats mild hypoglycemia.'],
      ['An extra dose of rapid-acting insulin.', 'Insulin can lower glucose further.'],
      ['A sugar-free soft drink.', 'A sugar-free drink does not supply needed carbohydrate.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Glucose reassessment', source: 'glucose',
    scenario: 'An alert client received oral glucose for hypoglycemia under the treatment protocol.',
    prompt: 'When should the nurse recheck the glucose level?', correct: 2,
    options: [
      ['At the next weekly visit.', 'This is too late to evaluate the response.'],
      ['Only if the client loses consciousness.', 'Reassessment should occur before deterioration.'],
      ['In 15 minutes.', 'A 15-minute recheck guides further treatment.'],
      ['After the next night’s sleep.', 'Waiting overnight delays evaluation.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Persistent hypoglycemia', source: 'glucose',
    scenario: 'Fifteen minutes after oral glucose, an alert client’s glucose remains 64 mg/dL. The client can still swallow safely.',
    prompt: 'What should the nurse do under the oral treatment protocol?', correct: 0,
    options: [
      ['Repeat fast-acting carbohydrate and recheck in 15 minutes.', 'Persistent low glucose requires repeat treatment and reassessment.'],
      ['Stop treatment because the client feels better.', 'Symptoms alone do not establish correction.'],
      ['Give insulin to stabilize the reading.', 'Insulin can worsen hypoglycemia.'],
      ['Wait two hours without further intervention.', 'The reading remains below the treatment threshold.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Exercise planning', source: 'glucose',
    scenario: 'An insulin-treated client plans a longer walk than usual.',
    prompt: 'Which teaching best addresses hypoglycemia risk?', correct: 3,
    options: [
      ['Exercise cannot affect glucose after it ends.', 'The effect can continue after activity.'],
      ['Leave fast-acting carbohydrate at home.', 'Treatment should be accessible.'],
      ['Skip glucose checks whenever exercising.', 'Activity can change glucose needs.'],
      ['Follow the individualized glucose-monitoring plan and carry fast-acting carbohydrate.', 'Activity may lower glucose during and after exercise.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Glucagon preparedness', source: 'glucose',
    scenario: 'A client prescribed emergency glucagon asks what a family member needs to learn.',
    prompt: 'Which teaching is most important?', correct: 1,
    options: [
      ['Wait for unconsciousness to resolve before seeking help.', 'Severe hypoglycemia requires prompt action.'],
      ['Learn how to give the prescribed glucagon and call emergency services after use.', 'Caregivers need rescue-treatment training and an emergency response plan.'],
      ['Give oral fluids to an unconscious person first.', 'Oral fluids are unsafe when swallowing is impaired.'],
      ['Use an expired kit for routine practice injections.', 'Training should follow product instructions using appropriate demonstration materials.'],
    ],
  },
]

export const nclexCategoryExpansion: Question[] = entries.map((entry, index) => {
  const whyCorrect = entry.options[entry.correct][1]
  return {
    id: `rn-category-expansion-20261002-${String(index + 1).padStart(3, '0')}`,
    examTrack: 'nclex-rn', category: entry.category, domain: entry.category,
    subcategory: entry.topic, system: entry.topic, board: 'NCSBN NCLEX-RN',
    contentQuality: 'authored-draft', authorType: 'clinical-editor-draft',
    clinicalReviewStatus: 'not_sme_reviewed', countsTowardOfficialReadiness: false,
    sourceStatus: 'source_checked', sourceBacked: true, sourceRefs: [sources[entry.source]],
    sourceTopic: entry.topic, sourcePackId: 'rn-category-expansion-20261002',
    learnerVisible: true, visibility: 'learner', contentStage: 'standard_bank',
    updatedAt: '2026-10-02', feedbackEnabled: true,
    difficulty: 'developing', difficultyProfile: 'case-based', format: 'multiple-choice',
    scenario: entry.scenario, prompt: entry.prompt,
    choices: entry.options.map(([text], i) => ({ id: String.fromCharCode(65 + i), text })),
    correctAnswer: [String.fromCharCode(65 + entry.correct)],
    rationale: {
      whyCorrect,
      whyOthers: entry.options.filter((_, i) => i !== entry.correct).map(([, why]) => why).join(' '),
      choices: Object.fromEntries(entry.options.map(([, why], i) => [String.fromCharCode(65 + i), why])),
    },
    nclexTip: whyCorrect, clinicalRelevance: whyCorrect, tags: [entry.category, entry.topic],
  }
})

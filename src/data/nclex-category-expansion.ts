import type { Question } from '../app/types'

// Quizlet's public topic index informed topic selection, not question wording or answer keys.
export const categoryExpansionTopicReference = 'https://quizlet.com/content/nclex-topics'
const sources = {
  teachback: 'https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/teachback.html',
  cdiffHome: 'https://www.cdc.gov/c-diff/prevention/index.html',
  maternal: 'https://www.cdc.gov/hearher/maternal-warning-signs/index.html',
  psychosis: 'https://www.nimh.nih.gov/health/publications/schizophrenia',
  asthma: 'https://www.nhlbi.nih.gov/health/asthma/attacks',
  stroke: 'https://www.cdc.gov/stroke/signs-symptoms/index.html',
  varicella: 'https://www.cdc.gov/chickenpox/hcp/clinical-overview/index.html',
  colonoscopy: 'https://www.niddk.nih.gov/health-information/diagnostic-tests/colonoscopy',
  adrenal: 'https://www.niddk.nih.gov/health-information/endocrine-diseases/adrenal-insufficiency-addisons-disease/treatment',
  panic: 'https://www.nimh.nih.gov/health/publications/panic-disorder-when-fear-overwhelms',
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
  {
    category: 'Management of Care', topic: 'Delegation acceptance', source: 'delegation',
    scenario: 'An assistant receives a delegated task but cannot explain when abnormal results should be reported.',
    prompt: 'What should the RN do before the task begins?', correct: 2,
    options: [
      ['Assume the written assignment is sufficient.', 'Written directions do not establish understanding.'],
      ['Wait until the end of the shift to clarify.', 'Clarification is needed before care.'],
      ['Clarify reporting expectations and ask the assistant to repeat them back.', 'Confirming understanding supports safe communication.'],
      ['Remove all reporting requirements.', 'Reporting supports supervision.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Supervision availability', source: 'delegation',
    scenario: 'An RN is leaving the unit temporarily while an assistant completes delegated care.',
    prompt: 'Which arrangement best supports safe supervision?', correct: 0,
    options: [
      ['Arrange qualified nursing coverage and explain whom to contact.', 'Delegated care requires accessible supervision.'],
      ['Ask the assistant to hold every concern until the RN returns.', 'Urgent concerns cannot wait.'],
      ['Leave without discussing coverage.', 'Unclear coverage can delay help.'],
      ['Tell the assistant to change the nursing plan independently.', 'Nursing judgment cannot be transferred this way.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Shared saline supply', source: 'injections',
    scenario: 'A clinic proposes drawing flushes for several clients from one IV saline bag using a new syringe each time.',
    prompt: 'How should the nurse respond?', correct: 1,
    options: [
      ['Accept the plan if the bag stays in a clean room.', 'Location does not make sharing safe.'],
      ['Use supplies intended for individual clients instead.', 'An IV bag must not serve multiple clients.'],
      ['Use the bag only during one shift.', 'A shorter duration does not resolve the risk.'],
      ['Label each syringe with the preparation time only.', 'Labeling does not prevent contamination.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Questionable vial sterility', source: 'injections',
    scenario: 'A nurse finds a multidose vial whose sterility cannot be confirmed.',
    prompt: 'What is the appropriate action?', correct: 3,
    options: [
      ['Keep it if the fluid is clear.', 'Appearance cannot confirm sterility.'],
      ['Reserve it for the next client.', 'Changing clients does not remove contamination.'],
      ['Refrigerate it before use.', 'Refrigeration does not restore sterility.'],
      ['Discard it according to policy and obtain a safe replacement.', 'Questionable sterility requires disposal.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Sleep after travel', source: 'sleep',
    scenario: 'After arriving home, a parent leaves a sleeping infant in the car seat for a routine nap.',
    prompt: 'Which teaching should the nurse provide?', correct: 0,
    options: [
      ['Move the infant to an appropriate infant sleep surface as soon as possible.', 'Sitting devices are not routine sleep spaces.'],
      ['Loosen the straps and leave the infant in the seat.', 'Loosening straps does not create a safe sleep surface.'],
      ['Prop the seat on a sofa.', 'A sofa is not a safe sleep location.'],
      ['Add a pillow to support the chin.', 'Pillows introduce an additional hazard.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Room sharing', source: 'sleep',
    scenario: 'Parents want their newborn nearby at night and ask how to arrange the room.',
    prompt: 'Which plan best follows safe-sleep guidance?', correct: 2,
    options: [
      ['Place the infant between adults in their bed.', 'An adult bed is not a separate infant sleep space.'],
      ['Have an adult sleep with the infant in an armchair.', 'Armchairs pose a serious sleep hazard.'],
      ['Place a separate approved bassinet beside the adult bed.', 'Room sharing uses a separate infant sleep space.'],
      ['Place the infant on a folded comforter on the floor.', 'Soft bedding is unsafe.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Asking about suicide', source: 'suicide',
    scenario: 'A family member fears that asking a distressed relative about suicide will introduce the idea.',
    prompt: 'Which response is most appropriate?', correct: 1,
    options: [
      ['Avoid discussing suicide unless the relative mentions it first.', 'Avoidance can prevent disclosure.'],
      ['Asking directly does not increase suicidal thoughts and can open a helpful conversation.', 'Direct questions can support identification and help.'],
      ['Ask only whether the relative feels tired.', 'An indirect question does not assess suicidal thoughts.'],
      ['Promise to keep any answer secret.', 'Safety concerns may require involving help.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Connecting with support', source: 'suicide',
    scenario: 'During follow-up after a suicidal crisis, a client says they do not know whom to contact when distress returns.',
    prompt: 'Which action best strengthens the support plan?', correct: 3,
    options: [
      ['Suggest waiting until the next routine appointment.', 'Support may be needed sooner.'],
      ['Encourage managing every crisis alone.', 'Isolation limits access to help.'],
      ['Give reassurance without identifying contacts.', 'Reassurance does not establish access to support.'],
      ['Identify trusted contacts and professional crisis resources with the client.', 'Specific connections improve access to support.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Fasting and diabetes medicines', source: 'glucose',
    scenario: 'A client who takes glucose-lowering medicine will fast for a procedure tomorrow.',
    prompt: 'Which instruction is safest?', correct: 2,
    options: [
      ['Double the medicine tonight.', 'Extra medicine may cause hypoglycemia.'],
      ['Stop every diabetes medicine permanently.', 'Permanent discontinuation is not appropriate.'],
      ['Obtain an individualized medicine and glucose-monitoring plan before fasting.', 'Fasting can increase hypoglycemia risk with these medicines.'],
      ['Skip monitoring until normal meals resume.', 'Monitoring remains important during fasting.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Hypoglycemia unawareness', source: 'glucose',
    scenario: 'A client reports repeated low glucose readings without their usual warning symptoms.',
    prompt: 'Which response should the nurse recommend?', correct: 0,
    options: [
      ['Contact the diabetes care team to review the treatment and monitoring plan.', 'Reduced warning symptoms warrant care-plan review.'],
      ['Ignore low readings when symptoms are absent.', 'Lack of symptoms does not make low glucose safe.'],
      ['Increase insulin without consulting the care team.', 'This can worsen hypoglycemia.'],
      ['Stop carrying hypoglycemia treatment.', 'Rescue supplies remain necessary.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Initial discharge teaching', source: 'delegation',
    scenario: 'A stable client will go home with a new wound-care plan. A trained assistant offers to explain the plan while the RN completes documentation.',
    prompt: 'Which assignment should the RN retain?', correct: 1,
    options: [
      ['Gather the unopened dressing supplies.', 'Gathering supplies is not initial nursing education.'],
      ['Teach the new wound-care plan and evaluate understanding.', 'Initial teaching and evaluation require nursing judgment.'],
      ['Help the client put personal items in a bag.', 'Packing does not require nursing judgment.'],
      ['Bring a wheelchair to the room.', 'Obtaining equipment is a routine support task.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Delegated intake measurement', source: 'delegation',
    scenario: 'Under facility policy, a competent assistant measures a stable client’s fluid intake. The recorded intake is much lower than the care plan anticipated.',
    prompt: 'Which follow-up belongs to the RN?', correct: 3,
    options: [
      ['Ask the assistant to independently prescribe a new fluid goal.', 'Prescribing a goal exceeds the delegated measurement task.'],
      ['Treat the completed record as proof that the goal was met.', 'Recording data does not establish the clinical outcome.'],
      ['Wait for another shift to interpret the measurement.', 'Follow-up remains the RN’s responsibility.'],
      ['Assess the client and evaluate whether the plan needs revision.', 'Interpreting outcomes requires nursing judgment.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Varicella room placement', source: 'varicella',
    scenario: 'An adult admitted with confirmed chickenpox has fluid-filled lesions and needs inpatient care.',
    prompt: 'Which precaution plan should the nurse initiate?', correct: 0,
    options: [
      ['Standard, airborne, and contact precautions in an appropriate isolation room.', 'Varicella requires airborne and contact precautions in addition to standard precautions.'],
      ['Standard precautions alone in a shared room.', 'Standard precautions alone are insufficient.'],
      ['Droplet precautions without contact precautions.', 'This does not address the required transmission precautions.'],
      ['Contact precautions only after the lesions drain.', 'Precautions should not wait for drainage.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'Varicella isolation duration', source: 'varicella',
    scenario: 'A hospitalized client with typical vesicular chickenpox is afebrile, but several lesions remain moist and uncrusted.',
    prompt: 'Which finding supports continuing isolation?', correct: 2,
    options: [
      ['The client can walk without assistance.', 'Mobility does not determine infectiousness.'],
      ['The client has a normal appetite.', 'Appetite does not determine isolation duration.'],
      ['Some lesions have not dried and crusted.', 'Typical varicella precautions continue until lesions are dry and crusted.'],
      ['The client slept poorly last night.', 'Sleep quality is not the criterion.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Colonoscopy screening purpose', source: 'colonoscopy',
    scenario: 'An asymptomatic adult asks why a clinician recommended colorectal cancer screening when bowel movements are normal.',
    prompt: 'Which explanation best addresses the concern?', correct: 1,
    options: [
      ['Screening is useful only after bleeding starts.', 'Screening can occur before symptoms.'],
      ['Screening can identify disease or polyps before symptoms appear.', 'Screening is intended for people without symptoms.'],
      ['Normal bowel movements rule out colorectal disease.', 'Absence of symptoms does not exclude disease.'],
      ['Every screening result requires surgery.', 'Follow-up depends on the findings.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Colonoscopy preparation difficulty', source: 'colonoscopy',
    scenario: 'During a preprocedure call, a client says nausea has prevented completion of the prescribed bowel preparation.',
    prompt: 'What should the nurse advise?', correct: 3,
    options: [
      ['Skip the remaining preparation without notifying the team.', 'Incomplete preparation may impair visualization.'],
      ['Take an additional unprescribed laxative.', 'The preparation should not be changed independently.'],
      ['Assume one bowel movement means preparation is complete.', 'One bowel movement does not establish adequate preparation.'],
      ['Contact the procedure team for instructions before changing the preparation.', 'Intolerable preparation effects require individualized guidance.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Panic symptom evaluation', source: 'panic',
    scenario: 'A client reports a first episode of sudden fear, palpitations, and chest discomfort and asks whether it proves they have panic disorder.',
    prompt: 'Which response is most appropriate?', correct: 0,
    options: [
      ['These symptoms need assessment; one episode alone does not establish panic disorder.', 'Assessment includes considering physical causes and the pattern of symptoms.'],
      ['Chest symptoms always indicate panic disorder.', 'Similar symptoms can have physical causes.'],
      ['A single episode confirms a chronic psychiatric diagnosis.', 'One episode does not establish the disorder.'],
      ['Physical assessment is unnecessary when fear is present.', 'Fear does not exclude a medical problem.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Panic disorder treatment education', source: 'panic',
    scenario: 'A client diagnosed with panic disorder asks what cognitive behavioral therapy is intended to accomplish.',
    prompt: 'Which explanation should the nurse give?', correct: 2,
    options: [
      ['It guarantees that anxiety will never occur again.', 'Treatment does not guarantee permanent absence of anxiety.'],
      ['It requires avoiding every setting associated with fear.', 'Avoidance is not the treatment goal.'],
      ['It helps change responses and thinking patterns associated with panic.', 'CBT teaches different ways to respond to panic-related sensations and thoughts.'],
      ['It replaces all medical follow-up.', 'Treatment still requires appropriate clinical follow-up.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Adrenal replacement during illness', source: 'adrenal',
    scenario: 'A client with adrenal insufficiency develops a febrile illness and asks whether their usual steroid replacement plan needs attention.',
    prompt: 'Which instruction is most appropriate?', correct: 1,
    options: [
      ['Stop replacement until the fever resolves.', 'Stopping replacement can be dangerous.'],
      ['Follow the prescribed sick-day plan and contact the treating clinician promptly.', 'Illness may require adjustment of replacement therapy.'],
      ['Double every medicine indefinitely.', 'Dose changes must follow individualized instructions.'],
      ['Delay seeking advice until the next routine visit.', 'Illness can increase replacement needs now.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Transient stroke symptoms', source: 'stroke',
    scenario: 'During a community visit, a client describes sudden one-sided arm weakness and slurred speech ten minutes ago. Both symptoms have now resolved.',
    prompt: 'Which action should the nurse prioritize?', correct: 3,
    options: [
      ['Arrange a routine appointment next month.', 'Transient symptoms still need emergency evaluation.'],
      ['Recommend a nap and reassessment afterward.', 'Rest must not delay evaluation.'],
      ['Ask the client to drive to urgent care.', 'Emergency medical transport is preferred for suspected stroke.'],
      ['Activate emergency medical services and report the symptom timing.', 'Resolved symptoms can indicate a TIA and require urgent evaluation.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Discharge teach-back', source: 'teachback',
    scenario: 'After reviewing a new medicine schedule, a client nods and says the instructions are clear.',
    prompt: 'Which action best checks understanding before discharge?', correct: 2,
    options: [
      ['Ask whether the print is large enough.', 'Readability alone does not confirm understanding.'],
      ['Ask the client to sign the instruction sheet.', 'A signature does not demonstrate understanding.'],
      ['Ask the client to explain how they will follow the schedule at home.', 'Explanation in the client’s own words reveals understanding.'],
      ['Repeat the entire sheet without inviting a response.', 'Repeating information alone does not check understanding.'],
    ],
  },
  {
    category: 'Management of Care', topic: 'Caregiver skill verification', source: 'teachback',
    scenario: 'With the client’s permission, a caregiver learns a home-care procedure. They can name the supplies but have not practiced the steps.',
    prompt: 'What should the nurse do next?', correct: 0,
    options: [
      ['Ask the caregiver to explain and demonstrate the procedure.', 'Demonstration checks whether instructions can be applied.'],
      ['Document that supply recognition proves competence.', 'Naming supplies does not demonstrate the procedure.'],
      ['Ask only whether the caregiver feels confident.', 'Confidence does not verify technique.'],
      ['Leave practice until after discharge.', 'Misunderstandings should be identified before discharge.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'C. diff household bathroom', source: 'cdiffHome',
    scenario: 'A client recovering from C. diff diarrhea shares the home’s only bathroom with family.',
    prompt: 'Which instruction best reduces household spread?', correct: 3,
    options: [
      ['Clean only surfaces with visible stool.', 'Contamination may not be visible.'],
      ['Use a shared towel to dry everyone’s hands.', 'Shared items can spread contamination.'],
      ['Wait until diarrhea resolves before cleaning.', 'Spread can occur during illness.'],
      ['Clean commonly touched bathroom surfaces before others use them and wash hands with soap and water.', 'Cleaning and handwashing reduce spread.'],
    ],
  },
  {
    category: 'Safety and Infection Control', topic: 'C. diff laundry handling', source: 'cdiffHome',
    scenario: 'A caregiver wears gloves while placing C. diff-soiled linens in the washer.',
    prompt: 'What should the caregiver do after removing the gloves?', correct: 1,
    options: [
      ['Begin preparing food immediately.', 'Handwashing is needed first.'],
      ['Wash their hands with soap and water.', 'Gloves do not replace handwashing after handling contaminated laundry.'],
      ['Wipe their hands on a towel only.', 'Wiping alone is insufficient.'],
      ['Wait to wash until the laundry finishes.', 'Hand hygiene should not be delayed.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Pregnancy movement education', source: 'maternal',
    scenario: 'At a prenatal visit, a client asks what to do if the baby becomes noticeably less active than usual.',
    prompt: 'Which teaching should the nurse provide?', correct: 0,
    options: [
      ['Seek medical care promptly for a clear decrease or stopping of movement.', 'A change in the baby’s usual movement is a warning sign.'],
      ['Wait until the next scheduled visit.', 'Waiting can delay evaluation.'],
      ['Assume reduced movement is always expected late in pregnancy.', 'A meaningful change should not be dismissed.'],
      ['Report it only if vaginal bleeding also occurs.', 'Decreased movement warrants attention without bleeding.'],
    ],
  },
  {
    category: 'Health Promotion', topic: 'Postpartum warning-sign teaching', source: 'maternal',
    scenario: 'Before discharge, a postpartum client asks which symptom should prompt immediate medical care at home.',
    prompt: 'Which symptom should the nurse identify?', correct: 2,
    options: [
      ['Mild tiredness that improves with rest.', 'This is not the urgent warning sign described here.'],
      ['Brief thirst relieved by drinking water.', 'This alone is not an urgent maternal warning sign.'],
      ['A severe headache that persists despite usual measures.', 'Persistent severe headache is an urgent maternal warning sign.'],
      ['Occasional hunger between meals.', 'Hunger alone is not an urgent maternal warning sign.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'Family support for psychosis', source: 'psychosis',
    scenario: 'A client with schizophrenia agrees to involve a sibling in care. The sibling feels overwhelmed and wants practical help supporting recovery.',
    prompt: 'Which referral best addresses this request?', correct: 3,
    options: [
      ['A program promising recovery without clinical treatment.', 'Support should complement appropriate treatment.'],
      ['A service excluding the client from all care decisions.', 'Recovery-focused care involves the individual.'],
      ['A plan to avoid discussing symptoms with the care team.', 'Avoidance can hinder treatment.'],
      ['A family education and support program about schizophrenia.', 'Family programs build knowledge, coping skills, and support.'],
    ],
  },
  {
    category: 'Psychosocial Integrity', topic: 'First-episode psychosis recovery', source: 'psychosis',
    scenario: 'A young adult receiving treatment after first-episode psychosis wants to return to college while continuing care.',
    prompt: 'Which approach best supports this goal?', correct: 1,
    options: [
      ['Postpone all personal goals indefinitely.', 'Recovery includes meaningful life goals.'],
      ['Explore coordinated specialty care with education support and ongoing treatment.', 'Coordinated care combines clinical and educational support.'],
      ['Stop treatment when classes begin.', 'Education goals do not replace treatment.'],
      ['Address medication only and exclude other support.', 'Coordinated care addresses multiple recovery needs.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Asthma rescue response', source: 'asthma',
    scenario: 'A client follows the prescribed asthma action plan and uses reliever medicine, but breathing remains severely difficult.',
    prompt: 'Which action is most appropriate?', correct: 2,
    options: [
      ['Wait until morning to reassess.', 'Severe persistent symptoms need urgent care.'],
      ['Exercise to test whether breathing improves.', 'Exertion does not address the emergency.'],
      ['Seek emergency care according to the action plan.', 'Severe symptoms persisting after reliever treatment require emergency evaluation.'],
      ['Replace prescribed treatment with warm fluids.', 'Fluids do not replace treatment for a severe attack.'],
    ],
  },
  {
    category: 'Physiological Integrity', topic: 'Pediatric asthma escalation', source: 'asthma',
    scenario: 'During a home visit, a child having an asthma attack becomes drowsy and develops a blue tint around the lips.',
    prompt: 'What should the nurse prioritize?', correct: 0,
    options: [
      ['Activate emergency medical services while providing care under the emergency plan.', 'Drowsiness and blue lips during an attack are emergency signs.'],
      ['Let the child sleep before checking again.', 'Drowsiness can signal serious deterioration.'],
      ['Schedule a routine visit later in the week.', 'Routine follow-up is insufficient now.'],
      ['Complete an exposure diary before seeking help.', 'Documentation must not delay emergency care.'],
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
    updatedAt: index < 25 ? '2026-10-02' : '2026-10-03', feedbackEnabled: true,
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

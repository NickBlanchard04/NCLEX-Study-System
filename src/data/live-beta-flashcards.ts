import type { Flashcard } from '../app/types'

type LiveBetaBatchId = 'FC-RN-DIABETES-TEACHING-0001' | 'FC-RN-OXYGENATION-0001'

interface LiveBetaFlashcardSeed {
  id: string
  sourcePackId: LiveBetaBatchId
  category: string
  subcategory: string
  front: string
  back: string
  sourceNeededClaims: string[]
}

const liveBetaBatchSourceRefs: Record<LiveBetaBatchId, string[]> = {
  "FC-RN-DIABETES-TEACHING-0001": [
    "OER-OPENRN-FUND-2E",
    "OER-OPENRN-PHARM-2E",
    "OFFICIAL-NCSBN-NCLEX-2026-RN"
  ],
  "FC-RN-OXYGENATION-0001": [
    "OER-OPENRN-FUND-2E",
    "OER-OPENRN-SKILLS-2E",
    "OFFICIAL-NCSBN-NCLEX-2026-RN"
  ]
}

const liveBetaBatchTopics: Record<LiveBetaBatchId, string> = {
  "FC-RN-DIABETES-TEACHING-0001": "Diabetes teaching, hypoglycemia recognition, sick-day concepts, insulin safety, and high-confidence miss traps",
  "FC-RN-OXYGENATION-0001": "Oxygenation cues, respiratory assessment, positioning, oxygen delivery, escalation, and monitoring"
}

const liveBetaFlashcardMeta = {
  examTrack: 'nclex-rn',
  contentQuality: 'authored-draft',
  sourceStatus: 'source_needed',
  sourceMapStatus: 'candidate_mapped_not_verified',
  clinicalReviewStatus: 'not_sme_reviewed',
  learnerVisible: true,
  visibility: 'learner',
  contentStage: 'beta_draft',
  countsTowardOfficialReadiness: false,
  feedbackEnabled: true,
  status: 'new',
} satisfies Pick<
  Flashcard,
  | 'examTrack'
  | 'contentQuality'
  | 'sourceStatus'
  | 'sourceMapStatus'
  | 'clinicalReviewStatus'
  | 'learnerVisible'
  | 'visibility'
  | 'contentStage'
  | 'countsTowardOfficialReadiness'
  | 'feedbackEnabled'
  | 'status'
>

const liveBetaFlashcardSeeds: LiveBetaFlashcardSeed[] = [
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-001",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Which cue suggests possible hypoglycemia?",
    "back": "Sudden shakiness, sweating, hunger, confusion, weakness, or behavior change can point to low glucose. The RN should assess promptly instead of assuming anxiety or noncompliance.",
    "sourceNeededClaims": [
      "hypoglycemia symptom cluster",
      "prompt assessment priority"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-002",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should the RN check first for sudden shakiness?",
    "back": "Check the client's current glucose status according to policy while assessing safety, mental status, recent intake, medication timing, and ability to swallow.",
    "sourceNeededClaims": [
      "glucose assessment workflow",
      "ability to swallow before treatment",
      "medication timing assessment"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-003",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Trap: 'They are just anxious.' Why unsafe?",
    "back": "Anxiety-like symptoms can overlap with glucose problems. In a client with diabetes, sudden sweating, trembling, or confusion deserves glucose-related assessment before reassurance alone.",
    "sourceNeededClaims": [
      "symptom overlap with anxiety",
      "diabetes assessment priority"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-004",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why does confusion outrank routine teaching?",
    "back": "New confusion can signal an immediate safety problem, including abnormal glucose or another acute change. Assess and stabilize before continuing routine teaching.",
    "sourceNeededClaims": [
      "new confusion escalation significance",
      "priority over routine teaching"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-005",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What cue cluster raises glucose-safety concern?",
    "back": "Missed meals, recent insulin or diabetes medication, sweating, tremor, confusion, weakness, vomiting, or unusual drowsiness together raise concern for glucose instability.",
    "sourceNeededClaims": [
      "glucose instability cue cluster",
      "missed meal and medication timing risk"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-006",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What comes first if low glucose is suspected?",
    "back": "Assess the client, verify glucose according to policy, protect from injury, and use the ordered or policy-directed hypoglycemia protocol when indicated.",
    "sourceNeededClaims": [
      "hypoglycemia first-action workflow",
      "policy-directed protocol wording"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-007",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why check swallowing before oral glucose?",
    "back": "The client must be able to swallow safely before oral treatment is used. Altered mental status or aspiration risk changes the safest response pathway.",
    "sourceNeededClaims": [
      "ability to swallow before oral carbohydrate",
      "altered mental status response pathway"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-008",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should the RN reassess after treating low glucose?",
    "back": "Reassess symptoms, mental status, repeat glucose according to protocol, intake plan, medication timing, and whether further escalation is needed.",
    "sourceNeededClaims": [
      "hypoglycemia reassessment elements",
      "repeat glucose timing by protocol",
      "escalation after inadequate response"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-009",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why is 'document and recheck later' weak?",
    "back": "It delays response to a possible acute glucose problem. Document after assessment, intervention, reassessment, and needed escalation.",
    "sourceNeededClaims": [
      "documentation timing",
      "acute glucose problem response"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-010",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "When does low-glucose concern need escalation?",
    "back": "Escalate according to policy when symptoms are severe, the client cannot swallow safely, glucose does not improve as expected, or the cause is unclear or recurring.",
    "sourceNeededClaims": [
      "hypoglycemia escalation cues",
      "glucose not improving",
      "recurring or unclear cause"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-011",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Pharmacological and Parenteral Therapies",
    "front": "What must match before giving mealtime insulin?",
    "back": "Mealtime insulin safety depends on assessment, the ordered medication plan, glucose data, meal availability, and facility policy. Do not ignore a missing meal tray or poor intake.",
    "sourceNeededClaims": [
      "mealtime insulin and meal availability",
      "glucose data before insulin",
      "facility-policy qualifier"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-012",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Pharmacological and Parenteral Therapies",
    "front": "When should insulin be held and clarified?",
    "back": "Hold and clarify according to policy when the order, dose, glucose data, meal status, route, timing, or client condition does not fit the expected plan.",
    "sourceNeededClaims": [
      "insulin hold-and-clarify triggers",
      "order and meal-status mismatch"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-013",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Pharmacological and Parenteral Therapies",
    "front": "Trap: 'Give insulin because it is scheduled.' Why wrong?",
    "back": "A scheduled time does not replace medication-safety checks. The RN still verifies glucose-related data, meal status, order details, and client condition before administration.",
    "sourceNeededClaims": [
      "scheduled insulin safety checks",
      "meal and client-condition verification"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-014",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "What should insulin teaching emphasize?",
    "back": "Teach the client the purpose of each insulin type, timing with food when applicable, glucose monitoring plan, hypoglycemia response, storage basics, and when to seek help.",
    "sourceNeededClaims": [
      "insulin type teaching",
      "timing with food",
      "storage basics",
      "when to seek help"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-015",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Pharmacological and Parenteral Therapies",
    "front": "Why rotate insulin injection sites?",
    "back": "Site rotation may help reduce tissue changes and support more consistent absorption. The client needs a clear, source-reviewed rotation plan rather than random site changes.",
    "sourceNeededClaims": [
      "injection site rotation benefit",
      "absorption consistency",
      "rotation plan teaching"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-016",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why does the glucose trend matter?",
    "back": "A trend shows whether the plan is working better than a single value alone. Pair glucose results with symptoms, intake, medications, illness, and activity.",
    "sourceNeededClaims": [
      "glucose trend interpretation",
      "symptom and intake correlation"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-017",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should the RN ask after repeated highs?",
    "back": "Ask about medication access and timing, missed doses, food pattern, illness, stress, activity changes, monitoring technique, and whether the client understands the plan.",
    "sourceNeededClaims": [
      "repeated high glucose assessment factors",
      "monitoring technique assessment"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-018",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "What is a glucose monitor teaching trap?",
    "back": "Do not teach the device as if the number is all that matters. Clients should know how to use the device, record trends, respond to symptoms, and follow the care plan.",
    "sourceNeededClaims": [
      "glucose monitor teaching elements",
      "trend recording and symptom response"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-019",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Psychosocial Integrity",
    "subcategory": "Therapeutic Communication",
    "front": "How should the RN respond to a high glucose reading?",
    "back": "Assess the client and the context before judging behavior. Use non-shaming language and focus on patterns, safety, barriers, and the next action.",
    "sourceNeededClaims": [
      "non-shaming diabetes communication",
      "context assessment before teaching"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-020",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "What shows diabetes teaching is working?",
    "back": "The client can explain the plan in their own words, identify warning symptoms, describe medication and meal timing, and state when to call for help.",
    "sourceNeededClaims": [
      "teach-back effectiveness indicators",
      "warning symptom and call-for-help teaching"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-021",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "What is the key sick-day diabetes idea?",
    "back": "Illness can disrupt glucose control even when intake changes. The client needs a clear sick-day plan for monitoring, fluids or food choices, medications, and when to contact the care team.",
    "sourceNeededClaims": [
      "illness effect on glucose control",
      "sick-day plan elements",
      "when to contact care team"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-022",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Pharmacological and Parenteral Therapies",
    "front": "Trap: 'Skip all diabetes meds when sick.' Why wrong?",
    "back": "Sick-day medication decisions depend on the prescribed plan, glucose pattern, intake, hydration, and provider instructions. Blanket skipping can be unsafe.",
    "sourceNeededClaims": [
      "sick-day medication decision factors",
      "risk of blanket medication skipping"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-023",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "When should a sick-day plan trigger a call?",
    "back": "The plan should tell the client when to contact the care team for persistent high or low readings, vomiting, poor intake, dehydration symptoms, fever, ketone concerns if applicable, or worsening condition.",
    "sourceNeededClaims": [
      "sick-day call triggers",
      "ketone concerns if applicable",
      "dehydration symptom escalation"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-024",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should the RN assess with vomiting and diabetes?",
    "back": "Assess hydration, mental status, glucose pattern, medication use, intake, urine output, ketone instructions if applicable, and signs that urgent evaluation is needed.",
    "sourceNeededClaims": [
      "vomiting and diabetes assessment elements",
      "urgent evaluation signs",
      "ketone instruction qualifier"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-025",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "How should sick-day teaching be tested?",
    "back": "Ask the client to teach back what they will monitor, what they will drink or eat if intake is limited, how they will handle medicines, and when they will seek help.",
    "sourceNeededClaims": [
      "sick-day teach-back elements",
      "intake and medicine plan teaching"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-026",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "What should diabetes meal teaching avoid?",
    "back": "Avoid shaming, rigid one-size-fits-all advice, or vague commands to eat better. Teach practical pattern recognition, care-plan alignment, and when food choices affect medication safety.",
    "sourceNeededClaims": [
      "diabetes nutrition teaching principles",
      "food and medication safety connection"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-027",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "What exercise safety point matters with diabetes?",
    "back": "Activity can change glucose needs and symptoms, so the client should follow the care plan for monitoring, food, medication timing, and when to stop or seek help.",
    "sourceNeededClaims": [
      "exercise effect on glucose needs",
      "monitoring and medication timing around activity"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-028",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "Why teach foot checks in diabetes?",
    "back": "Foot checks help clients notice skin changes, wounds, or sensation concerns early. Teaching should include what to inspect and when to report changes according to the care plan.",
    "sourceNeededClaims": [
      "diabetes foot-check purpose",
      "wound or sensation report teaching"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-029",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Health Promotion and Maintenance",
    "subcategory": "Health Promotion and Disease Prevention",
    "front": "What is a realistic diabetes teaching goal?",
    "back": "The goal is safer daily decisions, not perfect recall of every fact. Focus on monitoring, medicines, meals, symptoms, activity, follow-up, and when to ask for help.",
    "sourceNeededClaims": [
      "diabetes self-management teaching domains",
      "follow-up and help-seeking teaching"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-030",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Psychosocial Integrity",
    "subcategory": "Therapeutic Communication",
    "front": "How do you handle diabetes nonadherence wording?",
    "back": "Start with barriers, understanding, access, side effects, cost, schedule, culture, and support. Labeling the client as nonadherent before assessment can miss the real problem.",
    "sourceNeededClaims": [
      "barrier assessment in diabetes teaching",
      "nonadherence language risk"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-031",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "What diabetes task may fit UAP support?",
    "back": "A UAP may assist with stable, routine tasks such as obtaining a fingerstick glucose if trained and allowed by policy, reporting symptoms, or helping with meals.",
    "sourceNeededClaims": [
      "UAP glucose check scope",
      "trained and allowed by policy qualifier",
      "meal assistance role"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-032",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "What diabetes work stays with the RN?",
    "back": "The RN keeps assessment of symptoms, medication judgment, initial teaching, interpretation of glucose trends, escalation, and evaluation of response.",
    "sourceNeededClaims": [
      "RN diabetes assessment accountability",
      "medication judgment scope",
      "teaching and evaluation responsibility"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-033",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "What diabetes cues should UAP report?",
    "back": "Ask UAP to report sweating, shaking, confusion, unusual sleepiness, vomiting, poor intake, refused meal, unexpected glucose result, or any change from baseline.",
    "sourceNeededClaims": [
      "UAP report-back cues",
      "unexpected glucose result reporting",
      "baseline change reporting"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-034",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "Can UAP decide insulin response?",
    "back": "No. UAP can report data and symptoms if within role, but insulin decisions, assessment, teaching, escalation, and evaluation require licensed nursing judgment.",
    "sourceNeededClaims": [
      "UAP insulin decision boundary",
      "licensed nursing judgment for medication response"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-035",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "Which diabetes report needs RN follow-up first?",
    "back": "Prioritize acute change: confusion, inability to swallow, vomiting with poor intake, severe weakness, or symptoms paired with recent diabetes medication.",
    "sourceNeededClaims": [
      "diabetes report priority cues",
      "recent medication and symptom priority"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-036",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What is the safest diabetes-answer pattern?",
    "back": "The safest answer links symptoms, glucose data, intake, medication timing, and ability to act safely. Avoid choices that teach or document before assessing an acute cue.",
    "sourceNeededClaims": [
      "diabetes safety answer framework",
      "assessment before teaching or documentation"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-037",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why is 'just give juice' sometimes wrong?",
    "back": "It may be unsafe if the client cannot swallow, if glucose is not assessed according to policy, or if symptoms suggest a need for a different response pathway.",
    "sourceNeededClaims": [
      "oral carbohydrate safety limits",
      "glucose assessment by policy",
      "alternative response pathway"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-038",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Pharmacological and Parenteral Therapies",
    "front": "How does diabetes logic transfer to pharm questions?",
    "back": "Match medication action to timing, intake, symptoms, labs or glucose data, and safety risk. If the current data do not fit the medication plan, hold and clarify according to policy.",
    "sourceNeededClaims": [
      "medication timing and intake framework",
      "hold-and-clarify according to policy"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-039",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Pharmacological and Parenteral Therapies",
    "front": "What is the Nurse Command game hook for diabetes?",
    "back": "A shift event can ask the player to spot glucose instability, verify meal and insulin timing, respond to symptoms, teach sick-day rules, and reassess whether the plan worked.",
    "sourceNeededClaims": [
      "simulation action diabetes safety claims",
      "sick-day teaching claims",
      "meal and insulin timing claims"
    ]
  },
  {
    "id": "FC-RN-DIABETES-TEACHING-0001-040",
    "sourcePackId": "FC-RN-DIABETES-TEACHING-0001",
    "category": "Physiological Integrity",
    "subcategory": "Pharmacological and Parenteral Therapies",
    "front": "What is the diabetes teaching decision rule?",
    "back": "Assess acute symptoms first, match medicines with intake and glucose data, teach practical self-management, and evaluate whether the client can explain when to act or seek help.",
    "sourceNeededClaims": [
      "diabetes teaching decision framework",
      "medicine-intake-glucose matching",
      "help-seeking teach-back"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-001",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Which breathing cue should the RN notice first?",
    "back": "New shortness of breath, increased work of breathing, or difficulty speaking in full phrases is a priority cue. The RN should assess breathing before routine comfort tasks.",
    "sourceNeededClaims": [
      "respiratory distress cue significance",
      "priority over routine comfort tasks"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-002",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What makes a low oxygen reading more concerning?",
    "back": "A low reading is more concerning when it matches symptoms such as dyspnea, confusion, cyanosis, chest discomfort, or increased work of breathing. Validate the reading while assessing the client, not from the monitor alone.",
    "sourceNeededClaims": [
      "oxygen saturation interpretation",
      "symptom cluster significance",
      "monitor validation workflow"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-003",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Is mild dyspnea ever routine?",
    "back": "Some clients have a baseline respiratory pattern, but new, worsening, or activity-limiting dyspnea is not treated as routine until assessed. Compare the cue with baseline and current trend.",
    "sourceNeededClaims": [
      "baseline comparison language",
      "new or worsening dyspnea assessment priority"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-004",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Which cue cluster points to oxygenation trouble?",
    "back": "Restlessness, new confusion, increased respiratory effort, abnormal breath sounds, and a falling oxygen trend together raise concern for impaired oxygenation.",
    "sourceNeededClaims": [
      "oxygenation cue cluster",
      "mental status change as oxygenation cue"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-005",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Trap: 'The pulse ox is normal, so breathing is fine.' Why wrong?",
    "back": "A single normal reading does not replace respiratory assessment. Work of breathing, mental status, lung sounds, trend, perfusion, and device fit can change the priority.",
    "sourceNeededClaims": [
      "pulse oximetry limitation language",
      "respiratory assessment components"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-006",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should the RN assess first for new dyspnea?",
    "back": "Assess airway patency, respiratory rate and effort, oxygen saturation trend, breath sounds, mental status, skin color, pain, and current oxygen device or therapy order.",
    "sourceNeededClaims": [
      "focused respiratory assessment elements",
      "current oxygen therapy assessment"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-007",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why check the oxygen device during assessment?",
    "back": "Device problems can mimic or worsen oxygenation concerns. Verify placement, connection, flow or setting as ordered, water or tubing issues if applicable, and client tolerance according to facility policy.",
    "sourceNeededClaims": [
      "oxygen device safety check",
      "flow or setting verification",
      "facility-policy qualifier"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-008",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What is the problem with counting respirations too quickly?",
    "back": "A rushed count can miss rate, rhythm, depth, effort, pauses, or distress cues. Respiratory assessment should match the client's condition and facility expectations.",
    "sourceNeededClaims": [
      "respiratory assessment accuracy",
      "facility expectation wording"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-009",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What does tripod positioning suggest?",
    "back": "Tripod positioning can signal increased work of breathing. Treat it as a cue to assess respiratory status and support breathing rather than as simple preference.",
    "sourceNeededClaims": [
      "tripod positioning significance",
      "respiratory assessment priority"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-010",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why compare lung sounds with the client report?",
    "back": "A client can feel worse before obvious auscultation changes are recognized, and abnormal sounds can appear with or without severe symptoms. Combine subjective report, objective assessment, and trend.",
    "sourceNeededClaims": [
      "lung sound interpretation limits",
      "subjective and objective assessment integration"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-011",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What is a safe first action for sudden dyspnea?",
    "back": "Stay with the client, assess breathing, position to ease ventilation if tolerated, verify ordered oxygen support, and call for help or escalate according to condition and policy.",
    "sourceNeededClaims": [
      "positioning for ventilation",
      "oxygen support verification",
      "escalation according to policy"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-012",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Basic Care and Comfort",
    "front": "Which position may help breathing effort?",
    "back": "An upright or high-Fowler-type position may support breathing for many clients if tolerated and not contraindicated. The RN should individualize positioning to the client's condition and orders.",
    "sourceNeededClaims": [
      "upright positioning benefit",
      "contraindication qualifier",
      "individualized positioning"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-013",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What beats routine ambulation in a breathless client?",
    "back": "Breathing assessment and stabilization come before routine ambulation. Activity can wait until the RN determines the client can tolerate it safely.",
    "sourceNeededClaims": [
      "activity tolerance assessment",
      "breathing priority over routine ambulation"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-014",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why not leave to get supplies first?",
    "back": "If the client is in respiratory distress, the RN should stay, assess, activate help, and use available safety measures. Leaving without support can delay response to deterioration.",
    "sourceNeededClaims": [
      "do not leave respiratory distress unsupported",
      "activation of help"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-015",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should the RN do before increasing oxygen?",
    "back": "Assess the client, verify the current device and order, follow standing orders or facility policy, and escalate when the need exceeds the current plan.",
    "sourceNeededClaims": [
      "oxygen adjustment scope",
      "standing order or facility policy wording",
      "escalation when current plan insufficient"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-016",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should the RN verify with nasal cannula oxygen?",
    "back": "Verify correct placement, ordered flow, tubing connection, skin comfort, and whether the client is tolerating therapy. Facility policy and orders determine exact actions.",
    "sourceNeededClaims": [
      "nasal cannula safety checks",
      "ordered flow verification",
      "skin comfort monitoring"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-017",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What is unsafe about a loose oxygen mask?",
    "back": "A poor fit can reduce effective oxygen delivery and cause discomfort or skin issues. Assess fit, tolerance, and ordered device setup before assuming therapy is working.",
    "sourceNeededClaims": [
      "mask fit effect on oxygen delivery",
      "skin or comfort issue wording"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-018",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should the RN check if oxygen saturation drops suddenly?",
    "back": "Assess the client first while also checking probe placement, motion, perfusion, device connection, oxygen source, tubing, and ordered therapy setup.",
    "sourceNeededClaims": [
      "sudden saturation drop workflow",
      "probe and device troubleshooting"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-019",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "What should the RN clarify about a new oxygen order?",
    "back": "Clarify the device, dose or setting, target or monitoring expectations if provided, duration, and when to report lack of response. Use facility policy for incomplete or unclear orders.",
    "sourceNeededClaims": [
      "oxygen order clarification elements",
      "unclear order workflow"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-020",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Trap: 'More oxygen is always the answer.' Why wrong?",
    "back": "Oxygen support must match assessment, orders, client condition, and policy. The RN should identify the cause of distress and escalate rather than reflexively changing therapy beyond the plan.",
    "sourceNeededClaims": [
      "oxygen therapy scope",
      "cause assessment before intervention",
      "escalation when beyond plan"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-021",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "When should dyspnea be escalated?",
    "back": "Escalate according to facility policy when dyspnea is new, worsening, not relieved by ordered measures, associated with mental status change, chest discomfort, cyanosis, or unsafe vital-sign trends.",
    "sourceNeededClaims": [
      "dyspnea escalation cues",
      "unsafe vital-sign trends",
      "facility-policy escalation"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-022",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What trend matters after oxygen support starts?",
    "back": "Watch respiratory effort, oxygen saturation trend, mental status, skin color, comfort, activity tolerance, and whether ordered goals are being met. A number alone is not enough.",
    "sourceNeededClaims": [
      "oxygen therapy evaluation indicators",
      "ordered goal monitoring"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-023",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What shows respiratory status is improving?",
    "back": "Improvement may include easier breathing, lower work of breathing, clearer mentation, stable or improving oxygen trend, and tolerance of ordered activity or positioning.",
    "sourceNeededClaims": [
      "respiratory improvement indicators",
      "activity tolerance wording"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-024",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "What should the RN document after oxygenation concern?",
    "back": "Document assessment findings, oxygen device and ordered setting, interventions, client response, escalation or notifications, and follow-up monitoring according to policy.",
    "sourceNeededClaims": [
      "documentation elements",
      "oxygen device documentation",
      "notification according to policy"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-025",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why reassess after repositioning?",
    "back": "Positioning is not the endpoint. Reassess breathing effort, oxygenation trend, comfort, and whether further intervention or escalation is needed.",
    "sourceNeededClaims": [
      "reassessment after positioning",
      "escalation after inadequate response"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-026",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "What oxygenation task may fit UAP support?",
    "back": "A UAP may help with stable, routine support such as positioning, obtaining routine vital signs, or reporting observations if within role, training, care plan, and facility policy.",
    "sourceNeededClaims": [
      "UAP oxygenation support tasks",
      "stable routine qualifier",
      "facility-policy qualifier"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-027",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "What oxygenation work stays with the RN?",
    "back": "The RN keeps respiratory assessment, interpretation of trends, oxygen therapy judgment, teaching, escalation, and evaluation of response.",
    "sourceNeededClaims": [
      "RN respiratory assessment accountability",
      "oxygen therapy judgment scope",
      "evaluation responsibility"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-028",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "What should UAP report for oxygenation risk?",
    "back": "Ask UAP to report new shortness of breath, increased effort, cyanosis, confusion, dizziness, chest discomfort, device displacement, or vital signs outside report-back parameters.",
    "sourceNeededClaims": [
      "UAP report-back cues",
      "vital-sign parameter wording",
      "device displacement reporting"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-029",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "Can UAP decide to raise oxygen flow?",
    "back": "No. Changing oxygen therapy requires an order, protocol, or policy-supported nursing action. The RN assesses and follows the appropriate escalation pathway.",
    "sourceNeededClaims": [
      "UAP oxygen flow boundary",
      "order or protocol requirement",
      "RN escalation pathway"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-030",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Safe and Effective Care Environment",
    "subcategory": "Management of Care",
    "front": "Why not delegate first assessment of new dyspnea?",
    "back": "New dyspnea is not a routine stable task. The RN must assess, decide priority, start appropriate actions, and then delegate supportive tasks as safe.",
    "sourceNeededClaims": [
      "new dyspnea as nonroutine cue",
      "RN assessment before delegation"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-031",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why is 'document and recheck later' weak for new distress?",
    "back": "It delays assessment and response. Document after the RN assesses breathing, initiates appropriate safety actions, escalates if needed, and evaluates response.",
    "sourceNeededClaims": [
      "documentation timing",
      "respiratory distress priority response"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-032",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Psychosocial Integrity",
    "subcategory": "Therapeutic Communication",
    "front": "Why is 'reassure the client first' weak for dyspnea?",
    "back": "Calm communication helps, but it cannot replace respiratory assessment. The RN should assess and support breathing while using clear, reassuring communication.",
    "sourceNeededClaims": [
      "assessment priority over reassurance",
      "therapeutic communication during dyspnea"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-033",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Why is 'wait for the next scheduled vitals' unsafe?",
    "back": "A new respiratory cue can deteriorate before routine timing. The RN should assess current status and decide whether urgent monitoring or escalation is needed.",
    "sourceNeededClaims": [
      "respiratory cue reassessment urgency",
      "scheduled monitoring insufficiency"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-034",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What is the safest NCLEX answer for breathing trouble?",
    "back": "The safest answer usually assesses airway and breathing, supports ventilation or oxygenation within orders and policy, stays with the client, and escalates for instability.",
    "sourceNeededClaims": [
      "ABC priority framework",
      "support within orders and policy",
      "instability escalation"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-035",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "Trap: 'The client can talk, so airway is safe.' Why wrong?",
    "back": "Talking may be reassuring, but short phrases, fatigue, worsening effort, or mental status change can still signal risk. Keep assessing the full breathing picture.",
    "sourceNeededClaims": [
      "speech pattern and respiratory distress",
      "fatigue or mental status cue significance"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-036",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What should oxygen safety teaching include?",
    "back": "Teach the client to keep the device in place as ordered, call for help with worsening breathlessness, avoid changing settings independently, and follow facility oxygen-safety rules.",
    "sourceNeededClaims": [
      "oxygen device teaching",
      "do not independently change settings",
      "facility oxygen-safety rules"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-037",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Psychosocial Integrity",
    "subcategory": "Therapeutic Communication",
    "front": "How should the RN speak to a breathless client?",
    "back": "Use short, calm statements while assessing and acting. Avoid long explanations that increase fatigue or delay support.",
    "sourceNeededClaims": [
      "short communication during dyspnea",
      "fatigue and long explanation risk"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-038",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "How does oxygenation logic transfer to other priorities?",
    "back": "Find the immediate breathing risk, assess before routine care, keep scope-sensitive interventions policy-bound, and evaluate whether the client's status improves.",
    "sourceNeededClaims": [
      "oxygenation priority framework",
      "scope-sensitive policy-bound interventions"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-039",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What is the Nurse Command game hook for oxygenation?",
    "back": "A shift event can ask the player to spot worsening breathing, position safely, verify ordered oxygen support, call for help, and reassess whether the trend improves.",
    "sourceNeededClaims": [
      "simulation action oxygenation claims",
      "trend reassessment claims"
    ]
  },
  {
    "id": "FC-RN-OXYGENATION-0001-040",
    "sourcePackId": "FC-RN-OXYGENATION-0001",
    "category": "Physiological Integrity",
    "subcategory": "Reduction of Risk Potential",
    "front": "What is the oxygenation decision rule?",
    "back": "Assess breathing first, support oxygenation within the current plan and policy, escalate when unstable or not improving, and evaluate response after every action.",
    "sourceNeededClaims": [
      "oxygenation decision framework",
      "support within current plan and policy",
      "escalation when unstable or not improving"
    ]
  }
]

export const liveBetaBatchFlashcards: Flashcard[] = liveBetaFlashcardSeeds.map((card) => ({
  ...liveBetaFlashcardMeta,
  id: card.id,
  category: card.category,
  sourceTopic: `${card.category} / ${card.subcategory} / ${liveBetaBatchTopics[card.sourcePackId]}`,
  sourceRefs: [...liveBetaBatchSourceRefs[card.sourcePackId]],
  sourcePackId: card.sourcePackId,
  fixtureId: `LIVE-BETA-${card.sourcePackId}`,
  sourceNeededClaims: card.sourceNeededClaims,
  front: card.front,
  back: card.back,
}))

# Playable shifts

Open `/nurse-tycoon/` and start a new shift. Existing saved shifts retain their original cases; the new simulation starts with the next shift.

## Playing

- A shift lasts 24 game minutes. The existing visible-page clock and dialog/shop/manual pause rules remain in use. Completing care costs 3 game minutes before upgrade discounts.
- New shifts combine identity, monitor review, and immediate bedside safety into one assessment. Medication cases retain a separate verification; an installed scanner performs it at the bedside after assessment. Choose care, reassess the response, and chart at the station. After saving the note, a brief station work animation records charting and pays the task reward once. Older saves retain their original six-step sequence.
- Three authored case types cover changing chest symptoms, a medication concern, and dizziness/fall risk. Untreated cases worsen after their care window. Unsafe responses lower safety and money; the patient remains available for corrective care.
- Reassessment must distinguish improvement from persistent deterioration. Persistent findings require further simulated clinical review before documentation.
- Discharge documented patients from Patient commands or the nursing station. Two additional admissions replace discharged patients in their existing rooms. Once the queue is empty, discharged rooms remain vacant.
- Complete and discharge at least 3 patients with safety at 80% or higher to earn a $150 shift bonus. Handoff may end the shift early; the time limit ends it automatically. The review records decisions and earnings, including archived admissions.
- One successful shift unlocks extra rooms, support staff, and medication scanning. Two unlock the practice bay. Monitoring, charting, and lab support are available immediately. Extra rooms admit patients next shift, up to six rooms.

## Pacing and patient response

Each new shift opens with a briefing and quiet rounds. A comfort request appears after the first assessment or one game minute. One changed-symptom complication appears after the first completed patient or three game minutes. The call board puts clinical changes first. Attending the call acknowledges the request; focused care and reassessment still have to be completed.

Comfort requests can be deferred, attended personally, or assigned to purchased support staff. Staff must reach the room, provide comfort for two seconds, return to the station, and finish a report before the request is answered. Clinical changes cannot be delegated. Deferral does not extend the deadline. An unanswered clinical-change call loses 5 safety after its three-minute window; a comfort request loses 1 reputation after five minutes. Each consequence applies once. The handoff review records responses, delays, and a purchase recommendation based on the shift.

Patient expressions, posture illustrations, dialogue, monitor tint, and live readings follow the authoritative condition. Reduced-motion mode keeps the same information with static presentation. Monitoring upgrades expose remote vital trends on the ward board; baseline players review vitals at the bedside. The EHR upgrade prepares an editable draft from completed assessment, care, and reassessment, which the player reviews before saving. Support staff visibly travel to assigned rooms. Phaser reports arrival and work milestones; the game reducer validates each milestone before resolving requests.

## State and compatibility

Zustand's existing persisted tycoon state remains authoritative. Phaser renders state and reports expected job phase, position, and active work duration. The reducer validates these reports; Phaser never changes rewards directly. Each admission has a unique identity; discharge, care stages, choices, completion, and shift payout reject stale or repeated actions. Reward amounts are stored at completion so later upgrades cannot change historical earnings. Successful-shift unlocks persist independently of the capped shift-history list.

The simulation fields are optional to preserve legacy saves and care flows. No offline time is charged. New patient identities rebuild the ward's interaction targets without adding a second player nurse or resetting the nurse's position. Reduced motion removes walking-cycle animation and shortens the care presentation.

## Clinical content

These are fictional training-game cases, with authored numbers and scripted team responses. They are not clinical protocols or validated patient-outcome models. A clinical educator should review them before use as assessed nursing education. Background sources accessed September 26, 2026:

- [NHS chest pain](https://www.nhs.uk/symptoms/chest-pain/)
- [MedlinePlus digoxin information](https://medlineplus.gov/druginfo/meds/a682301.html)
- [CDC fall prevention](https://www.cdc.gov/falls/prevention/index.html)

## Verification

`npm test`, `npm run lint`, and `npm run build` pass. Tests cover the complete staged care sequence, all three cases, deterioration, corrective decisions, idempotency, turnover, stale routes, finite admissions, timeout, reward history, and progression.

Browser playthroughs cover the desktop shift, call responses, payout and reload, purchased-upgrade replay, and phone care with reduced motion. QA scripts, screenshots, and reports are in the NursingSoftware workspace's `outputs/tycoon-qa` directory. The current physical-interaction script is `physical.cjs`, tested against a built Vite preview on port 4175 to avoid development reloads. This change is local; it has not been deployed.

## Physical equipment jobs

New shifts enable persisted jobs; existing shifts keep their prior rules until the next shift. The player uses the scanner at the safety stop and charts at the station. Both require two active seconds; movement is locked while operating them. The lab runner collects an optional prepared training sample from a vitals-case bedside, carries it back, and delivers it before the lab time discount becomes available. Request pickup from Patient commands after assessment.

Dialogs, the shop, manual pause, and hidden pages suspend travel and work. Reduced motion keeps the same work requirements with static poses and a progress indicator. Reload resumes at the last confirmed job checkpoint; partially completed work restarts safely. A shop redraw preserves actor routes. Discharge and shift end cancel unfinished jobs. Expected-phase guards reject duplicate, stale, remote, and premature completion reports.

Other upgrades retain their existing roles: monitors show condition-based readings, extra beds add capacity next shift, and the practice bay grants its XP benefit. They do not have additional staff-use animations in this change.

## Ward polish

The camera follows with a short ease and uses direct positioning for reduced motion. All nurses use the registered foot pivots and a consistent scale. Staff presentation positions separate nearby characters while remaining on walkable floor; gameplay routes and arrival validation remain authoritative.

Equipment captions appear near the player. Labels move away from characters and other labels; lower-priority captions hide when space is insufficient. Scanner lights and the station screen respond to active work. Lab collection shows the sample before transport and leaves it at the station after delivery. Answered comfort requests warm the room lighting.

Quiet synthesized footsteps, scanning, call-bell, and completion cues start only after a user gesture. The speaker button saves its mute preference locally; pauses and hidden pages silence cues. Sounds are optional and do not affect state. Newly finished chart jobs display the recorded money and XP payout without awarding anything a second time.

Transparent panels use stronger text contrast. On phones the patient drawer occupies at most 54% of the viewport, with observations and shift goals available in expandable sections. Room navigation and call alerts stay visible in the compact ward card. The full-screen map retains desktop and phone layouts without page scrolling.

## Character movement

Walking now advances one frame per 22 screen-space pixels traveled; footstep cues occur on alternating contact frames. Idle time, blocked movement, and pauses do not advance the stride. Starts accelerate over a short interval; keyboard release stops within a small coasting distance, while automatic routes brake toward their destination. Turn confirmation and an axis dead band prevent tiny course corrections from flipping the sprite, without restarting its stride.

On arrival, nurses face the patient, equipment, scanner, or station. Support and lab staff park separately and move gradually toward presentation spacing targets along walkable routes. Returning lab staff combine the existing holding upper body with walking legs and a held sample; no new artwork is required. Reduced motion keeps static poses and the same navigation and care rules.


## Runtime performance

Navigation caches the fixed floor grid and validated neighbor edges by room count. Returned paths own their coordinates, so consuming or modifying a route cannot corrupt later routes. Controllers reuse interaction targets until tasks change, and find the nearby target without allocating and sorting an array each frame. Staff presentation skips stationary routing and limits blocked-route replanning to a 150 ms interval while continuing movement every frame.

Map captions, label collision placement, patient indicators, and diagnostic DOM attributes refresh at 10 Hz or immediately after bridged state changes. Route graphics refresh at 20 Hz. Nurse animation, camera movement, arrival checks, physical work, and the authoritative game clock retain their existing timing. This avoids tying care progression or rewards to the lower cosmetic refresh rate.

Validation: 186 tests passed, lint passed, and the production build passed (existing bundle-size warnings remain). Headless Edge completed the three-patient desktop workflow and reduced-motion phone workflow; Chrome completed the Room 103 workflow, including documentation, pause, discharge, and saved reward checks. Neither browser reported page errors. Firefox and Safari were not available in this environment.

The local six-second, three-actor Edge profiling sample measured animation callback intervals of 14.26 ms mean / 20.9 ms p95 before optimization, 7.83 / 13.9 ms afterward, and 6.95 / 7.1 ms on a repeat. These are headless rAF measurements, not guaranteed presented FPS or a controlled hardware benchmark. Scripts and JSON reports are in `outputs/tycoon-qa` in the parent NursingSoftware workspace.


## Room materials and grounded beds

Patient rooms use deterministic vinyl tile textures, with fine grain, subtle tile variation, seams, and baked wall-contact shading. Each palette creates one reusable canvas texture per game instance; room redraws reuse it. The material follows the same 72/44 isometric projection as the floor and navigation geometry. Nearby cabinet, monitor, and IV footprints use a shared soft-shadow texture.

The audited patient asset includes the entire mattress and bedding. Original image files remain unchanged. An occupied bed now adds a shaded metal chassis, four wheel supports, tight wheel-contact shadows, and a layered floor shadow. Three contiguous runtime crops of the original mattress use separate depth values so nurses sort against bed cross-sections. The mattress no longer rotates as a whole: its wheels and floor contacts stay fixed. Empty beds retain their existing complete artwork and gain floor shadows.

Room-material validation: production build, lint, and all 186 tests passed. Edge desktop completed all three patient workflows; phone reduced-motion care, support completion, documentation, pause, discharge, and reward persistence passed. Direct occupied-bed clicking opens assessment. Desktop and phone screenshots show no page scrolling and no page errors. The initial combined browser run encountered a temporary preview 404 while the build replaced dist; the phone workflow was rerun successfully after the build completed. Browser plugin not available; validation used installed Edge through regular Playwright.

With room materials enabled, two six-second headless Edge samples measured 16.88 and 16.45 ms mean animation callback intervals (both 21 ms p95). This is roughly 59–61 callbacks/second in that environment, slower than the earlier optimization-only samples. It does not establish presented FPS on the user's browser. Floors and contact shadows are cached, but bed depth layers and chassis add render objects; no zero-cost performance claim is made.


## Starting hospital surroundings

The outdoor courtyard background is replaced by a continuous indoor tile floor and a furnished hospital shell. Reception, entrance, family waiting, clean linen storage, sample dispatch, medication carts, and room-wall fixtures surround the compact clinical ward. Decorative areas sit outside the nurse's clinical navigation floor; the patient and station routes remain unchanged.

A receptionist and supply attendant provide background activity. Their poses and cart motion use the scene's active elapsed time, stop with pause or page hiding, and become static under reduced motion. These characters are scenery: they cannot complete clinical jobs, affect the clock, or grant rewards. Purchased support and lab staff retain their authoritative job behavior.

Practice-bay and future-wing signs open the existing shop. Buying Simulation Room replaces its reserved footprint with the practice bed and monitor. Buying Extra Bed installs an empty room immediately and advances the future-wing marker; patients arrive next shift under the existing capacity rules. Lab Runner equips the dispatch alcove and adds the existing functional runner. Other upgrades retain their visible installed objects. All purchases and progression requirements still use the store.

The Overview control frames the hospital, including expansion areas; Follow nurse restores the normal camera. Both controls are available on phones. The repeating common-floor texture and existing audited prop artwork are reused. Added source PNGs are byte-for-byte copies with visible bounds, anchors, and hashes in registration.json.

Surroundings validation uses the installed Edge browser through Playwright (Browser plugin unavailable). Desktop/phone overview, pause, no-scroll layout, and shop access passed. In an isolated earned-progress fixture, clicking the future-wing sign opened the shop; buying Extra Bed, Lab Runner, Support Nurse, and Simulation Room spent exactly $1,045, kept the current three-patient shift unchanged, and persisted across reload. Screenshots show the installed fourth room and the next expansion plot. Existing automated tests passed: 186 across 27 files.

The desktop workflow reached all three completed patient-care checks. The long-running local servers stopped before the combined report finished; both servers were restarted, and the phone care workflow was rerun to a PASS report. Final-build surroundings checks also passed again for desktop and phone, including purchases and persistence. Lint and the production build passed; existing bundle-size warnings remain. Background actors do not increase the count of gameplay nurses.


## Finished environment artwork

Seven generated assets replace the remaining environmental placeholder props: linen cabinets, sample-dispatch counter, complete reception desk, renovation barriers, waste bins, sanitizer stands, and textured vinyl. Full prompts and preserved source PNGs are in the parent workspace's `outputs/hospital-artwork/finished-map`; runtime copies are registered in `public/game-assets/hospital-prototype/registration.json`. Prop transparency was checked, anchors were adjusted to visible feet/bases, and the finished map was inspected at nurse-follow and overview scales. Rear-service props render behind patient-room walls. Ambient motion and progression remain separate from static art.

Art-pass validation: 186 tests, lint, and production build passed. Edge desktop/phone surroundings checks passed, including overview, shop purchases, installed-room capacity, pause, no page scrolling, and reload persistence. The reduced-motion phone workflow passed assessment, care, documentation, discharge, reward persistence, and support report-back. Generated source assets total 8,330,002 bytes; repeat objects share loaded textures. Existing production bundle-size warnings remain.

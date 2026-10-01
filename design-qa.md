# Question Bank navy/light release QA — 2026-10-01

Selected reference: codex-clipboard-157bb75e-faaf-4c75-b903-64f5a374cf79.png.
Implemented navy question area, light answer sheet, right-side selection indicators, cyan selection, dark primary action, and two-column desktop answers. Removed patient-context label. Feedback retains explicit correct/incorrect labels with light-surface contrast.

Validated through the in-app browser at 375x667 and 1440x900, including selection, wrong-answer feedback, Continue and correct-answer feedback. Document fits viewport; longer mobile feedback scrolls internally rather than hiding content. Browser error log empty. Fresh tab recovered a stale preview connection. Fixed feedback label and hover contrast discovered during QA.

Automated gates: 187 tests pass; lint and production build pass; formatting audit passes for 1,250 questions, with 67 pre-existing metadata warnings. Generated distractors now start with capitals and end with periods; clinical content, correct keys, and fingerprints unchanged. This is not a claim of exhaustive clinical or spelling review of the entire bank. Intentional tests/e2e/global.setup.ts change excluded from release.

final result: passed

## Prior iteration

# Question Bank selected-layout QA — 2026-10-01

final result: passed

Scope: local Question Bank active runner only, for guest and account entry. No deployment. Existing exam and Quick Study presentation remains unchanged. Preserve prior QA records below.

## Visual truth and evidence

- Mobile target: `C:/Users/lblan/AppData/Local/Temp/codex-clipboard-c1aa8ab1-741e-493e-b06f-e075827e559e.png` (853x1844 image, approximately 390x844 CSS at 2.18x density).
- Desktop target: `C:/Users/lblan/AppData/Local/Temp/codex-clipboard-b051d74d-384b-4c65-b42f-db8da8584231.png` (1505x1045, approximately 1440x1000 CSS).
- Rendered mobile: `C:/Users/lblan/.codex/generated_images/019f4cd2-809f-7d71-9244-6a8b0626b41a/practice-mobile-implemented.png` (390x844, 1x).
- Rendered desktop: same directory, `practice-desktop-implemented.png` (1440x1000, 1x).
- Reference and implementation images opened together in the same comparison input; compared proportions at the logical viewport rather than raw pixel sizes. Full-view text and control detail were readable, so no extra crops were needed.
- State: A selected, not submitted. Live bank selects a different existing question and a two-question filtered set; copy wrapping and progress fraction therefore differ. No pixel-identical clinical-copy claim. No question wording or scoring key changed.

## Fidelity and iteration findings

- Initial P2: mobile brand wrapped and primary action did not span the screen. Fixed scoped brand width and button width/margin; recaptured.
- Initial P2: desktop body centered too low, and answer letters remained beside the text. Fixed top alignment and desktop tile column layout; recaptured.
- Initial P2: excess unused space under mobile choices. Allowed rows to distribute available height with a maximum size; small-screen minimum content size retained. Recaptured.
- Typography: existing product font retained; 16px answers/context on phones, larger desktop text, bold question-first hierarchy on phones. No text scaling or truncation.
- Layout: stacked phone answers, two-column desktop tiles, patient context with left rule on mobile and contained context on desktop. Compact responsive header/footer intentionally use less height than the generated mock to preserve room on short screens.
- Colors: matte #080f15, navy answer surfaces, cyan selection and action; semantic green/red feedback plus explicit text labels.
- Assets: existing Nurse Command logo reused, not recreated; existing Lucide icons. No new raster assets required.
- Copy: “Your patient” replaces “Clinical scenario”; question and answer wording preserved. More retains source/review status, question navigation, reporting and discard. This small additional control is intentional.

## Verification

- In-app Browser at `http://127.0.0.1:4197/practice-questions`; meaningful page, correct title, no framework overlay, no captured warning/error logs.
- Guest setup -> Start practice -> select -> wrong-answer feedback -> Continue passed. Separate correct answer -> Why dialog -> Save & leave -> reload -> Resume session restored recorded answer and question position.
- Selected test question had no document or question-body overflow at 375x667, 390x844, 414x896, 768x1024, 1024x768, and 1440x1000; four answers and CTA visible. Rechecked smallest size after spacing fix.
- Longer items, enlarged text and feedback may scroll within the question area, with footer kept visible. No guarantee that arbitrary-length content fits without internal scrolling. No content is hidden or made unreadably small to force fit.
- Build and lint passed. All 187 tests across 30 files passed, including four new focused-view tests for ordering, selection versus correctness, wrong-answer labeling and unchanged Quick Study/SATA behavior.
- No authenticated production/cloud persistence QA, no release, no E2E cloud reset. Intentional local `tests/e2e/global.setup.ts` remains untouched.

## Follow-up polish / remaining risk

- Generated-mock gradient and exact line wrapping are not reproduced; flat existing brand tokens and real bank content are intentional.
- Signed-in integration shares the same component and is wired in code, but this browser pass used only an isolated guest local session.
- Content clinical quality/expert review is outside this layout change.

---

# Viewport-fit home launcher verification

Date: 2026-09-20. Scope: home route only; preserve the three approved banner crops and hover effects while replacing everything around them.

## Result

- Replaced the grid/animated background, oversized heading, subtitle, lower tool panels, and upload section with a matte dark canvas and compact branded header.
- Desktop shows all three original banners at their original aspect ratios, sized to available width and height. No artwork edits.
- Under 768px, a three-option selector shows one readable banner at a time instead of stacking a scrolling page.
- Study tools open in a native modal dialog. Uploads remain available in Study Library; account access remains in the header. Normal study pages keep their scrolling behavior.
- Kept migration controls available, constrained within the viewport, with a dark background for contrast.

## Verification

- Actual AppShell and StudyMenuPage rendered in Chrome with an isolated, in-memory local fixture. Supabase and analytics disabled; no real user/account reset and no cloud writes.
- Document width/height equal viewport width/height at 320x568, 375x667, 390x844, 640x480, 768x1024, 1024x768, 1280x720, 1440x900, 1920x1080, and 844x390. All visible banner bounds remain inside the viewport.
- Inspected 1280x720 and 390x844 screenshots. Art proportions, readable navigation, and no clipping verified.
- Banner routes, profile link, mobile selector, library link, modal focus trapping, Escape/focus restoration, hover glow/lift, and reduced-motion behavior passed.
- 320px enlarged-text (20px root font) and migration-visible layout checks passed without document overflow.
- Browser console: zero errors/warnings on local fixture. Lint, production build, and diff whitespace check passed.
- Local screenshots and QA snippets: `output/playwright/home-fit-*` (ignored artifacts).

Boundary: these are layout/navigation checks, not new live authentication or cloud-data validation. The tools dialog itself may scroll on small displays; the home page does not.

## Quick Study simplification — 2026-09-20

- Quick Study now uses the home screen's matte canvas, compact brand header, blue practice artwork, and a single Start 5 questions action. Removed sidebar, duplicate start controls, signal/stat grids, loop instructions, and secondary page sections from this route only.
- Added an opt-in compact presentation to the existing question-session runner. The store, confidence-gated answer persistence, scoring, session sync, question selection, and noncompact Question Bank/Exam views are unchanged.
- One bounded panel handles answering, rationale review, and completion. Header/progress and footer controls stay visible; long clinical text, detailed sources, and missed-item review remain readable through internal panel/dialog scrolling, never document scrolling.
- Preserved single-answer/SATA selection, flags, confidence, back/jump navigation, answer locking, save/resume, source/SME status, full rationales, linked cards, content reporting, completion, and missing-item rebuild. Discard is secondary and requires confirmation. Rebuild clears the unusable active session before starting a replacement, preserving recorded attempts.
- Local isolated Chrome checks: 30 no-document-overflow cases across intro/question/review at 10 viewports, plus completion at 5 sizes. Complete 5-answer session saved exactly once per answer; pause/resume, SATA, confidence gating, explanation dialog/Escape/focus, discard confirmation, missing-item rebuild, and content report passed.
- Trailing-slash direct entry, enlarged text at 320px, migration-visible layout, and noncompact Question Bank regression passed. Inspected desktop/mobile screenshots in `output/playwright/quick-*`.
- Lint, TypeScript/production build, 107 unit tests, bundle budgets, and whitespace validation passed. Existing cloud-mutating E2E setup was not run or changed; its unrelated local edit remains preserved. Protected-route expectations were updated to the new start-button label.
- Same isolated local-fixture limitations as the home checks above: no live user/account reset or cloud writes were used for QA.
# 2026-09-26 Quick Study inline feedback

- Replaced separate text-heavy answer review with persistent scenario/choices and explicit selected, correct, incorrect, and missed-correct labels. Correct choices are green; incorrect selections are red; missed correct choices use a dashed green border. Checked choices stay fully opaque and locked.
- Check answer saves once with confidence `unreported`; no fabricated low/medium/high selection or confidence-selected analytics event. Unreported answers are excluded from calibration averages/mismatch denominators and cannot prove confidence-based remediation transfer. Added three regression tests.
- Removed the repeated practice/SME line and Item details control from the main question surface at the owner's request. Source/review status and reporting remain available in Sources & options / Why. Existing clinical rationale is unchanged; short rationales appear in desktop feedback, full explanation remains available on every size.
- Local isolated Chrome: correct, incorrect, and SATA partial feedback passed at 320x568, 390x844, 768x1024, 1280x720, 1920x1080, and 844x390. No document overflow; long content remains internally scrollable. Verified selection labels, locked answers, immediate save, dialog Escape/focus, three-question completion, backtracking, save/resume, and duplicate prevention. Screenshots inspected in output/playwright/feedback-*-desktop.png and feedback-*-mobile.png.
- Lint, 110 tests, TypeScript/Vite build, bundle budgets, question-engine simulation (100 learners / 6000 attempts), and formatting audit passed. Formatting retains the existing nonblocking metadata warnings. Local QA blocks external requests and uses synthetic in-memory state; no cloud accounts were reset or modified. Intentional tests/e2e/global.setup.ts change remains untouched.

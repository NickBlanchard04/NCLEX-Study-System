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

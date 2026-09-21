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

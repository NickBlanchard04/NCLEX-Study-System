# Site-Wide UX Audit - 2026-07-01

Scope: Nurse Command React/Vite web app. Criteria: sole page purpose, next action clarity, visual hierarchy, mobile fit, and hub/nav placement.

Evidence captured locally in `ux-audit-2026-07-01/`:

- Desktop first-screen screenshots for auth/welcome and 16 protected routes.
- Mobile first-screen screenshots for dashboard, question bank, my materials, notes, social, and mobile command hub.
- Console warnings/errors captured during audit: 0.

Evidence limits: this is a first-screen UX audit, not a full WCAG certification or full task-completion study. Keyboard trapping, screen reader output, and every below-the-fold interaction still need targeted accessibility testing.

## Hub Model

Use five learner-facing buckets everywhere:

- Start: Home, Dashboard, Study Plan
- Practice: Question Bank, Quick Study, Exam Prep, Exams
- Review: Remediation, Performance
- Library: My Materials, Flashcards, Notes, Resources
- Connect: Nurse Lab, Social

Settings and Help & Support stay as utilities below the hub. They are not study destinations, so they should not compete with the five buckets.

## Grades

| Page | Sole purpose | Primary next action | Grade | Nav placement | Main improvement |
| --- | --- | --- | --- | --- | --- |
| Auth / Welcome | Choose sign-in or account creation | Sign in or create beta account | B+ | Entry | Keep first screen premium and avoid bringing back form clutter. |
| Home / Study Menu | Route a learner into the right work mode | Start Today | B | Start | Keep it as a launch menu, not a second dashboard. |
| Dashboard | Own today's one best action | Start now | B+ | Start | Continue making badge meaning more consumer-readable. |
| Study Plan | Show weekly structure and pacing | Start today's plan item | B | Start | Make today/week/later less decorative and more task-like. |
| Question Bank | Build and review focused practice sets | Start adaptive set | B | Practice | Keep review details collapsed and make per-choice feedback consistent. |
| Quick Study | Start a short weak-area drill | Start quick session | A- | Practice | Strongest practice entry; keep it faster than Question Bank. |
| Exam Prep | Prepare for longer exam-style work | Pick an exam lane | B- | Practice | Reduce card density and make one primary path dominant. |
| Exams | Run or resume timed test sessions | Resume/start exam | B | Practice | Move resume/history higher than secondary setup details. |
| Remediation | Repair missed patterns | Start repair set | B+ | Review | Keep this focused on missed-question repair, not broad analytics. |
| Performance | Review progress and weak categories | Review weak category | B | Review | Simplify metric density and keep practice-evidence labeling visible. |
| My Materials | Import study content and create tools | Upload/import material | A- | Library | Best Library anchor; keep assisted fallback paths friendly. |
| Flashcards | Review approved cards and decks | Review due cards | B | Library | Tie decks more clearly back to materials and notes. |
| Notes | Capture notes and turn them into tools | New note or make cards/quiz | B | Library | Good direction; keep conversion actions above passive note storage. |
| Resources | Provide curated support references | Open a resource set | B- | Library | Group by learner need state instead of feeling like a broad link shelf. |
| Nurse Lab | Try experimental simulations and games | Pick a lab | B | Connect | Keep beta/experimental expectations explicit. |
| Clinical Simulator | Practice scenario decision-making | Start scenario | B | Connect via Nurse Lab | Make the learning goal visible before launch. |
| Social | Find beta learner connections | Refresh/search network | C+ | Connect | Needs clearer beta expectations and what works now. |
| Settings | Manage account/profile/preferences | Update profile | B+ | Utility | Good placement; keep privacy/support easy to find. |
| Help & Support | Give beta support and safe-use reminders | Send feedback or open settings | B | Utility | Keep as lightweight support, not a competing page. |

## Implemented In This Pass

- Desktop hub now shows Start, Practice, Review, Library, and Connect as compact bucket drawers.
- The active bucket auto-opens on direct navigation, refresh, and deep links.
- Mobile drawer uses the same bucket behavior as desktop.
- Mobile More sheet is now labeled Command hub and contains the full grouped hub, while the bottom bar remains shortcuts.
- Bucket color dots are consistent between desktop and mobile.

## Next UX Cleanup Order

1. Social: explain current beta behavior, what works now, and what is coming later.
2. Exam Prep and Exams: reduce dense setup surfaces and prioritize resume/history.
3. Resources: regroup under Library by need state, such as strategy, safety, content refresh, and exam logistics.
4. Dashboard: make readiness/mastery badge visuals more understandable to a non-nursing-student consumer.
5. Question Bank review: keep metadata collapsed and make per-choice feedback visible everywhere.


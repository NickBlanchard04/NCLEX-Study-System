# Site-Wide UX Audit - 2026-06-30

Scope: Nurse Command React/Vite web app. Audit criteria: page purpose, primary next action, visual hierarchy, mobile fit, and hub placement.

## Hub Model

Current target grouping:

- Start: Home, Dashboard, Study Plan
- Practice: Question Bank, Quick Study, Exam Prep, Exams
- Review: Remediation, Performance
- Library: My Materials, Flashcards, Notes, Resources
- Connect: Nurse Lab, Social

Mobile should use the same model. The bottom bar should give fast access to Start, Practice, and Library, while More holds the full grouped hub.

## Page Grades

| Page | Purpose | Next action | Grade | Primary cleanup |
| --- | --- | --- | --- | --- |
| Auth / Welcome | Get into beta account or start account creation | Sign in or create account | B+ | Add post-signup profile setup after verification; keep first screen uncluttered. |
| Home / Study Menu | Route the learner to the right study surface | Start today's action | B | Keep this as a launch menu, not a second dashboard. |
| Dashboard | Own today's next action and recent progress | Start/resume/review | B+ | Keep reducing fluff; show one dominant mission and compact badges. |
| Study Plan | Weekly structure and pacing | Start the scheduled task | B | Make the week plan feel more actionable than decorative. |
| Question Bank | Focused practice with review | Start adaptive set | B | Keep rationales scannable; avoid repeated questions and crowded review copy. |
| Quick Study | Short weakest-area drill | Start 10-minute drill | B+ | Keep it faster and simpler than Question Bank. |
| Exam Prep | Serious exam setup and strategy | Start timed exam or review misses | B- | Reduce card density; show resume/history higher. |
| Exams | Timed test sessions and exam history | Resume active exam or start exam | B | Good intent; continue emphasizing resume/history. |
| Remediation | Repair missed patterns | Start repair set | B+ | Keep weak-area repair as the main action, not analytics. |
| Performance | Progress review and trends | Review weak category | B | Simplify dense metrics; keep practice evidence labels visible. |
| My Materials | Import content and approve generated tools | Upload/import/review material | B+ | Best library anchor; keep fallback import paths friendly. |
| Flashcards | Review approved cards | Start due cards | B | Connect more clearly to My Materials and Notes. |
| Notes | Capture learner notes and convert them to tools | Create note or convert to cards/quiz | B- | Needs stronger reason to exist and clearer conversion actions. |
| Resources | Curated NCLEX support | Open a recommended resource | B- | Group resources as Library support, not a random link page. |
| Nurse Lab | Experimental practice labs/games | Pick a lab | B | Keep beta expectations clear. |
| Clinical Simulator | Scenario practice | Start NCLEX drill | B | Good fit under Connect/Lab; make learning goal obvious. |
| Social | Beta learner connections | Search or refresh suggestions | C+ | Needs clearer "what works now" and "coming later" messaging. |
| Settings | Account/profile/preferences | Update profile | B | Good place for profile edits after onboarding. |

## Release Actions In This Pass

- Add post-signup profile setup for school/program, exam track, goal date, and study intensity.
- Keep desktop hub grouped as Start, Practice, Review, Library, Connect.
- Align mobile bottom bar with the same model: Dashboard, Quick Study, Library, More.
- Rename the My Materials route title from "Material Upload" to "My Materials."
- Improve blocked-link import copy so Quizlet-style links open assisted import instead of feeling like a dead error.

## Next UX Cleanup Release

- Social: make beta state and current limitations explicit.
- Notes: make "convert note to cards" and "quiz from note" the dominant actions.
- Resources: group by NCLEX need state: strategy, safety, content refresh, exam logistics.
- Exam Prep / Exams: reduce visual weight and keep resume/history above secondary setup options.
- Dashboard: continue compacting nonessential copy and making badges consumer-friendly.

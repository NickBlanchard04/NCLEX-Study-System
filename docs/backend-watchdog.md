# Hosted backend watchdog

The `Nurse Command backend watchdog` GitHub Actions workflow runs hourly at minute
17 UTC and can also be started using **Run workflow** on `main`. It runs on GitHub,
not on the owner's computer, and does not use Codex or flashcard automation.

## Checks and recovery

- Confirms the status of only `xcjvnhrfrjzvszmwgtep` through the Management API.
- Resumes that existing project only when its status is `INACTIVE`.
- Waits up to ten minutes for an existing/new restore; never duplicates a pending
  restore or blindly retries an ambiguous restore request.
- Requires `ACTIVE_HEALTHY`, a healthy Auth endpoint, a read-only PostgREST query,
  and the expected public website HTML shell. This is not a full browser/sign-in test.
- The database query uses the existing anon role/RLS and an impossible null primary
  key predicate. No student records are read into logs, and nothing is written.
- Repeated database queries provide backend activity, reducing inactivity-pause risk.
- Failed checks fail the workflow. Review Actions and configure GitHub Actions
  failure notifications in personal notification settings; delivery depends on those settings.

No database migrations, account resets, paid upgrades, frontend changes, or
security-policy changes are performed. The only production mutation is resuming
this paused project. A healthy project is never restarted as a response to an HTTP error.

## Credentials and controls

Uses existing repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`,
plus `SUPABASE_MANAGEMENT_TOKEN`. The owner approved storing the existing management
token in GitHub's encrypted repository secrets on 2026-09-13. This token has broader
account access than this script uses; anyone able to change trusted repository
workflows could potentially misuse it. Prefer a project-scoped replacement with
only Project Settings read/write when practical. Never commit the token, put it in
frontend build variables, or print it. This workflow exposes it only to the check step.

The workflow runs only on this repository's `main`, has read-only GitHub permissions,
pins external actions, does not retain checkout credentials, installs no application
dependencies, and serializes overlapping runs. To stop it, disable the workflow in
Actions; to revoke recovery access, delete its management-token secret.

## Limitations

This is best-effort monitoring, not guaranteed uptime. Scheduled Actions can be
delayed or dropped, and public-repository schedules are disabled after 60 days
without repository activity. Normal workflow runs are not a substitute for repository
activity. Check the workflow is enabled after long breaks; no artificial commits or
automatic schedule re-enabling are configured. Expired/revoked credentials also
require owner attention. A paid Supabase plan removes inactivity auto-pausing; this
setup does not alter billing.

## Verification

Run `node --test scripts/backend-watchdog.checks.mjs` to exercise pause, recovery,
timeouts, wrong-project, duplicate-request, error-redaction, and data-read safeguards
without touching production. Run the workflow manually for a hosted smoke check.
Never pause production simply to test recovery.

Sources:
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/reference/api/v1-restore-a-project
- https://supabase.com/docs/guides/platform/personal-access-tokens
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

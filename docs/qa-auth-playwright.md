# Authenticated Playwright QA

Use this flow to test protected Nurse Command routes with a real cloud account. Local demo mode stays disabled.

## Local Secrets

Create `./.env.local` on your machine. This file is gitignored.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

PLAYWRIGHT_QA_EMAIL=qa@nursecommand.com
PLAYWRIGHT_QA_PASSWORD=use-a-strong-password

# Optional: run tests against deployed production instead of starting local Vite.
# PLAYWRIGHT_BASE_URL=https://nursecommand.com
```

## Create Or Refresh The QA User

```bash
npm run qa:create-user
```

The script creates or updates `PLAYWRIGHT_QA_EMAIL` as a confirmed Supabase Auth user with safe QA metadata:

- name: `Nurse Command QA`
- nursing school: `Nurse Command QA Program`
- exam track: `nclex-rn`
- beta terms accepted
- `qa_account: true`

## Run Protected Route Smoke Tests

```bash
npm run test:e2e
```

The Playwright setup signs in once, stores temporary auth state in `playwright/.auth/qa-user.json`, then checks:

- `/dashboard`
- `/quick-study`
- `/weak-areas`
- `/test-mode`
- `/exam-prep`
- `/my-materials`
- `/study-plan`
- mobile drawer
- mobile More sheet

The tests assert that the authenticated app renders, local demo mode is not active, the beta login screen is gone, console warnings/errors are absent, and no horizontal overflow is present.

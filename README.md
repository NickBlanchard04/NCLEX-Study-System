# Nurse Command

A premium adaptive study platform for NCLEX-RN, NCLEX-PN, FNP, and CCMA exam prep.

## Live Deployment

This app is configured for GitHub Pages through GitHub Actions.

Expected production URL:

```text
https://nursecommand.com/
```

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Supabase Environment

Copy `.env.example` to `.env` and provide:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

For GitHub Pages, add these same values as repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

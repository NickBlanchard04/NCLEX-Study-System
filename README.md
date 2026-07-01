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
- `VITE_GTM_CONTAINER_ID` after the Google Tag Manager container is created

## Launch Search And Analytics

The app supports Google Tag Manager through `VITE_GTM_CONTAINER_ID`. GTM loads only when that value is present, and app events are pushed to `dataLayer` through the sanitized analytics client.

Production verification checklist after deployment:

- `https://nursecommand.com/robots.txt` returns `200`.
- `https://nursecommand.com/sitemap.xml` returns `200`.
- GTM Preview sees allowlisted events after the GTM container secret is configured.
- GA4 Realtime receives events through GTM after the GA4 destination is configured.

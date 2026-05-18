# Onre Points Dashboard

Dashboard wrapper for `https://onre.hanyon.app/` with an added point analysis view.

## Features

- Source dashboard tab renders the live OnRe Analytics dashboard so the dashboard stays visually aligned with the source.
- Point analysis tab reads the same source data through `/api/source`.
- Source parser extracts TVL, yield, point issuance, holder tiers, and the wallet directory from the source page.
- Wallet movement compares against this browser's prior 01:00 GMT snapshot when available.
- When no prior snapshot exists, movement is estimated from the source 7-day average daily point issuance.

## Local Run

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open `http://localhost:5173`

## Vercel

Vercel settings are included in `vercel.json`.

- Framework: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- API route: `api/source.js`

## Notes

The source dashboard is embedded from `https://onre.hanyon.app/`. The point analysis page is native to this project and uses the parsed source data.

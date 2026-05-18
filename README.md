# Onre Points Dashboard

Wallet points dashboard for tracking Onre points movement by wallet. The app is built with Vite and React and is ready for GitHub plus Vercel deployment.

## Features

- Dashboard overview with total points, daily movement, transaction count, and tracked volume
- Wallet directory ranked by current Onre points
- Daily movement, previous day points, rank movement, and 7-day trend per wallet
- Client-side points rollover based on the UTC+1 day boundary
- Local browser persistence so daily movement does not reset on refresh

## Local Run

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open `http://localhost:5173`

## Vercel

Vercel settings are included in `vercel.json`.

- Framework: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

## Upload To GitHub

Upload every file in this folder except generated folders such as `node_modules`, `dist`, and `.vercel`. Those folders are already excluded in `.gitignore`.

# Onre Points Dashboard

Dashboard wrapper for `https://onre.hanyon.app/` with an added point analysis view.

## Features

- Source dashboard tab renders the live OnRe Analytics dashboard so the dashboard stays visually aligned with the source.
- Point analysis tab reads `/api/source`, which prefers the stored daily snapshot and falls back to the live source page.
- Source parser extracts TVL, yield, point issuance, holder tiers, and the wallet directory from the source page.
- Vercel cron captures a daily wallet and points snapshot at 01:00 GMT, with a retry at 01:20 GMT.
- Wallet movement compares every wallet against the prior stored daily snapshot when available.
- When no stored prior snapshot exists, movement falls back to the browser snapshot, then a 7-day average estimate.

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
- Cron routes: `api/cron/snapshot.js` and `api/cron/snapshot-retry.js`

### Required Environment Variables

Set these in Vercel before relying on the scheduled snapshot:

- `CRON_SECRET`: any long random value. Vercel uses this to authorize the cron request.
- `SNAPSHOT_GITHUB_TOKEN`: a GitHub fine-grained token with Contents read/write access to this repo.
- `SNAPSHOT_GITHUB_REPO`: repo name in `owner/repo` format, for example `danhdzoan2-lab/onrepoints`.
- `SNAPSHOT_GITHUB_BRANCH`: deployment branch, usually `main`.

Optional:

- `ONRE_SOURCE_URL`: override the source parser URL. Defaults to `https://onre.hanyon.app/`.
- `SNAPSHOT_ALLOW_STALE=1`: allow the cron to store a source snapshot even if the source has not reached the expected 01:00 GMT date.

The cron writes:

- `public/snapshots/latest.json`
- `public/snapshots/previous.json`
- `public/snapshots/history/YYYY-MM-DD.json`

Those committed files also give Vercel a durable snapshot after redeploy. Without the GitHub token, Vercel functions cannot persist a daily snapshot between invocations.

## Notes

The source dashboard is embedded from `https://onre.hanyon.app/`. The point analysis page is native to this project and uses the parsed source data.

If Hanyon itself updates later than the official OnRe leaderboard, the cron cannot fully remove that upstream delay. It prevents browser-cache delay and stores the first fresh source snapshot the job sees. To remove upstream delay completely, replace `ONRE_SOURCE_URL`/parser logic with the official leaderboard API once that endpoint is captured from `https://app.onre.finance/earn/leaderboard`.

const DEFAULT_SOURCE_URL = "https://onre.hanyon.app/";
const SNAPSHOT_BASE_PATH = process.env.SNAPSHOT_BASE_PATH || "public/snapshots";
const SNAPSHOT_LATEST_PATH = `${SNAPSHOT_BASE_PATH}/latest.json`;
const SNAPSHOT_PREVIOUS_PATH = `${SNAPSHOT_BASE_PATH}/previous.json`;
const SNAPSHOT_HISTORY_PREFIX = `${SNAPSHOT_BASE_PATH}/history`;
const GITHUB_API_URL = "https://api.github.com";
const DAILY_UPDATE_HOUR_UTC = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

function getSourceUrl() {
  return process.env.ONRE_SOURCE_URL || DEFAULT_SOURCE_URL;
}

function decodeFlightHtml(html) {
  return html.replaceAll('\\"', '"').replaceAll("\\/", "/");
}

function extractArrayAfter(source, token, fromIndex = 0) {
  const tokenIndex = source.indexOf(token, fromIndex);
  if (tokenIndex === -1) return null;

  const start = source.indexOf("[", tokenIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') inString = true;
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;

    if (depth === 0) {
      return {
        array: JSON.parse(source.slice(start, index + 1)),
        nextIndex: index + 1
      };
    }
  }

  return null;
}

function compactNumber(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return String(Math.round(value));
}

function sumTvl(row) {
  return Object.entries(row)
    .filter(([key]) => key !== "date")
    .reduce((total, [, value]) => total + Number(value || 0), 0);
}

function buildTopBreakdown(wallets) {
  const totalWallets = wallets.length;
  const totalPoints = wallets.reduce((sum, wallet) => sum + wallet.totalPoints, 0);
  const slices = [
    { tier: "Top 1%", color: "var(--accent)", start: 0, end: Math.round(totalWallets * 0.01) },
    { tier: "Top 5%", color: "#FFD96B", start: Math.round(totalWallets * 0.01), end: Math.round(totalWallets * 0.05) },
    { tier: "Top 10%", color: "#A78BFA", start: Math.round(totalWallets * 0.05), end: Math.round(totalWallets * 0.1) },
    { tier: "Top 25%", color: "#06B6D4", start: Math.round(totalWallets * 0.1), end: Math.round(totalWallets * 0.25) },
    { tier: "Top 50%", color: "#10B981", start: Math.round(totalWallets * 0.25), end: Math.round(totalWallets * 0.5) },
    { tier: "Bottom 50%", color: "var(--muted-2)", start: Math.round(totalWallets * 0.5), end: totalWallets }
  ];

  return slices.map((slice) => {
    const rows = wallets.slice(slice.start, slice.end);
    const points = rows.reduce((sum, wallet) => sum + wallet.totalPoints, 0);
    const threshold = rows[0]?.totalPoints ?? 0;

    return {
      ...slice,
      threshold,
      thresholdLabel: compactNumber(threshold),
      wallets: rows.length,
      walletPct: totalWallets ? rows.length / totalWallets : 0,
      points,
      pointsLabel: compactNumber(points),
      pointsPct: totalPoints ? points / totalPoints : 0
    };
  });
}

function dateKey(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getExpectedSnapshotDate(now = new Date()) {
  const todayCutoff = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    DAILY_UPDATE_HOUR_UTC,
    0,
    0
  );
  const effectiveTime = now.getTime() >= todayCutoff ? now.getTime() : now.getTime() - DAY_MS;
  return dateKey(new Date(effectiveTime));
}

function stripRuntimeFields(data) {
  const { snapshot, ...cleanData } = data;
  return {
    ...cleanData,
    wallets: cleanData.wallets.map(({ dailyMove, dailyMoveSource, previousPoints, ...wallet }) => wallet)
  };
}

function createSnapshotEnvelope(data, capturedAt = new Date().toISOString()) {
  const cleanData = stripRuntimeFields(data);

  return {
    schemaVersion: 1,
    capturedAt,
    snapshotDate: cleanData.meta.latestPointsDate ?? null,
    sourceUrl: cleanData.sourceUrl,
    totalWallets: cleanData.wallets.length,
    totalPoints: cleanData.meta.totalPoints,
    totalPointsLabel: cleanData.meta.totalPointsLabel,
    data: cleanData
  };
}

function normalizeSnapshotEnvelope(payload) {
  if (!payload) return null;
  if (payload.data?.wallets && payload.data?.meta) return payload;
  if (payload.wallets && payload.meta) return createSnapshotEnvelope(payload, payload.fetchedAt);
  return null;
}

function attachMovement(data, envelope, previousEnvelope, store, statusLabel, storeError = null) {
  const snapshotDate = envelope?.snapshotDate ?? data.meta.latestPointsDate ?? null;
  const expectedSnapshotDate = getExpectedSnapshotDate();
  const previousData = previousEnvelope?.snapshotDate !== snapshotDate ? previousEnvelope?.data : null;
  const previousByAddress = previousData?.wallets
    ? new Map(previousData.wallets.map((wallet) => [wallet.address, wallet.totalPoints]))
    : null;

  let matchedWallets = 0;
  const wallets = data.wallets.map((wallet) => {
    const previousPoints = previousByAddress?.get(wallet.address);
    if (Number.isFinite(previousPoints)) {
      matchedWallets += 1;
      return {
        ...wallet,
        previousPoints,
        dailyMove: wallet.totalPoints - previousPoints,
        dailyMoveSource: "stored daily snapshot"
      };
    }

    return {
      ...wallet,
      previousPoints: null,
      dailyMove: null,
      dailyMoveSource: null
    };
  });

  return {
    ...data,
    wallets,
    snapshot: {
      store,
      statusLabel,
      capturedAt: envelope?.capturedAt ?? data.fetchedAt,
      snapshotDate,
      previousSnapshotDate: previousData?.meta?.latestPointsDate ?? previousEnvelope?.snapshotDate ?? null,
      expectedSnapshotDate,
      stale: Boolean(snapshotDate && snapshotDate < expectedSnapshotDate),
      movementMatchedWallets: matchedWallets,
      movementTotalWallets: wallets.length,
      storeError
    }
  };
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function getGithubSnapshotConfig() {
  const token = process.env.SNAPSHOT_GITHUB_TOKEN;
  const repo = process.env.SNAPSHOT_GITHUB_REPO || (
    process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : null
  );
  const branch = process.env.SNAPSHOT_GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";

  if (!token || !repo || !repo.includes("/")) return null;
  return { token, repo, branch };
}

function repoApiPath(repo) {
  const [owner, name] = repo.split("/");
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function githubHeaders(config, accept = "application/vnd.github+json") {
  return {
    accept,
    authorization: `Bearer ${config.token}`,
    "content-type": "application/json",
    "user-agent": "onrepoints-snapshot-bot",
    "x-github-api-version": "2022-11-28"
  };
}

async function githubJson(config, path, init = {}, allow404 = false) {
  const response = await fetch(`${GITHUB_API_URL}${path}`, {
    ...init,
    headers: {
      ...githubHeaders(config),
      ...(init.headers || {})
    }
  });

  if (allow404 && response.status === 404) return null;
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub API returned ${response.status}: ${details.slice(0, 500)}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function readGithubText(config, path) {
  const response = await fetch(
    `${GITHUB_API_URL}${repoApiPath(config.repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`,
    {
      headers: githubHeaders(config, "application/vnd.github.raw")
    }
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`GitHub snapshot read returned ${response.status}: ${details.slice(0, 500)}`);
  }

  const text = await response.text();

  try {
    const metadata = JSON.parse(text);
    if (metadata?.encoding === "base64" && metadata?.content) {
      return Buffer.from(metadata.content, "base64").toString("utf8");
    }
  } catch {
    // Raw JSON snapshots are expected and should be returned as-is.
  }

  return text;
}

async function readSnapshotEnvelope(path) {
  const config = getGithubSnapshotConfig();
  if (!config) return null;

  const text = await readGithubText(config, path);
  if (!text) return null;
  return normalizeSnapshotEnvelope(JSON.parse(text));
}

async function readStoredSnapshots() {
  const config = getGithubSnapshotConfig();
  if (!config) {
    return { configured: false, latest: null, previous: null, repo: null, branch: null };
  }

  const [latest, previous] = await Promise.all([
    readSnapshotEnvelope(SNAPSHOT_LATEST_PATH),
    readSnapshotEnvelope(SNAPSHOT_PREVIOUS_PATH)
  ]);

  return {
    configured: true,
    latest,
    previous,
    repo: config.repo,
    branch: config.branch
  };
}

async function commitSnapshotFiles(files, message) {
  const config = getGithubSnapshotConfig();
  if (!config) {
    throw new Error("Missing SNAPSHOT_GITHUB_TOKEN and SNAPSHOT_GITHUB_REPO or Vercel Git repo metadata");
  }

  const repoPath = repoApiPath(config.repo);
  const refPath = `${repoPath}/git/ref/heads/${encodePath(config.branch)}`;
  const ref = await githubJson(config, refPath);
  const baseCommitSha = ref.object.sha;
  const baseCommit = await githubJson(config, `${repoPath}/git/commits/${baseCommitSha}`);

  const blobs = await Promise.all(files.map(async (file) => {
    const blob = await githubJson(config, `${repoPath}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({
        content: `${JSON.stringify(file.payload, null, 2)}\n`,
        encoding: "utf-8"
      })
    });
    return { file, sha: blob.sha };
  }));

  const tree = await githubJson(config, `${repoPath}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: blobs.map(({ file, sha }) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        sha
      }))
    })
  });

  const commit = await githubJson(config, `${repoPath}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [baseCommitSha]
    })
  });

  await githubJson(config, `${repoPath}/git/refs/heads/${encodePath(config.branch)}`, {
    method: "PATCH",
    body: JSON.stringify({
      sha: commit.sha,
      force: false
    })
  });

  return {
    commitSha: commit.sha,
    commitUrl: commit.html_url ?? null
  };
}

export function parseOnreHtml(html, sourceUrl = getSourceUrl()) {
  const decoded = decodeFlightHtml(html);

  const dataArrays = [];
  let dataIndex = 0;
  while (true) {
    const result = extractArrayAfter(decoded, '"data":[', dataIndex);
    if (!result) break;
    dataArrays.push(result.array);
    dataIndex = result.nextIndex;
  }

  const seriesArrays = [];
  let seriesIndex = 0;
  while (true) {
    const result = extractArrayAfter(decoded, '"series":[', seriesIndex);
    if (!result) break;
    seriesArrays.push(result.array);
    seriesIndex = result.nextIndex;
  }

  const buckets = extractArrayAfter(decoded, '"buckets":[')?.array ?? [];
  const wallets = extractArrayAfter(decoded, '"wallets":[')?.array ?? [];

  const tvl = dataArrays.find((items) => items[0]?.date && "wallet" in items[0]) ?? [];
  const distribution = dataArrays.find((items) => items[0]?.protocol) ?? [];
  const yieldSeries = seriesArrays.find((items) => items[0]?.nav) ?? [];
  const pointsSeries = seriesArrays.find((items) => items[0]?.totalPointsIssued) ?? [];
  const latestTvl = tvl.at(-1) ?? {};
  const latestYield = yieldSeries.at(-1) ?? {};
  const totalPoints = wallets.reduce((sum, wallet) => sum + wallet.totalPoints, 0);
  const currentPointsRow = pointsSeries.at(-1) ?? {};
  const recentPointRows = pointsSeries.slice(-7);
  const dailyPointsAvg7d =
    recentPointRows.reduce((sum, row) => sum + Number(row.dailyTotalGrowth || 0), 0) /
    Math.max(1, recentPointRows.length);

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    meta: {
      totalTvl: sumTvl(latestTvl),
      totalTvlLabel: `$${compactNumber(sumTvl(latestTvl))}`,
      activePartners: distribution.length,
      tvl30dChangePct: 0.1707,
      currentApy: latestYield.apy7d ?? 0,
      realizedApy30d: latestYield.apy30d ?? 0,
      totalPoints,
      totalPointsLabel: compactNumber(totalPoints),
      dailyPointsAvg7d,
      dailyPointsAvg7dLabel: compactNumber(dailyPointsAvg7d),
      wallets: wallets.length,
      latestPointsDate: currentPointsRow.date,
      dailyUpdateTimeGmt: "01:00 GMT"
    },
    tvl,
    distribution,
    yieldSeries,
    pointsSeries,
    holderBuckets: buckets,
    topBreakdown: buildTopBreakdown(wallets),
    wallets
  };
}

export async function fetchLiveSourceData() {
  const sourceUrl = getSourceUrl();
  const sourceResponse = await fetch(sourceUrl, {
    cache: "no-store",
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent": "Mozilla/5.0 OnRe points mirror"
    }
  });

  if (!sourceResponse.ok) {
    throw new Error(`Source returned ${sourceResponse.status}`);
  }

  const html = await sourceResponse.text();
  return parseOnreHtml(html, sourceUrl);
}

export async function captureScheduledSnapshot() {
  if (!getGithubSnapshotConfig()) {
    throw new Error("Snapshot storage is not configured. Set SNAPSHOT_GITHUB_TOKEN and SNAPSHOT_GITHUB_REPO.");
  }

  const liveData = await fetchLiveSourceData();
  const envelope = createSnapshotEnvelope(liveData);
  const expectedSnapshotDate = getExpectedSnapshotDate();
  const sourceFresh = Boolean(envelope.snapshotDate && envelope.snapshotDate >= expectedSnapshotDate);
  const stored = await readStoredSnapshots();
  const latest = stored.latest;
  const previous = latest?.snapshotDate && latest.snapshotDate !== envelope.snapshotDate
    ? latest
    : stored.previous;

  const unchanged = latest &&
    latest.snapshotDate === envelope.snapshotDate &&
    latest.totalPoints === envelope.totalPoints &&
    latest.totalWallets === envelope.totalWallets;

  if (!sourceFresh && process.env.SNAPSHOT_ALLOW_STALE !== "1") {
    return {
      ok: true,
      committed: false,
      skipped: true,
      reason: "Source has not reached the expected 01:00 GMT snapshot yet",
      expectedSnapshotDate,
      receivedSnapshotDate: envelope.snapshotDate,
      totalWallets: envelope.totalWallets,
      totalPointsLabel: envelope.totalPointsLabel
    };
  }

  if (unchanged) {
    return {
      ok: true,
      committed: false,
      skipped: true,
      reason: "Snapshot unchanged",
      snapshotDate: envelope.snapshotDate,
      totalWallets: envelope.totalWallets,
      totalPointsLabel: envelope.totalPointsLabel
    };
  }

  const files = [
    { path: SNAPSHOT_LATEST_PATH, payload: envelope },
    { path: `${SNAPSHOT_HISTORY_PREFIX}/${envelope.snapshotDate}.json`, payload: envelope }
  ];

  if (previous) {
    files.push({ path: SNAPSHOT_PREVIOUS_PATH, payload: previous });
  }

  const commit = await commitSnapshotFiles(
    files,
    `Update OnRe points snapshot for ${envelope.snapshotDate}`
  );

  return {
    ok: true,
    committed: true,
    skipped: false,
    snapshotDate: envelope.snapshotDate,
    previousSnapshotDate: previous?.snapshotDate ?? null,
    expectedSnapshotDate,
    totalWallets: envelope.totalWallets,
    totalPointsLabel: envelope.totalPointsLabel,
    ...commit
  };
}

export default async function handler(request, response) {
  let stored = null;
  let storeError = null;

  try {
    const requestUrl = new URL(request.url, `https://${request.headers.host ?? "localhost"}`);
    const forceLive = requestUrl.searchParams.get("live") === "1";

    if (!forceLive) {
      try {
        stored = await readStoredSnapshots();
        if (stored.latest) {
          const storedData = attachMovement(
            stored.latest.data,
            stored.latest,
            stored.previous,
            "github",
            "Stored daily snapshot"
          );

          if (!storedData.snapshot.stale) {
            response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
            response.status(200).json(storedData);
            return;
          }
        }
      } catch (error) {
        storeError = error instanceof Error ? error.message : String(error);
      }
    }

    const liveData = await fetchLiveSourceData();
    const liveEnvelope = createSnapshotEnvelope(liveData);
    const previousEnvelope = stored?.latest?.snapshotDate && stored.latest.snapshotDate !== liveEnvelope.snapshotDate
      ? stored.latest
      : stored?.previous;
    const data = attachMovement(
      liveData,
      liveEnvelope,
      previousEnvelope,
      forceLive ? "live-forced" : "live",
      "Live source data",
      storeError
    );

    response.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
    response.status(200).json(data);
  } catch (error) {
    response.status(502).json({
      error: "Unable to read source dashboard",
      message: error instanceof Error ? error.message : String(error),
      storeError
    });
  }
}

const SOURCE_URL = "https://onre.hanyon.app/";

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
      walletPct: rows.length / totalWallets,
      points,
      pointsLabel: compactNumber(points),
      pointsPct: points / totalPoints
    };
  });
}

export function parseOnreHtml(html) {
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
  const currentPointsRow = pointsSeries.at(-1) ?? {};
  const recentPointRows = pointsSeries.slice(-7);
  const dailyPointsAvg7d =
    recentPointRows.reduce((sum, row) => sum + Number(row.dailyTotalGrowth || 0), 0) /
    Math.max(1, recentPointRows.length);
  const totalPoints = wallets.reduce((sum, wallet) => sum + wallet.totalPoints, 0);

  return {
    fetchedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
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
      updatedAtUtcPlusOne: "Daily UTC+1"
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

export default async function handler(request, response) {
  try {
    const sourceResponse = await fetch(SOURCE_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 OnRe points mirror"
      }
    });

    if (!sourceResponse.ok) {
      throw new Error(`Source returned ${sourceResponse.status}`);
    }

    const html = await sourceResponse.text();
    const data = parseOnreHtml(html);

    response.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    response.status(200).json(data);
  } catch (error) {
    response.status(502).json({
      error: "Unable to read source dashboard",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

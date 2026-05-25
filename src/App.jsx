import { useEffect, useMemo, useState } from "react";
import { fallbackData } from "./data/fallback";

const SOURCE_URL = "https://onre.hanyon.app/";
const SNAPSHOT_KEY = "onre-source-wallet-snapshot-v3";
const DAILY_UPDATE_HOUR_UTC = 1;
const DAILY_UPDATE_OFFSET_MS = DAILY_UPDATE_HOUR_UTC * 60 * 60 * 1000;
const WALLETS_PER_PAGE = 50;

const POINT_COLUMNS = [
  { key: "wallet", label: "Wallet" },
  { key: "kamino", label: "Kamino" },
  { key: "loopscale", label: "Loopscale" },
  { key: "exponentYt", label: "Exponent YT" },
  { key: "exponentLp", label: "Exponent LP" },
  { key: "orca", label: "Orca" },
  { key: "elemental", label: "Elemental" },
  { key: "carrot", label: "Carrot" },
  { key: "referralBonus", label: "Referrals" }
];

function formatCompact(value, digits = 2) {
  const abs = Math.abs(Number(value || 0));
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(digits)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(digits)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(digits)}K`;
  return Math.round(value || 0).toLocaleString();
}

function formatPct(value, digits = 2) {
  return `${((value || 0) * 100).toFixed(digits)}%`;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("start-ellipsis");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("end-ellipsis");
  pages.push(totalPages);

  return pages;
}

function getPointUpdateKey(now = new Date()) {
  const shifted = new Date(now.getTime() - DAILY_UPDATE_OFFSET_MS);
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getNextPointUpdate(now = new Date()) {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      DAILY_UPDATE_HOUR_UTC,
      0,
      0
    )
  );

  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

function formatCountdown(target, now = new Date()) {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function normalizeSnapshotPayload(payload, statusLabel = "Stored static snapshot") {
  if (payload?.data?.meta && payload?.data?.wallets) {
    return {
      ...payload.data,
      snapshot: {
        store: "static",
        statusLabel,
        capturedAt: payload.capturedAt ?? payload.data.fetchedAt,
        snapshotDate: payload.snapshotDate ?? payload.data.meta.latestPointsDate,
        previousSnapshotDate: null,
        expectedSnapshotDate: null,
        stale: false,
        movementMatchedWallets: 0,
        movementTotalWallets: payload.data.wallets.length
      }
    };
  }

  return payload;
}

function useSourceData() {
  const [data, setData] = useState(fallbackData);
  const [status, setStatus] = useState("Loading source data");

  useEffect(() => {
    let cancelled = false;

    async function loadSourceData() {
      try {
        const response = await fetch("/api/source");
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const payload = await response.json();
        const nextData = normalizeSnapshotPayload(payload);

        if (!cancelled) {
          setData(nextData);
          setStatus(nextData.snapshot?.statusLabel ?? "Live source data");
        }
        return;
      } catch {
        // Fall through to the committed static snapshot if the API is unavailable.
      }

      try {
        const response = await fetch("/snapshots/latest.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Static snapshot returned ${response.status}`);
        const payload = await response.json();
        const nextData = normalizeSnapshotPayload(payload);

        if (!cancelled) {
          setData(nextData);
          setStatus(nextData.snapshot?.statusLabel ?? "Stored static snapshot");
        }
      } catch {
        if (!cancelled) setStatus("Snapshot fallback");
      }
    }

    loadSourceData();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, status };
}

function useWalletMovement(wallets) {
  const [movement, setMovement] = useState({});

  useEffect(() => {
    if (!wallets.length) return;

    const dayKey = getPointUpdateKey();
    const current = Object.fromEntries(wallets.map((wallet) => [wallet.address, wallet.totalPoints]));

    try {
      const stored = JSON.parse(localStorage.getItem(SNAPSHOT_KEY));
      const previous = stored?.dayKey === dayKey ? stored.previous : stored?.current;

      if (previous) {
        const nextMovement = {};
        for (const [address, points] of Object.entries(current)) {
          if (Object.prototype.hasOwnProperty.call(previous, address)) {
            nextMovement[address] = points - previous[address];
          }
        }
        setMovement(nextMovement);
      }

      localStorage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify({
          dayKey,
          previous: previous ?? current,
          current
        })
      );
    } catch {
      localStorage.removeItem(SNAPSHOT_KEY);
    }
  }, [wallets]);

  return movement;
}

function SourceDashboard() {
  return (
    <main className="source-frame-shell">
      <iframe
        title="OnRe Analytics source dashboard"
        src={SOURCE_URL}
        className="source-frame"
      />
    </main>
  );
}

function MetricCard({ label, value, detail, tone }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong className={`numeric ${tone ?? ""}`}>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="analysis-section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function PointAnalysis({ data, status, movement }) {
  const [now, setNow] = useState(new Date());
  const [walletPage, setWalletPage] = useState(1);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const nextUpdate = getNextPointUpdate(now);
  const sourceTotals = useMemo(() => {
    return POINT_COLUMNS.map((column) => ({
      ...column,
      value: data.wallets.reduce((sum, wallet) => sum + wallet[column.key], 0)
    })).sort((a, b) => b.value - a.value);
  }, [data.wallets]);

  const movementRows = useMemo(() => {
    return data.wallets.map((wallet) => {
      const share = wallet.totalPoints / data.meta.totalPoints;
      const estimate = data.meta.dailyPointsAvg7d * share;
      const serverMove = isFiniteNumber(wallet.dailyMove) ? wallet.dailyMove : undefined;
      const browserMove = isFiniteNumber(movement[wallet.address]) ? movement[wallet.address] : undefined;
      const actual = isFiniteNumber(serverMove) ? serverMove : browserMove;
      const primarySource = POINT_COLUMNS.reduce(
        (best, column) => (
          wallet[column.key] > best.value
            ? { label: column.label, value: wallet[column.key] }
            : best
        ),
        { label: "-", value: 0 }
      );

      return {
        ...wallet,
        move: isFiniteNumber(actual) ? actual : estimate,
        moveType: isFiniteNumber(serverMove)
          ? wallet.dailyMoveSource
          : isFiniteNumber(browserMove)
            ? "browser snapshot"
            : "7d avg estimate",
        primarySource
      };
    });
  }, [data, movement]);

  const totalMovementPages = Math.max(1, Math.ceil(movementRows.length / WALLETS_PER_PAGE));
  const paginationItems = useMemo(
    () => getPaginationItems(walletPage, totalMovementPages),
    [walletPage, totalMovementPages]
  );
  const pagedMovementRows = useMemo(() => {
    const start = (walletPage - 1) * WALLETS_PER_PAGE;
    return movementRows.slice(start, start + WALLETS_PER_PAGE);
  }, [movementRows, walletPage]);

  useEffect(() => {
    setWalletPage((currentPage) => Math.min(Math.max(currentPage, 1), totalMovementPages));
  }, [totalMovementPages]);

  return (
    <main className="analysis-page">
      <div className="source-status">
        <span className="pulse" />
        {status} - points date {data.meta.latestPointsDate ?? "unknown"} - extracted from {data.sourceUrl}
        {data.snapshot?.capturedAt ? ` - captured ${new Date(data.snapshot.capturedAt).toUTCString()}` : ""}
      </div>

      <section className="metric-grid">
        <MetricCard label="Total points" value={data.meta.totalPointsLabel} detail={`${data.meta.wallets.toLocaleString()} wallets`} />
        <MetricCard label="Daily points pace" value={`+${data.meta.dailyPointsAvg7dLabel}`} detail="average daily issuance, last 7 days" tone="positive" />
        <MetricCard label="01:00 GMT update" value={formatCountdown(nextUpdate, now)} detail={nextUpdate.toUTCString()} tone="accent" />
        <MetricCard label="Current APY" value={formatPct(data.meta.currentApy)} detail={`${formatPct(data.meta.realizedApy30d)} realized - 30d`} tone="accent" />
      </section>

      <Section title="Point source mix" description="Point contribution by source column from the live wallet directory.">
        <div className="card source-mix">
          {sourceTotals.map((source) => (
            <div className="mix-row" key={source.key}>
              <span>{source.label}</span>
              <div><i style={{ width: `${(source.value / data.meta.totalPoints) * 100}%` }} /></div>
              <b className="numeric">{formatCompact(source.value)}</b>
              <em>{formatPct(source.value / data.meta.totalPoints)}</em>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Concentration by tier" description="Same top-percent tiering used by the source holder distribution table.">
        <div className="card table-card">
          <table>
            <thead>
              <tr>
                <th>Tier</th>
                <th className="right">Threshold</th>
                <th className="right">Wallets</th>
                <th className="right">Points sum</th>
                <th className="right">% points</th>
              </tr>
            </thead>
            <tbody>
              {data.topBreakdown.map((row) => (
                <tr key={row.tier}>
                  <td><span className="tier" style={{ color: row.color }}>{row.tier}</span></td>
                  <td className="right numeric">{row.thresholdLabel}</td>
                  <td className="right numeric">{row.wallets.toLocaleString()}</td>
                  <td className="right numeric">{row.pointsLabel}</td>
                  <td className="right numeric muted">{formatPct(row.pointsPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Wallet point movement"
        description="Movement covers every wallet in the source leaderboard. It uses the stored 01:00 GMT daily snapshot when configured, then falls back to this browser's prior snapshot, then a 7-day average estimate."
      >
        <div className="card table-card">
          <div className="pagination-bar">
            <span>
              Page <b>{walletPage}</b> of <b>{totalMovementPages}</b>
            </span>
            <div className="pagination-actions">
              <button type="button" onClick={() => setWalletPage(1)} disabled={walletPage === 1}>
                First
              </button>
              <button type="button" onClick={() => setWalletPage((page) => Math.max(1, page - 1))} disabled={walletPage === 1}>
                Prev
              </button>
              {paginationItems.map((item) => (
                typeof item === "number" ? (
                  <button
                    key={item}
                    type="button"
                    className={item === walletPage ? "active" : ""}
                    onClick={() => setWalletPage(item)}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item}>...</span>
                )
              ))}
              <button type="button" onClick={() => setWalletPage((page) => Math.min(totalMovementPages, page + 1))} disabled={walletPage === totalMovementPages}>
                Next
              </button>
              <button type="button" onClick={() => setWalletPage(totalMovementPages)} disabled={walletPage === totalMovementPages}>
                Last
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table className="movement-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th className="right">Total points</th>
                  <th className="right">Move</th>
                  <th>Move source</th>
                  <th>Main source</th>
                  <th className="right">Share</th>
                </tr>
              </thead>
              <tbody>
                {pagedMovementRows.map((wallet) => (
                  <tr key={wallet.address}>
                    <td className="numeric muted">{wallet.rank}</td>
                    <td className="mono">
                      <a href={`https://jup.ag/portfolio/${wallet.address}`} target="_blank" rel="noreferrer">
                        {shortAddress(wallet.address)}
                      </a>
                    </td>
                    <td className="right numeric">{formatCompact(wallet.totalPoints)}</td>
                    <td className={`right numeric ${wallet.move >= 0 ? "positive" : "negative"}`}>
                      {wallet.move >= 0 ? "+" : ""}
                      {formatCompact(wallet.move)}
                    </td>
                    <td><span className="tag">{wallet.moveType}</span></td>
                    <td>{wallet.primarySource.label}</td>
                    <td className="right numeric muted">{formatPct(wallet.totalPoints / data.meta.totalPoints, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const { data, status } = useSourceData();
  const movement = useWalletMovement(data.wallets);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-group">
            <a className="logo" href={SOURCE_URL} aria-label="OnRe source dashboard">OnRe</a>
            <span className="divider" />
            <a className="byline" href="https://hanyon.app" target="_blank" rel="noreferrer">
              by <b>Hanyon Analytics</b>
            </a>
          </div>

          <nav className="tabs" aria-label="Views">
            <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")} type="button">
              Source dashboard
            </button>
            <button className={page === "analysis" ? "active" : ""} onClick={() => setPage("analysis")} type="button">
              Point analysis
            </button>
          </nav>

          <a className="btn-primary" href="https://app.onre.finance/earn?ref=OLG6E6KV3P">
            Join OnRe
          </a>
        </div>
      </header>

      {page === "dashboard" ? (
        <SourceDashboard />
      ) : (
        <PointAnalysis data={data} status={status} movement={movement} />
      )}
    </div>
  );
}

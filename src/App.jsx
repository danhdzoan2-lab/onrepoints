import { useEffect, useMemo, useState } from "react";
import { fallbackData } from "./data/fallback";

const SOURCE_URL = "https://onre.hanyon.app/";
const SNAPSHOT_KEY = "onre-source-wallet-snapshot-v3";
const DAILY_UPDATE_HOUR_UTC = 1;
const DAILY_UPDATE_OFFSET_MS = DAILY_UPDATE_HOUR_UTC * 60 * 60 * 1000;

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

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
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

function useSourceData() {
  const [data, setData] = useState(fallbackData);
  const [status, setStatus] = useState("Loading source data");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/source")
      .then((response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setStatus("Live source data");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("Snapshot fallback");
      });

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
    const current = Object.fromEntries(
      wallets.slice(0, 500).map((wallet) => [wallet.address, wallet.totalPoints])
    );

    try {
      const stored = JSON.parse(localStorage.getItem(SNAPSHOT_KEY));
      const previous = stored?.dayKey === dayKey ? stored.previous : stored?.current;

      if (previous) {
        const nextMovement = {};
        for (const [address, points] of Object.entries(current)) {
          nextMovement[address] = points - (previous[address] ?? points);
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
    return data.wallets.slice(0, 100).map((wallet) => {
      const share = wallet.totalPoints / data.meta.totalPoints;
      const estimate = data.meta.dailyPointsAvg7d * share;
      const actual = movement[wallet.address];
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
        move: Number.isFinite(actual) ? actual : estimate,
        moveType: Number.isFinite(actual) ? "source delta" : "7d avg estimate",
        primarySource
      };
    });
  }, [data, movement]);

  return (
    <main className="analysis-page">
      <div className="source-status">
        <span className="pulse" />
        {status} - extracted from {data.sourceUrl}
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
        description="Movement compares the latest source load to this browser's prior 01:00 GMT snapshot when available; otherwise it allocates the source 7-day daily average by wallet share."
      >
        <div className="card table-card">
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
                {movementRows.map((wallet) => (
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

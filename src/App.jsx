import { useEffect, useMemo, useState } from "react";
import { movementLabels, wallets as seedWallets } from "./data/wallets";

const STORAGE_KEY = "onre-wallet-points-v1";
const UTC_PLUS_ONE_OFFSET_MS = 60 * 60 * 1000;

function getUtcPlusOneDate(now = new Date()) {
  return new Date(now.getTime() + UTC_PLUS_ONE_OFFSET_MS);
}

function getUtcPlusOneKey(now = new Date()) {
  const date = getUtcPlusOneDate(now);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getNextUtcPlusOneUpdate(now = new Date()) {
  const shifted = getUtcPlusOneDate(now);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() + 1,
      0,
      0,
      0
    ) - UTC_PLUS_ONE_OFFSET_MS
  );
}

function formatCountdown(target, now = new Date()) {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function hashString(value) {
  return value.split("").reduce((hash, char) => {
    return (hash << 5) - hash + char.charCodeAt(0);
  }, 0);
}

function createDailyDelta(wallet, dayKey) {
  const seed = Math.abs(hashString(`${wallet.id}-${dayKey}`));
  const direction = seed % 5 === 0 ? -1 : 1;
  const magnitude = 180 + (seed % 1420);
  return direction * magnitude;
}

function rollWalletsForDay(wallets, dayKey) {
  return wallets.map((wallet) => {
    const delta = createDailyDelta(wallet, dayKey);
    const nextPoints = Math.max(0, wallet.points + delta);
    const nextHistory = [...wallet.history.slice(-6), nextPoints];

    return {
      ...wallet,
      previousPoints: wallet.points,
      points: nextPoints,
      volume: Math.max(0, wallet.volume + delta * 11),
      tx: Math.max(0, wallet.tx + Math.round(delta / 80)),
      rankChange: delta > 900 ? 2 : delta > 250 ? 1 : delta < -700 ? -2 : delta < 0 ? -1 : 0,
      history: nextHistory
    };
  });
}

function loadInitialWalletState() {
  const todayKey = getUtcPlusOneKey();

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.dayKey === todayKey && Array.isArray(stored.wallets)) {
      return { dayKey: todayKey, wallets: stored.wallets };
    }

    if (stored?.wallets) {
      const wallets = rollWalletsForDay(stored.wallets, todayKey);
      return { dayKey: todayKey, wallets };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { dayKey: todayKey, wallets: seedWallets };
}

function MiniTrend({ values }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 82 - ((value - min) / Math.max(1, max - min)) * 64;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mini-trend" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

export default function App() {
  const [state, setState] = useState(loadInitialWalletState);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const tick = () => {
      const nextNow = new Date();
      const todayKey = getUtcPlusOneKey(nextNow);

      setNow(nextNow);
      setState((current) => {
        if (current.dayKey === todayKey) return current;
        return {
          dayKey: todayKey,
          wallets: rollWalletsForDay(current.wallets, todayKey)
        };
      });
    };

    tick();
    const interval = window.setInterval(tick, 30 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const sortedWallets = useMemo(
    () => [...state.wallets].sort((a, b) => b.points - a.points),
    [state.wallets]
  );

  const totals = useMemo(() => {
    const totalPoints = state.wallets.reduce((sum, wallet) => sum + wallet.points, 0);
    const previousPoints = state.wallets.reduce((sum, wallet) => sum + wallet.previousPoints, 0);
    const volume = state.wallets.reduce((sum, wallet) => sum + wallet.volume, 0);
    const tx = state.wallets.reduce((sum, wallet) => sum + wallet.tx, 0);

    return {
      totalPoints,
      movement: totalPoints - previousPoints,
      volume,
      tx
    };
  }, [state.wallets]);

  const nextUpdate = getNextUtcPlusOneUpdate(now);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">ON</div>
        <nav>
          <a className="active" href="#overview">Overview</a>
          <a href="#wallets">Wallets</a>
          <a href="#movement">Movement</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar" id="overview">
          <div>
            <p className="eyebrow">Onre points</p>
            <h1>Wallet movement dashboard</h1>
          </div>
          <div className="update-card">
            <span>Next UTC+1 update</span>
            <strong>{formatCountdown(nextUpdate, now)}</strong>
            <small>{nextUpdate.toUTCString()}</small>
          </div>
        </header>

        <section className="metrics" aria-label="Wallet point summary">
          <article>
            <span>Total points</span>
            <strong>{totals.totalPoints.toLocaleString()}</strong>
          </article>
          <article>
            <span>Daily movement</span>
            <strong className={totals.movement >= 0 ? "positive" : "negative"}>
              {totals.movement >= 0 ? "+" : ""}
              {totals.movement.toLocaleString()}
            </strong>
          </article>
          <article>
            <span>Wallet tx</span>
            <strong>{totals.tx.toLocaleString()}</strong>
          </article>
          <article>
            <span>Volume tracked</span>
            <strong>${totals.volume.toLocaleString()}</strong>
          </article>
        </section>

        <section className="movement-grid" id="movement">
          <article className="movement-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">7 day points</p>
                <h2>Movement curve</h2>
              </div>
              <span className="date-pill">{state.dayKey}</span>
            </div>
            <div className="chart-stack">
              {sortedWallets.slice(0, 4).map((wallet) => (
                <div className="trend-row" key={wallet.id}>
                  <span>{wallet.label}</span>
                  <MiniTrend values={wallet.history} />
                </div>
              ))}
            </div>
            <div className="chart-labels">
              {movementLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </article>

          <article className="leader-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Leaders</p>
                <h2>Biggest daily moves</h2>
              </div>
            </div>
            {sortedWallets
              .map((wallet) => ({ ...wallet, delta: wallet.points - wallet.previousPoints }))
              .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
              .slice(0, 3)
              .map((wallet) => (
                <div className="leader-row" key={wallet.id}>
                  <div>
                    <strong>{wallet.label}</strong>
                    <span>{wallet.segment}</span>
                  </div>
                  <b className={wallet.delta >= 0 ? "positive" : "negative"}>
                    {wallet.delta >= 0 ? "+" : ""}
                    {wallet.delta.toLocaleString()}
                  </b>
                </div>
              ))}
          </article>
        </section>

        <section className="wallet-section" id="wallets">
          <div className="section-head">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>Wallets</h2>
            </div>
          </div>

          <div className="wallet-table">
            <div className="table-row table-head">
              <span>Wallet</span>
              <span>Points</span>
              <span>Previous</span>
              <span>Move</span>
              <span>Rank</span>
              <span>Trend</span>
            </div>
            {sortedWallets.map((wallet, index) => {
              const delta = wallet.points - wallet.previousPoints;
              return (
                <div className="table-row" key={wallet.id}>
                  <span className="wallet-name">
                    <b>#{index + 1} {wallet.label}</b>
                    <small>{wallet.id}</small>
                  </span>
                  <span>{wallet.points.toLocaleString()}</span>
                  <span>{wallet.previousPoints.toLocaleString()}</span>
                  <span className={delta >= 0 ? "positive" : "negative"}>
                    {delta >= 0 ? "+" : ""}
                    {delta.toLocaleString()}
                  </span>
                  <span className={wallet.rankChange >= 0 ? "positive" : "negative"}>
                    {wallet.rankChange >= 0 ? "+" : ""}
                    {wallet.rankChange}
                  </span>
                  <span><MiniTrend values={wallet.history} /></span>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

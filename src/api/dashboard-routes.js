// src/api/dashboard-routes.js (live-only, syntax-checked)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG as DEFAULTS } from '../config/settings.js';
import * as Runner from '../runtime/runner.js';

const app = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────
function safeJson(res, fn) {
  try { return fn(); }
  catch (e) {
    return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
}

function readCsvIfExists(localName) {
  try {
    const p = path.join(process.cwd(), localName);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  } catch {}
  return null;
}

// ───────────────────────────────────────────────
// Routes (live only)
// ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'live-only' }));

app.get('/api/defaults', (_req, res) => {
  return res.json({ ok: true, defaults: DEFAULTS });
});

app.get('/api/status', (_req, res) => {
  return safeJson(res, () => res.json({ ok: true, status: Runner.getStatus() }));
});

app.get('/api/trades', (_req, res) => {
  return safeJson(res, () => res.json({ ok: true, trades: Runner.getTrades() }));
});

app.get('/api/summary', (_req, res) => {
  return safeJson(res, () => {
    const trades = Runner.getTrades() || [];
    const count = trades.length;
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const zeros = trades.filter(t => t.pnl === 0).length;

    const netPNL = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const grossWin = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = trades.filter(t => t.pnl < 0).reduce((s, t) => s + Math.abs(t.pnl), 0);
    const profitFactor = grossLoss > 0 ? +(grossWin / grossLoss).toFixed(2) : null;
    const avgWin = wins ? +(grossWin / wins).toFixed(2) : 0;
    const avgLoss = losses ? +(-grossLoss / losses).toFixed(4) : 0;
    const winRatePct = count ? +((wins / count) * 100).toFixed(2) : 0;

    const bySide = trades.reduce((acc, t) => { acc[t.side] = (acc[t.side] || 0) + 1; return acc; }, {});
    const bySymbol = trades.reduce((acc, t) => { acc[t.symbol] = (acc[t.symbol] || 0) + 1; return acc; }, {});
    const byExitReason = trades.reduce((acc, t) => { acc[t.exitReason] = (acc[t.exitReason] || 0) + 1; return acc; }, {});
    const byStopLevel = trades.reduce((acc, t) => { acc[t.stopTier] = (acc[t.stopTier] || 0) + 1; return acc; }, {});

    return res.json({
      ok: true,
      count,
      wins, losses, zeros,
      winRatePct,
      netPNL: +netPNL.toFixed(2),
      grossWin: +grossWin.toFixed(2),
      grossLoss: +grossLoss.toFixed(2),
      profitFactor,
      avgWin,
      avgLoss,
      bySide,
      bySymbol,
      byExitReason,
      byStopLevel
    });
  });
});

// CSV downloads (if files exist)
app.get('/api/download/trades.csv', (_req, res) => {
  const txt = readCsvIfExists('trades.csv');
  if (!txt) return res.status(404).json({ ok: false, error: 'trades.csv not found' });
  res.setHeader('Content-Type', 'text/csv');
  return res.send(txt);
});

app.get('/api/download/winners.csv', (_req, res) => {
  const txt = readCsvIfExists('winners.csv');
  if (!txt) return res.status(404).json({ ok: false, error: 'winners.csv not found' });
  res.setHeader('Content-Type', 'text/csv');
  return res.send(txt);
});

app.get('/api/download/losers.csv', (_req, res) => {
  const txt = readCsvIfExists('losers.csv');
  if (!txt) return res.status(404).json({ ok: false, error: 'losers.csv not found' });
  res.setHeader('Content-Type', 'text/csv');
  return res.send(txt);
});

// No backtest in live build
app.all('/api/backtest*', (_req, res) => {
  return res.status(410).json({ ok: false, error: 'Backtest removed in live-only build' });
});

export default app;

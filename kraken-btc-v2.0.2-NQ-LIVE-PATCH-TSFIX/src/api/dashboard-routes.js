// src/api/dashboard-routes.js
import express from 'express';
import { CONFIG as DEFAULTS } from '../config/settings.js';
import * as Runner from '../runtime/runner.js';
// ---- Helpers to read "genuine" CSV produced by your master bot ----
  import fs from 'fs';
  import path from 'path';

  function readCsvLines(filepath) {
    try {
      if (!filepath) return null;
      if (!fs.existsSync(filepath)) return null;
      const txt = fs.readFileSync(filepath, 'utf8');
      const lines = txt.split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) return null; // headers only
      return lines;
    } catch { return null; }
  }

  function parseCsv(lines) {
    // expects header: time,symbol,side,entry,exit,pnl,pamm,rsi,macd,mode,id
    if (!lines || lines.length === 0) return [];
    const out = [];
    const header = lines[0].split(',');
    const idx = {
      time: header.indexOf('time'),
      symbol: header.indexOf('symbol'),
      side: header.indexOf('side'),
      entry: header.indexOf('entry'),
      exit: header.indexOf('exit'),
      pnl: header.indexOf('pnl'),
      pamm: header.indexOf('pamm'),
      rsi: header.indexOf('rsi'),
      macd: header.indexOf('macd'),
      mode: header.indexOf('mode'),
      id: header.indexOf('id'),
    };
    for (let i=1;i<lines.length;i++){
      const cols = lines[i].split(',');
      if (cols.length < header.length) continue;
      const rec = {
        time: cols[idx.time],
        symbol: cols[idx.symbol],
        side: cols[idx.side],
        entry: Number(cols[idx.entry]),
        exit: Number(cols[idx.exit]),
        pnl: Number(cols[idx.pnl]),
        pamm: Number(cols[idx.pamm]),
        rsi: Number(cols[idx.rsi]),
        macd: Number(cols[idx.macd]),
        mode: cols[idx.mode],
        id: cols[idx.id],
      };
      if (!isFinite(rec.pnl)) continue;
      out.push(rec);
    }
    return out;
  }

  function summarizeTrades(recs){
    const n = recs.length;
    let wins=0, losses=0, breakeven=0;
    let grossProfit=0, grossLoss=0;
    for (const r of recs){
      if (r.pnl > 0){ wins++; grossProfit += r.pnl; }
      else if (r.pnl < 0){ losses++; grossLoss += Math.abs(r.pnl); }
      else { breakeven++; }
    }
    const netProfit = grossProfit - grossLoss;
    const winPct = n ? (wins / n) * 100 : 0;
    const avgWin = wins ? (grossProfit / wins) : 0;
    const avgLoss = losses ? (grossLoss / losses) : 0;
    const pf = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? Infinity : 0);

    // Max drawdown from equity curve
    let peak = 0, equity = 0, maxDD = 0;
    for (const r of recs){
      equity += r.pnl;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDD) maxDD = dd;
    }
    return {
      trades: n, wins, losses, breakeven,
      winPct: Number(winPct.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      profitFactor: (pf === Infinity ? '∞' : Number(pf.toFixed(2))),
      maxDrawdown: Number(maxDD.toFixed(2))
    };
  }



let BT_TIMER = null;

let STATE = {
  on: DEFAULTS.ON_START,
  mode: DEFAULTS.MODE,
  config: { ...DEFAULTS },
  results: { trades: 0, winPct: 0, pnl: 0, pf: 0, ts: Date.now() },
  trades: [],
  fingerprints: [],
  backtest: { running: false }
};

// Sync with runner state
function syncRunnerState() {
  const runnerState = Runner.getState();
  if (runnerState.trades && runnerState.trades.length > 0) {
    STATE.trades = runnerState.trades;
  }
  if (runnerState.results) {
    STATE.results = {
      trades: runnerState.results.count || 0,
      winPct: runnerState.results.winRatePct || 0,
      pnl: runnerState.results.pnl || 0,
      pf: 0,
      ts: Date.now()
    };
  }
}

export function registerDashboardRoutes(app) {

  // Health & State
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  
  app.get('/api/runner/status', (_req, res) => {
    syncRunnerState();
    res.json({ ok:true, runner: Runner.status() });
  });

  app.get('/api/state', (_req, res) => {
    syncRunnerState();
    res.json({ ok:true, on: STATE.on, mode: STATE.mode, results: STATE.results });
  });

  // Config
  app.get('/api/config', (_req, res) => {
    res.json({ ok:true, config: STATE.config });
  });

  app.post('/api/config', express.json(), (req, res) => {
    STATE.config = { ...STATE.config, ...(req.body || {}) };
    res.json({ ok:true, config: STATE.config });
  });

  // CSV exports (stubbed structure)
  
  app.get('/api/csv/trades', (_req, res) => {
    const filepath = process.env.TRADES_CSV_PATH || path.join(process.cwd(), 'trades.csv');
    const lines = readCsvLines(filepath);
    if (lines) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="trades.csv"');
      return res.send(lines.join('\n'));
    }
    // fallback to placeholder
    const headers = ['time','symbol','side','entry','exit','pnl','pnlPct','pamm','rsi','macd','exitReason','stopLevel','mode','id'];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="trades.csv"');
    return res.send(headers.join(','));
  });


  
  app.get('/api/csv/backtest', (_req, res) => {
    // First check in-memory STATE (most reliable for recent backtests)
    if (STATE.backtest && STATE.backtest.csv) {
      console.log(`[CSV EXPORT] Serving from memory: ${STATE.backtest.csv.length} bytes`);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="backtest.csv"');
      return res.send(STATE.backtest.csv);
    }
    
    // Then try file system
    const envPath = process.env.BACKTEST_CSV_PATH || path.join(process.cwd(), 'backtest.csv');
    const lines = readCsvLines(envPath);
    if (lines) {
      console.log(`[CSV EXPORT] Serving from file: ${lines.length} lines`);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="backtest.csv"');
      return res.send(lines.join('\n'));
    }
    
    // Fallback: headers only
    console.log('[CSV EXPORT] No data available, returning headers only');
    const headers = ['time','symbol','side','entry','exit','pnl','pnlPct','pamm','rsi','macd','exitReason','stopLevel','mode','tf','id'];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="backtest.csv"');
    return res.send(headers.join(','));
  });


  // Bot controls
  app.post('/api/bot/start', (req, res) => {
    const mode = (req.query.mode || req.body?.mode || STATE.mode || 'paper').toLowerCase();
    try { 
      const st = Runner.start(mode);
      STATE.on = true;
      STATE.mode = mode;
      STATE.results.ts = Date.now();
      return res.json({ ok: true, on: STATE.on, mode: STATE.mode, runner: st });
    } catch (e) {
      return res.status(400).json({ ok:false, error: String(e) });
    }
  });

  app.post('/api/bot/stop', (_req, res) => {
    const st = Runner.stop();
    STATE.on = false;
    STATE.results.ts = Date.now();
    return res.json({ ok: true, on: STATE.on, mode: STATE.mode, runner: st });
  });

  app.post('/api/bot/toggle', express.json(), (req, res) => {
    const raw = (req.query.on ?? req.body?.on);
    let isOn = false;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      isOn = (v === 'true' || v === '1' || v === 'on');
    } else {
      isOn = !!raw;
    }
    STATE.on = isOn;
    STATE.results.ts = Date.now();
    return res.json({ ok: true, on: STATE.on, mode: STATE.mode });
  });

  // Backtest
  app.post('/api/backtest/run', express.json(), async (req, res) => {
    try {
      const { symbol='BTCUSD', start, end, tfMin = DEFAULTS.BACKTEST_DEFAULT_TIMEFRAME_MIN, tfList = DEFAULTS.TIMEFRAMES_DEFAULT } = req.body || {};
      if (!start || !end) return res.status(400).json({ ok:false, error: 'start and end (YYYY-MM-DD) are required' });
      STATE.mode = 'backtest';
      STATE.backtest = { running:true, startedAt: Date.now(), progress: 0 };
      const out = await runBacktest({ symbol, start, end, tfMin, tfList, config: DEFAULTS });
      STATE.backtest.running = false;
      STATE.backtest.progress = 100;
      STATE.backtest.csv = out.csv;
      STATE.backtest.trades = out.trades; // Store trades separately
      
      // Debug logging
      console.log(`[BACKTEST] Generated ${out.trades.length} trades`);
      console.log(`[BACKTEST] CSV length: ${out.csv ? out.csv.length : 0} bytes`);
      console.log(`[BACKTEST] CSV lines: ${out.csv ? out.csv.split('\n').length : 0}`);
      
      return res.json({ ok:true, count: out.trades.length });
    } catch (e) {
      console.error('[BACKTEST ERROR]', e);
      return res.status(500).json({ ok:false, error: String(e && e.message || e) });
    }
  });

  app.get('/api/backtest*', (_req,res)=>res.status(410).json({ok:false,error:'Backtest removed in live-only build'}));
  });

  // Debug endpoint to check STATE contents
  app.get('/api/backtest/debug', (_req, res) => {
    const debug = {
      hasBacktest: !!STATE.backtest,
      hasTrades: !!(STATE.backtest && STATE.backtest.trades),
      tradeCount: STATE.backtest && STATE.backtest.trades ? STATE.backtest.trades.length : 0,
      hasCsv: !!(STATE.backtest && STATE.backtest.csv),
      csvLength: STATE.backtest && STATE.backtest.csv ? STATE.backtest.csv.length : 0,
      csvLines: STATE.backtest && STATE.backtest.csv ? STATE.backtest.csv.split('\n').length : 0,
      firstTrade: STATE.backtest && STATE.backtest.trades && STATE.backtest.trades[0] ? STATE.backtest.trades[0] : null,
      csvPreview: STATE.backtest && STATE.backtest.csv ? STATE.backtest.csv.substring(0, 500) : null
    };
    return res.json({ ok: true, debug });
  });

  // Summarize backtest results (win/loss, PF, etc.)
  app.get('/api/backtest/summary', (_req, res) => {
    try {
      // Prefer env CSV -> file, then STATE.backtest.csv fallback
      const envPath = process.env.BACKTEST_CSV_PATH || path.join(process.cwd(), 'backtest.csv');

      let csvText = null;
      try {
        if (fs.existsSync(envPath)) {
          csvText = fs.readFileSync(envPath, 'utf-8');
        }
      } catch {}

      if (!csvText && STATE.backtest && STATE.backtest.csv) {
        csvText = STATE.backtest.csv;
      }

      if (!csvText || !csvText.trim()) {
        return res.status(404).json({ ok:false, error: 'No backtest CSV available yet.' });
      }

      const lines = csvText.trim().split(/\r?\n/);
      const [headerLine, ...rows] = lines;
      
      if (rows.length === 0) {
        return res.status(404).json({ ok:false, error: 'No trades in backtest. CSV has only headers.' });
      }
      
      const headers = headerLine.split(',');
      const colIndex = (name) => headers.indexOf(name);

      const idx = {
        time: colIndex('time'),
        symbol: colIndex('symbol'),
        side: colIndex('side'),
        entry: colIndex('entry'),
        exit: colIndex('exit'),
        pnl: colIndex('pnl'),
        pnlPct: colIndex('pnlPct'),
        pamm: colIndex('pamm'),
        rsi: colIndex('rsi'),
        macd: colIndex('macd'),
        exitReason: colIndex('exitReason'),
        stopLevel: colIndex('stopLevel'),
        mode: colIndex('mode'),
        tf: colIndex('tf'),
        id: colIndex('id'),
      };

      // Check required columns (tf is optional for backwards compat)
      const requiredCols = ['time','symbol','side','entry','exit','pnl','pnlPct','exitReason','stopLevel','mode'];
      if (requiredCols.some(col => colIndex(col) === -1)) {
        return res.status(400).json({ ok:false, error: 'CSV missing expected headers.' });
      }

      // Parse rows
      const trades = rows
        .map(r => r.split(','))
        .filter(cols => cols.length >= 10) // At least 10 columns (time, symbol, side, entry, exit, pnl, pnlPct, pamm, exitReason, mode)
        .map(cols => ({
          time: cols[idx.time],
          symbol: cols[idx.symbol],
          side: cols[idx.side],
          entry: Number(cols[idx.entry]),
          exit: Number(cols[idx.exit]),
          pnl: Number(cols[idx.pnl]),
          pnlPct: Number(cols[idx.pnlPct]) || 0,
          pamm: Number(cols[idx.pamm]),
          rsi: Number(cols[idx.rsi]),
          macd: Number(cols[idx.macd]),
          exitReason: cols[idx.exitReason] || 'unknown',
          stopLevel: cols[idx.stopLevel] || 'initial',
          mode: cols[idx.mode],
          id: cols[idx.id],
        }))
        .filter(t => Number.isFinite(t.pnl));
      
      if (trades.length === 0) {
        return res.status(404).json({ ok:false, error: `No valid trades parsed. CSV has ${rows.length} rows but 0 valid trades.` });
      }

      const total = trades.length;
      const wins = trades.filter(t => t.pnl > 0).length;
      const losses = trades.filter(t => t.pnl < 0).length;
      const zeros = total - wins - losses;
      const winRate = total ? +(wins / total * 100).toFixed(2) : 0;

      const grossWin = trades.filter(t => t.pnl > 0).reduce((a,b)=>a+b.pnl,0);
      const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((a,b)=>a+b.pnl,0));
      const profitFactor = grossLoss > 0 ? +(grossWin / grossLoss).toFixed(2) : (grossWin>0 ? null : 0);

      const avgWin = wins ? +(grossWin / wins).toFixed(4) : 0;
      const avgLoss = losses ? +(-(grossLoss / losses)).toFixed(4) : 0;
      const netPNL = +(trades.reduce((a,b)=>a+b.pnl,0)).toFixed(4);

      // small breakdowns
      const bySide = Object.fromEntries(['long','short'].map(s => [s, trades.filter(t=>t.side===s).length]));
      const bySymbol = trades.reduce((acc,t)=>{ acc[t.symbol]=(acc[t.symbol]||0)+1; return acc; }, {});
      const byExitReason = trades.reduce((acc,t)=>{ acc[t.exitReason]=(acc[t.exitReason]||0)+1; return acc; }, {});
      const byStopLevel = trades.reduce((acc,t)=>{ acc[t.stopLevel]=(acc[t.stopLevel]||0)+1; return acc; }, {});

      return res.json({
        ok: true,
        count: total,
        wins, losses, zeros,
        winRatePct: winRate,
        netPNL,
        grossWin, grossLoss,
        profitFactor,
        avgWin, avgLoss,
        bySide, bySymbol, byExitReason, byStopLevel
      });
    } catch (err) {
      return res.status(500).json({ ok:false, error: String(err && err.message || err) });
    }
  });
}
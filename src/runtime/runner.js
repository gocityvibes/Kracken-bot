// src/runtime/runner.js
import { fetchCandles, getCurrentPrice } from '../data/krakenf.js';
import { rsi, macd, atr, ema } from '../lib/indicators.js';
import { CONFIG } from '../config/settings.js';

// Normalize seconds vs milliseconds to ISO8601 UTC
function normalizeTs(ts) {
  // If it's already in milliseconds (typical: >= 2001-09-09), use as-is
  if (typeof ts === 'number') {
    return (ts > 1e12 ? new Date(ts) : new Date(ts * 1000)).toISOString();
  }
  // If it's a Date or string, fall back to native
  try { return new Date(ts).toISOString(); } catch { return new Date().toISOString(); }
}


// Singleton state
let RUNNER_STATE = {
  running: false,
  mode: 'idle',
  position: null,
  trades: [],
  results: { pnl: 0, count: 0, winRatePct: 0 },
  lastError: null,
  symbol: 'BTCUSD',
  timer: null,
  dailyPnL: 0,
  dailyDrawdown: 0,
  atrAvg: null
};

async function tick() {
  try {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 1000*60*60*240).toISOString(); // ~10 days
    const tfMin = CONFIG.BACKTEST_DEFAULT_TIMEFRAME_MIN || 5;
    const candles = await fetchCandles(RUNNER_STATE.symbol, tfMin, start, end);
    
    if (candles.length < 50) return;
    
    const closes = candles.map(c=>c.c);
    const highs  = candles.map(c=>c.h);
    const lows   = candles.map(c=>c.l);

    const RSI = rsi(closes, CONFIG.RSI_LEN);
    const { macd: MACD, hist: HIST } = macd(closes, CONFIG.MACD_FAST, CONFIG.MACD_SLOW, CONFIG.MACD_SIG);
    const ATR = atr(highs, lows, closes, 14);
    const EMA_FAST = ema(closes, CONFIG.MACD_FAST);

    const i = closes.length - 1;
    const currentPrice = closes[i];
    
    // Calculate average ATR for adaptive thresholds
    if (!RUNNER_STATE.atrAvg && ATR[i]) {
      const validATR = ATR.filter(v => v !== null).slice(-20);
      if (validATR.length > 0) {
        RUNNER_STATE.atrAvg = validATR.reduce((a,b)=>a+b) / validATR.length;
      }
    }

    // Adaptive PAMM threshold based on volatility
    const pammThreshold = getAdaptivePAMMThreshold(ATR[i], RUNNER_STATE.atrAvg);
    const pamm = scorePAMM({ rsi: RSI[i], macd: MACD[i], hist: HIST[i] });
    
    // Entry logic
    if (!RUNNER_STATE.position) {
      // Check for long entry
      if (pamm >= pammThreshold && Number.isFinite(RSI[i]) && Number.isFinite(MACD[i])) {
        enterPosition('long', currentPrice, candles[i].ts, pamm, RSI[i], MACD[i]);
      }
      // Check for short entry (if enabled)
      else if (CONFIG.ALLOW_SHORTS && pamm <= -pammThreshold && Number.isFinite(RSI[i]) && Number.isFinite(MACD[i])) {
        enterPosition('short', currentPrice, candles[i].ts, pamm, RSI[i], MACD[i]);
      }
    }
    
    // Exit logic
    if (RUNNER_STATE.position) {
      // Update high/low water marks
      if (RUNNER_STATE.position.side === 'long') {
        if (currentPrice > RUNNER_STATE.position.highWater) {
          RUNNER_STATE.position.highWater = currentPrice;
        }
      } else {
        if (currentPrice < RUNNER_STATE.position.lowWater) {
          RUNNER_STATE.position.lowWater = currentPrice;
        }
      }
      
      // Update 3-tier trailing stop
      updateTrailingStop(RUNNER_STATE.position, currentPrice);
      
      // Check stop loss
      const stopHit = checkStopLoss(RUNNER_STATE.position, currentPrice);
      
      // Check MACD flip exit
      const macdFlip = false && CONFIG.MACD_FLIP_EXIT_ENABLED && checkMACDFlip(RUNNER_STATE.position.side, HIST[i]);
      
      if (stopHit) {
        exitPosition(currentPrice, 'stop_loss', pamm, RSI[i], MACD[i]);
      } else if (macdFlip) {
        exitPosition(currentPrice, 'macd_flip', pamm, RSI[i], MACD[i]);
      }
    }

    // Risk management checks
    checkRiskLimits();

  } catch (err) {
    RUNNER_STATE.lastError = err.message;
    if (CONFIG.LOG_LEVEL === 'debug') console.error('Tick error:', err);
  }
}

function enterPosition(side, price, timestamp, pamm, rsi, macd) {
  const initialStopPct = CONFIG.INITIAL_STOP_LOSS_PCT / 100;
  const initialStop = side === 'long' 
    ? price * (1 - initialStopPct) 
    : price * (1 + initialStopPct);
  
  RUNNER_STATE.position = { 
    side, 
    entry: price,
    stopLoss: initialStop,
    highWater: price,
    lowWater: price,
    stopTier: 0,
    time: normalizeTs(timestamp),
    pamm,
    rsi,
    macd
  ,
    entryPamm: pamm,
    entryRsi: rsi,
    entryMacd: macd
  };
  
  if (CONFIG.LOG_LEVEL !== 'silent') {
    console.log(`[${side.toUpperCase()}] Entry @ ${price.toFixed(2)} | PAMM: ${pamm.toFixed(0)} | Stop: ${initialStop.toFixed(2)}`);
  }
}

function exitPosition(price, exitReason, pamm, rsi, macd) {
  const pos = RUNNER_STATE.position;
  const pnl = pos.side === 'long' 
    ? (price - pos.entry) 
    : (pos.entry - price);
  
  const pnlPct = (pnl / pos.entry) * 100;
  
  const trade = {
    time: pos.time,
    symbol: RUNNER_STATE.symbol,
    side: pos.side,
    entry: +pos.entry.toFixed(2),
    exit: +price.toFixed(2),
    pnl: +pnl.toFixed(2),
    pnlPct: +pnlPct.toFixed(2),
    pamm: +pamm.toFixed(0),
    rsi: +(rsi ?? 0).toFixed(2),
    macd: +(macd ?? 0).toFixed(4),
    exitReason,
    stopTier: pos.stopTier || 0,
    mode: RUNNER_STATE.mode,
    id: String(Date.now())
  };
  
  RUNNER_STATE.trades.push(trade);
  RUNNER_STATE.dailyPnL += pnl;
  
  // Update results
  updateResults();
  
  // Save CSVs if enabled
  if (CONFIG.SAVE_TRADES_CSV) saveTradeCSV(trade);
  if (CONFIG.SAVE_WINNERS_CSV && pnl > 0) saveWinnerCSV(trade);
  if (CONFIG.SAVE_LOSERS_CSV && pnl < 0) saveLoserCSV(trade);
  
  if (CONFIG.LOG_LEVEL !== 'silent') {
    console.log(`[EXIT] ${pos.side.toUpperCase()} @ ${price.toFixed(2)} | P&L: $${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%) | Reason: ${exitReason} | Tier: ${pos.stopTier}`);
  }
  
  RUNNER_STATE.position = null;
}

function updateTrailingStop(position, currentPrice) {
  const entry = position.entry;
  const side = position.side;
  
  // Calculate profit %
  const profitPct = side === 'long'
    ? ((currentPrice - entry) / entry) * 100
    : ((entry - currentPrice) / entry) * 100;
  
  // Check each tier from highest to lowest
  for (let i = CONFIG.TRAIL_TIERS.length - 1; i >= 0; i--) {
    const tier = CONFIG.TRAIL_TIERS[i];
    
    if (profitPct >= tier.trigger_pct) {
      // Calculate new stop based on tier
      const lockInPct = tier.lock_pct / 100;
      const newStop = side === 'long'
        ? entry * (1 + lockInPct)  // Lock in profit above entry
        : entry * (1 - lockInPct);  // Lock in profit below entry
      
      // Only move stop in favorable direction
      if (side === 'long' && newStop > position.stopLoss) {
        position.stopLoss = newStop;
        position.stopTier = i + 1;
      } else if (side === 'short' && newStop < position.stopLoss) {
        position.stopLoss = newStop;
        position.stopTier = i + 1;
      }
      
      break; // Only apply highest tier reached
    }
  }
}

function checkStopLoss(position, currentPrice) {
  if (position.side === 'long') {
    return currentPrice <= position.stopLoss;
  } else {
    return currentPrice >= position.stopLoss;
  }
}

function checkMACDFlip(side, histValue) {
  if (histValue === null || histValue === undefined) return false;
  
  if (side === 'long') {
    return histValue < 0;  // Histogram turned negative
  } else {
    return histValue > 0;  // Histogram turned positive
  }
}

function getAdaptivePAMMThreshold(currentATR, avgATR) {
  if (!avgATR || !currentATR) return CONFIG.PAMM_MIN;
  
  const atrRatio = currentATR / avgATR;
  
  // High volatility: lower threshold
  if (atrRatio > 1.5) {
    return CONFIG.PAMM_MIN_HIGH_VOL;
  }
  // Low volatility: higher threshold
  else if (atrRatio < 0.8) {
    return CONFIG.PAMM_MIN_LOW_VOL;
  }
  // Normal volatility
  else {
    return CONFIG.PAMM_MIN;
  }
}

function scorePAMM({ rsi, macd, hist }) {
  if (rsi == null || macd == null || hist == null) return 0;
  
  const rsiScore = Math.max(0, Math.min(100, (rsi-50)*3));
  const macdScore = macd > 0 ? 20 : -20;  // Can be negative for shorts
  const histScore = hist > 0 ? 10 : -10;   // Can be negative for shorts
  
  return rsiScore + macdScore + histScore;
}

function checkRiskLimits() {
  // Daily loss limit
  if (Math.abs(RUNNER_STATE.dailyPnL) >= CONFIG.DAILY_MAX_LOSS_USD) {
    if (CONFIG.LOG_LEVEL !== 'silent') {
      console.log(`[RISK] Daily loss limit reached: $${RUNNER_STATE.dailyPnL.toFixed(2)}`);
    }
    stop();
  }
  
  // Daily drawdown limit
  if (Math.abs(RUNNER_STATE.dailyDrawdown) >= CONFIG.DAILY_MAX_DRAWDOWN_USD) {
    if (CONFIG.LOG_LEVEL !== 'silent') {
      console.log(`[RISK] Daily drawdown limit reached: $${RUNNER_STATE.dailyDrawdown.toFixed(2)}`);
    }
    stop();
  }
}

function updateResults() {
  const trades = RUNNER_STATE.trades;
  if (trades.length === 0) {
    RUNNER_STATE.results = { pnl: 0, count: 0, winRatePct: 0 };
    return;
  }
  
  const wins = trades.filter(t => t.pnl > 0).length;
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  
  RUNNER_STATE.results = {
    pnl: +totalPnL.toFixed(2),
    count: trades.length,
    winRatePct: +((wins / trades.length) * 100).toFixed(2)
  };
}

function saveTradeCSV(trade) {
  try {
    const fs = await import('fs');
    const headers = [
      'time','symbol','side','entry','exit','pnl','pnlPct','exitReason','stopTier','mode','id',
      'entryPamm','entryRsi','entryMacd','exitPamm','exitRsi','exitMacd','tf'
    ];
    const line = [
      trade.time, trade.symbol, trade.side, trade.entry, trade.exit, trade.pnl, trade.pnlPct, trade.exitReason,
      trade.stopTier, trade.mode, trade.id, trade.entryPamm, trade.entryRsi, trade.entryMacd,
      trade.exitPamm, trade.exitRsi, trade.exitMacd, trade.tf
    ].join(',');
    const path = './trades.csv';
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, headers.join(',') + '
', 'utf-8');
    }
    fs.appendFileSync(path, line + '
', 'utf-8');
  } catch (e) {
    if (CONFIG.LOG_LEVEL !== 'silent') console.error('[CSV]', e.message);
  }
}

function saveWinnerCSV(trade){
  try{
    const fs = await import('fs');
    const path = './winners.csv';
    const headers = ['time','symbol','side','entry','exit','pnl','pnlPct','exitReason','id'];
    const line = [trade.time,trade.symbol,trade.side,trade.entry,trade.exit,trade.pnl,trade.pnlPct,trade.exitReason,trade.id].join(',');
    if(!fs.existsSync(path)) fs.writeFileSync(path, headers.join(',')+'
','utf-8');
    fs.appendFileSync(path, line+'
','utf-8');
  }catch(e){ if (CONFIG.LOG_LEVEL !== 'silent') console.error('[CSV]', e.message); }
}

function saveLoserCSV(trade){
  try{
    const fs = await import('fs');
    const path = './losers.csv';
    const headers = ['time','symbol','side','entry','exit','pnl','pnlPct','exitReason','id'];
    const line = [trade.time,trade.symbol,trade.side,trade.entry,trade.exit,trade.pnl,trade.pnlPct,trade.exitReason,trade.id].join(',');
    if(!fs.existsSync(path)) fs.writeFileSync(path, headers.join(',')+'
','utf-8');
    fs.appendFileSync(path, line+'
','utf-8');
  }catch(e){ if (CONFIG.LOG_LEVEL !== 'silent') console.error('[CSV]', e.message); }
}

export function start(mode = 'paper', symbol = 'BTCUSD') {
  if (RUNNER_STATE.running) return { ok: false, error: 'Already running' };
  
  RUNNER_STATE.running = true;
  RUNNER_STATE.mode = mode;
  RUNNER_STATE.symbol = symbol;
  RUNNER_STATE.dailyPnL = 0;
  RUNNER_STATE.dailyDrawdown = 0;
  RUNNER_STATE.lastError = null;
  
  // Run immediately then every minute
  tick();
  RUNNER_STATE.timer = setInterval(tick, 60000);
  
  if (CONFIG.LOG_LEVEL !== 'silent') {
    console.log(`[START] Runner started in ${mode.toUpperCase()} mode on ${symbol}`);
  }
  
  return { ok: true };
}

export function stop() {
  if (!RUNNER_STATE.running) return { ok: false, error: 'Not running' };
  
  clearInterval(RUNNER_STATE.timer);
  RUNNER_STATE.running = false;
  RUNNER_STATE.mode = 'idle';
  RUNNER_STATE.timer = null;
  
  if (CONFIG.LOG_LEVEL !== 'silent') {
    console.log('[STOP] Runner stopped');
  }
  
  return { ok: true };
}

export function getState() {
  return {
    running: RUNNER_STATE.running,
    mode: RUNNER_STATE.mode,
    position: RUNNER_STATE.position,
    results: RUNNER_STATE.results,
    lastError: RUNNER_STATE.lastError,
    symbol: RUNNER_STATE.symbol,
    tradeCount: RUNNER_STATE.trades.length,
    dailyPnL: RUNNER_STATE.dailyPnL
  };
}

export function getTrades() {
  return RUNNER_STATE.trades;
}

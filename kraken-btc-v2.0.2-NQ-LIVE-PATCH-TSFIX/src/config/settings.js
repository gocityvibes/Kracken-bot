// src/config/settings.js
export const CONFIG = {
  // ─────────────────────────────
  // 🚀 SYSTEM
  // ─────────────────────────────
  ON_START: (process.env.ON_START ?? 'false').toLowerCase() === 'true',
  MODE: (process.env.MODE ?? 'paper').toLowerCase(),
  port: Number(process.env.PORT ?? 10000),
  LOG_LEVEL: (process.env.LOG_LEVEL ?? 'info').toLowerCase(),

  // ─────────────────────────────
  // 📊 RISK MANAGEMENT
  // ─────────────────────────────
  POSITION_SIZE_USD: Number(process.env.POSITION_SIZE_USD ?? 500),
  DAILY_MAX_LOSS_USD: Number(process.env.DAILY_MAX_LOSS_USD ?? 500),
  DAILY_MAX_DRAWDOWN_USD: Number(process.env.DAILY_MAX_DRAWDOWN_USD ?? 1000),
  INITIAL_STOP_LOSS_PCT: Number(process.env.INITIAL_STOP_LOSS_PCT ?? 1.0),

  // ─────────────────────────────
  // 🧠 PAMM / ENTRY FILTERS
  // ─────────────────────────────
  PAMM_MIN: Number(process.env.PAMM_MIN ?? 115),
  PAMM_MIN_HIGH_VOL: Number(process.env.PAMM_MIN_HIGH_VOL ?? 115),
  PAMM_MIN_LOW_VOL: Number(process.env.PAMM_MIN_LOW_VOL ?? 115),
  ALLOW_SHORTS: (process.env.ALLOW_SHORTS ?? 'true').toLowerCase() === 'true',

  // ─────────────────────────────
  // 📈 INDICATOR PARAMETERS
  // ─────────────────────────────
  RSI_LEN: Number(process.env.RSI_LEN ?? 14),
  MACD_FAST: Number(process.env.MACD_FAST ?? 12),
  MACD_SLOW: Number(process.env.MACD_SLOW ?? 26),
  MACD_SIG: Number(process.env.MACD_SIG ?? 9),

  // ─────────────────────────────
  // ⏱️ TIMEFRAMES & EXECUTION
  // ─────────────────────────────
  TIMEFRAMES_DEFAULT: (process.env.TIMEFRAMES_DEFAULT ?? '15,30,60')
    .split(',')
    .map(s => s.trim())
    .map(s => s.toLowerCase() === '1h' ? '60' : s)
    .map(n => Number(n))
    .filter(n => [1,5,15,30,60,240,1440].includes(n)),

  BACKTEST_DEFAULT_TIMEFRAME_MIN: Number(process.env.BACKTEST_DEFAULT_TIMEFRAME_MIN ?? 60),

  // ─────────────────────────────
  // 🚦 TRAILING / EXIT LOGIC
  // ─────────────────────────────
  // 3-Tier Trailing Stop System
  TRAIL_TIERS: process.env.TRAIL_TIERS ? JSON.parse(process.env.TRAIL_TIERS) : [
    { trigger_pct: 0.75, lock_pct: 0.25 },  // Tier 1: At +0.75%, lock in 0.25%
    { trigger_pct: 1.50, lock_pct: 0.60 },  // Tier 2: At +1.50%, lock in 0.60%
    { trigger_pct: 3.00, lock_pct: 1.20 }   // Tier 3: At +3.00%, lock in 1.20%
  ],

  MACD_FLIP_EXIT_ENABLED: (process.env.MACD_FLIP_EXIT_ENABLED ?? 'false').toLowerCase() === 'true',
  REENTRY_EMA_FAST_RECLAIM_BARS: Number(process.env.REENTRY_EMA_FAST_RECLAIM_BARS ?? 5),

  // ─────────────────────────────
  // 🧩 PERFORMANCE / LOGGING
  // ─────────────────────────────
  SAVE_TRADES_CSV: (process.env.SAVE_TRADES_CSV ?? 'true').toLowerCase() === 'true',
  SAVE_WINNERS_CSV: (process.env.SAVE_WINNERS_CSV ?? 'true').toLowerCase() === 'true',
  SAVE_LOSERS_CSV: (process.env.SAVE_LOSERS_CSV ?? 'true').toLowerCase() === 'true'
};

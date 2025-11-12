// src/lib/indicators.js

/**
 * Exponential Moving Average (EMA)
 * @param {number[]} data - Price data
 * @param {number} period - EMA period
 * @returns {number[]} Array of EMA values (nulls for warmup period)
 */
export function ema(data, period) {
  if (!data || data.length === 0) return [];
  if (period < 1) throw new Error('EMA period must be >= 1');
  
  const result = new Array(data.length).fill(null);
  const multiplier = 2 / (period + 1);
  
  // Initialize with SMA for first period
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  
  if (data.length < period) return result;
  
  result[period - 1] = sum / period;
  
  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
  }
  
  return result;
}

/**
 * Simple Moving Average (SMA)
 * @param {number[]} data - Price data
 * @param {number} period - SMA period
 * @returns {number[]} Array of SMA values (nulls for warmup period)
 */
export function sma(data, period) {
  if (!data || data.length === 0) return [];
  if (period < 1) throw new Error('SMA period must be >= 1');
  
  const result = new Array(data.length).fill(null);
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result[i] = sum / period;
  }
  
  return result;
}

/**
 * Relative Strength Index (RSI)
 * @param {number[]} closes - Closing prices
 * @param {number} period - RSI period (typically 14)
 * @returns {number[]} Array of RSI values (nulls for warmup period)
 */
export function rsi(closes, period = 14) {
  if (!closes || closes.length === 0) return [];
  if (period < 1) throw new Error('RSI period must be >= 1');
  
  const result = new Array(closes.length).fill(null);
  
  if (closes.length < period + 1) return result;
  
  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate first RSI
  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - (100 / (1 + rs));
  }
  
  // Calculate subsequent RSI values using Wilder's smoothing
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    let gain = 0;
    let loss = 0;
    
    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }
  }
  
  return result;
}

/**
 * Moving Average Convergence Divergence (MACD)
 * @param {number[]} closes - Closing prices
 * @param {number} fastPeriod - Fast EMA period (typically 12)
 * @param {number} slowPeriod - Slow EMA period (typically 26)
 * @param {number} signalPeriod - Signal line period (typically 9)
 * @returns {Object} {macd: number[], signal: number[], hist: number[]}
 */
export function macd(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!closes || closes.length === 0) {
    return { macd: [], signal: [], hist: [] };
  }
  
  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);
  
  // Calculate MACD line
  const macdLine = closes.map((_, i) => {
    if (fastEMA[i] === null || slowEMA[i] === null) return null;
    return fastEMA[i] - slowEMA[i];
  });
  
  // Calculate signal line (EMA of MACD)
  const signalLine = emaOfNullable(macdLine, signalPeriod);
  
  // Calculate histogram
  const histogram = macdLine.map((m, i) => {
    if (m === null || signalLine[i] === null) return null;
    return m - signalLine[i];
  });
  
  return {
    macd: macdLine,
    signal: signalLine,
    hist: histogram
  };
}

/**
 * EMA for data that may contain null values
 */
function emaOfNullable(data, period) {
  const result = new Array(data.length).fill(null);
  const multiplier = 2 / (period + 1);
  
  // Find valid values for initial SMA
  const validValues = [];
  for (let i = 0; i < data.length && validValues.length < period; i++) {
    if (data[i] !== null) {
      validValues.push({ value: data[i], index: i });
    }
  }
  
  if (validValues.length < period) return result;
  
  // Calculate initial SMA
  const sum = validValues.reduce((acc, v) => acc + v.value, 0);
  const startIndex = validValues[validValues.length - 1].index;
  result[startIndex] = sum / period;
  
  // Calculate EMA for remaining values
  for (let i = startIndex + 1; i < data.length; i++) {
    if (data[i] !== null && result[i - 1] !== null) {
      result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
    }
  }
  
  return result;
}

/**
 * Average True Range (ATR)
 * @param {number[]} highs - High prices
 * @param {number[]} lows - Low prices
 * @param {number[]} closes - Closing prices
 * @param {number} period - ATR period (typically 14)
 * @returns {number[]} Array of ATR values (nulls for warmup period)
 */
export function atr(highs, lows, closes, period = 14) {
  if (!highs || !lows || !closes) return [];
  if (highs.length !== lows.length || highs.length !== closes.length) {
    throw new Error('ATR: highs, lows, and closes must have same length');
  }
  if (period < 1) throw new Error('ATR period must be >= 1');
  
  const result = new Array(closes.length).fill(null);
  const trueRanges = new Array(closes.length).fill(null);
  
  // Calculate True Range for each period
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      // First bar: TR = high - low
      trueRanges[i] = highs[i] - lows[i];
    } else {
      // TR = max(high - low, |high - prevClose|, |low - prevClose|)
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      trueRanges[i] = Math.max(hl, hc, lc);
    }
  }
  
  if (closes.length < period) return result;
  
  // Calculate initial ATR (SMA of TR)
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trueRanges[i];
  }
  result[period - 1] = sum / period;
  
  // Calculate subsequent ATR using Wilder's smoothing
  for (let i = period; i < closes.length; i++) {
    result[i] = (result[i - 1] * (period - 1) + trueRanges[i]) / period;
  }
  
  return result;
}

/**
 * Bollinger Bands
 * @param {number[]} closes - Closing prices
 * @param {number} period - MA period (typically 20)
 * @param {number} stdDev - Number of standard deviations (typically 2)
 * @returns {Object} {upper: number[], middle: number[], lower: number[]}
 */
export function bollingerBands(closes, period = 20, stdDev = 2) {
  if (!closes || closes.length === 0) {
    return { upper: [], middle: [], lower: [] };
  }
  
  const middle = sma(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  
  for (let i = period - 1; i < closes.length; i++) {
    if (middle[i] === null) continue;
    
    // Calculate standard deviation
    let sumSquares = 0;
    for (let j = 0; j < period; j++) {
      const diff = closes[i - j] - middle[i];
      sumSquares += diff * diff;
    }
    const sd = Math.sqrt(sumSquares / period);
    
    upper[i] = middle[i] + (stdDev * sd);
    lower[i] = middle[i] - (stdDev * sd);
  }
  
  return { upper, middle, lower };
}

/**
 * Average Directional Index (ADX)
 * @param {number[]} highs - High prices
 * @param {number[]} lows - Low prices
 * @param {number[]} closes - Closing prices
 * @param {number} period - ADX period (typically 14)
 * @returns {number[]} Array of ADX values
 */
export function adx(highs, lows, closes, period = 14) {
  if (!highs || !lows || !closes) return [];
  if (highs.length !== lows.length || highs.length !== closes.length) {
    throw new Error('ADX: highs, lows, and closes must have same length');
  }
  
  const result = new Array(closes.length).fill(null);
  const plusDM = new Array(closes.length).fill(0);
  const minusDM = new Array(closes.length).fill(0);
  const trueRanges = new Array(closes.length).fill(0);
  
  // Calculate +DM, -DM, and TR
  for (let i = 1; i < closes.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
    minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
    
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    trueRanges[i] = Math.max(hl, hc, lc);
  }
  
  if (closes.length < period * 2) return result;
  
  // Smooth +DM, -DM, and TR
  let smoothedPlusDM = plusDM.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let smoothedMinusDM = minusDM.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let smoothedTR = trueRanges.slice(1, period + 1).reduce((a, b) => a + b, 0);
  
  const plusDI = new Array(closes.length).fill(null);
  const minusDI = new Array(closes.length).fill(null);
  const dx = new Array(closes.length).fill(null);
  
  plusDI[period] = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
  minusDI[period] = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
  
  const diSum = plusDI[period] + minusDI[period];
  dx[period] = diSum !== 0 ? (Math.abs(plusDI[period] - minusDI[period]) / diSum) * 100 : 0;
  
  for (let i = period + 1; i < closes.length; i++) {
    smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDM[i];
    smoothedTR = smoothedTR - (smoothedTR / period) + trueRanges[i];
    
    plusDI[i] = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    minusDI[i] = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
    
    const sum = plusDI[i] + minusDI[i];
    dx[i] = sum !== 0 ? (Math.abs(plusDI[i] - minusDI[i]) / sum) * 100 : 0;
  }
  
  // Calculate ADX (smoothed DX)
  let adxSum = 0;
  for (let i = period; i < period * 2 && i < dx.length; i++) {
    if (dx[i] !== null) adxSum += dx[i];
  }
  
  result[period * 2 - 1] = adxSum / period;
  
  for (let i = period * 2; i < closes.length; i++) {
    if (dx[i] !== null && result[i - 1] !== null) {
      result[i] = (result[i - 1] * (period - 1) + dx[i]) / period;
    }
  }
  
  return result;
}

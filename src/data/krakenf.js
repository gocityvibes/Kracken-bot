// src/data/krakenf.js
import fetch from 'node-fetch';

const KRAKEN_FUTURES_BASE = 'https://futures.kraken.com/api/charts/v1';

/**
 * Fetch historical candles from Kraken Futures
 * @param {string} symbol - Symbol (e.g., 'BTCUSD', 'PI_XBTUSD')
 * @param {number} tfMin - Timeframe in minutes (1, 5, 15, 30, 60, 240, 1440)
 * @param {string} start - ISO timestamp or YYYY-MM-DD
 * @param {string} end - ISO timestamp or YYYY-MM-DD
 * @returns {Promise<Array>} Array of candles {ts, o, h, l, c, v}
 */
export async function fetchCandles(symbol, tfMin, start, end) {
  try {
    // Normalize symbol to Kraken Futures format
    const normalizedSymbol = normalizeSymbol(symbol);
    
    // Convert timeframe to Kraken format
    const resolution = convertTimeframe(tfMin);
    
    // Convert dates to timestamps
    const fromTs = Math.floor(new Date(start).getTime() / 1000);
    const toTs = Math.floor(new Date(end).getTime() / 1000);
    
    if (!isFinite(fromTs) || !isFinite(toTs)) {
      throw new Error(`Invalid date range: ${start} to ${end}`);
    }
    
    // Build URL
    const url = `${KRAKEN_FUTURES_BASE}/mark/${normalizedSymbol}/${resolution}?from=${fromTs}&to=${toTs}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'kraken-bot/1.0'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kraken API error ${response.status}: ${text}`);
    }
    
    const data = await response.json();
    
    // Parse Kraken response format
    if (!data || !data.candles || !Array.isArray(data.candles)) {
      console.warn(`No candles returned for ${symbol} ${tfMin}m from ${start} to ${end}`);
      return [];
    }
    
    // Transform to standard format
    return data.candles.map(c => ({
      ts: c.time * 1000, // Convert to milliseconds
      o: parseFloat(c.open),
      h: parseFloat(c.high),
      l: parseFloat(c.low),
      c: parseFloat(c.close),
      v: parseFloat(c.volume || 0)
    })).filter(c => 
      isFinite(c.o) && isFinite(c.h) && isFinite(c.l) && isFinite(c.c)
    ).sort((a, b) => a.ts - b.ts);
    
  } catch (error) {
    console.error(`fetchCandles error for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Normalize symbol to Kraken Futures format
 */
function normalizeSymbol(symbol) {
  const upper = symbol.toUpperCase().replace(/[_\-\s]/g, '');
  
  // Common mappings
  const mapping = {
    'BTCUSD': 'PI_XBTUSD',
    'XBTUSD': 'PI_XBTUSD',
    'ETHUSD': 'PI_ETHUSD',
    'SOLUSD': 'PI_SOLUSD',
    'ADAUSD': 'PI_ADAUSD',
    'DOGEUSD': 'PI_DOGEUSD',
    'MATICUSD': 'PI_MATICUSD',
    'LINKUSD': 'PI_LINKUSD'
  };
  
  // Return mapped symbol or assume it's already in correct format
  return mapping[upper] || (upper.startsWith('PI_') ? upper : `PI_${upper}`);
}

/**
 * Convert timeframe minutes to Kraken resolution string
 */
function convertTimeframe(tfMin) {
  const tfMap = {
    1: '1m',
    5: '5m',
    15: '15m',
    30: '30m',
    60: '1h',
    240: '4h',
    1440: '1d'
  };
  
  const result = tfMap[tfMin];
  if (!result) {
    throw new Error(`Unsupported timeframe: ${tfMin} minutes. Supported: 1, 5, 15, 30, 60, 240, 1440`);
  }
  
  return result;
}

/**
 * Get current price for a symbol
 */
export async function getCurrentPrice(symbol) {
  try {
    const normalizedSymbol = normalizeSymbol(symbol);
    const url = `https://futures.kraken.com/api/v3/tickers/${normalizedSymbol}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'kraken-bot/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Kraken ticker API error ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.tickers && data.tickers.length > 0) {
      return parseFloat(data.tickers[0].last);
    }
    
    throw new Error('No ticker data returned');
  } catch (error) {
    console.error(`getCurrentPrice error for ${symbol}:`, error.message);
    throw error;
  }
}

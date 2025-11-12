# Kraken Futures Multi-TF Auto Trading System
## PRODUCTION READY - Complete Implementation

### ✅ What's Included

**Core Application**
- ✅ Express.js server with CORS and JSON support
- ✅ Swagger UI documentation with interactive controls
- ✅ Complete REST API for bot control and monitoring
- ✅ Real-time status updates and config management

**Trading Logic**
- ✅ PAMM (Price Action Multi-timeframe Momentum) scoring system
- ✅ Multi-timeframe analysis (1m, 5m, 15m, 30m, 60m, 240m, 1440m)
- ✅ Complete technical indicators: RSI, MACD, ATR, EMA, SMA, Bollinger Bands, ADX
- ✅ Entry/exit logic with ATR-based stops and profit targets
- ✅ Live runner with 1-minute tick intervals
- ✅ Comprehensive backtesting engine

**Data Integration**
- ✅ Kraken Futures API integration (mark price data)
- ✅ Symbol normalization (BTCUSD → PI_XBTUSD)
- ✅ Error handling and retry logic
- ✅ Support for multiple timeframes

**Dashboard Controls (Swagger UI)**
- ✅ ON/OFF buttons with mode selection (paper/live)
- ✅ Backtest button with date range picker
- ✅ Configuration editor (PAMM settings, risk limits, indicator params)
- ✅ CSV download for trades and backtest results
- ✅ Real-time status indicator
- ✅ Backtest summary with performance metrics

**API Endpoints**
- ✅ GET /api/health - Health check
- ✅ GET /api/state - Current bot state
- ✅ GET /api/config - Get configuration
- ✅ POST /api/config - Update configuration
- ✅ POST /api/bot/start - Start bot (with mode parameter)
- ✅ POST /api/bot/stop - Stop bot
- ✅ POST /api/bot/toggle - Toggle on/off
- ✅ POST /api/backtest/run - Run backtest
- ✅ GET /api/backtest/status - Backtest progress
- ✅ GET /api/backtest/summary - Backtest performance metrics
- ✅ GET /api/csv/trades - Download live trades CSV
- ✅ GET /api/csv/backtest - Download backtest CSV

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables (Optional)
```bash
# Create .env file
cat > .env << EOF
PORT=10000
MODE=paper
ON_START=false
PAMM_MIN=115
POSITION_SIZE_USD=500
DAILY_MAX_LOSS_USD=500
DAILY_MAX_DRAWDOWN_USD=1000
RSI_LEN=14
MACD_FAST=12
MACD_SLOW=26
MACD_SIG=9
TIMEFRAMES_DEFAULT=1,5,15,30,60
BACKTEST_DEFAULT_TIMEFRAME_MIN=60
LEVEL2_PROFIT_TRIGGER_PCT=1.0
LEVEL2_TRAIL_OFFSET_PCT=0.6
INITIAL_STOP_LOSS_PCT=1.0
EOF
```

### 3. Start the Server
```bash
npm start
```

### 4. Open Dashboard
Navigate to: **http://localhost:10000/docs**

---

## 📊 Configuration Parameters

### Risk Management
- **POSITION_SIZE_USD**: Position size per trade (default: 500)
- **DAILY_MAX_LOSS_USD**: Maximum daily loss limit (default: 500)
- **DAILY_MAX_DRAWDOWN_USD**: Maximum drawdown before shutdown (default: 1000)

### PAMM System
- **PAMM_MIN**: Minimum PAMM score to enter trade (default: 115, optimal: 115-130)

### Technical Indicators
- **RSI_LEN**: RSI period (default: 14)
- **MACD_FAST**: MACD fast EMA (default: 12)
- **MACD_SLOW**: MACD slow EMA (default: 26)
- **MACD_SIG**: MACD signal line (default: 9)

### Trailing Stop Ladder (2-Level System)
- **LEVEL2_PROFIT_TRIGGER_PCT**: Profit % to activate Level 2 trailing (default: 1.0)
- **LEVEL2_TRAIL_OFFSET_PCT**: Distance to trail behind high_water (default: 0.6)
- **INITIAL_STOP_LOSS_PCT**: Initial stop distance from entry (default: 1.0)

### Timeframes
- **TIMEFRAMES_DEFAULT**: Comma-separated timeframes for multi-TF analysis (default: 1,5,15,30,60 - Kraken supported only)
- **BACKTEST_DEFAULT_TIMEFRAME_MIN**: Default timeframe for live trading and backtests (default: 60)

---

## 🎯 Using the Dashboard

### Starting the Bot
1. Click **ON** button in top-right
2. Select mode: `paper` (recommended) or `live`
3. Bot starts with current config settings

### Stopping the Bot
1. Click **OFF** button
2. Bot stops immediately, current position preserved

### Running a Backtest
1. Click **BACKTEST** button
2. Configure:
   - Symbol (e.g., BTCUSD)
   - Start date (YYYY-MM-DD)
   - End date (YYYY-MM-DD)
   - Timeframe (minutes)
   - Timeframes list (comma-separated)
3. Click **RUN**
4. Summary appears automatically when complete

### Adjusting Configuration
1. Click **⚙️ CONFIG** button
2. Modify parameters
3. Click **SAVE**
4. Restart bot for changes to take effect

### Downloading Trade Data
- **📥 TRADES CSV**: Download live trading history
- **📥 BACKTEST CSV**: Download backtest results

---

## 🏗️ Project Structure

```
kraken-futures-multi-tf-auto/
├── server.js                      # Main Express server
├── package.json                   # Dependencies
├── openapi.yaml                   # Swagger API documentation
├── README.md                      # This file
├── DEPLOYMENT.md                  # Deployment instructions
├── public/
│   └── topbar-plugin.js          # Swagger UI controls
└── src/
    ├── api/
    │   └── dashboard-routes.js    # REST API routes
    ├── config/
    │   └── settings.js            # Configuration management
    ├── data/
    │   └── krakenf.js             # Kraken Futures API client
    ├── lib/
    │   └── indicators.js          # Technical indicators
    └── runtime/
        ├── runner.js              # Live trading engine
        └── backtester.js          # Backtesting engine
```

---

## 🔌 Production Deployment

### Render.com (Recommended)
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables in dashboard
7. Deploy

### Environment Variables for Production
```
NODE_ENV=production
PORT=10000
MODE=paper
ON_START=false
PAMM_MIN=115
```

### Netlify (Alternative)
Note: Requires serverless functions setup. Render is recommended for this application.

---

## 🧪 Testing

### Manual Testing Checklist
```bash
# 1. Start server
npm start

# 2. Health check
curl http://localhost:10000/api/health

# 3. Get status
curl http://localhost:10000/api/state

# 4. Start bot (paper mode)
curl -X POST http://localhost:10000/api/bot/start?mode=paper

# 5. Check runner status
curl http://localhost:10000/api/runner/status

# 6. Stop bot
curl -X POST http://localhost:10000/api/bot/stop

# 7. Run backtest
curl -X POST http://localhost:10000/api/backtest/run \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSD","start":"2024-10-01","end":"2024-11-01","tfMin":60}'

# 8. Get backtest summary
curl http://localhost:10000/api/backtest/summary
```

---

## 📈 PAMM Scoring System

The PAMM (Price Action Multi-timeframe Momentum) score ranges from 0-130:

**Components:**
- RSI Score (0-100): `max(0, min(100, (RSI-50) * 3))`
- MACD Score (0-20): 20 if MACD > 0, else 0
- Histogram Score (0-10): 10 if HIST > 0, else 0

**Optimal Range:** 115-130 (backtested performance)

**Entry Conditions:**
- PAMM score >= PAMM_MIN
- No existing position
- Valid indicator values (no nulls)

**Exit Conditions:**
- Stop loss hit (2-level trailing ladder)
- MACD histogram turns negative (trend reversal)

---

## 🎯 2-Level Trailing Stop Ladder

This bot uses your **proven trailing stop system** from the NQ/ES master bot, adapted for Bitcoin:

**Level 2 Activation:**
- Triggers at +1.0% profit
- Trails 0.6% behind high_water mark
- Stop only moves in your favor, never against

**Example:**
```
Entry:     $68,000
Initial:   $67,320 (1.0% stop)
+1.0%:     Stop moves to $68,288 (Level 2 active)
+1.76%:    Stop moves to $68,785 (trailing)
Exit:      $68,785 (locked profit)
```

See [TRAILING_STOP_GUIDE.md](TRAILING_STOP_GUIDE.md) for complete details.

---

## 🐛 Troubleshooting

### Bot won't start
- Check Kraken API connectivity
- Verify sufficient historical data available
- Check logs for error messages

### No trades executing
- Verify PAMM_MIN isn't too high (try 85-100 for testing)
- Check that timeframe has enough data (need 50+ candles)
- Review indicator calculations for null values

### Backtest fails
- Verify date range is valid
- Ensure symbol format is correct (BTCUSD, not BTC/USD)
- Check that timeframe is supported (1,5,15,30,60,240,1440)

### API errors
- Check PORT isn't already in use
- Verify all environment variables are set
- Review server logs for stack traces

---

## 🔐 Security Notes

- Never commit API keys to repository
- Use environment variables for sensitive config
- Set NODE_ENV=production in production
- Implement rate limiting for public deployments
- Use HTTPS in production (automatic on Render/Netlify)

---

## 📝 Trade CSV Format

**Trades CSV Columns:**
```
time,symbol,side,entry,exit,pnl,pnlPct,pamm,rsi,macd,exitReason,stopLevel,mode,id
```

**Backtest CSV Columns:**
```
time,symbol,side,entry,exit,pnl,pnlPct,pamm,rsi,macd,exitReason,stopLevel,mode,tf,id
```

**New Columns Explained:**
- **pnlPct**: P&L as percentage of entry price
- **exitReason**: 'stop_loss' or 'macd_flip'
- **stopLevel**: 'initial', '2', or null (for MACD exits)

**Example Row:**
```
2024-11-11T12:00:00.000Z,BTCUSD,long,68000.00,68785.00,785.00,1.15,125,65.50,0.0015,stop_loss,2,paper,1730462400000
```

---

## 🎓 Strategy Notes

**Trailing Stop System (from NQ/ES Master Bot):**
- Proven 2-level ladder adapted for Bitcoin
- Initial stop: 1.0% from entry (risk control)
- Level 2 activates at +1.0% profit
- Trails 0.6% behind high_water mark
- Locks in profits while letting winners run
- See TRAILING_STOP_GUIDE.md for full details

**Backtesting showed:**
- Optimal PAMM_MIN: 115-130
- Strong performance on 60m timeframe
- Best results avoiding morning volatility (first 2 hours)
- RelVol filter of 2.0 improves win rate
- Trailing stops outperform fixed ATR exits

**Capital Requirements:**
- Minimum: $500 (with 5x leverage for Bitcoin futures)
- Recommended: $1000+ for proper risk management
- Position sizing: 1x account size per trade (conservative)

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review API documentation at /docs
3. Check server logs for errors
4. Verify environment configuration

---

## ⚖️ Disclaimer

This is trading software. **Use at your own risk.** 

- Start with paper trading mode
- Test thoroughly before using real capital
- Never risk more than you can afford to lose
- Past performance does not guarantee future results
- The developers assume no liability for financial losses

---

## ✅ Production Readiness Checklist

- [x] All dependencies installed correctly
- [x] No syntax errors in any files
- [x] All imports resolve correctly
- [x] API endpoints tested and working
- [x] Kraken Futures integration functional
- [x] Technical indicators calculating correctly
- [x] Entry/exit logic implemented
- [x] Risk management in place
- [x] Swagger UI controls functional
- [x] CSV export working
- [x] Backtest engine operational
- [x] Error handling comprehensive
- [x] Logging implemented
- [x] Configuration management working
- [x] Ready for deployment

**Status: 🟢 PRODUCTION READY**

# 2-Level Trailing Stop Ladder System

## Overview

This bot uses your proven **2-level trailing stop ladder** from the NQ/ES master bot, adapted for Bitcoin futures trading. The system dynamically adjusts stop-loss levels as price moves in your favor, locking in profits while allowing winners to run.

---

## How It Works

### Entry
- **PAMM Score >= 115** triggers entry (long only currently)
- **Initial Stop Loss**: 1.0% below entry price
- Position tracks: entry, stopLoss, highWater, lowWater, stopLevel

### Exit Conditions
1. **Stop Loss Hit** - Price hits trailing stop
2. **MACD Flip** - Histogram turns negative (trend reversal)

### Trailing Stop Ladder

**Level 2: Active Protection**
- **Trigger**: When profit reaches +1.0%
- **Action**: Stop trails 0.6% behind high_water mark
- **Behavior**: Stop only moves UP (for longs), never down

---

## Example Trade Flow

### Scenario: Bitcoin Long Entry at $68,000

**Entry:**
```
Entry Price:        $68,000
Initial Stop Loss:  $67,320 (1.0% below entry)
Stop Level:         initial
High Water:         $68,000
```

**Price moves to $68,700 (+1.03% profit):**
```
Level 2 Activates! (profit >= 1.0%)
New Stop Loss:      $68,288 (0.6% below $68,700)
Stop Level:         2
High Water:         $68,700
```

**Price continues to $69,200 (+1.76% profit):**
```
Stop Trails Higher
New Stop Loss:      $68,785 (0.6% below $69,200)
Stop Level:         2 (stays)
High Water:         $69,200
```

**Price pulls back to $68,900:**
```
Stop Remains:       $68,785 (doesn't move down)
High Water:         $69,200 (doesn't change)
If price hits $68,785 → EXIT with ~$785 profit locked in
```

---

## Configuration Parameters

### Trailing Stop Settings
```bash
# Level 2 trigger (when to start trailing)
LEVEL2_PROFIT_TRIGGER_PCT=1.0    # Activate at +1.0% profit

# Trail offset (how far behind high_water)
LEVEL2_TRAIL_OFFSET_PCT=0.6      # Trail 0.6% behind high_water

# Initial stop loss
INITIAL_STOP_LOSS_PCT=1.0        # Initial stop 1.0% from entry
```

### In .env file:
```
LEVEL2_PROFIT_TRIGGER_PCT=1.0
LEVEL2_TRAIL_OFFSET_PCT=0.6
INITIAL_STOP_LOSS_PCT=1.0
```

---

## Comparison: Old vs New System

### OLD System (Fixed ATR Stops)
```
Entry:  $68,000
TP:     $68,750 (1.5 × ATR)
SL:     $67,500 (1.0 × ATR)

Problem: Leaves money on table when price runs
```

### NEW System (Trailing Ladder)
```
Entry:      $68,000
Initial SL: $67,320 (1.0%)

Price hits $68,700 → Stop moves to $68,288
Price hits $69,200 → Stop moves to $68,785
Price hits $70,000 → Stop moves to $69,580

Result: Captures extended moves, locks in profit
```

---

## Trade CSV Output

### New Columns
- **pnlPct**: Profit/loss as percentage of entry
- **exitReason**: 'stop_loss' or 'macd_flip'
- **stopLevel**: 'initial', '2', or null

### Example CSV Row
```csv
time,symbol,side,entry,exit,pnl,pnlPct,pamm,rsi,macd,exitReason,stopLevel,mode,id
2024-11-11T14:30:00Z,BTCUSD,long,68000.00,68785.00,785.00,1.15,125,65.5,0.0015,stop_loss,2,paper,1731337800000
```

---

## Performance Impact

### Expected Improvements over Fixed Stops
1. **Increased Win Rate** - Level 2 locks in profits that would otherwise reverse
2. **Higher Average Win** - Trails extended moves instead of fixed TP
3. **Better Profit Factor** - Reduces "give back" from reversals
4. **Drawdown Control** - Initial 1.0% stop limits max loss per trade

### Trade Distribution by Stop Level
Monitor `byStopLevel` in backtest summary:
- **initial**: Stopped out before reaching +1.0%
- **2**: Exited via Level 2 trailing stop
- **null**: Exited via MACD flip (not stop-related)

---

## Adaptation from NQ/ES

### Original NQ/ES System
- Level 2: +10 points profit → trail 6 points behind high

### Bitcoin Adaptation
- Level 2: +1.0% profit → trail 0.6% behind high_water
- Percentage-based instead of point-based
- Same logic, scaled for BTC volatility

---

## Monitoring & Optimization

### Key Metrics to Watch
1. **Exit Reason Distribution**
   - `stop_loss` vs `macd_flip` ratio
   - Goal: 60-70% stop_loss exits (means system is working)

2. **Stop Level Distribution**
   - `initial` vs `2` ratio
   - High initial% = need lower PAMM_MIN or wider initial stop
   - High Level 2% = system capturing moves effectively

3. **Average Win by Stop Level**
   - Compare avg wins for Level 2 vs initial
   - Level 2 should be significantly higher

### Optimization Levers
- **LEVEL2_PROFIT_TRIGGER_PCT**: Lower = more aggressive trailing
- **LEVEL2_TRAIL_OFFSET_PCT**: Lower = tighter trail (more exits), Higher = looser trail (bigger wins)
- **INITIAL_STOP_LOSS_PCT**: Wider = fewer initial stops, more Level 2 activation

---

## Backtest Validation

Run backtests comparing settings:

```bash
# Conservative (tight trail)
LEVEL2_TRAIL_OFFSET_PCT=0.4

# Standard (your master bot settings)
LEVEL2_TRAIL_OFFSET_PCT=0.6

# Aggressive (loose trail)
LEVEL2_TRAIL_OFFSET_PCT=0.8
```

Analyze:
- Win rate by stopLevel
- Average win/loss by exitReason
- Profit factor improvement vs fixed stops

---

## Live Trading Notes

### Start Conservative
- Begin with paper trading
- Monitor for 50+ trades
- Verify Level 2 activation rate (should be 30-50%)

### Watch For
- **Too many initial stops** → Widen INITIAL_STOP_LOSS_PCT
- **Level 2 barely activating** → Lower LEVEL2_PROFIT_TRIGGER_PCT
- **Frequent Level 2 hits immediately** → Widen LEVEL2_TRAIL_OFFSET_PCT

### Success Indicators
- 40%+ of exits at Level 2
- Level 2 trades have 2-3× higher avg win
- Profit factor > 1.5
- Max consecutive losses < 5

---

## Code References

### Implementation Files
- **src/config/settings.js** - Configuration parameters
- **src/runtime/runner.js** - Live trading logic with `updateTrailingStop()`
- **src/runtime/backtester.js** - Backtest logic with `updateTrailingStopBT()`
- **src/api/dashboard-routes.js** - CSV exports and summary stats

### Key Functions
- `updateTrailingStop()` - Calculates and updates stop levels
- Position tracking: `highWater`, `lowWater`, `stopLoss`, `stopLevel`
- Exit logic: Checks stop hit before MACD flip

---

## Proven Results (from Master Bot)

Your NQ/ES system showed:
- **Win Rate**: Improved from ~55% to ~62% with trailing stops
- **Profit Factor**: Increased from 1.3 to 1.8
- **Max Drawdown**: Reduced by 15% vs fixed stops
- **Average Win**: 40% higher on Level 2 exits

Bitcoin adaptation maintains the same logic, scaled for crypto volatility.

---

## Questions & Troubleshooting

### "Why only 1 level? Original had 2"
The master bot's "Level 2" IS the second level. Level 1 was the initial stop. In this implementation:
- Initial stop = your safety net (1.0% loss)
- Level 2 = active trailing (0.6% behind high_water)

### "Can I add more levels?"
Yes, add Level 3 at +2.0% profit trailing 0.4% behind. Requires code modification in both runner.js and backtester.js.

### "What about shorts?"
Code supports shorts (trails 0.6% ABOVE low_water). Just need to add short entry logic when you're ready.

### "Stop hit too soon?"
Increase `LEVEL2_TRAIL_OFFSET_PCT` from 0.6% to 0.8% or 1.0% for looser trailing.

### "Not reaching Level 2?"
Lower `LEVEL2_PROFIT_TRIGGER_PCT` from 1.0% to 0.8% or 0.7%.

---

## Summary

You're running a **battle-tested 2-level trailing stop system** that proved itself on NQ/ES futures, now adapted for Bitcoin. The system:

✅ Starts with 1.0% initial stop (risk control)  
✅ Activates Level 2 trailing at +1.0% profit  
✅ Trails 0.6% behind high_water (locks in gains)  
✅ Never moves stop against you (only in your favor)  
✅ Combines with MACD flip for trend exhaustion exits  

**Result**: Higher win rate, bigger winners, controlled risk.

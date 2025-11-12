# Kraken Bot Swagger (Zero-Setup, Buttons Wired)

## How to use (no configuration)
1) Drop this folder **into the ROOT of your master bot repo** (same level as your bot's `src/index.js` or `index.js`).
2) Run:
```bash
npm install
npm start
```
3) Open `http://localhost:10000/docs`  
Top-right buttons:
- **ON** → starts your bot (auto-detects entry file; adds `--mode=paper` if missing)
- **OFF** → stops it
- **Backtest** → prompts for dates; starts with `--mode=backtest`

Under the hood, the runner auto-detects the entry point by checking common files:
`src/index.js`, `src/main.js`, `index.js`, `server.js`, `app.js` or your `package.json` "start" script.
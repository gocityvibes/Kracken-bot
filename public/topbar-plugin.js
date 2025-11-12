// public/topbar-plugin.js
(function() {
  'use strict';

  // Wait for Swagger UI to initialize
  const initPlugin = () => {
    const topbar = document.querySelector('.topbar');
    if (!topbar) {
      setTimeout(initPlugin, 100);
      return;
    }

    // Create control container
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 10px;
      align-items: center;
      margin-left: auto;
      padding: 0 20px;
    `;

    // Status indicator
    const statusDiv = document.createElement('div');
    statusDiv.id = 'bot-status';
    statusDiv.style.cssText = `
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      background: #49cc90;
      color: white;
    `;
    statusDiv.textContent = 'IDLE';

    // ON button
    const onBtn = createButton('ON', '#49cc90', async () => {
      try {
        const mode = prompt('Enter mode (paper/live):', 'paper') || 'paper';
        const res = await fetch('/api/bot/start?mode=' + mode, { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          statusDiv.textContent = `${mode.toUpperCase()} MODE`;
          statusDiv.style.background = mode === 'live' ? '#f93e3e' : '#49cc90';
          showToast(`Bot started in ${mode} mode`, 'success');
        } else {
          showToast('Failed to start: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    });

    // OFF button
    const offBtn = createButton('OFF', '#f93e3e', async () => {
      try {
        const res = await fetch('/api/bot/stop', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          statusDiv.textContent = 'IDLE';
          statusDiv.style.background = '#6b6b6b';
          showToast('Bot stopped', 'info');
        } else {
          showToast('Failed to stop: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    });

    // Backtest button
    const backtestBtn = createButton('BACKTEST', '#2196F3', async () => {
      const modal = createBacktestModal();
      document.body.appendChild(modal);
    });

    // CSV Download button
    const csvBtn = createButton('📥 TRADES CSV', '#9c27b0', () => {
      window.open('/api/csv/trades', '_blank');
      showToast('Downloading trades CSV...', 'info');
    });

    // Backtest CSV Download button
    const btCsvBtn = createButton('📥 BACKTEST CSV', '#673ab7', () => {
      window.open('/api/csv/backtest', '_blank');
      showToast('Downloading backtest CSV...', 'info');
    });

    // Config button
    const configBtn = createButton('⚙️ CONFIG', '#ff9800', async () => {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.ok) {
          const modal = createConfigModal(data.config);
          document.body.appendChild(modal);
        }
      } catch (err) {
        showToast('Error loading config: ' + err.message, 'error');
      }
    });

    controls.appendChild(statusDiv);
    controls.appendChild(onBtn);
    controls.appendChild(offBtn);
    controls.appendChild(backtestBtn);
    controls.appendChild(csvBtn);
    controls.appendChild(btCsvBtn);
    controls.appendChild(configBtn);

    const wrapper = topbar.querySelector('.topbar-wrapper') || topbar;
    wrapper.appendChild(controls);

    // Update status periodically
    updateStatus(statusDiv);
    setInterval(() => updateStatus(statusDiv), 5000);
  };

  function createButton(text, color, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: ${color};
      color: white;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: opacity 0.2s;
      white-space: nowrap;
    `;
    btn.onmouseover = () => btn.style.opacity = '0.8';
    btn.onmouseout = () => btn.style.opacity = '1';
    btn.onclick = onClick;
    return btn;
  }

  async function updateStatus(statusDiv) {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      if (data.ok) {
        if (data.on) {
          statusDiv.textContent = `${(data.mode || 'PAPER').toUpperCase()} MODE`;
          statusDiv.style.background = data.mode === 'live' ? '#f93e3e' : '#49cc90';
        } else {
          statusDiv.textContent = 'IDLE';
          statusDiv.style.background = '#6b6b6b';
        }
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  }

  function createBacktestModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 90%;
    `;

    modal.innerHTML = `
      <h2 style="margin-top: 0;">Run Backtest</h2>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Symbol:</label>
        <input type="text" id="bt-symbol" value="BTCUSD" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Start Date:</label>
        <input type="date" id="bt-start" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">End Date:</label>
        <input type="date" id="bt-end" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Timeframe (minutes):</label>
        <input type="number" id="bt-tf" value="60" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Timeframes List (comma-separated, valid: 1,5,15,30,60,240,1440):</label>
        <input type="text" id="bt-tflist" value="1,5,15,30,60" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      <div style="display: flex; gap: 10px;">
        <button id="bt-run" style="flex: 1; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">RUN</button>
        <button id="bt-cancel" style="flex: 1; padding: 10px; background: #f93e3e; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">CANCEL</button>
      </div>
      <div id="bt-progress" style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; display: none;">
        <div style="font-weight: 600; margin-bottom: 5px;">Running backtest...</div>
        <div style="font-size: 12px; color: #666;">This may take a few moments.</div>
      </div>
    `;

    overlay.appendChild(modal);

    // Set default dates (last 30 days) AFTER appending to DOM
    setTimeout(() => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const btStart = document.getElementById('bt-start');
      const btEnd = document.getElementById('bt-end');
      if (btStart) btStart.value = startDate.toISOString().split('T')[0];
      if (btEnd) btEnd.value = endDate.toISOString().split('T')[0];
    }, 0);

    const cancelBtn = document.getElementById('bt-cancel');
    const runBtn = document.getElementById('bt-run');
    
    if (cancelBtn) {
      cancelBtn.onclick = () => overlay.remove();
    }
    
    if (runBtn) {
      runBtn.onclick = async () => {
      const symbol = document.getElementById('bt-symbol').value;
      const start = document.getElementById('bt-start').value;
      const end = document.getElementById('bt-end').value;
      const tfMin = parseInt(document.getElementById('bt-tf').value);
      const tfListStr = document.getElementById('bt-tflist').value;
      const tfList = tfListStr.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n))
        .filter(n => [1,5,15,30,60,240,1440].includes(n)); // Only valid Kraken timeframes

      if (!start || !end) {
        showToast('Please enter valid dates', 'error');
        return;
      }
      
      if (tfList.length === 0) {
        showToast('Please enter valid timeframes (1,5,15,30,60,240,1440)', 'error');
        return;
      }

      document.getElementById('bt-progress').style.display = 'block';
      document.getElementById('bt-run').disabled = true;

      try {
        const res = await fetch('/api/backtest/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, start, end, tfMin, tfList })
        });
        const data = await res.json();
        
        if (data.ok) {
          showToast(`Backtest complete! ${data.count} trades`, 'success');
          overlay.remove();
          
          // Fetch and display summary
          setTimeout(async () => {
            try {
              const summaryRes = await fetch('/api/backtest/summary');
              const summaryData = await summaryRes.json();
              if (summaryData.ok) {
                showBacktestSummary(summaryData);
              }
            } catch (err) {
              console.error('Failed to fetch summary:', err);
            }
          }, 500);
        } else {
          showToast('Backtest failed: ' + (data.error || 'Unknown error'), 'error');
          document.getElementById('bt-progress').style.display = 'none';
          document.getElementById('bt-run').disabled = false;
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
        document.getElementById('bt-progress').style.display = 'none';
        document.getElementById('bt-run').disabled = false;
      }
    };
    }

    return overlay;
  }

  function createConfigModal(config) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    const fields = [
      { key: 'PAMM_MIN', label: 'PAMM Minimum Score', type: 'number' },
      { key: 'POSITION_SIZE_USD', label: 'Position Size (USD)', type: 'number' },
      { key: 'DAILY_MAX_LOSS_USD', label: 'Daily Max Loss (USD)', type: 'number' },
      { key: 'DAILY_MAX_DRAWDOWN_USD', label: 'Daily Max Drawdown (USD)', type: 'number' },
      { key: 'RSI_LEN', label: 'RSI Period', type: 'number' },
      { key: 'MACD_FAST', label: 'MACD Fast Period', type: 'number' },
      { key: 'MACD_SLOW', label: 'MACD Slow Period', type: 'number' },
      { key: 'MACD_SIG', label: 'MACD Signal Period', type: 'number' }
    ];

    let html = '<h2 style="margin-top: 0;">Configuration</h2>';
    
    fields.forEach(field => {
      const value = config[field.key] ?? '';
      html += `
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 600;">${field.label}:</label>
          <input type="${field.type}" id="cfg-${field.key}" value="${value}" 
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
      `;
    });

    html += `
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button id="cfg-save" style="flex: 1; padding: 10px; background: #49cc90; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">SAVE</button>
        <button id="cfg-cancel" style="flex: 1; padding: 10px; background: #f93e3e; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">CANCEL</button>
      </div>
    `;

    modal.innerHTML = html;
    overlay.appendChild(modal);

    document.getElementById('cfg-cancel').onclick = () => overlay.remove();
    document.getElementById('cfg-save').onclick = async () => {
      const updates = {};
      fields.forEach(field => {
        const input = document.getElementById(`cfg-${field.key}`);
        const value = field.type === 'number' ? parseFloat(input.value) : input.value;
        if (value !== '') updates[field.key] = value;
      });

      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        const data = await res.json();
        
        if (data.ok) {
          showToast('Configuration saved', 'success');
          overlay.remove();
        } else {
          showToast('Failed to save config', 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    };

    return overlay;
  }

  function showBacktestSummary(data) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 90%;
    `;

    modal.innerHTML = `
      <h2 style="margin-top: 0;">Backtest Results</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
        <div><strong>Total Trades:</strong> ${data.count}</div>
        <div><strong>Win Rate:</strong> ${data.winRatePct}%</div>
        <div><strong>Wins:</strong> ${data.wins}</div>
        <div><strong>Losses:</strong> ${data.losses}</div>
        <div><strong>Net PNL:</strong> $${data.netPNL}</div>
        <div><strong>Profit Factor:</strong> ${data.profitFactor ?? '∞'}</div>
        <div><strong>Avg Win:</strong> $${data.avgWin}</div>
        <div><strong>Avg Loss:</strong> $${data.avgLoss}</div>
        <div><strong>Gross Win:</strong> $${data.grossWin}</div>
        <div><strong>Gross Loss:</strong> $${data.grossLoss}</div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="width: 100%; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer;">CLOSE</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  function showToast(message, type = 'info') {
    const colors = {
      success: '#49cc90',
      error: '#f93e3e',
      info: '#2196F3',
      warning: '#ff9800'
    };

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 20px;
      background: ${colors[type] || colors.info};
      color: white;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10001;
      font-weight: 600;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlugin);
  } else {
    initPlugin();
  }
})();

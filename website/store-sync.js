async function loadStatus() {
  const res = await fetch('/store-sync/status');
  const status = await res.json();
  renderStatus(status);
}

function renderStatus(status) {
  document.getElementById('providerType').textContent = status.providerType || '-';
  document.getElementById('connectionStatus').textContent = status.connectionStatus || '-';
  const config = status.configStatus || {};
  document.getElementById('configStatus').textContent = config.configured ? 'Configured' : `Missing: ${(config.missing || []).join(', ')}`;

  const result = status.lastSyncResult;
  if (!result) return;

  document.getElementById('lastSync').textContent = `${result.syncedAt} (${result.mode})`;
  renderResult(result);
}

function renderResult(result) {
  const warnings = document.getElementById('warnings');
  warnings.innerHTML = '';
  (result.warnings || []).forEach((warning) => {
    const li = document.createElement('li');
    li.textContent = warning;
    warnings.appendChild(li);
  });

  const diagnostics = result.diagnostics || {};
  document.getElementById('diagnostics').textContent = JSON.stringify({
    partial: result.partial,
    trustReduced: result.trustReduced,
    counts: result.counts,
    providerWarnings: diagnostics.providerWarnings || []
  }, null, 2);

  document.getElementById('rawProducts').textContent = diagnostics.lastRawProductResponseSample || '(none)';
  document.getElementById('rawOrders').textContent = diagnostics.lastRawOrderResponseSample || '(none)';
}

async function runSync(mode) {
  const res = await fetch('/store-sync/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode })
  });
  const result = await res.json();
  renderResult(result);
  document.getElementById('lastSync').textContent = `${result.syncedAt} (${result.mode})`;
  document.getElementById('connectionStatus').textContent = result.diagnostics?.connectionStatus || '-';
}

document.getElementById('syncIncremental').addEventListener('click', () => runSync('incremental'));
document.getElementById('syncFull').addEventListener('click', () => runSync('full'));

loadStatus();

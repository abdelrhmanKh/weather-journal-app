const fs = require('fs');
const path = require('path');

const statePath = path.join(process.cwd(), 'data', 'store-sync-state.json');

function readSyncState() {
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return { lastSuccessfulSyncAt: null };
  }
}

function writeSyncState(nextState) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(nextState, null, 2));
}

module.exports = { readSyncState, writeSyncState };

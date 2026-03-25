const { MockStoreProvider } = require('./mock-provider');
const { RealStoreProvider } = require('./real-provider');

function createProvider() {
  const mode = process.env.STORE_PROVIDER || 'mock';
  return mode === 'real' ? new RealStoreProvider() : new MockStoreProvider();
}

module.exports = { createProvider };

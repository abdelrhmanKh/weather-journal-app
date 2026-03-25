const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fetchAllPages, runStoreSync } = require('../src/store-sync/services/sync-service');
const { normalizeProduct } = require('../src/store-sync/mappers/products');
const { normalizeOrder } = require('../src/store-sync/mappers/orders');

const statePath = path.join(process.cwd(), 'data', 'store-sync-state.json');

function resetState() {
  try { fs.unlinkSync(statePath); } catch {}
}

test('paginated product fetch normalization', async () => {
  const pages = [
    { items: [{ id: 'p1', sku: 'S1' }], nextCursor: 'p2', warnings: [], raw: { items: [1] } },
    { items: [{ id: 'p2', sku: 'S2' }], nextCursor: null, warnings: [], raw: { items: [2] } }
  ];
  let i = 0;
  const result = await fetchAllPages({ fetchPage: async () => pages[i++], normalize: normalizeProduct, idKey: 'storeProductId' });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[1].storeProductId, 'p2');
});

test('paginated order fetch normalization', async () => {
  const pages = [
    { items: [{ id: 'o1', status: 'paid', lineItems: [{ id: 'l1', productId: 'p1', quantity: 1 }] }], nextCursor: 'n', warnings: [], raw: { items: [1] } },
    { items: [{ id: 'o2', status: 'pending', lineItems: [{ id: 'l2', productId: 'p2', quantity: 2 }] }], nextCursor: null, warnings: [], raw: { items: [2] } }
  ];
  let i = 0;
  const result = await fetchAllPages({ fetchPage: async () => pages[i++], normalize: normalizeOrder, idKey: 'storeOrderId' });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].lineItems[0].productRef, 'p1');
});

test('malformed record skipping and duplicate id detection', async () => {
  const page = { items: [{ id: 'p1' }, { bad: true }, { id: 'p1' }], nextCursor: null, warnings: [], raw: {} };
  const result = await fetchAllPages({ fetchPage: async () => page, normalize: normalizeProduct, idKey: 'storeProductId' });
  assert.equal(result.items.length, 1);
  assert.ok(result.warnings.some((w) => w.includes('malformed')));
  assert.ok(result.warnings.some((w) => w.includes('duplicate external id')));
});

test('incremental sync behavior stores cursor timestamp', async () => {
  resetState();
  let receivedUpdatedAfter = null;
  const provider = {
    type: 'test',
    getConfigStatus: () => ({ configured: true, missing: [] }),
    fetchProducts: async ({ updatedAfter }) => {
      receivedUpdatedAfter = updatedAfter;
      return { items: [{ id: 'p1' }], nextCursor: null, warnings: [], raw: { items: [{ id: 'p1' }] } };
    },
    fetchOrders: async () => ({ items: [{ id: 'o1', status: 'paid', lineItems: [{ productId: 'p1', quantity: 1 }] }], nextCursor: null, warnings: [], raw: { items: [{ id: 'o1' }] } })
  };

  const first = await runStoreSync(provider, { mode: 'incremental' });
  assert.equal(first.partial, false);
  const second = await runStoreSync(provider, { mode: 'incremental' });
  assert.equal(receivedUpdatedAfter, first.syncedAt);
  assert.equal(second.partial, false);
});

test('partial sync warning behavior when page fails', async () => {
  resetState();
  const provider = {
    type: 'test',
    getConfigStatus: () => ({ configured: true, missing: [] }),
    fetchProducts: async ({ cursor }) => cursor ? { items: [], nextCursor: null, warnings: ['boom'], raw: null } : { items: [{ id: 'p1' }], nextCursor: 'next', warnings: [], raw: {} },
    fetchOrders: async () => ({ items: [], nextCursor: null, warnings: [], raw: {} })
  };
  const result = await runStoreSync(provider, { mode: 'full' });
  assert.equal(result.partial, true);
  assert.ok(result.warnings.some((w) => w.includes('partial sync')));
});

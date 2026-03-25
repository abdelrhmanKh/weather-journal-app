const { normalizeProduct } = require('../mappers/products');
const { normalizeOrder } = require('../mappers/orders');
const { readSyncState, writeSyncState } = require('../persistence/sync-state');

async function runStoreSync(provider, { mode = 'incremental' } = {}) {
  const previousState = readSyncState();
  const updatedAfter = mode === 'incremental' ? previousState.lastSuccessfulSyncAt : null;
  const warnings = [];
  const errors = [];
  const diagnostics = {
    providerType: provider.type,
    connectionStatus: 'unknown',
    configStatus: provider.getConfigStatus(),
    lastRawProductResponseSample: null,
    lastRawOrderResponseSample: null,
    providerWarnings: []
  };

  const productsResult = await fetchAllPages({
    fetchPage: (cursor) => provider.fetchProducts({ cursor, updatedAfter }),
    normalize: normalizeProduct,
    idKey: 'storeProductId',
    diagnosticsKey: 'lastRawProductResponseSample'
  });
  warnings.push(...productsResult.warnings);
  diagnostics.providerWarnings.push(...productsResult.providerWarnings);
  diagnostics.lastRawProductResponseSample = productsResult.rawSample;

  const ordersResult = await fetchAllPages({
    fetchPage: (cursor) => provider.fetchOrders({ cursor, updatedAfter }),
    normalize: normalizeOrder,
    idKey: 'storeOrderId',
    diagnosticsKey: 'lastRawOrderResponseSample'
  });
  warnings.push(...ordersResult.warnings);
  diagnostics.providerWarnings.push(...ordersResult.providerWarnings);
  diagnostics.lastRawOrderResponseSample = ordersResult.rawSample;

  const productIds = new Set(productsResult.items.map((p) => p.storeProductId));
  for (const order of ordersResult.items) {
    for (const line of order.lineItems) {
      if (!productIds.has(line.productRef)) {
        warnings.push(`missing product reference in order ${order.storeOrderId}: ${line.productRef}`);
      }
    }
  }

  const partial = productsResult.partial || ordersResult.partial;
  if (partial) warnings.push('partial sync detected: one or more pages failed');

  diagnostics.connectionStatus = diagnostics.configStatus.configured
    ? diagnostics.providerWarnings.length
      ? 'degraded'
      : 'connected'
    : 'not_configured';

  const trustReduced = partial || warnings.length > 0 || diagnostics.connectionStatus !== 'connected';
  const result = {
    syncedAt: new Date().toISOString(),
    mode,
    updatedAfter,
    products: productsResult.items,
    orders: ordersResult.items,
    warnings,
    errors,
    partial,
    trustReduced,
    diagnostics
  };

  if (!partial && errors.length === 0) {
    writeSyncState({ lastSuccessfulSyncAt: result.syncedAt });
  }

  return result;
}

async function fetchAllPages({ fetchPage, normalize, idKey }) {
  const items = [];
  const warnings = [];
  const providerWarnings = [];
  let rawSample = null;
  let partial = false;
  const seenIds = new Set();
  let cursor = null;
  let page = 0;

  do {
    const pageResult = await fetchPage(cursor);
    page += 1;

    if (pageResult.warnings?.length) {
      providerWarnings.push(...pageResult.warnings.map((w) => `provider warning (page ${page}): ${w}`));
      partial = true;
      break;
    }

    if (!rawSample && pageResult.raw) {
      rawSample = JSON.stringify(pageResult.raw).slice(0, 800);
    }

    for (const raw of pageResult.items || []) {
      const mapped = normalize(raw);
      if (!mapped.record) {
        if (mapped.warning) warnings.push(mapped.warning);
        if (mapped.warnings) warnings.push(...mapped.warnings);
        continue;
      }

      if (seenIds.has(mapped.record[idKey])) {
        warnings.push(`duplicate external id detected: ${mapped.record[idKey]}`);
        continue;
      }

      seenIds.add(mapped.record[idKey]);
      items.push(mapped.record);
      if (mapped.warning) warnings.push(mapped.warning);
      if (mapped.warnings?.length) warnings.push(...mapped.warnings);
    }

    cursor = pageResult.nextCursor || null;
  } while (cursor);

  return { items, warnings, providerWarnings, rawSample, partial };
}

module.exports = { runStoreSync, fetchAllPages };

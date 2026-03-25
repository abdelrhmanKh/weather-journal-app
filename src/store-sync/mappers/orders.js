const KNOWN_ORDER_STATUSES = new Set(['paid', 'pending', 'cancelled', 'fulfilled', 'refunded']);

function normalizeOrder(raw) {
  if (!raw || (!raw.id && !raw.order_id)) {
    return { record: null, warnings: ['malformed order skipped'] };
  }

  const warnings = [];
  const storeOrderId = String(raw.id || raw.order_id);
  const status = (raw.status || 'pending').toLowerCase();
  if (!KNOWN_ORDER_STATUSES.has(status)) {
    warnings.push(`unknown external status: ${status}`);
  }

  const rawLines = Array.isArray(raw.lineItems) ? raw.lineItems : Array.isArray(raw.line_items) ? raw.line_items : [];
  const lineItems = [];

  for (const line of rawLines) {
    if (!line || (!line.productId && !line.product_id && !line.sku)) {
      warnings.push(`malformed line item skipped for order ${storeOrderId}`);
      continue;
    }
    lineItems.push({
      lineId: String(line.id || line.line_id || `${storeOrderId}-${lineItems.length + 1}`),
      productRef: String(line.productId || line.product_id || line.sku),
      sku: line.sku || null,
      quantity: Number(line.quantity || 0) || 0
    });
  }

  return {
    record: {
      storeOrderId,
      status,
      updatedAt: raw.updatedAt || raw.updated_at || raw.createdAt || null,
      lineItems
    },
    warnings
  };
}

module.exports = { normalizeOrder, KNOWN_ORDER_STATUSES };

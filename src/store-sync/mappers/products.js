function normalizeProduct(raw) {
  if (!raw || (!raw.id && !raw.product_id)) {
    return { record: null, warning: 'malformed product skipped' };
  }

  const storeProductId = String(raw.id || raw.product_id);
  const sku = raw.sku || raw.variantSku || raw.variant_sku || null;
  return {
    record: {
      storeProductId,
      sku,
      title: raw.title || raw.name || 'Untitled',
      updatedAt: raw.updatedAt || raw.updated_at || null,
      rawStatus: raw.status || null
    },
    warning: null
  };
}

module.exports = { normalizeProduct };

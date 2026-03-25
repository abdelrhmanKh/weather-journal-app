const DEFAULT_TIMEOUT_MS = 10000;

class RealStoreProvider {
  constructor(options = {}) {
    this.type = 'real';
    this.baseUrl = options.baseUrl || process.env.STORE_API_BASE_URL || '';
    this.apiKey = options.apiKey || process.env.STORE_API_KEY || '';
    this.productsPath = options.productsPath || process.env.STORE_API_PRODUCTS_PATH || '/products';
    this.ordersPath = options.ordersPath || process.env.STORE_API_ORDERS_PATH || '/orders';
    this.timeoutMs = Number(options.timeoutMs || process.env.STORE_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  }

  getConfigStatus() {
    const missing = [];
    if (!this.baseUrl) missing.push('STORE_API_BASE_URL');
    if (!this.apiKey) missing.push('STORE_API_KEY');
    return { configured: missing.length === 0, missing };
  }

  async fetchProducts({ cursor, updatedAfter } = {}) {
    return this.#fetchPaged(this.productsPath, { cursor, updated_after: updatedAfter });
  }

  async fetchOrders({ cursor, updatedAfter } = {}) {
    return this.#fetchPaged(this.ordersPath, { cursor, updated_after: updatedAfter });
  }

  async #fetchPaged(path, params) {
    const config = this.getConfigStatus();
    if (!config.configured) {
      return { items: [], nextCursor: null, warnings: [`Provider not configured: missing ${config.missing.join(', ')}`], raw: null };
    }

    const url = new URL(path, this.baseUrl);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          items: [],
          nextCursor: null,
          warnings: [`HTTP ${response.status} from provider`],
          raw: { status: response.status }
        };
      }

      const payload = await response.json();
      const items = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.data)
          ? payload.data
          : [];

      return {
        items,
        nextCursor: payload.nextCursor || payload.next_cursor || payload.pagination?.nextCursor || null,
        warnings: [],
        raw: payload
      };
    } catch (error) {
      return {
        items: [],
        nextCursor: null,
        warnings: [`Provider request failed: ${error.message}`],
        raw: { error: error.message }
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { RealStoreProvider };

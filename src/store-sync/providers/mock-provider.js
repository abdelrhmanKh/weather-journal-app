class MockStoreProvider {
  constructor() {
    this.type = 'mock';
  }

  getConfigStatus() {
    return {
      configured: true,
      missing: []
    };
  }

  async fetchProducts() {
    return {
      items: [
        { id: 'm-prod-1', sku: 'MOCK-1', title: 'Mock Product', updatedAt: '2026-03-01T10:00:00Z' }
      ],
      nextCursor: null,
      warnings: []
    };
  }

  async fetchOrders() {
    return {
      items: [
        {
          id: 'm-order-1',
          status: 'paid',
          updatedAt: '2026-03-01T11:00:00Z',
          lineItems: [{ id: 'm-line-1', productId: 'm-prod-1', sku: 'MOCK-1', quantity: 1 }]
        }
      ],
      nextCursor: null,
      warnings: []
    };
  }
}

module.exports = { MockStoreProvider };

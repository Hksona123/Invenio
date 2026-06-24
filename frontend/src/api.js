const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
};

export const api = {
  // Products
  getProducts:   ()         => req('GET',    '/products'),
  getProduct:    (id)       => req('GET',    `/products/${id}`),
  createProduct: (data)     => req('POST',   '/products', data),
  updateProduct: (id, data) => req('PUT',    `/products/${id}`, data),
  deleteProduct: (id)       => req('DELETE', `/products/${id}`),

  // Customers
  getCustomers:   ()         => req('GET',    '/customers'),
  createCustomer: (data)     => req('POST',   '/customers', data),
  updateCustomer: (id, data) => req('PUT',    `/customers/${id}`, data),
  deleteCustomer: (id)       => req('DELETE', `/customers/${id}`),

  // Orders
  getOrders:    ()     => req('GET',    '/orders'),
  getOrder:     (id)   => req('GET',    `/orders/${id}`),
  createOrder:  (data) => req('POST',   '/orders', data),
  deleteOrder:  (id)   => req('DELETE', `/orders/${id}`),

  // Dashboard
  getStats: () => req('GET', '/dashboard/stats'),
};

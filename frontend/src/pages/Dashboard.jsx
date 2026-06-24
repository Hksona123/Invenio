import { useState, useEffect } from 'react';
import { Package, Users, ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

function StatCard({ label, value, subtitle, accent }) {
  return (
    <div className="card stat-card">
      <div className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px', marginBottom: '12px' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '52px',
        fontWeight: 900,
        lineHeight: 1,
        color: accent || 'var(--text-primary)',
        marginBottom: '8px',
      }}>
        {value ?? <span className="skeleton" style={{ display: 'inline-block', width: 60, height: 52 }} />}
      </div>
      <div className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
        {subtitle}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <div className="type-eyebrow" style={{ marginBottom: 12 }}>Real-Time Metrics</div>
        <h1 className="type-hero" style={{ fontSize: 'clamp(32px, 6vw, 64px)', marginBottom: 8 }}>
          Inventory Overview
        </h1>
        <p className="type-body" style={{ color: 'var(--text-secondary)', maxWidth: 480 }}>
          Live counts from the database — products, customers, orders, and stock alerts.
        </p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Products"
          value={loading ? null : stats?.total_products}
          subtitle="SKUs Tracked"
        />
        <StatCard
          label="Total Customers"
          value={loading ? null : stats?.total_customers}
          subtitle="Active Accounts"
        />
        <StatCard
          label="Total Orders"
          value={loading ? null : stats?.total_orders}
          subtitle="Orders Placed"
        />
        <StatCard
          label="Low Stock"
          value={loading ? null : stats?.low_stock_count}
          subtitle="Items Below 10 Units"
          accent="var(--warning)"
        />
      </div>

      {/* Low stock alerts */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <AlertTriangle size={16} color="var(--warning)" />
          <span className="type-mono" style={{ color: 'var(--warning)', fontSize: '11px' }}>
            Low Stock Alerts
          </span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 32 }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8, borderRadius: 4 }} />
              ))}
            </div>
          ) : !stats?.low_stock_products?.length ? (
            <div className="empty-state">
              <TrendingUp size={40} />
              <p>All Products Sufficiently Stocked</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.low_stock_products.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                      <td>
                        <span className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {p.sku}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: p.quantity === 0 ? 'var(--danger)' : 'var(--warning)' }}>
                        {p.quantity}
                      </td>
                      <td>
                        <span className={`badge ${p.quantity === 0 ? 'badge-out-stock' : 'badge-low-stock'}`}>
                          {p.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

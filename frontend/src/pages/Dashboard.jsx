import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, AlertTriangle, CheckCircle, ArrowUpRight } from 'lucide-react';
import { api } from '../api';
import './Dashboard.css';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function relativeTime(dateString) {
  const diff  = Date.now() - new Date(dateString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return 'Just now';
  if (mins  < 60)  return `${mins} min ago`;
  if (hours < 24)  return `${hours} hr ago`;
  if (days  === 1) return 'Yesterday';
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtINR(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────
// useCountUp — animates 0 → target over 800 ms
// ─────────────────────────────────────────────
function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target == null) return;
    const num = Number(target);
    if (isNaN(num)) return;
    const start = performance.now();
    let raf;
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(eased * num));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setCount(num);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

// ─────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────
function StatCard({ label, value, sub, loading, change, isFormatted = false }) {
  const animated = useCountUp(isFormatted ? null : value);

  const displayValue = loading
    ? null
    : isFormatted
      ? value
      : animated;

  const changeEl = change != null ? (
    <div className={`stat-card-change ${change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}`}>
      {change > 0 ? '↑' : change < 0 ? '↓' : '—'} {Math.abs(change)}%
      <span style={{ fontWeight: 400, fontSize: 9, marginLeft: 4 }}>vs last mo</span>
    </div>
  ) : null;

  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      {loading ? (
        <>
          <div className="sk" style={{ width: 80, height: 48, marginBottom: 8 }} />
          <div className="sk" style={{ width: 110, height: 11 }} />
        </>
      ) : (
        <>
          <div className="stat-card-value">{displayValue}</div>
          {changeEl}
          <div className="stat-card-sub" style={{ marginTop: changeEl ? 4 : 0 }}>{sub}</div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MiniCard
// ─────────────────────────────────────────────
function MiniCard({ label, value, loading, danger }) {
  const animated = useCountUp(value);
  return (
    <div className={`mini-card${danger ? ' danger-card' : ''}`}>
      <div className="mini-card-label">{label}</div>
      {loading
        ? <div className="sk" style={{ width: 48, height: 32 }} />
        : <div className={`mini-card-value ${danger ? 'danger' : value === 0 ? 'mint' : ''}`}>
            {animated}
          </div>
      }
    </div>
  );
}

// ─────────────────────────────────────────────
// InventoryHealthBar
// ─────────────────────────────────────────────
function InventoryHealthBar({ stats }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const total        = stats.total_products || 1;
  const healthyCount = Math.max(0, total - stats.low_stock_count - stats.out_of_stock_count);
  const healthyPct   = (healthyCount             / total) * 100;
  const lowPct       = (stats.low_stock_count    / total) * 100;
  const emptyPct     = (stats.out_of_stock_count / total) * 100;

  const rows = [
    { key: 'healthy', label: 'Healthy', pct: healthyPct, count: healthyCount },
    { key: 'low',     label: 'Low',     pct: lowPct,     count: stats.low_stock_count },
    { key: 'empty',   label: 'Empty',   pct: emptyPct,   count: stats.out_of_stock_count },
  ];

  return (
    <div className="health-bar-card" ref={ref}>
      <div className="health-bar-title">Inventory Health</div>
      {rows.map(({ key, label, pct, count }) => (
        <div key={key} className="health-bar-row">
          <span className={`health-bar-row-label ${key}`}>{label}</span>
          <div className="health-bar-track">
            <div
              className={`health-bar-fill ${key}`}
              style={{ width: animated ? `${Math.max(pct, pct > 0 ? 1 : 0)}%` : '0%' }}
            />
          </div>
          <span className="health-bar-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// LowStockTable
// ─────────────────────────────────────────────
function LowStockTable({ products, loading, onRestock }) {
  const count = products.length;

  return (
    <div>
      <div className="section-header">
        <div className="section-title" style={{ color: 'var(--warning)' }}>
          <AlertTriangle size={14} />
          Low Stock Alerts
        </div>
        {count > 0 && (
          <span className="section-badge">{count} Item{count !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="low-stock-wrap">
          {[1, 2, 3].map(i => (
            <div key={i} className="sk-row">
              <div className="sk" style={{ flex: 2, height: 14 }} />
              <div className="sk" style={{ flex: 1, height: 14 }} />
              <div className="sk" style={{ width: 32, height: 14 }} />
              <div className="sk" style={{ width: 64, height: 14 }} />
              <div className="sk" style={{ width: 80, height: 24 }} />
            </div>
          ))}
        </div>
      ) : count === 0 ? (
        <div className="empty-stock-state">
          <div className="empty-stock-check">✓</div>
          <div className="empty-stock-main">All Products Sufficiently Stocked</div>
          <div className="empty-stock-sub">No items below threshold of 10 units</div>
        </div>
      ) : (
        <div className="low-stock-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const isOut = p.quantity === 0;
                const qtyClass = isOut ? 'qty-danger' : p.quantity <= 3 ? 'qty-warning' : 'qty-ok';
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {p.sku}
                      </span>
                    </td>
                    <td className={qtyClass}>{p.quantity}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{fmtINR(p.price)}</td>
                    <td>
                      <span className={`badge ${isOut ? 'badge-out-stock' : 'badge-low-stock'}`}>
                        {isOut ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                    <td>
                      <button className="restock-btn" onClick={() => onRestock(p.id)}>
                        → Restock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// RecentOrdersFeed
// ─────────────────────────────────────────────
function RecentOrdersFeed({ orders, loading, onViewAll }) {
  return (
    <div>
      <div className="section-header">
        <div className="section-title" style={{ color: 'var(--text-primary)' }}>
          Recent Orders
        </div>
        <button className="view-all-link" onClick={onViewAll}>
          View All →
        </button>
      </div>

      <div className="orders-feed-card">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="sk-row">
              <div className="sk" style={{ width: 48, height: 14 }} />
              <div className="sk" style={{ flex: 1, height: 14 }} />
              <div className="sk" style={{ width: 80, height: 14 }} />
              <div className="sk" style={{ width: 64, height: 14 }} />
              <div className="sk" style={{ width: 72, height: 14 }} />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="orders-feed-empty">No orders yet</div>
        ) : (
          orders.map(o => (
            <div key={o.id} className="order-feed-row">
              <span className="order-feed-id">#{o.id}</span>
              <span className="order-feed-name">{o.customer_name}</span>
              <span className="order-feed-items">
                {o.item_count} item{o.item_count !== 1 ? 's' : ''}
              </span>
              <span className="order-feed-total">{fmtINR(o.total_amount)}</span>
              <span className="order-feed-time">{relativeTime(o.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PageHeader
// ─────────────────────────────────────────────
function PageHeader({ lastUpdated, onRefresh, refreshing }) {
  const [spinKey, setSpinKey] = useState(0);

  const handleRefresh = () => {
    setSpinKey(k => k + 1);
    onRefresh();
  };

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';

  return (
    <div className="dash-header">
      <div className="dash-header-left">
        <div className="dash-eyebrow">Invenio / Overview</div>
        <h1 className="dash-title">Dashboard</h1>
        <div className="dash-subtitle">Real-Time Inventory Metrics</div>
      </div>
      <div className="dash-header-right">
        <div className="dash-refresh-row">
          <div className={`refresh-dot${refreshing ? ' pulsing' : ''}`} />
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            id="dashboard-refresh-btn"
          >
            <span className="refresh-icon" key={spinKey} style={{ animation: refreshing ? 'spin-once 0.6s linear infinite' : 'none' }}>
              <RotateCcw size={12} />
            </span>
            Refresh
          </button>
        </div>
        <div className="last-updated">Last updated: {timeStr}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ErrorState
// ─────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <div className="dash-error">
      <div className="dash-error-left">
        <span className="dash-error-icon">✕</span>
        <div>
          <div className="dash-error-title">Could Not Load Dashboard Data</div>
          <div className="dash-error-msg">{message}</div>
        </div>
      </div>
      <button className="retry-btn" onClick={onRetry}>
        <RotateCcw size={11} /> Try Again
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dashboard — main export
// ─────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await api.getStats();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Auto-refresh every 60 s (with cleanup to prevent memory leak)
  useEffect(() => {
    const id = setInterval(fetchStats, 60_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  return (
    <div className="dashboard-page">

      {/* ── Section 1: Header ─────────────────── */}
      <PageHeader
        lastUpdated={lastUpdated}
        onRefresh={fetchStats}
        refreshing={refreshing}
      />

      {/* ── Error banner ──────────────────────── */}
      {error && <ErrorState message={error} onRetry={fetchStats} />}

      {/* ── Section 2: Main stat cards ────────── */}
      <div className="stat-cards-grid">
        <StatCard
          label="Total Products"
          value={stats?.total_products}
          sub="SKUs active"
          loading={loading}
        />
        <StatCard
          label="Total Customers"
          value={stats?.total_customers}
          sub="Active accounts"
          loading={loading}
        />
        <StatCard
          label="Total Orders"
          value={stats?.total_orders}
          sub="Orders placed"
          loading={loading}
        />
        <StatCard
          label="Total Revenue"
          value={stats ? fmtINR(stats.total_revenue) : null}
          sub="All time"
          loading={loading}
          change={stats?.revenue_change_pct}
          isFormatted
        />
      </div>

      {/* ── Section 3: Mini indicators ────────── */}
      <div className="mini-cards-grid">
        <MiniCard
          label="Orders Today"
          value={stats?.orders_today}
          loading={loading}
        />
        <MiniCard
          label="New Customers / Week"
          value={stats?.new_customers_this_week}
          loading={loading}
        />
        <MiniCard
          label="Out of Stock"
          value={stats?.out_of_stock_count}
          loading={loading}
          danger={(stats?.out_of_stock_count ?? 0) > 0}
        />
      </div>

      {/* ── Section 6: Inventory health bar ───── */}
      {stats && !loading && <InventoryHealthBar stats={stats} />}
      {loading && (
        <div className="health-bar-card">
          <div className="sk" style={{ width: 140, height: 11, marginBottom: 16 }} />
          {[1, 2, 3].map(i => (
            <div key={i} className="health-bar-row" style={{ marginBottom: 12 }}>
              <div className="sk" style={{ width: 52, height: 10 }} />
              <div className="sk" style={{ height: 6, borderRadius: 3 }} />
              <div className="sk" style={{ width: 24, height: 10 }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Section 4: Low stock table ─────────── */}
      <LowStockTable
        products={stats?.low_stock_products ?? []}
        loading={loading}
        onRestock={(id) => navigate(`/products?highlight=${id}`)}
      />

      {/* ── Section 5: Recent orders feed ─────── */}
      <RecentOrdersFeed
        orders={stats?.recent_orders ?? []}
        loading={loading}
        onViewAll={() => navigate('/orders')}
      />

    </div>
  );
}

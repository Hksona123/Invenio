import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Eye, ShoppingCart, X } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import OrderForm from '../components/Forms/OrderForm';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function OrderDrawer({ order, customers, products, onClose }) {
  const customer = customers.find(c => c.id === order.customer_id);
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="type-mono" style={{ color: 'var(--accent-mint)', fontSize: '12px' }}>
              Order #{order.id}
            </span>
            <button className="btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="type-heading" style={{ color: 'var(--text-primary)', marginBottom: 4 }}>
            {customer?.full_name || `Customer #${order.customer_id}`}
          </div>
          <div className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
            {formatDate(order.created_at)}
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px', marginBottom: 16 }}>
            Line Items
          </div>
          {order.items.map((item, i) => {
            const prod = products.find(p => p.id === item.product_id);
            return (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 12,
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-hairline)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {prod?.name || `Product #${item.product_id}`}
                  </div>
                  <div className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                    {item.quantity} × ${item.unit_price.toFixed(2)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </div>
              </div>
            );
          })}

          <div style={{ paddingTop: 24 }}>
            <div className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px', marginBottom: 4 }}>
              Order Total
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 900, color: 'var(--accent-mint)' }}>
              ${order.total_amount.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([api.getOrders(), api.getCustomers(), api.getProducts()])
      .then(([o, c, p]) => { setOrders(o); setCustomers(c); setProducts(p); })
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getCustomer = (id) => customers.find(c => c.id === id);

  const filtered = orders.filter(o => {
    const c = getCustomer(o.customer_id);
    const term = search.toLowerCase();
    return (
      String(o.id).includes(term) ||
      c?.full_name.toLowerCase().includes(term) ||
      c?.email.toLowerCase().includes(term)
    );
  });

  const handleCreate = async (data) => {
    await api.createOrder(data);
    addToast('Order placed successfully');
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.deleteOrder(id);
      addToast('Order deleted');
      if (viewing?.id === id) setViewing(null);
      load();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="type-display">Orders</h1>
        <button className="btn-primary" id="create-order-btn" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Create Order
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Search by order # or customer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="order-search"
          />
        </div>
        <span className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
          {filtered.length} results
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 4 }} />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="empty-state">
            <ShoppingCart size={40} />
            <p>{search ? 'No orders match your search' : 'No orders yet — create one!'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => {
                  const cust = getCustomer(o.customer_id);
                  return (
                    <tr key={o.id}>
                      <td>
                        <span className="type-mono" style={{ color: 'var(--accent-mint)', fontSize: '12px' }}>
                          #{o.id}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cust?.full_name || `#${o.customer_id}`}
                      </td>
                      <td>
                        <span className="badge badge-pending">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        ${o.total_amount.toFixed(2)}
                      </td>
                      <td>
                        <span className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {formatDate(o.created_at)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-icon" title="View details" onClick={() => setViewing(o)}>
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn-icon danger"
                            title="Delete"
                            onClick={() => handleDelete(o.id)}
                            disabled={deleting === o.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <OrderForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
      {viewing && (
        <OrderDrawer
          order={viewing}
          customers={customers}
          products={products}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api';

export default function OrderForm({ onSubmit, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([api.getCustomers(), api.getProducts()])
      .then(([c, p]) => { setCustomers(c); setProducts(p); })
      .finally(() => setLoadingData(false));
  }, []);

  const getProduct = (id) => products.find(p => p.id === parseInt(id));

  const runningTotal = items.reduce((sum, item) => {
    const p = getProduct(item.product_id);
    return sum + (p ? p.price * (parseInt(item.quantity) || 0) : 0);
  }, 0);

  const addItem = () => setItems(p => [...p, { product_id: '', quantity: 1 }]);

  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));

  const setItem = (i, field, val) => {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
    setErrors(p => ({ ...p, _global: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!customerId)  e.customer = 'Select a customer';
    if (!items.length) e._global = 'Add at least one item';
    items.forEach((it, i) => {
      if (!it.product_id) e[`item_${i}_product`] = 'Select a product';
      if (!it.quantity || it.quantity < 1) e[`item_${i}_qty`] = 'Qty ≥ 1';
    });
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        customer_id: parseInt(customerId),
        items: items.map(it => ({ product_id: parseInt(it.product_id), quantity: parseInt(it.quantity) })),
      });
    } catch (err) {
      setErrors({ _global: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2 className="type-heading">Create Order</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {errors._global && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
              {errors._global}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Customer</label>
            <select
              className={`input ${errors.customer ? 'error' : ''}`}
              value={customerId}
              onChange={e => { setCustomerId(e.target.value); setErrors(p => ({ ...p, customer: undefined })); }}
              disabled={loadingData}
            >
              <option value="">— Select customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
            </select>
            {errors.customer && <div className="form-error">{errors.customer}</div>}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label className="form-label" style={{ margin: 0 }}>Line Items</label>
              <button type="button" className="btn-ghost" style={{ padding: '6px 16px', fontSize: 10 }} onClick={addItem}>
                <Plus size={12} /> Add Item
              </button>
            </div>

            {items.map((item, i) => {
              const prod = getProduct(item.product_id);
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: 10, marginBottom: 10, alignItems: 'start' }}>
                  <div>
                    <select
                      className={`input ${errors[`item_${i}_product`] ? 'error' : ''}`}
                      value={item.product_id}
                      onChange={e => setItem(i, 'product_id', e.target.value)}
                      disabled={loadingData}
                    >
                      <option value="">— Product —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                          {p.name} — ${p.price.toFixed(2)} (qty: {p.quantity})
                        </option>
                      ))}
                    </select>
                    {errors[`item_${i}_product`] && <div className="form-error">{errors[`item_${i}_product`]}</div>}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      max={prod?.quantity || 9999}
                      className={`input ${errors[`item_${i}_qty`] ? 'error' : ''}`}
                      value={item.quantity}
                      onChange={e => setItem(i, 'quantity', e.target.value)}
                    />
                    {errors[`item_${i}_qty`] && <div className="form-error">{errors[`item_${i}_qty`]}</div>}
                  </div>
                  <button type="button" className="btn-icon danger" onClick={() => removeItem(i)} style={{ marginTop: 2 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Running total */}
          <div className="running-total">
            <span className="label">Order Total</span>
            <span className="amount">${runningTotal.toFixed(2)}</span>
          </div>
        </form>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || loadingData}>
            {submitting ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X } from 'lucide-react';

export default function ProductForm({ onSubmit, onClose, initialData }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    price: initialData?.price || '',
    quantity: initialData?.quantity ?? '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())            e.name     = 'Name is required';
    if (!form.sku.trim())             e.sku      = 'SKU is required';
    if (!form.price || form.price <= 0) e.price  = 'Price must be positive';
    if (form.quantity === '' || form.quantity < 0) e.quantity = 'Quantity must be ≥ 0';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await onSubmit({ ...form, price: parseFloat(form.price), quantity: parseInt(form.quantity) });
    } catch (err) {
      setErrors({ _global: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setErrors(p => ({ ...p, [field]: undefined, _global: undefined }));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="type-heading">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {errors._global && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
              {errors._global}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input className={`input ${errors.name ? 'error' : ''}`} placeholder="e.g. Laptop Pro 15" value={form.name} onChange={set('name')} />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">SKU</label>
            <input className={`input ${errors.sku ? 'error' : ''}`} placeholder="e.g. LP-PRO-15-BLK" value={form.sku} onChange={set('sku')} disabled={isEdit} style={isEdit ? { opacity: 0.6 } : {}} />
            {errors.sku && <div className="form-error">{errors.sku}</div>}
            {isEdit && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>SKU cannot be changed after creation</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price ($)</label>
              <input type="number" step="0.01" min="0.01" className={`input ${errors.price ? 'error' : ''}`} placeholder="0.00" value={form.price} onChange={set('price')} />
              {errors.price && <div className="form-error">{errors.price}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" min="0" className={`input ${errors.quantity ? 'error' : ''}`} placeholder="0" value={form.quantity} onChange={set('quantity')} />
              {errors.quantity && <div className="form-error">{errors.quantity}</div>}
            </div>
          </div>
        </form>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

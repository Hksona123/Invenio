import { useState } from 'react';
import { X } from 'lucide-react';

export default function CustomerForm({ onSubmit, onClose, initialData }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({
    full_name: initialData?.full_name || '',
    email:     initialData?.email    || '',
    phone:     initialData?.phone    || '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim())  e.full_name = 'Name is required';
    if (!form.email.trim())      e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await onSubmit({ ...form, phone: form.phone || null });
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
          <h2 className="type-heading">{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {errors._global && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
              {errors._global}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className={`input ${errors.full_name ? 'error' : ''}`} placeholder="e.g. Jane Smith" value={form.full_name} onChange={set('full_name')} />
            {errors.full_name && <div className="form-error">{errors.full_name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className={`input ${errors.email ? 'error' : ''}`} placeholder="jane@example.com" value={form.email} onChange={set('email')} />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Phone (optional)</label>
            <input className="input" placeholder="+1 555 000 0000" value={form.phone} onChange={set('phone')} />
          </div>
        </form>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

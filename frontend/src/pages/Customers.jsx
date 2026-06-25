import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { api } from '../api';
import './Customers.css';

// ─────────────────────────────────────────────
// Constants — avatar colors
// ─────────────────────────────────────────────
const AVATAR_COLORS = [
  '#3cffd0', '#5200ff', '#d4a017',
  '#3860be', '#ff4444', '#9b59b6',
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getAvatarColor(name) {
  return AVATAR_COLORS[(name || 'A').charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatJoinDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year  = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// ─────────────────────────────────────────────
// useDebounce
// ─────────────────────────────────────────────
function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────
// Client-side validation
// ─────────────────────────────────────────────
function validate(form) {
  const errs = {};
  if (!form.full_name.trim())
    errs.full_name = 'Full name is required';
  else if (form.full_name.trim().length > 100)
    errs.full_name = 'Max 100 characters';

  if (!form.email.trim())
    errs.email = 'Email address is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    errs.email = 'Enter a valid email address';

  if (form.phone.trim()) {
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15)
      errs.phone = 'Phone must be between 7 and 15 digits';
  }
  return errs;
}

// ─────────────────────────────────────────────
// Avatar component
// ─────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const color    = getAvatarColor(name);
  const initials = getInitials(name);
  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   '50%',
      background:     `${color}18`,
      border:         `1px solid ${color}40`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontFamily:     'var(--font-mono)',
      fontSize:       Math.floor(size * 0.36),
      fontWeight:     600,
      color,
      flexShrink:     0,
    }}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      <td style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
          <div className="skeleton" style={{ width: 140, height: 14, borderRadius: 3 }} />
        </div>
      </td>
      {[180, 120, 70, 90, 70].map((w, i) => (
        <td key={i} style={{ padding: 16 }}>
          <div className="skeleton" style={{ width: w, height: 14, borderRadius: 3 }} />
        </td>
      ))}
    </tr>
  );
}

// ─────────────────────────────────────────────
// Orders count badge
// ─────────────────────────────────────────────
function OrdersBadge({ count }) {
  const style =
    count === 0
      ? { bg: 'transparent',          border: 'var(--border-hairline)',     color: 'var(--text-secondary)' }
      : count >= 5
        ? { bg: 'rgba(60,255,208,0.1)', border: 'var(--accent-mint)',         color: 'var(--accent-mint)' }
        : { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.2)',   color: 'var(--text-muted)' };

  return (
    <span style={{
      background:   style.bg,
      border:       `1px solid ${style.border}`,
      color:        style.color,
      borderRadius: '4px',
      padding:      '3px 10px',
      fontFamily:   'var(--font-mono)',
      fontSize:     '11px',
      letterSpacing:'0.5px',
      whiteSpace:   'nowrap',
    }}>
      {count} {count === 1 ? 'ORDER' : 'ORDERS'}
    </span>
  );
}

// ─────────────────────────────────────────────
// Customer preview card (modal + delete)
// ─────────────────────────────────────────────
function CustomerPreviewCard({ name, email, phone }) {
  const displayName  = name  || 'Full Name';
  const displayEmail = email || 'email@example.com';
  return (
    <div className="cust-preview-card">
      <Avatar name={displayName} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {displayName}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
          {displayEmail}
        </div>
      </div>
      {phone && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
          {phone}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className={`cust-toast ${toast.type}`}>
      <span className="cust-toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
      <span className="cust-toast-msg">{toast.msg}</span>
      <button className="cust-toast-dismiss" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Customer Modal (Add / Edit)
// ─────────────────────────────────────────────
function CustomerModal({ modal, onClose, onSaved, onToast }) {
  const isEdit = modal !== 'add';
  const [form, setForm]     = useState({ full_name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setForm({ full_name: modal.full_name, email: modal.email, phone: modal.phone ?? '' });
    } else {
      setForm({ full_name: '', email: '', phone: '' });
    }
    setErrors({});
  }, [modal]);

  // Escape key closes
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setErrors(p => ({ ...p, [field]: undefined }));
  };

  const showPreview = form.full_name.trim() || form.email.trim();

  async function handleSave() {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email:     form.email.trim().toLowerCase(),
        phone:     form.phone.trim() || null,
      };
      if (isEdit) {
        await api.updateCustomer(modal.id, payload);
        onToast('success', `"${form.full_name.trim()}" updated successfully`);
      } else {
        await api.createCustomer(payload);
        onToast('success', `"${form.full_name.trim()}" added to customers`);
      }
      onClose();
      onSaved();
    } catch (err) {
      const msg = err.message || 'Something went wrong';
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
      else onToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cust-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cust-modal">
        <div className="cust-modal-header">
          <span className="cust-modal-title">{isEdit ? 'Edit Customer' : 'Add Customer'}</span>
          <button className="cust-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Full Name */}
        <div className="cust-field-group">
          <label className="cust-field-label">Full Name *</label>
          <input
            className={`cust-field-input${errors.full_name ? ' has-error' : ''}`}
            placeholder="e.g. Priya Sharma"
            value={form.full_name}
            onChange={set('full_name')}
            autoFocus
          />
          {errors.full_name && <span className="cust-field-error">{errors.full_name}</span>}
        </div>

        {/* Email */}
        <div className="cust-field-group">
          <label className="cust-field-label">Email Address *</label>
          <input
            type="email"
            className={`cust-field-input${errors.email ? ' has-error' : ''}`}
            placeholder="priya@example.com"
            value={form.email}
            onChange={set('email')}
          />
          {errors.email && <span className="cust-field-error">{errors.email}</span>}
        </div>

        {/* Phone */}
        <div className="cust-field-group">
          <label className="cust-field-label">Phone Number <span style={{ opacity: 0.5 }}>(optional)</span></label>
          <input
            type="tel"
            className={`cust-field-input${errors.phone ? ' has-error' : ''}`}
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={set('phone')}
          />
          {errors.phone
            ? <span className="cust-field-error">{errors.phone}</span>
            : <span className="cust-field-hint">Accepts +91 prefix, spaces, and dashes</span>
          }
        </div>

        {/* Live preview card */}
        {showPreview && (
          <CustomerPreviewCard
            name={form.full_name}
            email={form.email}
            phone={form.phone}
          />
        )}

        <div className="cust-modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Delete Modal
// ─────────────────────────────────────────────
function DeleteModal({ target, onClose, onDeleted, onToast }) {
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCustomer(target.id);
      onToast('success', `"${target.full_name}" deleted`);
      onClose();
      onDeleted();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="cust-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cust-modal" style={{ maxWidth: 440 }}>
        <div className="cust-modal-header">
          <span className="cust-modal-title danger">Delete Customer</span>
          <button className="cust-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Customer preview */}
        <CustomerPreviewCard
          name={target.full_name}
          email={target.email}
          phone={target.phone}
        />

        {deleteError && (
          <div className="cust-delete-error">{deleteError}</div>
        )}

        {!deleteError && (
          <>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>
              Are you sure you want to permanently delete this customer? This action cannot be undone.
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              This action cannot be undone.
            </p>
          </>
        )}

        <div className="cust-modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={deleting}>
            {deleteError ? 'Got It' : 'Cancel'}
          </button>
          {!deleteError && (
            <button className="btn-cust-delete" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Customer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Customers Page
// ─────────────────────────────────────────────
export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast]         = useState(null);

  const debouncedSearch = useDebounce(search, 250);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers(debouncedSearch);
      setCustomers(data.items);
      setSummary({
        total:          data.total,
        new_this_week:  data.new_this_week,
        new_this_month: data.new_this_month,
      });
    } catch (err) {
      showToast('error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  return (
    <div className="customers-page">

      {/* ── Header ────────────────────────────── */}
      <div>
        <div className="cust-breadcrumb">Invenio / Customers</div>
        <div className="cust-header">
          <div>
            <h1 className="cust-title">Customers</h1>
            <p className="cust-subtitle">Manage your customer accounts</p>
          </div>
          <button className="btn-primary" id="add-customer-btn" onClick={() => setModal('add')}>
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {/* ── Summary strip ─────────────────────── */}
      <div className="cust-summary-strip">
        <div className="cust-summary-item">
          <span className="cust-summary-value">{summary?.total ?? '—'}</span>
          <span className="cust-summary-label">Total</span>
        </div>
        <div className={`cust-summary-item${(summary?.new_this_week ?? 0) > 0 ? ' highlight' : ''}`}>
          <span className="cust-summary-value">{summary?.new_this_week ?? '—'}</span>
          <span className="cust-summary-label">New This Week</span>
        </div>
        <div className="cust-summary-item">
          <span className="cust-summary-value">{summary?.new_this_month ?? '—'}</span>
          <span className="cust-summary-label">New This Month</span>
        </div>
      </div>

      {/* ── Search bar ────────────────────────── */}
      <div className="cust-search-wrap">
        <div className="cust-search-bar">
          <span className="cust-search-icon"><Search size={16} /></span>
          <input
            className="cust-search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="customer-search"
          />
          {search && (
            <button className="cust-search-clear" onClick={() => setSearch('')} title="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
        {search && !loading && (
          <div className="cust-result-count">
            Showing {customers.length} of {summary?.total ?? 0} customers
          </div>
        )}
      </div>

      {/* ── Table ─────────────────────────────── */}
      <div className="cust-table-container">
        <table className="cust-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th className="center">Orders</th>
              <th>Joined</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="cust-empty-cell">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    {search ? (
                      <>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          No Results
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          No customers match "{search}"
                        </div>
                        <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setSearch('')}>
                          Clear Search
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 32 }}>👤</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          No Customers Yet
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          Add your first customer to get started
                        </div>
                        <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setModal('add')}>
                          <Plus size={13} /> Add Customer
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}>
                  {/* Name + avatar */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={c.full_name} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                          {c.full_name}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, letterSpacing: '0.5px' }}>
                          ID #{c.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
                      {c.email}
                    </span>
                  </td>

                  {/* Phone */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: c.phone ? 'var(--text-muted)' : 'var(--text-secondary)', opacity: c.phone ? 1 : 0.4 }}>
                      {c.phone ?? '—'}
                    </span>
                  </td>

                  {/* Orders badge */}
                  <td className="center">
                    <OrdersBadge count={c.order_count} />
                  </td>

                  {/* Joined date */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                      {formatJoinDate(c.created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="center">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button className="btn-icon" title="Edit customer" onClick={() => setModal(c)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-icon danger" title="Delete customer" onClick={() => setDeleteTarget(c)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modals ────────────────────────────── */}
      {modal && (
        <CustomerModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={fetchCustomers}
          onToast={showToast}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchCustomers}
          onToast={showToast}
        />
      )}

      {/* ── Toast ─────────────────────────────── */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

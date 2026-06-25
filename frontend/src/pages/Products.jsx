import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { api } from '../api';
import './Products.css';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STATUS_CONFIG = {
  IN_STOCK:     { label: 'IN STOCK',     bg: 'rgba(60,255,208,0.1)',  border: '#3cffd0', color: '#3cffd0' },
  LOW_STOCK:    { label: 'LOW STOCK',    bg: 'rgba(212,160,23,0.1)',  border: '#d4a017', color: '#d4a017' },
  OUT_OF_STOCK: { label: 'OUT OF STOCK', bg: 'rgba(255,68,68,0.1)',   border: '#ff4444', color: '#ff4444' },
};

function fmtINR(n) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─────────────────────────────────────────────
// useDebounce hook
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
// Validate form
// ─────────────────────────────────────────────
function validate(form, isEdit) {
  const errs = {};
  if (!form.name.trim())                               errs.name = 'Product name is required';
  else if (form.name.trim().length > 120)              errs.name = 'Max 120 characters';
  if (!isEdit) {
    if (!form.sku.trim())                              errs.sku = 'SKU is required';
    else if (!/^[A-Z0-9\-_]+$/i.test(form.sku.trim())) errs.sku = 'Letters, numbers, hyphens, underscores only';
  }
  if (!form.price)                                     errs.price = 'Price is required';
  else if (isNaN(form.price) || +form.price <= 0)      errs.price = 'Must be greater than zero';
  if (form.quantity === '')                             errs.quantity = 'Quantity is required';
  else if (isNaN(form.quantity) || +form.quantity < 0) errs.quantity = 'Cannot be negative';
  return errs;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function IconButton({ icon: Icon, title, onClick, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`btn-icon${danger ? ' danger' : ''}`}
    >
      <Icon size={14} />
    </button>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[220, 110, 90, 60, 100, 72].map((w, i) => (
        <td key={i} style={{ padding: '16px' }}>
          <div className="skeleton" style={{ width: w, height: 14, borderRadius: 3 }} />
        </td>
      ))}
    </tr>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.IN_STOCK;
  return (
    <span style={{
      background:   cfg.bg,
      border:       `1px solid ${cfg.border}`,
      color:        cfg.color,
      borderRadius: '4px',
      padding:      '3px 10px',
      fontFamily:   'var(--font-mono)',
      fontSize:     '10px',
      letterSpacing:'1px',
      whiteSpace:   'nowrap',
      textTransform:'uppercase',
    }}>
      {cfg.label}
    </span>
  );
}

function StockPreview({ qty }) {
  const n = parseInt(qty) || 0;
  const key = n === 0 ? 'OUT_OF_STOCK' : n < 10 ? 'LOW_STOCK' : 'IN_STOCK';
  const cfg = STATUS_CONFIG[key];
  return (
    <div className="stock-preview" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span className="stock-preview-label" style={{ color: cfg.color }}>Stock Preview</span>
      <span className="stock-preview-value" style={{ color: cfg.color }}>
        {cfg.label} — {n} units
      </span>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className={`prod-toast ${toast.type}`}>
      <span className="prod-toast-icon">{toast.type === 'success' ? '✓' : '✕'}</span>
      <span className="prod-toast-msg">{toast.msg}</span>
      <button className="prod-toast-dismiss" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}

// ── Product Modal (Add / Edit) ─────────────────────────────
function ProductModal({ modal, onClose, onSaved, onToast }) {
  const isEdit = modal !== 'add';
  const [form, setForm]       = useState({ name: '', sku: '', price: '', quantity: '' });
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (isEdit) {
      setForm({ name: modal.name, sku: modal.sku, price: String(modal.price), quantity: String(modal.quantity) });
    } else {
      setForm({ name: '', sku: '', price: '', quantity: '' });
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

  async function handleSave() {
    const errs = validate(form, isEdit);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateProduct(modal.id, {
          name:     form.name.trim(),
          price:    parseFloat(form.price),
          quantity: parseInt(form.quantity),
        });
        onToast('success', `"${form.name.trim()}" updated successfully`);
      } else {
        await api.createProduct({
          name:     form.name.trim(),
          sku:      form.sku.trim().toUpperCase(),
          price:    parseFloat(form.price),
          quantity: parseInt(form.quantity),
        });
        onToast('success', `"${form.name.trim()}" added to catalogue`);
      }
      onClose();
      onSaved();
    } catch (err) {
      const msg = err.message || 'Something went wrong';
      if (msg.toLowerCase().includes('sku'))        setErrors({ sku: msg });
      else if (msg.toLowerCase().includes('price')) setErrors({ price: msg });
      else if (msg.toLowerCase().includes('name'))  setErrors({ name: msg });
      else                                          onToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="prod-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="prod-modal">
        <div className="prod-modal-header">
          <span className="prod-modal-title">{isEdit ? 'Edit Product' : 'Add Product'}</span>
          <button className="prod-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Name */}
        <div className="field-group">
          <label className="field-label">Product Name *</label>
          <input
            className={`field-input${errors.name ? ' has-error' : ''}`}
            placeholder="e.g. Wireless Keyboard"
            value={form.name}
            onChange={set('name')}
            autoFocus
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        {/* SKU + Price row */}
        <div className="field-row">
          <div className="field-group">
            <label className="field-label">SKU *</label>
            <input
              className={`field-input${errors.sku ? ' has-error' : ''}`}
              placeholder="e.g. WKB-001"
              value={form.sku}
              onChange={set('sku')}
              disabled={isEdit}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.sku  && <span className="field-error">{errors.sku}</span>}
            {isEdit && !errors.sku && (
              <span className="field-hint">SKU cannot be changed after creation</span>
            )}
          </div>
          <div className="field-group">
            <label className="field-label">Price (₹) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={`field-input${errors.price ? ' has-error' : ''}`}
              placeholder="0.00"
              value={form.price}
              onChange={set('price')}
            />
            {errors.price && <span className="field-error">{errors.price}</span>}
          </div>
        </div>

        {/* Quantity */}
        <div className="field-group">
          <label className="field-label">{isEdit ? 'Quantity' : 'Initial Quantity'} *</label>
          <input
            type="number"
            min="0"
            step="1"
            className={`field-input${errors.quantity ? ' has-error' : ''}`}
            placeholder="0"
            value={form.quantity}
            onChange={set('quantity')}
          />
          {errors.quantity && <span className="field-error">{errors.quantity}</span>}
        </div>

        {/* Live stock preview */}
        <StockPreview qty={form.quantity} />

        <div className="prod-modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Modal ────────────────────────────────────────────
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
      await api.deleteProduct(target.id);
      onToast('success', `"${target.name}" deleted`);
      onClose();
      onDeleted();
    } catch (err) {
      // 409 Conflict: surface inline, don't close
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="prod-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="prod-modal" style={{ maxWidth: 420 }}>
        <div className="prod-modal-header">
          <span className="prod-modal-title danger">Delete Product</span>
          <button className="prod-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {deleteError && (
          <div className="delete-inline-error">{deleteError}</div>
        )}

        <p className="delete-confirm-text">
          Are you sure you want to delete{' '}
          <strong style={{ color: 'var(--text-primary)' }}>"{target.name}"</strong>{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
            (SKU: {target.sku})
          </span>?
        </p>
        <p className="delete-cannot-undo">This action cannot be undone.</p>

        <div className="prod-modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={deleting}>
            {deleteError ? 'Got It' : 'Cancel'}
          </button>
          {!deleteError && (
            <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Product'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Products Page
// ─────────────────────────────────────────────
export default function Products() {
  const [products, setProducts]       = useState([]);
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast]             = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const rowRefs  = useRef({});

  const debouncedSearch = useDebounce(search, 250);

  // Toast helper
  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProducts(debouncedSearch);
      setProducts(data.items);
      setSummary({
        total:        data.total,
        in_stock:     data.in_stock,
        low_stock:    data.low_stock,
        out_of_stock: data.out_of_stock,
      });
    } catch (err) {
      showToast('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Handle ?highlight= from Dashboard → Restock
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hid = parseInt(params.get('highlight'));
    if (!hid) return;
    setHighlightId(hid);
    // Scroll to the row once products are rendered
    const tryScroll = () => {
      const el = rowRefs.current[hid];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightId(null), 2500);
        navigate('/products', { replace: true });
      } else {
        setTimeout(tryScroll, 150);
      }
    };
    setTimeout(tryScroll, 300);
  }, [location.search, navigate]);

  return (
    <div className="products-page">

      {/* ── Header ─────────────────────────────── */}
      <div>
        <div className="prod-breadcrumb">Invenio / Products</div>
        <div className="prod-header">
          <div className="prod-title-block">
            <h1 className="prod-title">Products</h1>
            <p className="prod-subtitle">Manage your product catalogue</p>
          </div>
          <button className="btn-primary" id="add-product-btn" onClick={() => setModal('add')}>
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* ── Summary strip ───────────────────────── */}
      <div className="summary-strip">
        <div className="summary-item">
          <span className="summary-value">{summary?.total ?? '—'}</span>
          <span className="summary-label">Total</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item">
          <span className="summary-value">{summary?.in_stock ?? '—'}</span>
          <span className="summary-label">In Stock</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item low">
          <span className="summary-value">{summary?.low_stock ?? '—'}</span>
          <span className="summary-label">Low Stock</span>
        </div>
        <div className="summary-divider" />
        <div className="summary-item empty">
          <span className="summary-value">{summary?.out_of_stock ?? '—'}</span>
          <span className="summary-label">Out of Stock</span>
        </div>
      </div>

      {/* ── Search bar ──────────────────────────── */}
      <div className="prod-search-wrap">
        <div className="prod-search-bar">
          <span className="prod-search-icon"><Search size={16} /></span>
          <input
            className="prod-search-input"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="product-search"
          />
          {search && (
            <button className="prod-search-clear" onClick={() => setSearch('')} title="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
        {search && !loading && (
          <div className="prod-result-count">
            Showing {products.length} of {summary?.total ?? 0} products
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────── */}
      <div className="table-container">
        <table className="prod-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th className="right">Price</th>
              <th className="right">Qty</th>
              <th className="center">Status</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }, (_, i) => <SkeletonRow key={i} />)
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-cell">
                  <div className="empty-state-inner">
                    {search ? (
                      <>
                        <div className="empty-state-headline">No Results</div>
                        <div className="empty-state-sub">No products match "{search}"</div>
                        <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => setSearch('')}>
                          Clear Search
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="empty-state-headline">No Products</div>
                        <div className="empty-state-sub">Add your first product to get started</div>
                        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setModal('add')}>
                          <Plus size={13} /> Add Product
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              products.map(p => {
                const qtyColor =
                  p.quantity === 0 ? 'var(--danger)'  :
                  p.quantity < 10  ? 'var(--warning)' :
                  'var(--text-primary)';
                return (
                  <tr
                    key={p.id}
                    ref={el => { rowRefs.current[p.id] = el; }}
                    className={p.id === highlightId ? 'highlighted' : ''}
                  >
                    {/* Name */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Added {fmtDate(p.created_at)}
                        {p.updated_at && (
                          <span style={{ marginLeft: 8, opacity: 0.7 }}>· Updated {fmtDate(p.updated_at)}</span>
                        )}
                      </div>
                    </td>
                    {/* SKU */}
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                      {p.sku}
                    </td>
                    {/* Price */}
                    <td className="right" style={{ fontWeight: 600 }}>
                      {fmtINR(p.price)}
                    </td>
                    {/* Qty */}
                    <td className="right" style={{ fontWeight: 700, color: qtyColor, fontFamily: 'var(--font-display)', fontSize: 16 }}>
                      {p.quantity.toLocaleString()}
                    </td>
                    {/* Status */}
                    <td className="center">
                      <StatusBadge status={p.status} />
                    </td>
                    {/* Actions */}
                    <td className="center">
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <IconButton icon={Edit2} title="Edit product" onClick={() => setModal(p)} />
                        <IconButton icon={Trash2} title="Delete product" onClick={() => setDeleteTarget(p)} danger />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modals ────────────────────────────────── */}
      {modal && (
        <ProductModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={fetchProducts}
          onToast={showToast}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={fetchProducts}
          onToast={showToast}
        />
      )}

      {/* ── Toast ─────────────────────────────────── */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

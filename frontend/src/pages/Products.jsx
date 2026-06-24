import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import ProductForm from '../components/Forms/ProductForm';

function getStockStatus(qty) {
  if (qty === 0) return { label: 'Out of Stock', cls: 'badge-out-stock' };
  if (qty < 10)  return { label: 'Low Stock',    cls: 'badge-low-stock' };
  return            { label: 'In Stock',        cls: 'badge-in-stock' };
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    api.getProducts()
      .then(setProducts)
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data) => {
    await api.createProduct(data);
    addToast('Product added successfully');
    setShowForm(false);
    load();
  };

  const handleUpdate = async (data) => {
    await api.updateProduct(editing.id, data);
    addToast('Product updated');
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.deleteProduct(id);
      addToast('Product deleted');
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
        <h1 className="type-display">Products</h1>
        <button className="btn-primary" id="add-product-btn" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="product-search"
          />
        </div>
        <span className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
          {filtered.length} results
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 4 }} />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="empty-state">
            <Package size={40} />
            <p>{search ? 'No products match your search' : 'No products yet — add one!'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const status = getStockStatus(p.quantity);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                      <td>
                        <span className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {p.sku}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-mint)' }}>
                        ${p.price.toFixed(2)}
                      </td>
                      <td style={{ fontWeight: 700 }}>{p.quantity}</td>
                      <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn-icon"
                            title="Edit product"
                            onClick={() => setEditing(p)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-icon danger"
                            title="Delete product"
                            onClick={() => handleDelete(p.id)}
                            disabled={deleting === p.id}
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
        <ProductForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <ProductForm onSubmit={handleUpdate} onClose={() => setEditing(null)} initialData={editing} />
      )}
    </div>
  );
}

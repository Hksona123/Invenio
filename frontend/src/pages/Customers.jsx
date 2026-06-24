import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import CustomerForm from '../components/Forms/CustomerForm';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    api.getCustomers()
      .then(setCustomers)
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data) => {
    await api.createCustomer(data);
    addToast('Customer added');
    setShowForm(false);
    load();
  };

  const handleUpdate = async (data) => {
    await api.updateCustomer(editing.id, data);
    addToast('Customer updated');
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await api.deleteCustomer(id);
      addToast('Customer deleted');
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
        <h1 className="type-display">Customers</h1>
        <button className="btn-primary" id="add-customer-btn" onClick={() => setShowForm(true)}>
          <Plus size={14} /> Add Customer
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="customer-search"
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
            <Users size={40} />
            <p>{search ? 'No customers match your search' : 'No customers yet — add one!'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.full_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.email}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                    <td>
                      <span className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        {formatDate(c.created_at)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-icon" title="Edit" onClick={() => setEditing(c)}>
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon danger"
                          title="Delete"
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <CustomerForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
      {editing  && <CustomerForm onSubmit={handleUpdate} onClose={() => setEditing(null)} initialData={editing} />}
    </div>
  );
}

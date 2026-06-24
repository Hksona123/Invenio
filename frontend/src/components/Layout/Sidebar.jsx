import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, ShoppingCart,
  Menu, X, ChevronRight
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package,         label: 'Products' },
  { to: '/customers',icon: Users,           label: 'Customers' },
  { to: '/orders',   icon: ShoppingCart,    label: 'Orders' },
];

export default function Sidebar({ open, onToggle }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="sidebar-overlay" onClick={onToggle} />}

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">INVENIO</span>
          <button className="sidebar-close btn-icon" onClick={onToggle} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth < 768 && onToggle()}
            >
              <Icon size={16} className="nav-icon" />
              <span>{label}</span>
              <ChevronRight size={12} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="type-mono" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
            v1.0.0
          </span>
        </div>
      </aside>
    </>
  );
}

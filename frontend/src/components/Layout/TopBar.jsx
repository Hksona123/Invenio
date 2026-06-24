import { Menu, Bell } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ onMenuToggle, title }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn btn-icon" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={18} />
        </button>
        {title && (
          <span className="topbar-title type-mono" style={{ color: 'var(--text-secondary)' }}>
            {title}
          </span>
        )}
      </div>
      <div className="topbar-right">
        <div className="topbar-status">
          <span className="status-dot" />
          <span className="type-mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            System Online
          </span>
        </div>
      </div>
    </header>
  );
}

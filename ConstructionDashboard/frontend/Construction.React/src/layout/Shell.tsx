import { type ReactNode, useState, useCallback } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import type { NavigationItem } from './navigation';
import { primaryNav } from './navigation';
import './Shell.css';

const navItemClassName = ({ isActive }: { isActive: boolean }): string =>
  `nav-item${isActive ? ' is-active' : ''}`;

function NavIcon({ name }: { name: string }) {
  // Lucide Static font icons via class name
  return <i className={`icon icon-${name}`} aria-hidden="true" />;
}

function SidebarNav({ items, onNavigate }: { items: NavigationItem[]; onNavigate?: () => void }) {
  return (
    <ul className="nav-list">
      {items.map((item) => (
        <li key={item.id}>
          <NavLink to={item.path} className={navItemClassName} onClick={onNavigate}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-icon btn-ghost"
      onClick={onToggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <NavIcon name={theme === 'light' ? 'moon' : 'sun'} />
    </button>
  );
}

export function Shell(): ReactNode {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [menuOpen, setMenuOpen] = useState(false);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className={`sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <i className="icon icon-building-2" aria-hidden="true" />
          <span>Construction</span>
        </div>
        <nav aria-label="Primary">
          <SidebarNav items={primaryNav} onNavigate={closeMenu} />
          {/* <div className="nav-section-title">Management</div>
          <SidebarNav items={secondaryNav} onNavigate={closeMenu} /> */}
        </nav>
      </aside>

      <div className={`sidebar-overlay${menuOpen ? ' is-visible' : ''}`} onClick={closeMenu} aria-hidden="true" />

      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="btn btn-icon btn-ghost menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <NavIcon name="menu" />
          </button>
        </div>
        <div className="topbar-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button type="button" className="btn btn-icon btn-ghost" aria-label="Notifications">
            <NavIcon name="bell" />
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

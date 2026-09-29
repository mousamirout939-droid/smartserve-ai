import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import AIStatusIndicator from './AIStatusIndicator.jsx';

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/menu', label: 'Menu' },
  { to: '/customers', label: 'Customers' },
  { to: '/conversations', label: 'Conversations' },
  { to: '/faqs', label: 'FAQs' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('smartserve_admin') || '{}');

  function logout() {
    localStorage.removeItem('smartserve_token');
    localStorage.removeItem('smartserve_admin');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-char-900">
      <aside className="w-60 shrink-0 border-r border-char-700 flex flex-col">
        <div className="px-5 py-6 border-b border-char-700">
          <div className="font-display text-xl text-cream leading-none">SmartServe</div>
          <div className="text-xs text-muted mt-1 tracking-wide">Kitchen Console</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-char-700 text-gold-400 font-medium'
                    : 'text-muted hover:text-cream hover:bg-char-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-char-700">
          <AIStatusIndicator />
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-cream">{admin.name || 'Admin'}</div>
            <button onClick={logout} className="text-xs text-muted hover:text-sauce transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

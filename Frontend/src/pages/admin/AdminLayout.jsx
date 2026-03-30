import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

export default function AdminLayout() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const navItems = [
    { to: '/admin',       label: '📊 Overview',  end: true },
    { to: '/admin/posts', label: '📝 All Posts'  },
    { to: '/admin/users', label: '👥 Users'      },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">⚙ Admin Panel</div>
        <nav className="admin-nav">
          {navItems.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-footer-info">
          Logged in as<br /><strong>{user.name}</strong>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

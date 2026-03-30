import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const at = (p) => location.pathname === p;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">✦</span>
          <span className="brand-name">BrainByte</span>
        </Link>

        <nav className="navbar-nav">
          <Link to="/" className={at('/') ? 'nav-link active' : 'nav-link'}>
            Stories
          </Link>
          {user && (
            <>
              <Link to="/dashboard" className={at('/dashboard') ? 'nav-link active' : 'nav-link'}>
                Dashboard
              </Link>
              {isAdmin && (
                <Link to="/admin" className={location.pathname.startsWith('/admin') ? 'nav-link admin-link active' : 'nav-link admin-link'}>
                  ⚙ Admin
                </Link>
              )}
              <Link to="/editor" className="btn btn-primary btn-sm">
                + New Post
              </Link>
              <div className="nav-user">
                <div className="nav-avatar" title={user.name}>
                  {user.name?.charAt(0).toUpperCase()}
                  {isAdmin && <span className="admin-dot" title="Admin" />}
                </div>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                  Sign out
                </button>
              </div>
            </>
          )}
          {!user && (
            <>
              <Link to="/login" className="nav-link">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

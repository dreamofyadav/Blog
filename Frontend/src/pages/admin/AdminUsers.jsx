import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState({});
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    api.get('/admin/users')
      .then(r => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    const msg = newRole === 'admin'
      ? `Promote "${u.name}" to Admin? They will have full admin access.`
      : `Demote "${u.name}" to regular user?`;
    if (!window.confirm(msg)) return;

    setActing(a => ({ ...a, [u._id]: true }));
    try {
      const res = await api.patch(`/admin/users/${u._id}/role`, { role: newRole });
      setUsers(prev => prev.map(x => x._id === u._id ? res.data : x));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update role');
    } finally {
      setActing(a => ({ ...a, [u._id]: false }));
    }
  };

  const visible = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === 'admin').length;
  const userCount  = users.filter(u => u.role === 'user').length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-sub">{users.length} total · {adminCount} admin · {userCount} user</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          className="admin-search-input"
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="admin-loading"><div className="spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="td-author">
                      <div className="mini-avatar" style={{ background: u.role === 'admin' ? 'var(--accent)' : '#6d28d9' }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{u.name}</strong>
                        {u._id === me?._id && <span className="you-badge">you</span>}
                      </div>
                    </div>
                  </td>
                  <td className="td-email">{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                      {u.role === 'admin' ? '⚙ Admin' : '👤 User'}
                    </span>
                  </td>
                  <td className="td-date">
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td>
                    {u._id !== me?._id ? (
                      <button
                        className={u.role === 'admin' ? 'btn-reject' : 'btn-approve'}
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => toggleRole(u)}
                        disabled={acting[u._id]}
                      >
                        {acting[u._id] ? '…' : u.role === 'admin' ? '↓ Demote' : '↑ Make Admin'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

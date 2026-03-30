import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/posts?approval=pending&limit=5'),
    ]).then(([s, p]) => {
      setStats(s.data);
      setRecent(p.data.posts);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const cards = [
    { label: 'Total Posts',    value: stats.totalPosts,    color: 'var(--ink)',    icon: '📝' },
    { label: 'Pending Review', value: stats.pending,       color: '#b45309',       icon: '⏳' },
    { label: 'Approved',       value: stats.approved,      color: '#15803d',       icon: '✅' },
    { label: 'Rejected',       value: stats.rejected,      color: '#b91c1c',       icon: '❌' },
    { label: 'Published',      value: stats.publishedPosts,color: 'var(--accent)', icon: '🌐' },
    { label: 'Drafts',         value: stats.draftPosts,    color: 'var(--ink-light)', icon: '📄' },
    { label: 'Total Users',    value: stats.totalUsers,    color: '#6d28d9',       icon: '👥' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Overview</h1>
        <p className="admin-page-sub">Platform health at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="admin-stats-grid">
        {cards.map(c => (
          <div key={c.label} className="admin-stat-card">
            <span className="asc-icon">{c.icon}</span>
            <span className="asc-value" style={{ color: c.color }}>{c.value}</span>
            <span className="asc-label">{c.label}</span>
          </div>
        ))}
      </div>

      {/* Pending queue */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">Pending Review</h2>
          <Link to="/admin/posts?approval=pending" className="btn btn-outline btn-sm">View all →</Link>
        </div>

        {recent.length === 0 ? (
          <div className="admin-empty">
            <span>🎉</span>
            <p>No posts waiting for review.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(post => (
                  <PendingRow key={post._id} post={post} onAction={(id, action) => {
                    if (action !== 'preview') setRecent(prev => prev.filter(p => p._id !== id));
                  }} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingRow({ post, onAction }) {
  const [acting, setActing] = useState('');
  const date = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const approve = async () => {
    setActing('approve');
    try { await api.patch(`/admin/posts/${post._id}/approve`); onAction(post._id, 'approve'); }
    catch { alert('Failed'); } finally { setActing(''); }
  };

  const reject = async () => {
    const reason = window.prompt('Rejection reason (shown to author):');
    if (reason === null) return;
    setActing('reject');
    try { await api.patch(`/admin/posts/${post._id}/reject`, { reason }); onAction(post._id, 'reject'); }
    catch { alert('Failed'); } finally { setActing(''); }
  };

  return (
    <tr>
      <td className="td-title">
        <Link to={`/admin/posts?preview=${post._id}`} className="table-title-link">{post.title}</Link>
        <span className="td-meta">{post.readTime} min read</span>
      </td>
      <td>{post.author?.name}</td>
      <td>{date}</td>
      <td>
        <div className="action-btns">
          <button className="btn-approve" onClick={approve} disabled={!!acting}>
            {acting === 'approve' ? '…' : '✓ Approve'}
          </button>
          <button className="btn-reject" onClick={reject} disabled={!!acting}>
            {acting === 'reject' ? '…' : '✕ Reject'}
          </button>
        </div>
      </td>
    </tr>
  );
}

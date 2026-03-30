import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Dashboard.css';

const APPROVAL_META = {
  pending:  { label: '⏳ Pending',  bg: '#fffbeb', color: '#b45309' },
  approved: { label: '✅ Approved', bg: '#f0fdf4', color: '#15803d' },
  rejected: { label: '❌ Rejected', bg: '#fef2f2', color: '#b91c1c' },
};

function ApprovalBadge({ status }) {
  const m = APPROVAL_META[status] || APPROVAL_META.pending;
  return (
    <span style={{
      background: m.bg, color: m.color,
      padding: '2px 10px', borderRadius: 20,
      fontSize: '0.73rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [posts,    setPosts]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [deleting, setDeleting]= useState(null);
  const [filter,   setFilter]  = useState('all');

  useEffect(() => {
    api.get('/posts/my')
      .then(res => setPosts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post permanently?')) return;
    setDeleting(id);
    try {
      await api.delete(`/posts/${id}`);
      setPosts(prev => prev.filter(p => p._id !== id));
    } catch { alert('Delete failed.'); }
    finally { setDeleting(null); }
  };

  const handleToggleStatus = async (post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const res = await api.put(`/posts/${post._id}`, { ...post, status: newStatus });
      setPosts(prev => prev.map(p =>
        p._id === post._id ? { ...p, status: res.data.status, approvalStatus: res.data.approvalStatus } : p
      ));
    } catch { alert('Failed to update status.'); }
  };

  const pendingCount  = posts.filter(p => p.approvalStatus === 'pending').length;
  const approvedCount = posts.filter(p => p.approvalStatus === 'approved').length;
  const rejectedCount = posts.filter(p => p.approvalStatus === 'rejected').length;

  const filtered = filter === 'all'      ? posts
    : filter === 'pending'               ? posts.filter(p => p.approvalStatus === 'pending')
    : filter === 'approved'              ? posts.filter(p => p.approvalStatus === 'approved')
    : filter === 'rejected'              ? posts.filter(p => p.approvalStatus === 'rejected')
    : posts.filter(p => p.status === filter);

  const tabs = [
    { key: 'all',      label: 'All',      count: posts.length },
    { key: 'approved', label: 'Approved', count: approvedCount },
    { key: 'pending',  label: 'Pending',  count: pendingCount },
    { key: 'rejected', label: 'Rejected', count: rejectedCount },
    { key: 'draft',    label: 'Drafts',   count: posts.filter(p=>p.status==='draft').length },
  ];

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Your Stories</h1>
            <p className="dashboard-subtitle">Welcome back, <strong>{user?.name}</strong></p>
          </div>
          <Link to="/editor" className="btn btn-primary">+ New Story</Link>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-num">{posts.length}</span>
            <span className="stat-label">Total Posts</span>
          </div>
          <div className="stat-card">
            <span className="stat-num accent">{approvedCount}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-card">
            <span className="stat-num" style={{ color: '#b45309' }}>{pendingCount}</span>
            <span className="stat-label">Pending Review</span>
          </div>
          <div className="stat-card">
            <span className="stat-num" style={{ color: '#b91c1c' }}>{rejectedCount}</span>
            <span className="stat-label">Rejected</span>
          </div>
        </div>

        {/* Info banner when there are pending posts */}
        {pendingCount > 0 && (
          <div className="approval-info-banner">
            ⏳ <strong>{pendingCount} post{pendingCount > 1 ? 's' : ''}</strong> awaiting admin review. They won't appear publicly until approved.
          </div>
        )}

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {tabs.map(t => (
            <button key={t.key} className={`filter-tab ${filter === t.key ? 'active' : ''}`} onClick={() => setFilter(t.key)}>
              {t.label}
              <span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Posts list */}
        {loading ? (
          <div className="loading-screen" style={{ height: 300 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-dashboard">
            <p className="empty-icon">✦</p>
            <h3>No stories here</h3>
            <Link to="/editor" className="btn btn-primary" style={{ marginTop: 16 }}>Write something</Link>
          </div>
        ) : (
          <div className="posts-list">
            {filtered.map(post => (
              <div key={post._id} className={`post-row ${post.approvalStatus === 'rejected' ? 'post-row--rejected' : ''}`}>
                <div className="post-row-cover">
                  {post.coverImage
                    ? <img src={post.coverImage} alt="" />
                    : <div className="cover-placeholder">✦</div>}
                </div>

                <div className="post-row-info">
                  <div className="post-row-top">
                    <h3 className="post-row-title">
                      {post.status === 'published' && post.approvalStatus === 'approved'
                        ? <Link to={`/post/${post.slug}`}>{post.title}</Link>
                        : post.title}
                    </h3>
                    <span className={`status-badge status-${post.status}`}>{post.status}</span>
                    <ApprovalBadge status={post.approvalStatus} />
                  </div>

                  {/* Rejection reason */}
                  {post.approvalStatus === 'rejected' && post.rejectionReason && (
                    <div className="rejection-reason">
                      <strong>Reason:</strong> {post.rejectionReason}
                    </div>
                  )}

                  <div className="post-row-meta">
                    <span>📅 {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>👁 {(post.views || 0).toLocaleString()} views</span>
                    <span>♥ {post.likes?.length || 0} likes</span>
                    <span>⏱ {post.readTime || 1} min read</span>
                    {post.tags?.length > 0 && <span>🏷 {post.tags.slice(0,2).join(', ')}</span>}
                  </div>
                </div>

                <div className="post-row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/editor/${post._id}`)}>✏ Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggleStatus(post)}>
                    {post.status === 'published' ? '↩ Unpublish' : '🚀 Submit'}
                  </button>
                  {post.status === 'published' && post.approvalStatus === 'approved' && (
                    <Link to={`/post/${post.slug}`} target="_blank" className="btn btn-ghost btn-sm">👁 View</Link>
                  )}
                  <button
                    className="btn btn-ghost btn-sm danger-action"
                    onClick={() => handleDelete(post._id)}
                    disabled={deleting === post._id}
                  >
                    {deleting === post._id ? '…' : '🗑 Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

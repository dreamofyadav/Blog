import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import PostPreviewModal from './PostPreviewModal';

const APPROVAL_BADGE = {
  pending:  { label: 'Pending',  cls: 'badge-pending'  },
  approved: { label: 'Approved', cls: 'badge-approved' },
  rejected: { label: 'Rejected', cls: 'badge-rejected' },
};

export default function AdminPosts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts,    setPosts]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState({});
  const [preview,  setPreview]  = useState(null);
  const [search,   setSearch]   = useState('');

  const approvalFilter = searchParams.get('approval') || '';
  const page           = parseInt(searchParams.get('page') || '1');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (approvalFilter) params.approval = approvalFilter;
      if (search)         params.search   = search;
      const res = await api.get('/admin/posts', { params });
      setPosts(res.data.posts);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, approvalFilter, search]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const setFilter = (v) => setSearchParams(v ? { approval: v } : {});
  const setPage   = (p) => setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', p); return n; });

  const approve = async (id) => {
    setActing(a => ({ ...a, [id]: 'approve' }));
    try {
      await api.patch(`/admin/posts/${id}/approve`);
      setPosts(prev => prev.map(p => p._id === id ? { ...p, approvalStatus: 'approved' } : p));
    } catch { alert('Failed to approve'); }
    finally { setActing(a => ({ ...a, [id]: '' })); }
  };

  const reject = async (id) => {
    const reason = window.prompt('Rejection reason (will be shown to the author):');
    if (reason === null) return;
    setActing(a => ({ ...a, [id]: 'reject' }));
    try {
      await api.patch(`/admin/posts/${id}/reject`, { reason });
      setPosts(prev => prev.map(p => p._id === id ? { ...p, approvalStatus: 'rejected', rejectionReason: reason } : p));
    } catch { alert('Failed to reject'); }
    finally { setActing(a => ({ ...a, [id]: '' })); }
  };

  const deletePost = async (id, title) => {
    if (!window.confirm(`Delete "${title}" permanently? This cannot be undone.`)) return;
    setActing(a => ({ ...a, [id]: 'delete' }));
    try {
      await api.delete(`/admin/posts/${id}`);
      setPosts(prev => prev.filter(p => p._id !== id));
      setTotal(t => t - 1);
    } catch { alert('Failed to delete'); }
    finally { setActing(a => ({ ...a, [id]: '' })); }
  };

  const FILTERS = [
    { key: '',         label: 'All'      },
    { key: 'pending',  label: '⏳ Pending' },
    { key: 'approved', label: '✅ Approved'},
    { key: 'rejected', label: '❌ Rejected'},
  ];

  return (
    <div className="admin-page">
      {preview && <PostPreviewModal postId={preview} onClose={() => setPreview(null)} onApprove={approve} onReject={reject} />}

      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">All Posts</h1>
          <p className="admin-page-sub">{total} total posts</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="filter-pills">
          {FILTERS.map(f => (
            <button key={f.key} className={`filter-pill ${approvalFilter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="admin-search">
          <input
            type="text"
            placeholder="Search by title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchPosts()}
          />
          <button className="btn btn-primary btn-sm" onClick={fetchPosts}>Search</button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading"><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="admin-empty"><span>📭</span><p>No posts found.</p></div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => {
                  const b    = APPROVAL_BADGE[post.approvalStatus] || APPROVAL_BADGE.pending;
                  const busy = acting[post._id];
                  const date = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
                  return (
                    <tr key={post._id} className={post.approvalStatus === 'rejected' ? 'row-rejected' : ''}>
                      <td className="td-title">
                        <button className="table-title-link" onClick={() => setPreview(post._id)}>
                          {post.title}
                        </button>
                        {post.approvalStatus === 'rejected' && post.rejectionReason && (
                          <span className="td-rejection-hint">{post.rejectionReason}</span>
                        )}
                        <span className="td-meta">{post.readTime} min · {post.views} views</span>
                      </td>
                      <td>
                        <div className="td-author">
                          <div className="mini-avatar">{post.author?.name?.charAt(0).toUpperCase()}</div>
                          {post.author?.name}
                        </div>
                      </td>
                      <td><span className={`status-badge status-${post.status}`}>{post.status}</span></td>
                      <td><span className={`approval-badge ${b.cls}`}>{b.label}</span></td>
                      <td className="td-date">{date}</td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-preview" onClick={() => setPreview(post._id)} title="Preview">👁</button>
                          {post.approvalStatus !== 'approved' && (
                            <button className="btn-approve" onClick={() => approve(post._id)} disabled={!!busy}>
                              {busy === 'approve' ? '…' : '✓'}
                            </button>
                          )}
                          {post.approvalStatus !== 'rejected' && (
                            <button className="btn-reject" onClick={() => reject(post._id)} disabled={!!busy}>
                              {busy === 'reject' ? '…' : '✕'}
                            </button>
                          )}
                          <button className="btn-delete" onClick={() => deletePost(post._id, post.title)} disabled={!!busy}>
                            {busy === 'delete' ? '…' : '🗑'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="admin-pagination">
              <button className="btn btn-outline btn-sm" onClick={() => setPage(page - 1)} disabled={page === 1}>← Prev</button>
              <span className="page-label">Page {page} of {pages}</span>
              <button className="btn btn-outline btn-sm" onClick={() => setPage(page + 1)} disabled={page === pages}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

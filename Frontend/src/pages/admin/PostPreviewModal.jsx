import { useState, useEffect } from 'react';
import api from '../../utils/api';
import './PostPreviewModal.css';

export default function PostPreviewModal({ postId, onClose, onApprove, onReject }) {
  const [post,    setPost]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState('');

  useEffect(() => {
    api.get(`/admin/posts/${postId}`)
      .then(r => setPost(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Close on Escape
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [postId, onClose]);

  const handleApprove = async () => {
    setActing('approve');
    await onApprove(postId);
    setPost(p => p ? { ...p, approvalStatus: 'approved' } : p);
    setActing('');
  };

  const handleReject = async () => {
    setActing('reject');
    await onReject(postId);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Post Preview</h2>
          <div className="modal-header-actions">
            {post && post.approvalStatus === 'pending' && (
              <>
                <button className="btn-approve" onClick={handleApprove} disabled={!!acting}>
                  {acting === 'approve' ? 'Approving…' : '✓ Approve'}
                </button>
                <button className="btn-reject" onClick={handleReject} disabled={!!acting}>
                  {acting === 'reject' ? 'Rejecting…' : '✕ Reject'}
                </button>
              </>
            )}
            {post && post.approvalStatus !== 'pending' && (
              <span className={`approval-badge badge-${post.approvalStatus}`}>
                {post.approvalStatus === 'approved' ? '✅ Approved' : '❌ Rejected'}
              </span>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading ? (
            <div className="modal-loading"><div className="spinner" /></div>
          ) : !post ? (
            <p>Could not load post.</p>
          ) : (
            <>
              {post.coverImage && (
                <img src={post.coverImage} alt="Cover" className="modal-cover" />
              )}

              <div className="modal-meta">
                <div className="modal-author">
                  <div className="mini-avatar">{post.author?.name?.charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{post.author?.name}</strong>
                    <span>{post.author?.email}</span>
                  </div>
                </div>
                <div className="modal-stats">
                  <span>📅 {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>⏱ {post.readTime} min read</span>
                  <span>👁 {post.views} views</span>
                  {post.tags?.length > 0 && (
                    <span>{post.tags.map(t => <span key={t} className="tag" style={{ marginRight: 4 }}>{t}</span>)}</span>
                  )}
                </div>
              </div>

              {post.rejectionReason && (
                <div className="modal-rejection">
                  <strong>Rejection reason:</strong> {post.rejectionReason}
                </div>
              )}

              <h1 className="modal-post-title">{post.title}</h1>

              <div
                className="modal-post-content post-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

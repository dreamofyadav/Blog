import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import './Comments.css';

export default function Comments({ postId }) {
  const { user } = useAuth();
  const [comments, setComments]   = useState([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get(`/posts/${postId}/comments`)
      .then(r => setComments(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await api.post(`/posts/${postId}/comments`, { content: text });
      setComments(prev => [r.data, ...prev]);
      setText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/posts/${postId}/comments/${id}`);
      setComments(prev => prev.filter(c => c._id !== id));
    } catch {
      alert('Could not delete comment');
    }
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60)   return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <section className="comments-section">
      <h3 className="comments-title">
        Discussion
        {comments.length > 0 && <span className="comments-count">{comments.length}</span>}
      </h3>

      {/* Compose */}
      {user ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <div className="comment-form-avatar">{user.name?.charAt(0).toUpperCase()}</div>
          <div className="comment-form-body">
            <textarea
              className="comment-textarea"
              placeholder="Share your thoughts…"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              maxLength={1000}
              required
            />
            {error && <p className="comment-error">{error}</p>}
            <div className="comment-form-footer">
              <span className="char-count">{text.length}/1000</span>
              <button className="btn btn-primary btn-sm" type="submit" disabled={submitting || !text.trim()}>
                {submitting ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="comment-login-prompt">
          <Link to="/login" className="btn btn-outline btn-sm">Sign in to comment</Link>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="comments-loading">
          {[1,2,3].map(i => <div key={i} className="comment-skeleton" />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="no-comments">No comments yet. Be the first!</p>
      ) : (
        <ul className="comments-list">
          {comments.map(c => (
            <li key={c._id} className="comment-item">
              <div className="comment-avatar">{c.author?.name?.charAt(0).toUpperCase()}</div>
              <div className="comment-body">
                <div className="comment-header">
                  <strong className="comment-author">{c.author?.name}</strong>
                  <span className="comment-time">{timeAgo(c.createdAt)}</span>
                  {user?._id === c.author?._id && (
                    <button
                      className="comment-delete"
                      onClick={() => handleDelete(c._id)}
                      title="Delete comment"
                    >✕</button>
                  )}
                </div>
                <p className="comment-text">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

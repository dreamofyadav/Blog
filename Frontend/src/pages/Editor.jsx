import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RichEditor from '../components/RichEditor';
import api from '../utils/api';
import './Editor.css';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const coverInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const isEditing = Boolean(id);

  // Load existing post
  useEffect(() => {
    if (id) {
      api.get(`/posts/${id}`)
        .then(res => {
          const p = res.data;
          setTitle(p.title || '');
          setContent(p.content || '');
          setTags((p.tags || []).join(', '));
          setCoverImage(p.coverImage || '');
          setCoverPreview(p.coverImage || '');
          setStatus(p.status || 'draft');
        })
        .catch(() => setError('Could not load post.'));
    }
  }, [id]);

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Cover image must be under 5MB'); return; }

    setCoverUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCoverImage(res.data.url);
      setCoverPreview(res.data.url);
    } catch {
      setError('Cover image upload failed.');
    } finally {
      setCoverUploading(false);
    }
    e.target.value = '';
  };

  const handleSave = async (publishStatus) => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!content || content === '<p><br></p>') { setError('Content cannot be empty'); return; }

    setSaving(true);
    setError('');

    const payload = {
      title: title.trim(),
      content,
      coverImage,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      status: publishStatus || status,
    };

    try {
      if (isEditing) {
        await api.put(`/posts/${id}`, payload);
      } else {
        await api.post('/posts', payload);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (publishStatus === 'published') navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const wordCount = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="editor-page">
      {/* Top bar */}
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <button onClick={() => navigate('/dashboard')} className="btn btn-ghost btn-sm">
            ← Back
          </button>
          <span className="editor-meta-info">
            {wordCount} words · {readTime} min read
          </span>
          {saved && <span className="saved-indicator">✓ Saved</span>}
        </div>
        <div className="editor-topbar-right">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            {isEditing && status === 'published' ? 'Update' : 'Publish →'}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        {/* Main editor column */}
        <div className="editor-main">
          {error && <div className="error-message">{error}</div>}

          {/* Cover image */}
          <div className="cover-image-section">
            {coverPreview ? (
              <div className="cover-preview-wrapper">
                <img src={coverPreview} alt="Cover" className="cover-preview" />
                <div className="cover-preview-overlay">
                  <button className="btn btn-sm btn-outline" onClick={() => coverInputRef.current?.click()}>
                    Change Cover
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => { setCoverImage(''); setCoverPreview(''); }}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="cover-upload-btn"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
              >
                {coverUploading ? '⏳ Uploading…' : '＋ Add Cover Image'}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleCoverUpload}
            />
          </div>

          {/* Title */}
          <input
            className="title-input"
            type="text"
            placeholder="Your story title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
          />

          {/* Rich Editor */}
          <RichEditor value={content} onChange={setContent} />
        </div>

        {/* Sidebar */}
        <aside className="editor-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-heading">Post Settings</h3>

            <div className="form-group">
              <label>Status</label>
              <div className="status-toggle">
                <button
                  className={`status-opt ${status === 'draft' ? 'active' : ''}`}
                  onClick={() => setStatus('draft')}
                  type="button"
                >
                  Draft
                </button>
                <button
                  className={`status-opt ${status === 'published' ? 'active' : ''}`}
                  onClick={() => setStatus('published')}
                  type="button"
                >
                  Published
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Tags</label>
              <input
                type="text"
                placeholder="tech, design, life…"
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
              <p className="field-hint">Comma-separated tags</p>
            </div>

            {tags && (
              <div className="tags-preview">
                {tags.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                  <span key={i} className="tag">{t}</span>
                ))}
              </div>
            )}

            <hr className="sidebar-divider" />

            <div className="sidebar-stats">
              <div className="stat-row">
                <span>Words</span>
                <strong>{wordCount}</strong>
              </div>
              <div className="stat-row">
                <span>Read time</span>
                <strong>{readTime} min</strong>
              </div>
              <div className="stat-row">
                <span>Characters</span>
                <strong>{content.replace(/<[^>]*>/g, '').length}</strong>
              </div>
            </div>
          </div>

          <div className="sidebar-tips">
            <p className="tip-title">💡 Editor Tips</p>
            <ul>
              <li>Drag & drop images anywhere in the editor</li>
              <li>Paste screenshots directly (Ctrl+V)</li>
              <li>Click caption below image to edit it</li>
              <li>Use H1/H2/H3 buttons for structure</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

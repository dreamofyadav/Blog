import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Comments from '../components/Comments';
import './PostPage.css';

export default function PostPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    api.get(`/posts/slug/${slug}`)
      .then(res => {
        setPost(res.data);
        setLikeCount(res.data.likes?.length || 0);
        if (user) setLiked(res.data.likes?.includes(user._id));
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [slug, user, navigate]);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    if (liking) return;
    setLiking(true);
    try {
      const res = await api.post(`/posts/${post._id}/like`);
      setLiked(res.data.liked);
      setLikeCount(res.data.likes);
    } catch (e) { console.error(e); }
    finally { setLiking(false); }
  };

  if (loading) return (
    <div className="post-page-loading">
      <div className="spinner" />
    </div>
  );

  if (!post) return null;

  const date = new Date(post.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const isAuthor = user && post.author?._id === user._id;

  return (
    <div className="post-page">
      {/* Back */}
      <div className="post-nav">
        <div className="container post-nav-inner">
          <Link to="/" className="btn btn-ghost btn-sm">← All Stories</Link>
          {isAuthor && (
            <Link to={`/editor/${post._id}`} className="btn btn-outline btn-sm">
              ✏ Edit Post
            </Link>
          )}
        </div>
      </div>

      <article className="post-article">
        {/* Header */}
        <header className="post-header container">
          {post.tags?.length > 0 && (
            <div className="post-tags">
              {post.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
          <h1 className="post-title">{post.title}</h1>

          <div className="post-meta">
            <div className="post-author">
              <div className="author-avatar-lg">
                {post.author?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="author-name-lg">{post.author?.name}</p>
                <p className="post-date-line">
                  {date} · {post.readTime} min read · {post.views} views
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="post-cover">
            <img src={post.coverImage} alt={post.title} />
          </div>
        )}

        {/* Content */}
        <div
          className="post-content container"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Footer actions */}
        <div className="post-footer container">
          <div className="like-section">
            <button
              className={`like-btn ${liked ? 'liked' : ''}`}
              onClick={handleLike}
              disabled={liking}
              title={user ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
            >
              <span className="like-icon">{liked ? '♥' : '♡'}</span>
              <span>{likeCount}</span>
            </button>
            <span className="like-label">
              {!user ? 'Sign in to like this story' : liked ? 'You liked this' : 'Enjoyed this story?'}
            </span>
          </div>

          <div className="post-footer-author">
            <div className="author-avatar-lg">{post.author?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <p className="about-author-label">Written by</p>
              <p className="author-name-lg">{post.author?.name}</p>
              {post.author?.bio && <p className="author-bio">{post.author.bio}</p>}
            </div>
          </div>

          <Link to="/" className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>
            ← More Stories
          </Link>
        </div>

        {/* Comments */}
        <div className="container" style={{ maxWidth: 760 }}>
          <Comments postId={post._id} />
        </div>
      </article>
    </div>
  );
}

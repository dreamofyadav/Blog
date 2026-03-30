import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import './Home.css';

function PostCard({ post }) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <article className="post-card">
      {post.coverImage && (
        <Link to={`/post/${post.slug}`} className="card-image-wrap">
          <img src={post.coverImage} alt={post.title} className="card-image" />
        </Link>
      )}
      <div className="card-body">
        {post.tags?.length > 0 && (
          <div className="card-tags">
            {post.tags.slice(0, 2).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
        <h2 className="card-title">
          <Link to={`/post/${post.slug}`}>{post.title}</Link>
        </h2>
        {/* <p className="card-excerpt">{post.excerpt}</p> */}
        <p className="card-excerpt" dangerouslySetInnerHTML={{__html: post.excerpt}} />
        <div className="card-footer">
          <div className="card-author">
            <div className="author-avatar">{post.author?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <span className="author-name">{post.author?.name}</span>
              <span className="card-date">{date}</span>
            </div>
          </div>
          <span className="read-time">{post.readTime} min read</span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [allTags, setAllTags] = useState([]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 9 };
      if (search) params.search = search;
      if (activeTag) params.tag = activeTag;
      const res = await api.get('/posts', { params });

      const postsData = Array.isArray(res.data?.posts) ? res.data.posts : [];
        setPosts(postsData);
        setTotalPages(res.data?.pages || 1);
    //   setPosts(res.data.posts);
    //   setTotalPages(res.data.pages);

      // Collect all tags
      const tagSet = new Set();
      postsData.forEach(p => p.tags?.forEach(t => tagSet.add(t)));
      
      if (page === 1) {
        setAllTags(prev => {
        const merged = new Set([...prev, ...tagSet]);
        return [...merged].slice(0, 12);
      });
    }
    } catch (e) {
      console.error("failed to fetch posts: ", e);
       // ✅ Prevent broken UI on error
        setPosts([]);
        setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTag]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleTagClick = (tag) => {
    setActiveTag(prev => prev === tag ? '' : tag);
    setPage(1);
  };

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-decoration">✦</div>
        <div className="container hero-content">
          <h1 className="hero-title">Stories worth<br /><em>reading</em></h1>
          <p className="hero-subtitle">
            Thoughtful writing on technology, design, and the human experience.
          </p>
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search stories…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
        </div>
      </section>

      <div className="container">
        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="tags-filter">
            <button
              className={`tag-filter-btn ${!activeTag ? 'active' : ''}`}
              onClick={() => { setActiveTag(''); setPage(1); }}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-filter-btn ${activeTag === tag ? 'active' : ''}`}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Results info */}
        {(search || activeTag) && (
          <div className="filter-info">
            {search && <span>Results for "<strong>{search}</strong>"</span>}
            {activeTag && <span>Tagged: <strong>{activeTag}</strong></span>}
            <button className="clear-filters" onClick={() => { setSearch(''); setSearchInput(''); setActiveTag(''); setPage(1); }}>
              Clear filters ✕
            </button>
          </div>
        )}

        {/* Posts grid */}
        {loading ? (
          <div className="posts-loading">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <h3>No stories found</h3>
            <p>Try a different search or tag filter.</p>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => <PostCard key={post._id} post={post} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-outline"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
            >
              ← Previous
            </button>
            <span className="page-info">{page} / {totalPages}</span>
            <button
              className="btn btn-outline"
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── PUBLIC ───────────

// GET all approved + published posts (with pagination)(home page feed)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const tag = req.query.tag;
    const search = req.query.search;

    // let query = { status: 'published' };
    let query = { status: 'published', approvalStatus: 'approved' };
    if (tag) query.tags = tag;
    // if (search) query.$text = { $search: search };
    if (search) query.title = { $regex: search, $options: 'i' };

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-content');

    res.json({ posts, total, pages: Math.ceil(total / limit), page });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single post by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug,
       status:'published', 
       approvalStatus:'approved',
       }).populate('author', 'name avatar bio');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Increment views
    post.views++;
    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── AUTHOR ────────────

// GET user's own posts (all statuses + approval states)
router.get('/my', auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .select('-content');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single post by ID (for editing author only)
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE post — always starts as pending review (unless draft)
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, coverImage, tags, status } = req.body;
    const post = new Post({
      title, content, coverImage,
      tags: tags || [],
      status: status || 'draft',
       // When user submits for publish → goes to pending review
      // Draft stays pending too (won't show publicly until approved)
      approvalStatus: 'pending',
      author: req.user._id,
    });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE post
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    if (!post) return res.status(404).json({ message: 'Not found or unauthorized' });

    const { title, content, coverImage, tags, status } = req.body;
    const contentChanged = title !== post.title || content !== post.content;

    Object.assign(post, { title, content, coverImage, tags, status });
     // If the post was approved and the author edits content, reset to pending
    if (contentChanged && post.approvalStatus === 'approved') {
      post.approvalStatus = 'pending';
      post.approvedAt  = undefined;
      post.approvedBy  = undefined;
      post.rejectionReason = '';
    }
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id });
    if (!post) return res.status(404).json({ message: 'Not found or unauthorized' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LIKE / UNLIKE post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const idx = post.likes.indexOf(req.user._id);
    if (idx === -1) post.likes.push(req.user._id);
    else post.likes.splice(idx, 1);

    await post.save();
    res.json({ likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

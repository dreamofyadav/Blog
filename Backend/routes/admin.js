const express = require('express');
const Post    = require('../models/Post');
const User    = require('../models/User');
const auth    = require('../middleware/auth');
const admin   = require('../middleware/admin');

const router = express.Router();
// All routes here require auth + admin role
router.use(auth, admin);

// ── POSTS ──────────────────────────────────────────────────────────────────

// GET all posts with optional filter: ?approval=pending|approved|rejected&status=draft|published&search=
router.get('/posts', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const { approval, status, search } = req.query;

    const query = {};
    if (approval) query.approvalStatus = approval;
    if (status)   query.status         = status;
    if (search)   query.title          = { $regex: search, $options: 'i' };

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('author', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-content');

    res.json({ posts, total, pages: Math.ceil(total / limit), page });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET stats for admin dashboard
router.get('/stats', async (req, res) => {
  try {
    const [
      totalPosts, pending, approved, rejected,
      totalUsers, publishedPosts, draftPosts,
    ] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ approvalStatus: 'pending' }),
      Post.countDocuments({ approvalStatus: 'approved' }),
      Post.countDocuments({ approvalStatus: 'rejected' }),
      User.countDocuments({ role: 'user' }),
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' }),
    ]);

    res.json({ totalPosts, pending, approved, rejected, totalUsers, publishedPosts, draftPosts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single post (full content) for admin preview
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name email avatar')
      .populate('approvedBy', 'name');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// APPROVE post
router.patch('/posts/:id/approve', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.approvalStatus  = 'approved';
    post.rejectionReason = '';
    post.approvedAt      = new Date();
    post.approvedBy      = req.user._id;
    await post.save();

    res.json({ message: 'Post approved', post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// REJECT post
router.patch('/posts/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.approvalStatus  = 'rejected';
    post.rejectionReason = reason || 'Does not meet content guidelines.';
    post.approvedAt      = undefined;
    post.approvedBy      = undefined;
    await post.save();

    res.json({ message: 'Post rejected', post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE any post (admin power)
router.delete('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted by admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── USERS ──────────────────────────────────────────────────────────────────

// GET all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PROMOTE / DEMOTE user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });

    // Prevent self-demotion
    if (req.params.id === req.user._id.toString() && role !== 'admin')
      return res.status(400).json({ message: 'Cannot demote yourself' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

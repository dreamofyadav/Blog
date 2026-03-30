const express = require('express');
const Comment = require('../models/Comment');
const auth    = require('../middleware/auth');

const router = express.Router({ mergeParams: true }); // needs mergeParams for :postId

// GET comments for a post
router.get('/', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new comment
router.post('/', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

    const comment = await Comment.create({
      post:    req.params.postId,
      author:  req.user._id,
      content: content.trim(),
    });

    const populated = await comment.populate('author', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE comment (author only)
router.delete('/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findOneAndDelete({
      _id:    req.params.commentId,
      author: req.user._id,
    });
    if (!comment) return res.status(404).json({ message: 'Not found or unauthorized' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

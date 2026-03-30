const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  content:     { type: String, required: true },
  excerpt:     { type: String, default: '' },
  coverImage:  { type: String, default: '' },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags:        [{ type: String, trim: true }],

  // User-facing publish intent: 'draft' | 'published'
  // A post only appears publicly when status='published' AND approvalStatus='approved'
  status:      { type: String, enum: ['draft', 'published'], default: 'draft' },

  // Admin approval gate: 'pending' | 'approved' | 'rejected'
  approvalStatus:   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason:  { type: String, default: '' },
  approvedAt:       { type: Date },
  approvedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  slug:     { type: String, unique: true },
  views:    { type: Number, default: 0 },
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readTime: { type: Number, default: 1 },
}, { timestamps: true });

// Strip contenteditable / data-placeholder so saved HTML is read-only
const stripEditableAttrs = (html) =>
  html
    .replace(/\s?contenteditable="[^"]*"/gi, '')
    .replace(/\s?data-placeholder="[^"]*"/gi, '');

    // Auto-generate slug from title
postSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now();
  }

  // Sanitize HTML: remove contenteditable so published posts are truly read-only
  if (this.isModified('content')) {
    this.content = stripEditableAttrs(this.content);
  }

   // Auto-generate excerpt from content (strip HTML)
  if (this.isModified('content') && !this.excerpt) {
    const stripped = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = stripped.substring(0, 160) + (stripped.length > 160 ? '...' : '');
  }

   // Estimate read time (avg 200 words/min)
  if (this.isModified('content')) {
    const wordCount = this.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  next();
});

module.exports = mongoose.model('Post', postSchema);

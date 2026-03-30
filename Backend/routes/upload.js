
const express  = require('express');
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const auth     = require('../middleware/auth');

const router = express.Router();

// ── Configure Cloudinary ────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── File filter — validate MIME type before upload ───────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files (jpg, png, gif, webp) are allowed'), false);
};

// ── Multer instance (temporary storage) ─────────────────────────────────
const upload = multer({
  dest: 'uploads/',                     // temp local storage
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter,
});

// ── POST /api/upload/image ─────────────────────────────────────────────
router.post('/image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary with your transformations
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'BlogAnki',
      transformation: [
        { width: 1400, crop: 'limit' },
        { quality: 'auto' },
      ],
      fetch_format: 'auto', // serve webp/avif when browser supports
      public_id: `img_${Date.now()}`,
    });

    // Delete local temp file
    fs.unlinkSync(req.file.path);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/image/:public_id', auth, async (req, res) => {
  try {
    const result = await cloudinary.uploader.destroy(req.params.public_id);
    if (result.result === 'ok') {
      res.json({ message: 'Image deleted from Cloudinary' });
    } else {
      res.status(404).json({ message: 'Image not found on Cloudinary' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Error handler ───────────────────────────────────────────────────────────
router.use((err, req, res, next) => {
  res.status(400).json({ message: err.message });
});

module.exports = router;
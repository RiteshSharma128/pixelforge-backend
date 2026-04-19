const express  = require('express');
const router   = express.Router();
const archiver = require('archiver');
const { protect }     = require('../middleware/auth');
const { deleteImage } = require('../config/cloudinary');
const { Image }       = require('../models');

// GET /api/gallery/download-zip  ← MUST be before /:id
router.get('/download-zip', protect, async (req, res) => {
  try {
    const images = await Image.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    if (!images.length) return res.status(404).json({ success: false, message: 'No images in gallery' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=pixelforge-gallery.zip');
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);
    for (const [i, img] of images.entries()) {
      const b64 = img.url.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(b64, 'base64');
      archive.append(buf, { name: `${i+1}-${img.type}.png` });
    }
    await archive.finalize();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/gallery?type=&page=&limit=&favorite=
router.get('/', protect, async (req, res) => {
  try {
    const { type, page = 1, limit = 24, favorite } = req.query;
    const q = { user: req.user._id };
    if (type)              q.type       = type;
    if (favorite === 'true') q.isFavorite = true;
    const images = await Image.find(q)
      .sort({ createdAt: -1 })
      .limit(+limit)
      .skip((+page - 1) * +limit)
      .select('-__v');
    const total = await Image.countDocuments(q);
    res.json({ success: true, images, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PATCH /api/gallery/:id/favorite  ← before DELETE /:id
router.patch('/:id/favorite', protect, async (req, res) => {
  try {
    const img = await Image.findOne({ _id: req.params.id, user: req.user._id });
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });
    img.isFavorite = !img.isFavorite;
    await img.save();
    res.json({ success: true, isFavorite: img.isFavorite });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/gallery/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const img = await Image.findOne({ _id: req.params.id, user: req.user._id });
    if (!img) return res.status(404).json({ success: false, message: 'Image not found' });
    if (img.publicId) await deleteImage(img.publicId);
    await img.deleteOne();
    res.json({ success: true, message: 'Image deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/gallery  (clear all)
router.delete('/', protect, async (req, res) => {
  try {
    const imgs = await Image.find({ user: req.user._id });
    for (const img of imgs) {
      if (img.publicId) await deleteImage(img.publicId);
    }
    await Image.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'Gallery cleared' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;

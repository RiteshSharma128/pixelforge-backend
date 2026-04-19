const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { BrandKit } = require('../models');

router.get('/', protect, async (req, res) => {
  try {
    let kit = await BrandKit.findOne({ user: req.user._id });
    if (!kit) kit = await BrandKit.create({ user: req.user._id });
    res.json({ success: true, kit });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/', protect, async (req, res) => {
  try {
    const allowed = ['colors','headingFont','bodyFont','tagline','mission','logoUrl','logoPublicId'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const kit = await BrandKit.findOneAndUpdate({ user: req.user._id }, updates, { new: true, upsert: true });
    res.json({ success: true, message: 'Brand kit saved!', kit });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;

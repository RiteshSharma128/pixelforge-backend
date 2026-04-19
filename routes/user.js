const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { User, Image, TeamMember, Comment } = require('../models');

// PUT /api/user/api-keys  ← FIXED: only save non-empty values
router.put('/api-keys', protect, async (req, res) => {
  try {
    const fields = ['huggingface','removebg','cloudinaryName','cloudinaryKey','cloudinarySecret','cloudinaryPreset'];
    const updates = {};
    fields.forEach(f => {
      if (req.body[f] !== undefined && req.body[f].trim && req.body[f].trim() !== '') {
        updates[`apiKeys.${f}`] = req.body[f].trim();
      } else if (req.body[f] !== undefined && typeof req.body[f] === 'string' && req.body[f] !== '') {
        updates[`apiKeys.${f}`] = req.body[f];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Please enter at least one API key to save' });
    }

    await User.findByIdAndUpdate(req.user._id, { $set: updates });
    res.json({ success: true, message: 'API keys saved securely! ✅' });
  } catch (e) {
    console.error('API keys save error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to save: ' + e.message });
  }
});

// GET /api/user/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const total = await Image.countDocuments({ user: req.user._id });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Image.countDocuments({ user: req.user._id, createdAt: { $gte: today } });
    const team = await TeamMember.countDocuments({ workspace: req.user._id, status: 'active' });
    const comments = await Comment.countDocuments({ workspace: req.user._id });
    res.json({ success: true, stats: { total, todayCount, team, comments } });
  } catch (e) {
    console.error('Stats error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/user/account
router.delete('/account', protect, async (req, res) => {
  try {
    const { BrandKit } = require('../models');
    await Promise.all([
      Image.deleteMany({ user: req.user._id }),
      TeamMember.deleteMany({ workspace: req.user._id }),
      Comment.deleteMany({ workspace: req.user._id }),
      BrandKit.deleteOne({ user: req.user._id }),
      User.findByIdAndDelete(req.user._id)
    ]);
    res.clearCookie('pf_token', { path: '/' });
    res.json({ success: true, message: 'Account deleted.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;

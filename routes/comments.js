const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Comment } = require('../models');

router.get('/', protect, async (req, res) => {
  try {
    const comments = await Comment.find({ workspace: req.user._id }).sort({ createdAt: -1 }).populate('user','name avatar');
    res.json({ success: true, comments });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { text, ref='General', imageId } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Text required' });
    const c = await Comment.create({ user: req.user._id, workspace: req.user._id, text: text.trim(), ref, imageId: imageId||null });
    await c.populate('user','name avatar');
    res.status(201).json({ success: true, comment: c });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Reply text required' });
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Comment not found' });
    c.replies.push({ author: req.user._id, authorName: req.user.name, authorAvatar: req.user.avatar, text: text.trim() });
    await c.save();
    res.json({ success: true, comment: c });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:id/resolve', protect, async (req, res) => {
  try {
    const c = await Comment.findByIdAndUpdate(req.params.id, { isResolved: true }, { new: true });
    res.json({ success: true, comment: c });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Comment.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;

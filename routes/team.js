const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { TeamMember } = require('../models');

router.get('/', protect, async (req, res) => {
  try {
    const members = await TeamMember.find({ workspace: req.user._id, status: { $ne: 'removed' } });
    res.json({ success: true, members });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { email, name, role='member', avatar='👤', color='#6d28d9' } = req.body;
    if (!email || !name) return res.status(400).json({ success: false, message: 'Email and name required' });
    if (await TeamMember.findOne({ workspace: req.user._id, email, status: { $ne: 'removed' } }))
      return res.status(409).json({ success: false, message: 'Already in workspace' });
    const m = await TeamMember.create({ workspace: req.user._id, email, name, role, avatar, color });
    res.status(201).json({ success: true, message: 'Member invited!', member: m });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:id', protect, async (req, res) => {
  try {
    const m = await TeamMember.findOneAndUpdate({ _id: req.params.id, workspace: req.user._id }, { role: req.body.role }, { new: true });
    if (!m) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, member: m });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await TeamMember.findOneAndUpdate({ _id: req.params.id, workspace: req.user._id }, { status: 'removed' });
    res.json({ success: true, message: 'Member removed' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;

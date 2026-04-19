const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { protect, sendToken } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
  next();
};

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
], validate, async (req, res) => {
  try {
    const { name, email, password, workspace, avatar, role, plan } = req.body;
    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: 'Email already registered' });
    const user = await User.create({
      name,
      email,
      password,
      workspace: workspace || 'My Studio',
      avatar: avatar || '🎨',
      role: role || 'Designer',
      plan: plan || 'free'
    });
    sendToken(user, 201, res, 'Account created! Welcome to PixelForge 🎉');
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ success: false, message: 'Registration failed: ' + e.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    user.stats.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });
    sendToken(user, 200, res, `Welcome back, ${user.name.split(' ')[0]}! 👋`);
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// POST /api/auth/demo
router.post('/demo', async (req, res) => {
  try {
    let demo = await User.findOne({ email: 'demo@pixelforge.ai' });
    if (!demo) {
      demo = await User.create({
        name: 'Demo Creator',
        email: 'demo@pixelforge.ai',
        password: 'DemoPass#2024!!',
        avatar: '🚀',
        role: 'Designer',
        plan: 'pro',
        workspace: 'Demo Studio',
        isDemo: true
      });
    }
    sendToken(demo, 200, res, 'Demo mode activated! 🚀');
  } catch (e) {
    console.error('Demo error:', e.message);
    res.status(500).json({ success: false, message: 'Demo login failed' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('pf_token', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

// PUT /api/auth/profile  ← FIXED
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, avatar, role, workspace, plan } = req.body;
    const updates = {};
    if (name      && name.trim())      updates.name      = name.trim();
    if (avatar)                        updates.avatar    = avatar;
    if (role)                          updates.role      = role;
    if (workspace && workspace.trim()) updates.workspace = workspace.trim();
    if (plan && ['free','pro','team'].includes(plan)) updates.plan = plan;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Profile updated!', user: user.toSafeObject() });
  } catch (e) {
    console.error('Profile update error:', e.message);
    res.status(500).json({ success: false, message: 'Profile update failed: ' + e.message });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ success: false, message: 'New password min 8 chars' });
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword)))
      return res.status(401).json({ success: false, message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;

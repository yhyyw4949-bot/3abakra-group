// routes/auth.js - Authentication routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be 6+ characters' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      if (existing.email === email.toLowerCase())
        return res.status(400).json({ error: 'Email already registered' });
      return res.status(400).json({ error: 'Username already taken' });
    }

    // First registered user becomes admin
    const count = await User.countDocuments();
    const user = new User({
      username, email, password,
      role: count === 0 ? 'admin' : 'member'
    });
    await user.save();
    // Award welcome badge & XP
    user.badges.push('welcome');
    await user.addXP(50);

    req.session.userId = user._id.toString();
    res.json({
      success: true,
      user: { id: user._id, username: user.username, role: user.role, xp: user.xp, level: user.level }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    req.session.userId = user._id.toString();
    res.json({
      success: true,
      user: { id: user._id, username: user.username, role: user.role, xp: user.xp, level: user.level, badges: user.badges }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.session.userId, { isOnline: false, lastSeen: new Date() });
    req.session.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      ...user.toObject(),
      rankTitle: user.getRankTitle(),
      xpProgress: user.xpProgress(),
      xpForNextLevel: user.xpForNextLevel()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { bio, github, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { bio, github, avatar },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;

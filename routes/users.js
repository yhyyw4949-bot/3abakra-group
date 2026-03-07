// routes/users.js - User & leaderboard routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .select('username avatar xp level badges role joinedAt')
      .sort({ xp: -1 })
      .limit(50);
    const ranked = users.map((u, i) => ({
      ...u.toObject(),
      rank: i + 1,
      rankTitle: u.getRankTitle()
    }));
    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/users/online
router.get('/online', async (req, res) => {
  try {
    const users = await User.find({ isOnline: true })
      .select('username avatar level role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const projects = await Project.find({ author: user._id }).sort({ createdAt: -1 }).limit(6);
    res.json({
      ...user.toObject(),
      rankTitle: user.getRankTitle(),
      xpProgress: user.xpProgress(),
      xpForNextLevel: user.xpForNextLevel(),
      projects
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users - Admin: all users
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/users/:id/role - Admin: change role
router.put('/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/users/:id - Admin: delete user
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.session.userId)
      return res.status(400).json({ error: 'Cannot delete yourself' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/users/:id/xp - Admin: award XP
router.put('/:id/xp', requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.addXP(Number(amount));
    res.json({ success: true, xp: user.xp, level: user.level });
  } catch (err) {
    res.status(500).json({ error: 'Failed to award XP' });
  }
});

module.exports = router;

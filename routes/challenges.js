// routes/challenges.js - Challenge routes
const express = require('express');
const router = express.Router();
const { Challenge } = require('../models/models');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/challenges
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// GET /api/challenges/:id
router.get('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('completedBy', 'username avatar level');
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

// POST /api/challenges - Admin creates challenge
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, description, difficulty, xpReward, category, tags, expiresAt } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

    const challenge = new Challenge({
      title, description, difficulty,
      xpReward: xpReward || 100,
      category, tags, expiresAt,
      createdBy: req.session.userId
    });
    await challenge.save();
    res.json({ success: true, challenge });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// POST /api/challenges/:id/complete - Mark as completed
router.post('/:id/complete', requireAuth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.status === 'closed') return res.status(400).json({ error: 'Challenge is closed' });

    const user = await User.findById(req.session.userId);
    if (challenge.completedBy.includes(user._id))
      return res.status(400).json({ error: 'Already completed' });

    challenge.completedBy.push(user._id);
    await challenge.save();

    user.completedChallenges.push(challenge._id);
    const result = await user.addXP(challenge.xpReward);
    await user.checkBadges();
    await user.save();

    res.json({ success: true, xpGained: challenge.xpReward, ...result, badges: user.badges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete challenge' });
  }
});

// PUT /api/challenges/:id - Admin updates
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, challenge });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update challenge' });
  }
});

// DELETE /api/challenges/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Challenge.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

module.exports = router;

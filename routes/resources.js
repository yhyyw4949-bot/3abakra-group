// routes/resources.js - Resource routes
const express = require('express');
const router = express.Router();
const { Resource } = require('../models/models');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/resources
router.get('/', async (req, res) => {
  try {
    const { category, type, search } = req.query;
    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (type)   filter.type = type;
    if (search) filter.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    const resources = await Resource.find(filter)
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// POST /api/resources - Create resource
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, url, category, type, tags } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'Title and URL required' });

    const resource = new Resource({
      title, description, url, category, type,
      tags: tags || [], author: req.session.userId
    });
    await resource.save();

    const user = await User.findById(req.session.userId);
    await user.addXP(30);
    res.json({ success: true, resource, xpGained: 30 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// PUT /api/resources/:id/upvote - Toggle upvote
router.put('/:id/upvote', requireAuth, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    const userId = req.session.userId;
    const upvoted = resource.upvotes.includes(userId);
    if (upvoted) resource.upvotes.pull(userId);
    else         resource.upvotes.push(userId);
    await resource.save();
    res.json({ success: true, upvotes: resource.upvotes.length, upvoted: !upvoted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

module.exports = router;

// routes/chat.js - Chat history routes
const express = require('express');
const router = express.Router();
const { Message } = require('../models/models');
const { requireAuth } = require('../middleware/auth');

// GET /api/chat/messages - Get recent messages
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const { room = 'general', limit = 50 } = req.query;
    const messages = await Message.find({ room })
      .populate('author', 'username avatar level role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;

// routes/chat.js - Chat history + admin delete
const express = require('express');
const router  = express.Router();
const { Message } = require('../models/models');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET messages
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const { room = 'general', limit = 80 } = req.query;
    const messages = await Message.find({ room })
      .populate('author', 'username avatar level role')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    res.json(messages.reverse());
  } catch (err) { res.status(500).json({ error: 'Failed to fetch messages' }); }
});

// DELETE single message — admin only
router.delete('/messages/:id', requireAdmin, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete message' }); }
});

// DELETE all messages in a room — admin only
router.delete('/messages/room/:room', requireAdmin, async (req, res) => {
  try {
    await Message.deleteMany({ room: req.params.room });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to clear chat' }); }
});

module.exports = router;

// models/Challenge.js - Weekly coding challenges
const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  difficulty:  { type: String, enum: ['easy','medium','hard','expert'], default: 'medium' },
  xpReward:    { type: Number, default: 100 },
  category:    { type: String, default: 'General' },
  tags:        [{ type: String }],
  status:      { type: String, enum: ['open','closed'], default: 'open' },
  expiresAt:   { type: Date },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now }
});
challengeSchema.index({ status: 1, createdAt: -1 });

const Challenge = mongoose.model('Challenge', challengeSchema);

// models/Resource.js - Programming resources
const resourceSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  url:         { type: String, required: true },
  category:    { type: String, enum: ['Web','AI','Cybersecurity','Tools','Database','Mobile','DevOps','Other'], default: 'Other' },
  type:        { type: String, enum: ['article','video','course','tool','book','docs'], default: 'article' },
  tags:        [{ type: String }],
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  upvotes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  featured:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});
resourceSchema.index({ category: 1, createdAt: -1 });

const Resource = mongoose.model('Resource', resourceSchema);

// models/Message.js - Chat messages
const messageSchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, required: true, maxlength: 1000 },
  room:      { type: String, default: 'general' },
  type:      { type: String, enum: ['text','system'], default: 'text' },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 } // auto-delete after 30 days
});
messageSchema.index({ room: 1, createdAt: -1 }); // fast room message queries
messageSchema.index({ author: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = { Challenge, Resource, Message };

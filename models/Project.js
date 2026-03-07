// models/Project.js - Projects with likes and comments
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

const projectSchema = new mongoose.Schema({
  title:       { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 1000 },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  github:      { type: String, default: '' },
  liveUrl:     { type: String, default: '' },
  tags:        [{ type: String }],
  techStack:   [{ type: String }],
  likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments:    [commentSchema],
  image:       { type: String, default: '' },
  featured:    { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);

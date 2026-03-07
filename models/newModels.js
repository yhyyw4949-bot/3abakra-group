// models/newModels.js — All new feature models
const mongoose = require('mongoose');

// ─── Announcement ────────────────────────────────────────
const announcementSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  content:   { type: String, required: true },
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pinned:    { type: Boolean, default: false },
  type:      { type: String, enum: ['info','warning','success','event'], default: 'info' },
  createdAt: { type: Date, default: Date.now }
});
const Announcement = mongoose.model('Announcement', announcementSchema);

// ─── Event ───────────────────────────────────────────────
const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  date:        { type: Date, required: true },
  endDate:     { type: Date },
  type:        { type: String, enum: ['meeting','hackathon','workshop','other'], default: 'meeting' },
  location:    { type: String, default: 'Online' },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attendees:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxAttendees:{ type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});
const Event = mongoose.model('Event', eventSchema);

// ─── Learning Path ───────────────────────────────────────
const learningStepSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  url:         { type: String },
  type:        { type: String, enum: ['video','article','exercise','quiz'], default: 'article' },
  xpReward:    { type: Number, default: 20 },
  order:       { type: Number, default: 0 },
});
const learningPathSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  category:    { type: String, default: 'General' },
  difficulty:  { type: String, enum: ['beginner','intermediate','advanced'], default: 'beginner' },
  steps:       [learningStepSchema],
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  enrolled:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  completedSteps: [{
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    step:  { type: mongoose.Schema.Types.ObjectId },
    completedAt: { type: Date, default: Date.now }
  }],
  image:       { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now }
});
const LearningPath = mongoose.model('LearningPath', learningPathSchema);

// ─── Poll ────────────────────────────────────────────────
const pollSchema = new mongoose.Schema({
  question:  { type: String, required: true },
  options:   [{ text: String, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }],
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
const Poll = mongoose.model('Poll', pollSchema);

// ─── Blog Post ───────────────────────────────────────────
const blogSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  content:   { type: String, required: true },
  excerpt:   { type: String },
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags:      [{ type: String }],
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments:  [{
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content:   { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  coverImage:{ type: String, default: '' },
  published: { type: Boolean, default: true },
  views:     { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Blog = mongoose.model('Blog', blogSchema);

// ─── Direct Message ──────────────────────────────────────
const dmSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content:   { type: String, required: true },
    read:      { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  lastMessage:   { type: Date, default: Date.now },
  createdAt:     { type: Date, default: Date.now }
});
const DM = mongoose.model('DM', dmSchema);

// ─── Notification ────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['xp','badge','like','comment','follow','mention','task','announcement','dm'], default: 'xp' },
  title:     { type: String, required: true },
  message:   { type: String },
  link:      { type: String, default: '' },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// ─── Daily Mission ───────────────────────────────────────
const missionSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  type:        { type: String, enum: ['chat','project','challenge','resource','login','comment'], default: 'login' },
  xpReward:    { type: Number, default: 25 },
  target:      { type: Number, default: 1 },
  active:      { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now }
});
const Mission = mongoose.model('Mission', missionSchema);

const userMissionSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mission:   { type: mongoose.Schema.Types.ObjectId, ref: 'Mission' },
  progress:  { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  date:      { type: String }, // YYYY-MM-DD
  createdAt: { type: Date, default: Date.now }
});
const UserMission = mongoose.model('UserMission', userMissionSchema);

// ─── Team/Group ──────────────────────────────────────────
const teamSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true },
  description: { type: String },
  avatar:      { type: String, default: '' },
  leader:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  totalXP:     { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});
const Team = mongoose.model('Team', teamSchema);

// ─── XP Shop Item ────────────────────────────────────────
const shopItemSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  type:        { type: String, enum: ['title','border','badge','theme'], default: 'title' },
  cost:        { type: Number, required: true },
  value:       { type: String }, // the actual value applied
  icon:        { type: String, default: '🎁' },
  available:   { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now }
});
const ShopItem = mongoose.model('ShopItem', shopItemSchema);

// ─── Code Snippet ────────────────────────────────────────
const snippetSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  code:     { type: String, required: true },
  language: { type: String, default: 'javascript' },
  description: { type: String },
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags:     [{ type: String }],
  createdAt:{ type: Date, default: Date.now }
});
const Snippet = mongoose.model('Snippet', snippetSchema);

// ─── Task ────────────────────────────────────────────────
const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  assignedTo:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:      { type: String, enum: ['todo','inprogress','done'], default: 'todo' },
  priority:    { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  dueDate:     { type: Date },
  xpReward:    { type: Number, default: 50 },
  createdAt:   { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

// ─── Follow ──────────────────────────────────────────────
const followSchema = new mongoose.Schema({
  follower:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
const Follow = mongoose.model('Follow', followSchema);

module.exports = {
  Announcement, Event, LearningPath, Poll, Blog,
  DM, Notification, Mission, UserMission, Team,
  ShopItem, Snippet, Task, Follow
};

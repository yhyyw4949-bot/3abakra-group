// models/User.js - User schema with XP, badges, roles
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// XP thresholds for each level
const LEVEL_XP = [0,100,250,500,1000,2000,3500,5500,8000,12000,18000,25000,35000,50000,70000,100000];
const RANK_TITLES = [
  'Newcomer','Apprentice','Coder','Developer','Engineer',
  'Senior Dev','Tech Lead','Architect','Expert','Master',
  'Principal','Fellow','Distinguished','Elite','Legend','Mythic'
];

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['admin','member'], default: 'member' },
  avatar:   { type: String, default: '' },
  bio:      { type: String, default: '', maxlength: 300 },
  github:   { type: String, default: '' },
  xp:       { type: Number, default: 0 },
  level:    { type: Number, default: 1 },
  badges:   [{ type: String }],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  joinedAt: { type: Date, default: Date.now },
  completedChallenges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
  likedProjects:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
});

// ── Indexes for fast queries ──────────────────────────────
userSchema.index({ xp: -1 });        // leaderboard sort
userSchema.index({ isOnline: 1 });   // online users filter
userSchema.index({ role: 1 });       // admin queries

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Add XP and auto-level up
userSchema.methods.addXP = async function(amount) {
  this.xp += amount;
  // Recalculate level
  let newLevel = 1;
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (this.xp >= LEVEL_XP[i]) { newLevel = i + 1; break; }
  }
  const leveledUp = newLevel > this.level;
  this.level = newLevel;
  // Check badge conditions
  await this.checkBadges();
  await this.save();
  return { leveledUp, newLevel };
};

// Auto-award badges based on conditions
userSchema.methods.checkBadges = async function() {
  const badges = new Set(this.badges);
  if (this.xp >= 100  && !badges.has('first_xp'))     { badges.add('first_xp'); }
  if (this.xp >= 1000 && !badges.has('xp_1k'))        { badges.add('xp_1k'); }
  if (this.xp >= 5000 && !badges.has('xp_5k'))        { badges.add('xp_5k'); }
  if (this.level >= 5 && !badges.has('level_5'))       { badges.add('level_5'); }
  if (this.level >= 10 && !badges.has('level_10'))     { badges.add('level_10'); }
  if (this.completedChallenges.length >= 1  && !badges.has('first_challenge'))  { badges.add('first_challenge'); }
  if (this.completedChallenges.length >= 5  && !badges.has('challenger'))       { badges.add('challenger'); }
  if (this.completedChallenges.length >= 20 && !badges.has('challenge_master')) { badges.add('challenge_master'); }
  this.badges = Array.from(badges);
};

// Get rank title
userSchema.methods.getRankTitle = function() {
  return RANK_TITLES[Math.min(this.level - 1, RANK_TITLES.length - 1)];
};

// XP needed for next level
userSchema.methods.xpForNextLevel = function() {
  if (this.level >= LEVEL_XP.length) return null;
  return LEVEL_XP[this.level] || null;
};

userSchema.methods.xpProgress = function() {
  const current = LEVEL_XP[this.level - 1] || 0;
  const next = LEVEL_XP[this.level] || this.xp;
  return Math.round(((this.xp - current) / (next - current)) * 100);
};

module.exports = mongoose.model('User', userSchema);
module.exports.LEVEL_XP = LEVEL_XP;
module.exports.RANK_TITLES = RANK_TITLES;

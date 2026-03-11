// routes/features.js — All new feature routes
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const {
  Announcement, Event, LearningPath, Poll, Blog,
  DM, Notification, Mission, UserMission, Team,
  ShopItem, Snippet, Task, Follow,
  VideoLesson, UploadedFile
} = require('../models/newModels');

// ═══════════════════════════════════════════════
//  NOTIFICATIONS HELPER
// ═══════════════════════════════════════════════
async function createNotification(userId, type, title, message, link = '') {
  try {
    await Notification.create({ user: userId, type, title, message, link });
  } catch (e) {}
}

// ═══════════════════════════════════════════════
//  ANNOUNCEMENTS
// ═══════════════════════════════════════════════
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('author', 'username avatar')
      .sort({ pinned: -1, createdAt: -1 });
    res.json(announcements);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch announcements' }); }
});

router.post('/announcements', requireAdmin, async (req, res) => {
  try {
    const { title, content, type, pinned } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    const ann = await Announcement.create({ title, content, type, pinned, author: req.session.userId });
    // Notify all users
    const users = await User.find({}, '_id');
    for (const u of users) {
      if (u._id.toString() !== req.session.userId)
        await createNotification(u._id, 'announcement', `📢 ${title}`, content, '#announcements');
    }
    res.json({ success: true, announcement: ann });
  } catch (err) { res.status(500).json({ error: 'Failed to create announcement' }); }
});

router.delete('/announcements/:id', requireAdmin, async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ═══════════════════════════════════════════════
//  EVENTS
// ═══════════════════════════════════════════════
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('author', 'username avatar')
      .populate('attendees', 'username avatar')
      .sort({ date: 1 });
    res.json(events);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch events' }); }
});

router.post('/events', requireAdmin, async (req, res) => {
  try {
    const { title, description, date, endDate, type, location, maxAttendees } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Title and date required' });
    const event = await Event.create({
      title, description, date, endDate, type, location,
      maxAttendees, author: req.session.userId
    });
    res.json({ success: true, event });
  } catch (err) { res.status(500).json({ error: 'Failed to create event' }); }
});

router.put('/events/:id/attend', requireAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const userId = req.session.userId;
    const attending = event.attendees.includes(userId);
    if (attending) event.attendees.pull(userId);
    else {
      if (event.maxAttendees > 0 && event.attendees.length >= event.maxAttendees)
        return res.status(400).json({ error: 'Event is full' });
      event.attendees.push(userId);
    }
    await event.save();
    res.json({ success: true, attending: !attending, count: event.attendees.length });
  } catch (err) { res.status(500).json({ error: 'Failed to update attendance' }); }
});

router.delete('/events/:id', requireAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ═══════════════════════════════════════════════
router.get('/learning', async (req, res) => {
  try {
    const paths = await LearningPath.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    res.json(paths);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch learning paths' }); }
});

router.get('/learning/:id', async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id)
      .populate('author', 'username avatar')
      .populate('enrolled', 'username avatar');
    if (!path) return res.status(404).json({ error: 'Not found' });
    res.json(path);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch' }); }
});

router.post('/learning', requireAdmin, async (req, res) => {
  try {
    const { title, description, category, difficulty, steps, image } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const path = await LearningPath.create({
      title, description, category, difficulty,
      steps: steps || [], image, author: req.session.userId
    });
    res.json({ success: true, path });
  } catch (err) { res.status(500).json({ error: 'Failed to create' }); }
});

router.put('/learning/:id/enroll', requireAuth, async (req, res) => {
  try {
    const path = await LearningPath.findById(req.params.id);
    if (!path) return res.status(404).json({ error: 'Not found' });
    const userId = req.session.userId;
    const enrolled = path.enrolled.includes(userId);
    if (enrolled) path.enrolled.pull(userId);
    else path.enrolled.push(userId);
    await path.save();
    res.json({ success: true, enrolled: !enrolled });
  } catch (err) { res.status(500).json({ error: 'Failed to enroll' }); }
});

router.post('/learning/:id/complete-step', requireAuth, async (req, res) => {
  try {
    const { stepId } = req.body;
    const path = await LearningPath.findById(req.params.id);
    if (!path) return res.status(404).json({ error: 'Not found' });
    const step = path.steps.id(stepId);
    if (!step) return res.status(404).json({ error: 'Step not found' });
    const userId = req.session.userId;
    const alreadyDone = path.completedSteps.some(
      cs => cs.user.toString() === userId && cs.step.toString() === stepId
    );
    if (alreadyDone) return res.status(400).json({ error: 'Already completed' });
    path.completedSteps.push({ user: userId, step: stepId });
    await path.save();
    const user = await User.findById(userId);
    await user.addXP(step.xpReward || 20);
    res.json({ success: true, xpGained: step.xpReward || 20 });
  } catch (err) { res.status(500).json({ error: 'Failed to complete step' }); }
});

router.delete('/learning/:id', requireAdmin, async (req, res) => {
  try {
    await LearningPath.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ═══════════════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════════════
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { Challenge, Resource, Message } = require('../models/models');
    const Project = require('../models/Project');
    const [
      totalUsers, totalProjects, totalChallenges,
      totalMessages, totalResources, totalBlogs,
      topUsers, recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Challenge.countDocuments(),
      Message.countDocuments(),
      Resource.countDocuments(),
      Blog.countDocuments(),
      User.find().sort({ xp: -1 }).limit(5).select('username xp level avatar'),
      User.find().sort({ joinedAt: -1 }).limit(5).select('username joinedAt avatar'),
    ]);
    const onlineUsers = await User.countDocuments({ isOnline: true });
    res.json({
      totalUsers, totalProjects, totalChallenges,
      totalMessages, totalResources, totalBlogs,
      onlineUsers, topUsers, recentUsers
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch analytics' }); }
});

// ═══════════════════════════════════════════════
//  POLLS
// ═══════════════════════════════════════════════
router.get('/polls', async (req, res) => {
  try {
    const polls = await Poll.find()
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch polls' }); }
});

router.post('/polls', requireAdmin, async (req, res) => {
  try {
    const { question, options, expiresAt } = req.body;
    if (!question || !options?.length) return res.status(400).json({ error: 'Question and options required' });
    const poll = await Poll.create({
      question,
      options: options.map(o => ({ text: o, votes: [] })),
      expiresAt, author: req.session.userId
    });
    res.json({ success: true, poll });
  } catch (err) { res.status(500).json({ error: 'Failed to create poll' }); }
});

router.post('/polls/:id/vote', requireAuth, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.expiresAt && new Date() > poll.expiresAt)
      return res.status(400).json({ error: 'Poll has expired' });
    const userId = req.session.userId;
    // Remove previous votes
    poll.options.forEach(o => o.votes.pull(userId));
    poll.options[optionIndex].votes.push(userId);
    await poll.save();
    res.json({ success: true, poll });
  } catch (err) { res.status(500).json({ error: 'Failed to vote' }); }
});

router.delete('/polls/:id', requireAdmin, async (req, res) => {
  try {
    await Poll.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ═══════════════════════════════════════════════
router.get('/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find({ published: true })
      .populate('author', 'username avatar level')
      .sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch blogs' }); }
});

router.get('/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id, { $inc: { views: 1 } }, { new: true }
    ).populate('author', 'username avatar level badges')
     .populate('comments.author', 'username avatar');
    if (!blog) return res.status(404).json({ error: 'Not found' });
    res.json(blog);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch' }); }
});

router.post('/blogs', requireAuth, async (req, res) => {
  try {
    const { title, content, tags, coverImage } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    const excerpt = content.replace(/<[^>]*>/g, '').slice(0, 150) + '...';
    const blog = await Blog.create({
      title, content, excerpt, tags, coverImage,
      author: req.session.userId
    });
    const user = await User.findById(req.session.userId);
    await user.addXP(50);
    res.json({ success: true, blog, xpGained: 50 });
  } catch (err) { res.status(500).json({ error: 'Failed to create blog' }); }
});

router.put('/blogs/:id/like', requireAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Not found' });
    const userId = req.session.userId;
    const liked = blog.likes.includes(userId);
    if (liked) blog.likes.pull(userId);
    else blog.likes.push(userId);
    await blog.save();
    res.json({ success: true, likes: blog.likes.length, liked: !liked });
  } catch (err) { res.status(500).json({ error: 'Failed to like' }); }
});

router.post('/blogs/:id/comment', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Not found' });
    blog.comments.push({ author: req.session.userId, content });
    await blog.save();
    await blog.populate('comments.author', 'username avatar');
    res.json({ success: true, comment: blog.comments[blog.comments.length - 1] });
  } catch (err) { res.status(500).json({ error: 'Failed to comment' }); }
});

router.delete('/blogs/:id', requireAuth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    const user = await User.findById(req.session.userId);
    if (blog.author.toString() !== req.session.userId && user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });
    await blog.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ═══════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.session.userId })
      .sort({ createdAt: -1 }).limit(30);
    res.json(notifications);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch' }); }
});

router.put('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.session.userId }, { read: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to mark read' }); }
});

router.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.session.userId, read: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch' }); }
});

// ═══════════════════════════════════════════════
//  DAILY MISSIONS
// ═══════════════════════════════════════════════
router.get('/missions', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const missions = await Mission.find({ active: true });
    const userMissions = await UserMission.find({ user: req.session.userId, date: today });
    const result = missions.map(m => {
      const um = userMissions.find(u => u.mission.toString() === m._id.toString());
      return { ...m.toObject(), progress: um?.progress || 0, completed: um?.completed || false };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch missions' }); }
});

router.post('/missions', requireAdmin, async (req, res) => {
  try {
    const { title, description, type, xpReward, target } = req.body;
    const mission = await Mission.create({ title, description, type, xpReward, target });
    res.json({ success: true, mission });
  } catch (err) { res.status(500).json({ error: 'Failed to create mission' }); }
});

router.post('/missions/:id/progress', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const mission = await Mission.findById(req.params.id);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });
    let um = await UserMission.findOne({ user: req.session.userId, mission: req.params.id, date: today });
    if (!um) um = new UserMission({ user: req.session.userId, mission: req.params.id, date: today, progress: 0 });
    if (um.completed) return res.status(400).json({ error: 'Already completed' });
    um.progress += 1;
    if (um.progress >= mission.target) {
      um.completed = true;
      const user = await User.findById(req.session.userId);
      await user.addXP(mission.xpReward);
      await um.save();
      return res.json({ success: true, completed: true, xpGained: mission.xpReward });
    }
    await um.save();
    res.json({ success: true, completed: false, progress: um.progress });
  } catch (err) { res.status(500).json({ error: 'Failed to update progress' }); }
});

// ═══════════════════════════════════════════════
//  TEAMS
// ═══════════════════════════════════════════════
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('leader', 'username avatar')
      .populate('members', 'username avatar xp level')
      .sort({ totalXP: -1 });
    res.json(teams);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch teams' }); }
});

router.post('/teams', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name required' });
    const exists = await Team.findOne({ name });
    if (exists) return res.status(400).json({ error: 'Team name taken' });
    const team = await Team.create({
      name, description,
      leader: req.session.userId,
      members: [req.session.userId]
    });
    res.json({ success: true, team });
  } catch (err) { res.status(500).json({ error: 'Failed to create team' }); }
});

router.put('/teams/:id/join', requireAuth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const userId = req.session.userId;
    if (team.members.includes(userId))
      return res.status(400).json({ error: 'Already a member' });
    team.members.push(userId);
    // Recalculate total XP
    const members = await User.find({ _id: { $in: team.members } });
    team.totalXP = members.reduce((sum, u) => sum + u.xp, 0);
    await team.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to join team' }); }
});

router.put('/teams/:id/leave', requireAuth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    team.members.pull(req.session.userId);
    await team.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to leave' }); }
});

// ═══════════════════════════════════════════════
//  XP SHOP
// ═══════════════════════════════════════════════
router.get('/shop', async (req, res) => {
  try {
    const items = await ShopItem.find({ available: true }).sort({ cost: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch shop' }); }
});

router.post('/shop', requireAdmin, async (req, res) => {
  try {
    const { name, description, type, cost, value, icon } = req.body;
    const item = await ShopItem.create({ name, description, type, cost, value, icon });
    res.json({ success: true, item });
  } catch (err) { res.status(500).json({ error: 'Failed to create item' }); }
});

router.post('/shop/:id/buy', requireAuth, async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const user = await User.findById(req.session.userId);
    if (user.xp < item.cost) return res.status(400).json({ error: 'Not enough XP' });
    user.xp -= item.cost;
    if (item.type === 'badge') user.badges.push(item.value);
    await user.save();
    res.json({ success: true, message: `Purchased ${item.name}!` });
  } catch (err) { res.status(500).json({ error: 'Failed to purchase' }); }
});

// ═══════════════════════════════════════════════
//  CODE SNIPPETS
// ═══════════════════════════════════════════════
router.get('/snippets', async (req, res) => {
  try {
    const snippets = await Snippet.find()
      .populate('author', 'username avatar level')
      .sort({ createdAt: -1 });
    res.json(snippets);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch snippets' }); }
});

router.post('/snippets', requireAuth, async (req, res) => {
  try {
    const { title, code, language, description, tags } = req.body;
    if (!title || !code) return res.status(400).json({ error: 'Title and code required' });
    const snippet = await Snippet.create({
      title, code, language, description,
      tags: tags || [], author: req.session.userId
    });
    const user = await User.findById(req.session.userId);
    await user.addXP(20);
    res.json({ success: true, snippet, xpGained: 20 });
  } catch (err) { res.status(500).json({ error: 'Failed to create snippet' }); }
});

router.put('/snippets/:id/like', requireAuth, async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.id);
    const userId = req.session.userId;
    const liked = snippet.likes.includes(userId);
    if (liked) snippet.likes.pull(userId);
    else snippet.likes.push(userId);
    await snippet.save();
    res.json({ success: true, likes: snippet.likes.length, liked: !liked });
  } catch (err) { res.status(500).json({ error: 'Failed to like' }); }
});

router.delete('/snippets/:id', requireAuth, async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.id);
    const user = await User.findById(req.session.userId);
    if (snippet.author.toString() !== req.session.userId && user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });
    await snippet.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ═══════════════════════════════════════════════
//  TASKS (Admin assigns to users)
// ═══════════════════════════════════════════════
// ── GET all tasks ─────────────────────────────────────────
router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    let tasks;
    if (user.role === 'admin') {
      tasks = await Task.find()
        .populate('assignedTo', 'username avatar')
        .populate('assignedBy', 'username avatar')
        .populate('submissions.user', 'username avatar')
        .populate('submissions.reviewedBy', 'username')
        .sort({ createdAt: -1 });
    } else {
      tasks = await Task.find({ assignedTo: req.session.userId })
        .populate('assignedTo', 'username avatar')
        .populate('assignedBy', 'username avatar')
        .populate('submissions.user', 'username avatar')
        .populate('submissions.reviewedBy', 'username')
        .sort({ createdAt: -1 });
    }
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch tasks' }); }
});

// ── CREATE task (admin only) ──────────────────────────────
router.post('/tasks', requireAdmin, async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate, xpReward } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const task = await Task.create({
      title, description,
      assignedTo: assignedTo || [],
      assignedBy: req.session.userId,
      priority, dueDate, xpReward: xpReward || 50
    });
    for (const userId of (assignedTo || [])) {
      await createNotification(userId, 'task', `📋 New Task: ${title}`, description || '', '#tasks');
    }
    res.json({ success: true, task });
  } catch (err) { res.status(500).json({ error: 'Failed to create task' }); }
});

// ── SUBMIT work (user uploads file as base64) ────────────
router.post('/tasks/:id/submit', requireAuth, async (req, res) => {
  try {
    const { fileName, fileUrl, fileType, fileSize, note } = req.body;
    if (!fileName || !fileUrl) return res.status(400).json({ error: 'File required' });
    if (fileSize > 10 * 1024 * 1024) return res.status(400).json({ error: 'File too large (max 10MB)' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const userId = req.session.userId;
    const isAssigned = task.assignedTo.some(id => id.toString() === userId);
    if (!isAssigned) return res.status(403).json({ error: 'Not assigned to this task' });

    // Remove old submission from this user if exists
    task.submissions = task.submissions.filter(s => s.user.toString() !== userId);

    task.submissions.push({ user: userId, fileName, fileUrl, fileType, fileSize, note });
    task.status = 'pending_review';
    await task.save();

    // Notify admin(s)
    const admins = await User.find({ role: 'admin' }, '_id');
    const submitter = await User.findById(userId);
    for (const admin of admins) {
      await createNotification(admin._id, 'task',
        `📎 Submission: ${task.title}`,
        `${submitter.username} submitted work for review`,
        '#tasks'
      );
    }
    res.json({ success: true, message: 'Work submitted for review!' });
  } catch (err) { res.status(500).json({ error: 'Failed to submit work' }); }
});

// ── ADMIN: approve or reject a submission ────────────────
router.put('/tasks/:taskId/submissions/:subId/review', requireAdmin, async (req, res) => {
  try {
    const { verdict, adminNote } = req.body; // verdict: 'approved' | 'rejected'
    if (!['approved','rejected'].includes(verdict))
      return res.status(400).json({ error: 'Invalid verdict' });

    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const sub = task.submissions.id(req.params.subId);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    sub.status    = verdict;
    sub.adminNote = adminNote || '';
    sub.reviewedBy = req.session.userId;
    sub.reviewedAt = new Date();

    if (verdict === 'approved') {
      task.status = 'done';
      // Award XP to user
      const user = await User.findById(sub.user);
      if (user) {
        await user.addXP(task.xpReward || 50);
        await createNotification(sub.user, 'xp',
          `✅ Task Approved: ${task.title}`,
          `Great work! +${task.xpReward} XP earned`,
          '#tasks'
        );
      }
    } else {
      task.status = 'inprogress';
      await createNotification(sub.user, 'task',
        `❌ Submission Rejected: ${task.title}`,
        adminNote || 'Please review and resubmit.',
        '#tasks'
      );
    }

    await task.save();
    res.json({ success: true, verdict });
  } catch (err) { res.status(500).json({ error: 'Failed to review submission' }); }
});

// ── UPDATE task status (move kanban column) ──────────────
router.put('/tasks/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['todo','inprogress'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Use submit endpoint to complete' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    task.status = status;
    await task.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to update task' }); }
});

// ── DELETE task ──────────────────────────────────────────
router.delete('/tasks/:id', requireAdmin, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }); }
});

// ═══════════════════════════════════════════════
//  FOLLOW SYSTEM
// ═══════════════════════════════════════════════
router.post('/follow/:userId', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.session.userId)
      return res.status(400).json({ error: 'Cannot follow yourself' });
    const existing = await Follow.findOne({ follower: req.session.userId, following: targetId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, following: false });
    }
    await Follow.create({ follower: req.session.userId, following: targetId });
    const me = await User.findById(req.session.userId);
    await createNotification(targetId, 'follow', `👥 New Follower`, `${me.username} started following you`);
    res.json({ success: true, following: true });
  } catch (err) { res.status(500).json({ error: 'Failed to follow' }); }
});

router.get('/follow/:userId/status', requireAuth, async (req, res) => {
  try {
    const following = await Follow.findOne({ follower: req.session.userId, following: req.params.userId });
    const followers = await Follow.countDocuments({ following: req.params.userId });
    const followings = await Follow.countDocuments({ follower: req.params.userId });
    res.json({ following: !!following, followers, followings });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch' }); }
});

// ═══════════════════════════════════════════════
//  DIRECT MESSAGES
// ═══════════════════════════════════════════════
router.get('/dm', requireAuth, async (req, res) => {
  try {
    const dms = await DM.find({ participants: req.session.userId })
      .populate('participants', 'username avatar isOnline')
      .sort({ lastMessage: -1 });
    res.json(dms);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch DMs' }); }
});

router.get('/dm/:userId', requireAuth, async (req, res) => {
  try {
    const participants = [req.session.userId, req.params.userId].sort();
    let dm = await DM.findOne({ participants: { $all: participants } })
      .populate('participants', 'username avatar isOnline level');
    if (!dm) {
      dm = await DM.create({ participants });
      await dm.populate('participants', 'username avatar isOnline level');
    }
    // Mark messages as read
    dm.messages.forEach(m => {
      if (m.sender.toString() !== req.session.userId) m.read = true;
    });
    await dm.save();
    res.json(dm);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch DM' }); }
});

router.post('/dm/:userId/send', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const participants = [req.session.userId, req.params.userId].sort();
    let dm = await DM.findOne({ participants: { $all: participants } });
    if (!dm) dm = new DM({ participants });
    dm.messages.push({ sender: req.session.userId, content });
    dm.lastMessage = new Date();
    await dm.save();
    const me = await User.findById(req.session.userId);
    await createNotification(req.params.userId, 'dm', `💬 New Message from ${me.username}`, content);
    const lastMsg = dm.messages[dm.messages.length - 1];
    res.json({ success: true, message: lastMsg });
  } catch (err) { res.status(500).json({ error: 'Failed to send message' }); }
});

// ═══════════════════════════════════════════════
//  VIDEO LESSONS
// ═══════════════════════════════════════════════
router.get('/videos', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'all' ? { category } : {};
    const videos = await VideoLesson.find(filter)
      .populate('author', 'username avatar')
      .select('-fileData -comments') // don't send file data in list
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch videos' }); }
});

router.get('/videos/categories', async (req, res) => {
  try {
    const cats = await VideoLesson.distinct('category');
    res.json(cats);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch categories' }); }
});

router.get('/videos/:id', async (req, res) => {
  try {
    const video = await VideoLesson.findByIdAndUpdate(
      req.params.id, { $inc: { views: 1 } }, { new: true }
    )
    .populate('author', 'username avatar level')
    .populate('comments.author', 'username avatar');
    if (!video) return res.status(404).json({ error: 'Not found' });
    res.json(video);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch video' }); }
});

router.post('/videos', requireAdmin, async (req, res) => {
  try {
    const { title, description, category, fileData, fileName, fileSize, thumbnail, duration, tags } = req.body;
    if (!title || !fileData || !fileName) return res.status(400).json({ error: 'Title and video file required' });
    if (fileSize > 100 * 1024 * 1024) return res.status(400).json({ error: 'Video too large (max 100MB)' });
    const video = await VideoLesson.create({
      title, description, category: category || 'General',
      fileData, fileName, fileSize, thumbnail, duration,
      tags: tags || [], author: req.session.userId
    });
    res.json({ success: true, video: { ...video.toObject(), fileData: undefined } });
  } catch (err) { res.status(500).json({ error: 'Failed to upload video' }); }
});

router.put('/videos/:id/like', requireAuth, async (req, res) => {
  try {
    const video = await VideoLesson.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Not found' });
    const uid = req.session.userId;
    const liked = video.likes.includes(uid);
    if (liked) video.likes.pull(uid); else video.likes.push(uid);
    await video.save();
    res.json({ success: true, likes: video.likes.length, liked: !liked });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/videos/:id/comment', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const video = await VideoLesson.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Not found' });
    video.comments.push({ author: req.session.userId, content });
    await video.save();
    await video.populate('comments.author', 'username avatar');
    res.json({ success: true, comment: video.comments[video.comments.length - 1] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/videos/:id/comment/:commentId', requireAdmin, async (req, res) => {
  try {
    const video = await VideoLesson.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Not found' });
    video.comments.pull({ _id: req.params.commentId });
    await video.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/videos/:id', requireAdmin, async (req, res) => {
  try {
    await VideoLesson.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ═══════════════════════════════════════════════
//  ADMIN FILE UPLOADS (any section)
// ═══════════════════════════════════════════════
router.get('/uploads', requireAdmin, async (req, res) => {
  try {
    const { section } = req.query;
    const filter = section ? { section } : {};
    const files = await UploadedFile.find(filter)
      .populate('author', 'username')
      .select('-fileData')
      .sort({ createdAt: -1 });
    res.json(files);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch uploads' }); }
});

router.get('/uploads/:id/download', requireAuth, async (req, res) => {
  try {
    const file = await UploadedFile.findById(req.params.id).select('fileData fileName fileType');
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({ fileData: file.fileData, fileName: file.fileName, fileType: file.fileType });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/uploads', requireAdmin, async (req, res) => {
  try {
    const { title, section, fileData, fileName, fileType, fileSize, note } = req.body;
    if (!title || !fileData || !fileName) return res.status(400).json({ error: 'Title and file required' });
    if (fileSize > 50 * 1024 * 1024) return res.status(400).json({ error: 'File too large (max 50MB)' });
    const uploaded = await UploadedFile.create({
      title, section: section || 'general',
      fileData, fileName, fileType, fileSize, note,
      author: req.session.userId
    });
    res.json({ success: true, file: { ...uploaded.toObject(), fileData: undefined } });
  } catch (err) { res.status(500).json({ error: 'Failed to upload' }); }
});

router.delete('/uploads/:id', requireAdmin, async (req, res) => {
  try {
    await UploadedFile.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Admin delete any blog comment
router.delete('/blogs/:id/comment/:commentId', requireAdmin, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Not found' });
    blog.comments.pull({ _id: req.params.commentId });
    await blog.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
module.exports.createNotification = createNotification;


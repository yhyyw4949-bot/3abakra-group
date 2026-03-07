// routes/projects.js - Project CRUD routes
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/projects - Get all projects
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 9, tag, search } = req.query;
    const filter = {};
    if (tag)    filter.tags = tag;
    if (search) filter.$or = [
      { title:       { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    const total    = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .populate('author', 'username avatar level')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ projects, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('author', 'username avatar level badges')
      .populate('comments.author', 'username avatar level');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create project
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, github, liveUrl, tags, techStack, image } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

    const project = new Project({
      title, description, github, liveUrl,
      tags: tags || [], techStack: techStack || [],
      image, author: req.session.userId
    });
    await project.save();

    // Award XP for uploading a project
    const user = await User.findById(req.session.userId);
    const result = await user.addXP(75);

    res.json({ success: true, project, xpGained: 75, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id/like - Toggle like
router.put('/:id/like', requireAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const userId = req.session.userId;
    const liked  = project.likes.includes(userId);
    if (liked) {
      project.likes.pull(userId);
    } else {
      project.likes.push(userId);
      // Award XP to project author
      if (project.author.toString() !== userId) {
        const author = await User.findById(project.author);
        if (author) await author.addXP(10);
      }
    }
    await project.save();
    res.json({ success: true, likes: project.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/projects/:id/comment - Add comment
router.post('/:id/comment', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment content required' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.comments.push({ author: req.session.userId, content });
    await project.save();
    await project.populate('comments.author', 'username avatar level');

    const user = await User.findById(req.session.userId);
    await user.addXP(15);

    const newComment = project.comments[project.comments.length - 1];
    res.json({ success: true, comment: newComment, xpGained: 15 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const user = await User.findById(req.session.userId);
    if (project.author.toString() !== req.session.userId && user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });

    await project.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;

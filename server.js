// server.js - Main Express + Socket.io server (v2 with all new features)
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const path       = require('path');
const connectDB  = require('./config/database');
const { attachUser } = require('./middleware/auth');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// ─── Connect Database ───────────────────────────────────────────
connectDB();

// ─── Session Config ─────────────────────────────────────────────
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/it-team-platform'
  }),
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
});

// ─── Middleware ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));
app.use(attachUser);

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/projects',   require('./routes/projects'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/resources',  require('./routes/resources'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/chat',       require('./routes/chat'));
app.use('/api/features',   require('./routes/features')); // ← NEW

// ─── Serve SPA ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Socket.io ────────────────────────────────────────────────
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

const onlineUsers = new Map();
const User        = require('./models/User');
const { Message } = require('./models/models');

io.on('connection', async (socket) => {
  const userId = socket.request.session?.userId;
  if (!userId) { socket.disconnect(); return; }

  let currentUser;
  try {
    currentUser = await User.findById(userId).select('username avatar level role');
    if (!currentUser) { socket.disconnect(); return; }
    await User.findByIdAndUpdate(userId, { isOnline: true });
  } catch (e) { socket.disconnect(); return; }

  const userInfo = { userId, socketId: socket.id, username: currentUser.username, avatar: currentUser.avatar, level: currentUser.level, role: currentUser.role, room: 'general' };
  onlineUsers.set(socket.id, userInfo);

  const broadcastOnline = () => {
    const list = Array.from(onlineUsers.values()).map(u => ({ userId: u.userId, username: u.username, avatar: u.avatar, level: u.level, role: u.role }));
    const seen = new Set();
    const unique = list.filter(u => { if (seen.has(u.userId)) return false; seen.add(u.userId); return true; });
    io.emit('online_users', unique);
  };

  socket.join('general');
  socket.emit('joined_room', { room: 'general' });
  socket.to('general').emit('message', { type: 'system', content: `${currentUser.username} joined the chat`, createdAt: new Date() });
  broadcastOnline();

  socket.on('send_message', async (data) => {
    try {
      const { content, room = 'general' } = data;
      if (!content || content.trim().length === 0 || content.length > 1000) return;
      const msg = new Message({ author: userId, content: content.trim(), room });
      await msg.save();
      await msg.populate('author', 'username avatar level role');
      io.to(room).emit('message', { _id: msg._id, content: msg.content, room: msg.room, type: 'text', author: msg.author, createdAt: msg.createdAt });
      const recent = await Message.countDocuments({ author: userId, createdAt: { $gte: new Date(Date.now() - 60000) } });
      if (recent <= 1) { const user = await User.findById(userId); if (user) await user.addXP(5); }
    } catch (err) { console.error('Message error:', err); }
  });

  socket.on('typing', (data) => {
    socket.to(data.room || 'general').emit('user_typing', { username: currentUser.username, typing: data.typing });
  });

  socket.on('disconnect', async () => {
    onlineUsers.delete(socket.id);
    try {
      const stillOnline = Array.from(onlineUsers.values()).some(u => u.userId === userId);
      if (!stillOnline) await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    } catch (e) {}
    socket.to('general').emit('message', { type: 'system', content: `${currentUser.username} left the chat`, createdAt: new Date() });
    broadcastOnline();
  });
});

// ─── Start Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 IT Team Platform v2 running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/it-team-platform'}\n`);
});

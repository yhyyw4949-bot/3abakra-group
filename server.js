// server.js — 3abakra Community Platform
'use strict';
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const path       = require('path');
const compression = require('compression');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

// ─── LISTEN FIRST — Railway healthcheck needs this before DB connects ──
const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 3abakra Community — port ' + PORT);
  console.log('📦 ' + (process.env.NODE_ENV || 'development') + ' mode\n');
});

// ─── Then connect DB ──────────────────────────────────────
require('./config/database')();

// ─── Session ─────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/3abakra-platform';
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI, touchAfter: 24*3600, ttl: 7*24*60*60 }),
  cookie: { maxAge: 7*24*60*60*1000, httpOnly: true }
});

// ─── Middleware ───────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', etag: true }));
app.use(require('./middleware/auth').attachUser);

// ─── In-memory API cache ──────────────────────────────────
const _cache = new Map();
global.apiCache = {
  get(key) {
    const item = _cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) { _cache.delete(key); return null; }
    return item.data;
  },
  set(key, data, ttlMs = 20000) { _cache.set(key, { data, expires: Date.now() + ttlMs }); },
  del(pattern) { for (const k of _cache.keys()) if (k.startsWith(pattern)) _cache.delete(k); }
};
setInterval(() => { const now = Date.now(); for (const [k,v] of _cache.entries()) if (now > v.expires) _cache.delete(k); }, 120000);

// ─── Rate limiting ────────────────────────────────────────
const _rl = new Map();
function rateLimit(max = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.session?.userId || req.ip;
    const now = Date.now();
    const r = _rl.get(key) || { n: 0, t: now };
    if (now - r.t > windowMs) { r.n = 0; r.t = now; }
    r.n++; _rl.set(key, r);
    if (r.n > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}
setInterval(() => { const n = Date.now(); for (const [k,v] of _rl.entries()) if (n-v.t > 120000) _rl.delete(k); }, 300000);

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth',       rateLimit(20, 60000),  require('./routes/auth'));
app.use('/api/projects',   rateLimit(60, 60000),  require('./routes/projects'));
app.use('/api/challenges', rateLimit(60, 60000),  require('./routes/challenges'));
app.use('/api/resources',  rateLimit(60, 60000),  require('./routes/resources'));
app.use('/api/users',      rateLimit(60, 60000),  require('./routes/users'));
app.use('/api/chat',       rateLimit(60, 60000),  require('./routes/chat'));
app.use('/api/features',   rateLimit(60, 60000),  require('./routes/features'));

// ─── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: Math.floor(process.uptime()) }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── Socket.io ────────────────────────────────────────────
const wrap = m => (s, next) => m(s.request, {}, next);
io.use(wrap(sessionMiddleware));
io.of('/game').use(wrap(sessionMiddleware));

const onlineUsers = new Map();
const User        = require('./models/User');
const { Message } = require('./models/models');

// Game sockets (onlineUsers declared above)
require('./game/gameSockets')(io, onlineUsers);

// ─── Broadcast online users ───────────────────────────────
let broadcastPending = false;
function scheduleBroadcast() {
  if (broadcastPending) return;
  broadcastPending = true;
  setTimeout(() => {
    const seen = new Set();
    const list = Array.from(onlineUsers.values())
      .filter(u => { if (seen.has(u.userId)) return false; seen.add(u.userId); return true; })
      .map(({ userId, username, avatar, level, role }) => ({ userId, username, avatar, level, role }));
    io.emit('online_users', list);
    broadcastPending = false;
  }, 500);
}

// ─── Main chat sockets ────────────────────────────────────
io.on('connection', async (socket) => {
  const userId = socket.request.session?.userId;
  if (!userId) { socket.disconnect(); return; }

  let currentUser;
  try {
    currentUser = await User.findById(userId).select('username avatar level role').lean();
    if (!currentUser) { socket.disconnect(); return; }
    User.findByIdAndUpdate(userId, { isOnline: true }).exec();
  } catch (e) { socket.disconnect(); return; }

  onlineUsers.set(socket.id, { userId, socketId: socket.id, ...currentUser });
  socket.join('general');
  socket.emit('joined_room', { room: 'general' });
  socket.to('general').emit('message', { type:'system', content: currentUser.username + ' joined the chat', createdAt: new Date() });
  scheduleBroadcast();

  const msgTs = [];
  socket.on('send_message', async ({ content, room = 'general' } = {}) => {
    try {
      const now = Date.now();
      while (msgTs.length && now - msgTs[0] > 5000) msgTs.shift();
      if (msgTs.length >= 5) return socket.emit('error', { message: 'Slow down!' });
      msgTs.push(now);
      if (!content?.trim() || content.length > 1000) return;
      const msg = new Message({ author: userId, content: content.trim(), room });
      await msg.save();
      await msg.populate('author', 'username avatar level role');
      io.to(room).emit('message', { _id: msg._id, content: msg.content, room, type:'text', author: msg.author, createdAt: msg.createdAt });
      const recent = await Message.countDocuments({ author: userId, createdAt: { $gte: new Date(Date.now()-60000) } });
      if (recent <= 1) { const u = await User.findById(userId); if (u) u.addXP(5); }
    } catch (err) { console.error('Msg error:', err.message); }
  });

  socket.on('join_room', ({ room } = {}) => { if (room) { socket.join(room); socket.emit('joined_room', { room }); } });
  socket.on('typing', ({ room: r = 'general', typing } = {}) => { socket.to(r).emit('user_typing', { username: currentUser.username, typing }); });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    const stillOnline = Array.from(onlineUsers.values()).some(u => u.userId === userId);
    if (!stillOnline) User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).exec();
    socket.to('general').emit('message', { type:'system', content: currentUser.username + ' left the chat', createdAt: new Date() });
    scheduleBroadcast();
  });
});

// ─── Graceful shutdown ────────────────────────────────────
function gracefulShutdown(signal) {
  console.log('\n' + signal + ' — shutting down');
  server.close(() => { console.log('Closed'); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('uncaughtException',  err => console.error('Uncaught:', err.message));
process.on('unhandledRejection', err => console.error('Unhandled:', err?.message));

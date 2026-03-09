/**
 * 3abakra Community v2.1 — Complete App.js (Performance Optimized)
 */
'use strict';

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
const State = {
  user: null, socket: null, currentPage: 'dashboard',
  onlineUsers: [], unreadChats: 0, chatVisible: false,
};

// ═══════════════════════════════════════════════════════
//  PAGE CACHE — avoid re-fetching same data repeatedly
// ═══════════════════════════════════════════════════════
const PageCache = {
  _store: new Map(),
  _ttl: 20000, // 20 seconds
  get(key) {
    const item = this._store.get(key);
    if (!item) return null;
    if (Date.now() > item.exp) { this._store.delete(key); return null; }
    return item.data;
  },
  set(key, data, ttl = this._ttl) {
    this._store.set(key, { data, exp: Date.now() + ttl });
  },
  del(key) { this._store.delete(key); },
  clear() { this._store.clear(); },
};

// ═══════════════════════════════════════════════════════
//  API HELPER — with caching for GET requests
// ═══════════════════════════════════════════════════════
const API = {
  async request(method, url, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
    if (body) opts.body = JSON.stringify(body);
    // Cache GET requests
    if (method === 'GET') {
      const cached = PageCache.get(url);
      if (cached) return cached;
    }
    try {
      const res = await fetch(url, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      if (method === 'GET') PageCache.set(url, data);
      return data;
    } catch (err) { throw err; }
  },
  get:    (url)       => API.request('GET', url),
  post:   (url, body) => { PageCache.clear(); return API.request('POST', url, body); },
  put:    (url, body) => { PageCache.clear(); return API.request('PUT', url, body); },
  delete: (url)       => { PageCache.clear(); return API.request('DELETE', url); },
};

// ═══════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(100px)'; t.style.transition='all 0.3s'; setTimeout(()=>t.remove(),300); }, duration);
  },
  success: (m) => Toast.show(m,'success'),
  error:   (m) => Toast.show(m,'error'),
  info:    (m) => Toast.show(m,'info'),
};

// ═══════════════════════════════════════════════════════
//  XP POPUP
// ═══════════════════════════════════════════════════════
function showXPPopup(amount) {
  const el = document.getElementById('xp-popup');
  document.getElementById('xp-popup-text').textContent = `+${amount} XP`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

// ═══════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════
const Modal = {
  open(html, title = '') {
    document.getElementById('modal-content').innerHTML = (title ? `<h2 class="modal-title">${title}</h2>` : '') + html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() { document.getElementById('modal-overlay').classList.add('hidden'); },
};
document.getElementById('modal-close').addEventListener('click', Modal.close);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) Modal.close();
});

// ═══════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
}
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function formatBadge(key) {
  const map = { welcome:'👋 Welcome', first_xp:'⚡ First XP', xp_1k:'🏅 1K XP', xp_5k:'💎 5K XP', level_5:'⭐ Level 5', level_10:'🌟 Level 10', first_challenge:'🎯 First Challenge', challenger:'⚔️ Challenger', challenge_master:'👑 Master' };
  return map[key] || key;
}
function diffColor(diff) {
  const map = { easy:'var(--accent)', medium:'var(--accent-warn)', hard:'var(--accent-3)', expert:'var(--accent-2)' };
  return map[diff] || 'var(--text-muted)';
}

// ═══════════════════════════════════════════════════════
//  AUTH SCREEN
// ═══════════════════════════════════════════════════════
function initAuthScreen() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    });
  });
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    try { const data = await API.post('/api/auth/login', { email, password }); State.user = data.user; showApp(); }
    catch (err) { errEl.textContent = err.message; }
  });
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-btn').click(); });
  document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl = document.getElementById('register-error');
    errEl.textContent = '';
    try { const data = await API.post('/api/auth/register', { username, email, password }); State.user = data.user; showApp(); }
    catch (err) { errEl.textContent = err.message; }
  });
}

// ═══════════════════════════════════════════════════════
//  SHOW APP
// ═══════════════════════════════════════════════════════
async function showApp() {
  try { State.user = await API.get('/api/auth/me'); } catch {}
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateSidebarUser();
  initSocket();
  pollNotifications();
  setInterval(pollNotifications, 30000);
  navigateTo('dashboard');
  if (State.user?.role === 'admin') {
    document.getElementById('admin-nav-link').classList.remove('hidden');
    document.getElementById('analytics-nav-link').classList.remove('hidden');
  }
}

function updateSidebarUser() {
  const u = State.user;
  if (!u) return;
  document.getElementById('sidebar-username').textContent = u.username;
  document.getElementById('sidebar-level').textContent = `Lv.${u.level} · ${u.rankTitle||''}`;
  const avatarEl = document.getElementById('sidebar-avatar');
  if (u.avatar) avatarEl.innerHTML = `<img src="${u.avatar}" alt="${u.username}">`;
  else avatarEl.textContent = u.username[0].toUpperCase();
  document.getElementById('mobile-user-avatar').textContent = u.username[0].toUpperCase();
}

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await API.post('/api/auth/logout');
    State.user = null;
    if (State.socket) State.socket.disconnect();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
  } catch (err) { Toast.error('Logout failed'); }
});

// ═══════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════
function navigateTo(page) {
  State.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  if (page === 'chat') { State.unreadChats = 0; State.chatVisible = true; document.getElementById('chat-badge').style.display = 'none'; }
  else State.chatVisible = false;
  if (page === 'notifications') { const b = document.getElementById('notif-badge'); if(b) b.style.display='none'; }
  renderPage(page);
  document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => { e.preventDefault(); if (item.dataset.page) navigateTo(item.dataset.page); });
});
document.getElementById('menu-toggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('sidebar-avatar').addEventListener('click', () => { if (State.user) openUserProfile(State.user._id || State.user.id); });

// ═══════════════════════════════════════════════════════
//  PAGE RENDERER — with skeleton loading
// ═══════════════════════════════════════════════════════
async function renderPage(page) {
  const content = document.getElementById('main-content');
  // Show skeleton immediately — feels much faster
  content.innerHTML = `
    <div class="skeleton-wrap fade-in">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-sub"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:20px">
        ${[1,2,3].map(()=>`<div class="skeleton skeleton-card"></div>`).join('')}
      </div>
    </div>`;
  switch (page) {
    case 'dashboard':     await renderDashboard(); break;
    case 'leaderboard':   await renderLeaderboard(); break;
    case 'challenges':    await renderChallenges(); break;
    case 'projects':      await renderProjects(); break;
    case 'resources':     await renderResources(); break;
    case 'chat':          renderChat(); break;
    case 'admin':         await renderAdmin(); break;
    case 'announcements': await renderAnnouncements(); break;
    case 'events':        await renderEvents(); break;
    case 'learning':      await renderLearning(); break;
    case 'analytics':     await renderAnalytics(); break;
    case 'polls':         await renderPolls(); break;
    case 'blogs':         await renderBlogs(); break;
    case 'notifications': await renderNotifications(); break;
    case 'tasks':         await renderTasks(); break;
    case 'teams':         await renderTeams(); break;
    case 'shop':          await renderShop(); break;
    case 'snippets':      await renderSnippets(); break;
    case 'courses':       await renderCourses(); break;
    case 'videos':        await renderVideos(); break;
    case 'dms':           await renderDMs(); break;
    default: content.innerHTML = `<div class="empty-state"><div class="empty-icon">◻</div><div class="empty-title">Page not found</div></div>`;
  }
}

// ═══════════════════════════════════════════════════════
//  NOTIFICATIONS POLLING
// ═══════════════════════════════════════════════════════
async function pollNotifications() {
  try {
    const data = await API.get('/api/features/notifications/unread-count');
    const badge = document.getElementById('notif-badge');
    if (badge) {
      if (data.count > 0) { badge.textContent = data.count; badge.style.display = 'inline'; }
      else badge.style.display = 'none';
    }
  } catch {}
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════
async function renderDashboard() {
  const u = State.user;
  const content = document.getElementById('main-content');

  // Fetch ALL data in parallel — 4x faster than sequential awaits
  const [recentChallenges, projectData, missions, announcements] = await Promise.allSettled([
    API.get('/api/challenges'),
    API.get('/api/projects?limit=3'),
    API.get('/api/features/missions'),
    API.get('/api/features/announcements'),
  ]);

  const challenges    = recentChallenges.value?.slice(0,3) || [];
  const recentProjects= projectData.value?.projects || [];
  const missionList   = missions.value || [];
  const annList       = (announcements.value || []).slice(0,2);

  const xpProg = u.xpProgress || 0;
  const xpNext = u.xpForNextLevel;
  const badges = (u.badges||[]).map(b => `<span class="badge-chip badge-${b}">${formatBadge(b)}</span>`).join('');

  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Welcome back, <span class="text-accent">${u.username}</span></div>
      <div class="page-subtitle">Welcome to 3abakra Community</div>
    </div>
  </div>
  <div class="dashboard-grid fade-in">
    <div class="profile-card">
      <div class="profile-avatar-lg" id="dash-avatar">
        ${u.avatar ? `<img src="${u.avatar}" alt="${u.username}">` : u.username[0].toUpperCase()}
      </div>
      <div class="profile-name">${u.username}</div>
      <div class="profile-rank">${u.rankTitle || 'Newcomer'}</div>
      ${u.bio ? `<div class="profile-bio">${u.bio}</div>` : ''}
      <div class="xp-section">
        <div class="xp-header">
          <span class="xp-label">Level ${u.level} Progress</span>
          <span class="xp-val">${u.xp} XP ${xpNext ? `/ ${xpNext} XP` : '(MAX)'}</span>
        </div>
        <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:0%" id="xp-bar-fill"></div></div>
      </div>
      <div class="badges-row">${badges || '<span class="text-muted text-sm">No badges yet</span>'}</div>
      <div class="stats-row" style="width:100%;margin-top:8px;margin-bottom:0">
        <div class="stat-card"><div class="stat-value">${u.level}</div><div class="stat-label">Level</div></div>
        <div class="stat-card"><div class="stat-value">${u.xp}</div><div class="stat-label">XP</div></div>
        <div class="stat-card"><div class="stat-value">${(u.completedChallenges||[]).length}</div><div class="stat-label">Challenges</div></div>
        <div class="stat-card"><div class="stat-value">${(u.badges||[]).length}</div><div class="stat-label">Badges</div></div>
      </div>
      <button class="btn-secondary" style="width:100%" onclick="openEditProfile()">Edit Profile</button>
    </div>
    <div class="dash-right">
      <div class="card">
        <div class="section-heading">Quick Actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn-secondary" onclick="navigateTo('challenges')">⚡ Challenges</button>
          <button class="btn-secondary" onclick="openNewProject()">◻ New Project</button>
          <button class="btn-secondary" onclick="navigateTo('tasks')">📋 My Tasks</button>
          <button class="btn-secondary" onclick="navigateTo('chat')">◉ Team Chat</button>
          <button class="btn-secondary" onclick="navigateTo('learning')">🎓 Learning</button>
          <button class="btn-secondary" onclick="navigateTo('shop')">🎰 XP Shop</button>
        </div>
      </div>
      ${annList.length > 0 ? `
      <div class="card">
        <div class="section-heading">Latest Announcements</div>
        ${annList.map(a => `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div>
            <div class="activity-text">${a.title}</div>
            <div class="activity-time">${formatDate(a.createdAt)}</div>
          </div>
        </div>`).join('')}
        <button class="btn-secondary" style="width:100%;margin-top:8px" onclick="navigateTo('announcements')">View All →</button>
      </div>` : ''}
      ${missionList.length > 0 ? `
      <div class="card">
        <div class="section-heading">Daily Missions</div>
        ${missionList.map(m => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1">
            <div style="font-size:0.82rem;font-weight:600">${m.title}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">⚡ ${m.xpReward} XP · ${m.progress||0}/${m.target}</div>
          </div>
          ${m.completed
            ? `<span style="color:var(--accent);font-size:0.78rem">✓ Done</span>`
            : `<div style="width:60px;height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.round((m.progress||0)/m.target*100)}%;background:var(--accent);border-radius:3px"></div></div>`}
        </div>`).join('')}
      </div>` : ''}
      <div class="card">
        <div class="section-heading">Open Challenges</div>
        ${challenges.length === 0 ? '<div class="empty-state" style="padding:16px"><div class="empty-sub">No challenges yet</div></div>' :
          challenges.map(c => `
          <div class="activity-item">
            <div class="activity-dot" style="background:${diffColor(c.difficulty)}"></div>
            <div><div class="activity-text">${c.title}</div><div class="activity-time">⚡ ${c.xpReward} XP · ${c.difficulty}</div></div>
          </div>`).join('')}
        <button class="btn-secondary" style="width:100%;margin-top:8px" onclick="navigateTo('challenges')">View All →</button>
      </div>
      <div class="card">
        <div class="section-heading">Recent Projects</div>
        ${recentProjects.length === 0 ? '<div class="empty-state" style="padding:16px"><div class="empty-sub">No projects yet</div></div>' :
          recentProjects.map(p => `
          <div class="activity-item">
            <div class="activity-dot" style="background:var(--accent-2)"></div>
            <div><div class="activity-text">${p.title}</div><div class="activity-time">by ${p.author?.username||'unknown'} · ♥ ${p.likes?.length||0}</div></div>
          </div>`).join('')}
        <button class="btn-secondary" style="width:100%;margin-top:8px" onclick="navigateTo('projects')">View All →</button>
      </div>
    </div>
  </div>`;
  setTimeout(() => { const bar = document.getElementById('xp-bar-fill'); if (bar) bar.style.width = `${xpProg}%`; }, 100);
}

function openEditProfile() {
  const u = State.user;
  Modal.open(`
    <!-- Avatar Upload -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <div id="avatar-preview" style="width:80px;height:80px;border-radius:50%;background:var(--bg-elevated);border:2px solid rgba(201,168,76,0.4);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-family:'Cinzel',serif;color:var(--accent);cursor:pointer" onclick="document.getElementById('avatar-file-input').click()">
        ${u.avatar ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover">` : u.username[0].toUpperCase()}
      </div>
      <div style="text-align:center">
        <div style="font-size:0.78rem;color:var(--accent);font-weight:600">صورة الملف الشخصي</div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">اضغط على الصورة لتغييرها</div>
      </div>
      <input type="file" id="avatar-file-input" accept="image/*" style="display:none" onchange="profileAvatarSelect(this)">
      <button class="btn-secondary" style="font-size:0.72rem;padding:5px 14px" onclick="document.getElementById('avatar-file-input').click()">📷 تغيير الصورة</button>
    </div>
    <div class="form-group"><label>Bio</label><textarea id="edit-bio" placeholder="عرّف بنفسك للفريق...">${u.bio||''}</textarea></div>
    <div class="form-group"><label>GitHub Username</label><input type="text" id="edit-github" value="${u.github||''}" placeholder="yourusername"></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="saveProfile()">💾 حفظ التغييرات</button>
  `, 'تعديل الملف الشخصي');
}

function profileAvatarSelect(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { Toast.error('الصورة كبيرة جداً (الحد 5MB)'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    window._newAvatar = e.target.result;
    const preview = document.getElementById('avatar-preview');
    if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    Toast.info('تم اختيار الصورة — اضغط حفظ لتطبيقها');
  };
  reader.readAsDataURL(file);
}

async function saveProfile() {
  const bio    = document.getElementById('edit-bio').value;
  const github = document.getElementById('edit-github').value;
  const avatar = window._newAvatar || State.user.avatar || '';
  try {
    const data = await API.put('/api/auth/profile', { bio, github, avatar });
    State.user = { ...State.user, ...data.user };
    window._newAvatar = null;
    // Update sidebar avatar immediately
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) {
      sidebarAvatar.innerHTML = avatar ? `<img src="${avatar}" alt="${State.user.username}">` : State.user.username[0].toUpperCase();
    }
    updateSidebarUser();
    Modal.close();
    Toast.success('تم تحديث الملف الشخصي! ✅');
    renderPage('dashboard');
  } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  LEADERBOARD
// ═══════════════════════════════════════════════════════
async function renderLeaderboard() {
  const content = document.getElementById('main-content');
  let users = [];
  try { users = await API.get('/api/users/leaderboard'); } catch {}
  content.innerHTML = `
  <div class="page-header fade-in"><div><div class="page-title">Leaderboard</div><div class="page-subtitle">Top developers ranked by XP</div></div></div>
  <div class="card fade-in" style="overflow:auto">
    <table class="leaderboard-table">
      <thead><tr><th style="width:50px">#</th><th>Developer</th><th>Level</th><th>XP</th><th>Badges</th><th>Joined</th></tr></thead>
      <tbody>
        ${users.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">No users yet</td></tr>` :
          users.map(u => `
          <tr style="cursor:pointer" onclick="openUserProfile('${u._id}')">
            <td><span class="rank-num rank-${u.rank}">${u.rank<=3?['🥇','🥈','🥉'][u.rank-1]:u.rank}</span></td>
            <td><div class="user-cell"><div class="user-avatar-sm">${u.avatar?`<img src="${u.avatar}">`:u.username[0].toUpperCase()}</div><div><div class="user-name-cell">${u.username}${u._id===(State.user?._id||State.user?.id)?'<span style="color:var(--accent);font-size:0.7rem"> (you)</span>':''}</div><div class="user-rank-cell">${u.rankTitle}</div></div></div></td>
            <td><span class="level-badge">Lv.${u.level}</span></td>
            <td><span class="xp-cell">⚡ ${u.xp.toLocaleString()}</span></td>
            <td><span style="font-size:0.8rem">${(u.badges||[]).length} 🏅</span></td>
            <td><span style="font-size:0.75rem;color:var(--text-muted)">${formatDate(u.joinedAt)}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  CHALLENGES
// ═══════════════════════════════════════════════════════
async function renderChallenges() {
  const content = document.getElementById('main-content');
  let challenges = [];
  try { challenges = await API.get('/api/challenges'); } catch {}
  const completedIds = new Set((State.user?.completedChallenges||[]).map(String));
  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Challenges</div><div class="page-subtitle">Complete challenges to earn XP and badges</div></div>
    ${State.user?.role==='admin'?`<button class="btn-primary" onclick="openNewChallenge()">+ New Challenge</button>`:''}
  </div>
  <div class="challenges-grid fade-in">
    ${challenges.length===0?`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚡</div><div class="empty-title">No challenges yet</div></div>`:
      challenges.map(c => {
        const isCompleted = completedIds.has(String(c._id));
        const isClosed = c.status==='closed';
        return `<div class="challenge-card ${isCompleted?'completed':''} ${isClosed?'closed':''}">
          <div class="challenge-header"><div class="challenge-title">${c.title}</div><span class="diff-badge diff-${c.difficulty}">${c.difficulty}</span></div>
          <div class="challenge-desc">${c.description}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${(c.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
          <div class="challenge-footer">
            <span class="xp-reward">${c.xpReward} XP</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:0.72rem;color:var(--text-muted)">${c.completedBy?.length||0} completed</span>
              ${isCompleted?`<span class="challenge-status status-completed">✓ Done</span>`:isClosed?`<span class="challenge-status status-closed">Closed</span>`:`<button class="btn-primary" style="padding:6px 14px;font-size:0.78rem" onclick="completeChallenge('${c._id}')">Complete</button>`}
            </div>
          </div>
          ${State.user?.role==='admin'?`<div style="margin-top:10px;display:flex;gap:6px"><button class="btn-danger" onclick="deleteChallenge('${c._id}')">Delete</button><button class="btn-secondary" style="font-size:0.75rem;padding:6px 10px" onclick="toggleChallengeStatus('${c._id}','${c.status}')">${c.status==='open'?'Close':'Reopen'}</button></div>`:''}
        </div>`;
      }).join('')}
  </div>`;
}

async function completeChallenge(id) {
  try {
    const data = await API.post(`/api/challenges/${id}/complete`);
    showXPPopup(data.xpGained); Toast.success(`+${data.xpGained} XP!`);
    if (data.leveledUp) Toast.info(`🎉 Level Up! Level ${data.newLevel}!`);
    State.user = await API.get('/api/auth/me'); updateSidebarUser(); renderPage('challenges');
  } catch (err) { Toast.error(err.message); }
}

async function deleteChallenge(id) {
  if (!confirm('Delete?')) return;
  try { await API.delete(`/api/challenges/${id}`); renderPage('challenges'); } catch (err) { Toast.error(err.message); }
}

async function toggleChallengeStatus(id, current) {
  try { await API.put(`/api/challenges/${id}`, { status: current==='open'?'closed':'open' }); renderPage('challenges'); } catch (err) { Toast.error(err.message); }
}

function openNewChallenge() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="ch-title" placeholder="Build a REST API..."></div>
    <div class="form-group"><label>Description</label><textarea id="ch-desc"></textarea></div>
    <div class="form-group"><label>Difficulty</label><select id="ch-diff"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option><option value="expert">Expert</option></select></div>
    <div class="form-group"><label>XP Reward</label><input type="number" id="ch-xp" value="100" min="10"></div>
    <div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="ch-tags" placeholder="node.js, api"></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createChallenge()">Create Challenge</button>
  `, 'New Challenge');
}

async function createChallenge() {
  const body = { title:document.getElementById('ch-title').value, description:document.getElementById('ch-desc').value, difficulty:document.getElementById('ch-diff').value, xpReward:Number(document.getElementById('ch-xp').value), tags:document.getElementById('ch-tags').value.split(',').map(t=>t.trim()).filter(Boolean) };
  try { await API.post('/api/challenges', body); Toast.success('Challenge created!'); Modal.close(); renderPage('challenges'); } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  PROJECTS
// ═══════════════════════════════════════════════════════
let projectsPage = 1, projectsSearch = '';

async function renderProjects() {
  const content = document.getElementById('main-content');
  let data = { projects:[], total:0, pages:1 };
  try { data = await API.get(`/api/projects?page=${projectsPage}&limit=9&search=${projectsSearch}`); } catch {}
  const currentUserId = State.user?._id || State.user?.id;
  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Projects</div><div class="page-subtitle">${data.total} projects shared</div></div>
    <button class="btn-primary" onclick="openNewProject()">+ New Project</button>
  </div>
  <div class="search-bar fade-in">
    <input type="text" class="search-input" id="projects-search" placeholder="Search projects..." value="${projectsSearch}">
    <button class="btn-secondary" onclick="searchProjects()">Search</button>
  </div>
  <div class="projects-grid fade-in">
    ${data.projects.length===0?`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◻</div><div class="empty-title">No projects found</div></div>`:
      data.projects.map(p => {
        const liked = (p.likes||[]).some(l => String(l)===currentUserId||(l._id&&String(l._id)===currentUserId));
        return `<div class="project-card">
          <div class="project-image">${p.image?`<img src="${p.image}" alt="${p.title}">`:`<span class="project-image-placeholder">◻</span>`}</div>
          <div class="project-body">
            <div class="project-title">${p.title}</div>
            <div class="project-desc">${p.description.slice(0,120)}${p.description.length>120?'...':''}</div>
            <div class="project-tags">${(p.techStack||[]).slice(0,4).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
          </div>
          <div class="project-footer">
            <div class="project-author"><div class="user-avatar-sm" style="width:22px;height:22px;font-size:0.65rem">${p.author?.avatar?`<img src="${p.author.avatar}">`:((p.author?.username||'?')[0].toUpperCase())}</div>${p.author?.username||'Unknown'}</div>
            <div class="project-actions">
              <button class="like-btn ${liked?'liked':''}" onclick="toggleLike('${p._id}',this)">♥ <span class="like-count">${p.likes?.length||0}</span></button>
              ${p.github?`<a href="${p.github.startsWith('http')?p.github:'https://github.com/'+p.github}" target="_blank" class="github-link">GitHub →</a>`:''}
              <button class="btn-secondary" style="font-size:0.72rem;padding:4px 8px" onclick="openProject('${p._id}')">View</button>
            </div>
          </div>
        </div>`;
      }).join('')}
  </div>
  ${data.pages>1?`<div style="display:flex;justify-content:center;gap:8px;margin-top:20px">${Array.from({length:data.pages},(_,i)=>`<button class="${i+1===projectsPage?'btn-primary':'btn-secondary'}" style="padding:6px 12px" onclick="goProjectsPage(${i+1})">${i+1}</button>`).join('')}</div>`:''}`;
  document.getElementById('projects-search')?.addEventListener('keydown', e => { if (e.key==='Enter') searchProjects(); });
}

function searchProjects() { projectsSearch=document.getElementById('projects-search')?.value.trim()||''; projectsPage=1; renderPage('projects'); }
function goProjectsPage(n) { projectsPage=n; renderPage('projects'); }

async function toggleLike(id, btn) {
  try { const data=await API.put(`/api/projects/${id}/like`); btn.classList.toggle('liked',data.liked); btn.querySelector('.like-count').textContent=data.likes; if(data.liked)showXPPopup(10); } catch(err){Toast.error(err.message);}
}

async function openProject(id) {
  let p; try { p=await API.get(`/api/projects/${id}`); } catch { Toast.error('Failed'); return; }
  const currentUserId=State.user?._id||State.user?.id;
  const isOwner=String(p.author?._id||p.author)===currentUserId||State.user?.role==='admin';
  Modal.open(`
    ${p.image?`<img src="${p.image}" style="width:100%;border-radius:8px;margin-bottom:16px;max-height:200px;object-fit:cover">`:''}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <h3 style="font-size:1.1rem;font-weight:700;flex:1">${p.title}</h3>
      ${isOwner?`<button class="btn-danger" onclick="deleteProject('${p._id}')">Delete</button>`:''}
    </div>
    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.7">${p.description}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${(p.techStack||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${p.github?`<a href="${p.github.startsWith('http')?p.github:'https://github.com/'+p.github}" target="_blank" class="github-link">GitHub →</a>`:''}
      ${p.liveUrl?`<a href="${p.liveUrl}" target="_blank" class="resource-link">Live Demo →</a>`:''}
    </div>
    <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:16px">By <strong style="color:var(--accent)">${p.author?.username||'Unknown'}</strong> · ${formatDate(p.createdAt)}</div>
    <div style="border-top:1px solid var(--border);padding-top:14px">
      <div class="section-heading" style="margin-bottom:10px">Comments (${p.comments?.length||0})</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        ${(p.comments||[]).length===0?'<span style="color:var(--text-muted);font-size:0.8rem">No comments yet</span>':
          (p.comments||[]).map(c=>`<div style="display:flex;gap:8px;padding:8px;background:var(--bg-elevated);border-radius:6px"><div class="user-avatar-sm" style="width:26px;height:26px;font-size:0.65rem;flex-shrink:0">${c.author?.avatar?`<img src="${c.author.avatar}">`:((c.author?.username||'?')[0].toUpperCase())}</div><div><div style="font-size:0.78rem;font-weight:600;color:var(--accent)">${c.author?.username||'?'}</div><div style="font-size:0.8rem;color:var(--text-secondary)">${c.content}</div></div></div>`).join('')}
      </div>
      <div class="form-group"><textarea id="comment-input" placeholder="Write a comment..." style="height:70px"></textarea></div>
      <button class="btn-primary" style="margin-top:8px" onclick="addComment('${p._id}')">Post Comment</button>
    </div>
  `, p.title);
}

async function addComment(id) {
  const content=document.getElementById('comment-input').value.trim();
  if(!content)return;
  try { await API.post(`/api/projects/${id}/comment`,{content}); showXPPopup(15); Toast.success('+15 XP'); openProject(id); } catch(err){Toast.error(err.message);}
}

async function deleteProject(id) {
  if(!confirm('Delete?'))return;
  try { await API.delete(`/api/projects/${id}`); Modal.close(); Toast.success('Deleted'); renderPage('projects'); } catch(err){Toast.error(err.message);}
}

function openNewProject() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="proj-title" placeholder="My Project"></div>
    <div class="form-group"><label>Description</label><textarea id="proj-desc" placeholder="What did you build?"></textarea></div>
    <div class="form-group"><label>GitHub URL</label><input type="text" id="proj-github" placeholder="https://github.com/user/repo"></div>
    <div class="form-group"><label>Live URL (optional)</label><input type="text" id="proj-live" placeholder="https://..."></div>
    <div class="form-group"><label>Tech Stack (comma-separated)</label><input type="text" id="proj-tech" placeholder="React, Node.js, MongoDB"></div>
    <div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="proj-tags" placeholder="fullstack, api"></div>
    <div class="form-group"><label>Preview Image URL (optional)</label><input type="text" id="proj-image" placeholder="https://..."></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createProject()">Upload Project</button>
    <p style="font-size:0.72rem;color:var(--accent);margin-top:8px;text-align:center">+75 XP for sharing!</p>
  `, 'Share a Project');
}

async function createProject() {
  const body = { title:document.getElementById('proj-title').value, description:document.getElementById('proj-desc').value, github:document.getElementById('proj-github').value, liveUrl:document.getElementById('proj-live').value, techStack:document.getElementById('proj-tech').value.split(',').map(t=>t.trim()).filter(Boolean), tags:document.getElementById('proj-tags').value.split(',').map(t=>t.trim()).filter(Boolean), image:document.getElementById('proj-image').value };
  if(!body.title||!body.description)return Toast.error('Title and description required');
  try { await API.post('/api/projects',body); showXPPopup(75); Toast.success('+75 XP!'); State.user=await API.get('/api/auth/me'); updateSidebarUser(); Modal.close(); renderPage('projects'); } catch(err){Toast.error(err.message);}
}

// ═══════════════════════════════════════════════════════
//  RESOURCES
// ═══════════════════════════════════════════════════════
let resourcesFilter = 'all';
async function renderResources() {
  const content = document.getElementById('main-content');
  let resources = [];
  try { resources = await API.get(`/api/resources?category=${resourcesFilter}`); } catch {}
  const catIcons = { Web:'🌐',AI:'🤖',Cybersecurity:'🔒',Tools:'🔧',Database:'🗄️',Mobile:'📱',DevOps:'⚙️',Other:'📚' };
  const categories = ['all','Web','AI','Cybersecurity','Tools','DevOps','Mobile','Other'];
  const currentUserId = State.user?._id||State.user?.id;
  content.innerHTML = `
  <div class="page-header fade-in"><div><div class="page-title">Resources</div><div class="page-subtitle">Curated resources from the community</div></div><button class="btn-primary" onclick="openNewResource()">+ Share Resource</button></div>
  <div class="resources-filter fade-in">${categories.map(c=>`<button class="filter-btn ${resourcesFilter===c?'active':''}" onclick="filterResources('${c}')">${c==='all'?'⬡ All':`${catIcons[c]||'◻'} ${c}`}</button>`).join('')}</div>
  <div class="resources-list fade-in">
    ${resources.length===0?`<div class="empty-state"><div class="empty-icon">◈</div><div class="empty-title">No resources yet</div></div>`:
      resources.map(r=>{
        const upvoted=(r.upvotes||[]).some(u=>String(u)===currentUserId);
        return `<div class="resource-item">
          <div class="resource-icon cat-${r.category}">${catIcons[r.category]||'📚'}</div>
          <div class="resource-info"><div class="resource-title">${r.title}</div><div class="resource-desc">${r.description||''}</div><div class="resource-meta"><span class="resource-cat" style="background:rgba(0,212,170,0.08);color:var(--accent)">${r.category}</span><span class="tag">${r.type}</span><span style="font-size:0.68rem;color:var(--text-muted)">by ${r.author?.username||'?'}</span></div></div>
          <div class="resource-actions"><button class="upvote-btn ${upvoted?'upvoted':''}" onclick="toggleUpvote('${r._id}',this)">▲ <span>${r.upvotes?.length||0}</span></button><a href="${r.url}" target="_blank" class="resource-link">Visit →</a>${State.user?.role==='admin'?`<button class="btn-danger" onclick="deleteResource('${r._id}')">✕</button>`:''}</div>
        </div>`;
      }).join('')}
  </div>`;
}
function filterResources(cat) { resourcesFilter=cat; renderPage('resources'); }
async function toggleUpvote(id,btn) { try{const data=await API.put(`/api/resources/${id}/upvote`);btn.classList.toggle('upvoted',data.upvoted);btn.querySelector('span').textContent=data.upvotes;}catch(err){Toast.error(err.message);} }
async function deleteResource(id) { if(!confirm('Delete?'))return; try{await API.delete(`/api/resources/${id}`);renderPage('resources');}catch(err){Toast.error(err.message);} }
function openNewResource() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="res-title" placeholder="Awesome React Tutorial"></div>
    <div class="form-group"><label>URL</label><input type="url" id="res-url" placeholder="https://..."></div>
    <div class="form-group"><label>Description</label><textarea id="res-desc"></textarea></div>
    <div class="form-group"><label>Category</label><select id="res-cat"><option>Web</option><option>AI</option><option>Cybersecurity</option><option>Tools</option><option>Database</option><option>Mobile</option><option>DevOps</option><option>Other</option></select></div>
    <div class="form-group"><label>Type</label><select id="res-type"><option>article</option><option>video</option><option>course</option><option>tool</option><option>book</option><option>docs</option></select></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createResource()">Share Resource</button>
    <p style="font-size:0.72rem;color:var(--accent);text-align:center;margin-top:6px">+30 XP for sharing!</p>
  `, 'Share a Resource');
}
async function createResource() {
  const body={title:document.getElementById('res-title').value,url:document.getElementById('res-url').value,description:document.getElementById('res-desc').value,category:document.getElementById('res-cat').value,type:document.getElementById('res-type').value};
  if(!body.title||!body.url)return Toast.error('Title and URL required');
  try{await API.post('/api/resources',body);showXPPopup(30);Toast.success('+30 XP!');State.user=await API.get('/api/auth/me');updateSidebarUser();Modal.close();renderPage('resources');}catch(err){Toast.error(err.message);}
}

// ═══════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════
let typingTimeout = null;
function renderChat() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
  <div class="page-header fade-in"><div><div class="page-title">Team Chat</div><div class="page-subtitle">Real-time team communication</div></div></div>
  <div class="chat-layout fade-in">
    <div class="chat-main">
      <div class="chat-header">
        <div class="chat-header-dot"></div>
        <span class="chat-room-name"># general</span>
        <span class="chat-room-desc">General discussion</span>
        ${State.user?.role === 'admin' ? `<button class="btn-danger" style="margin-left:auto;font-size:0.72rem;padding:4px 10px" onclick="clearAllChat()">🗑 Clear Chat</button>` : ''}
      </div>
      <div class="chat-messages" id="chat-messages"><div class="loading"><div class="spinner"></div></div></div>
      <div class="chat-typing" id="chat-typing"></div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Message #general..." maxlength="1000" autocomplete="off">
        <button class="chat-send-btn" onclick="sendChatMessage()">Send</button>
      </div>
    </div>
    <div class="online-sidebar">
      <div class="online-header">Online <span class="online-count" id="online-count">0</span></div>
      <div id="online-users-list"></div>
    </div>
  </div>`;
  loadChatMessages(); updateOnlineUsers();
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMessage();}
    else if(State.socket){State.socket.emit('typing',{room:'general',typing:true});clearTimeout(typingTimeout);typingTimeout=setTimeout(()=>State.socket.emit('typing',{room:'general',typing:false}),1500);}
  });
}

async function loadChatMessages() {
  try {
    const msgs = await API.get('/api/chat/messages?room=general&limit=80');
    const container = document.getElementById('chat-messages');
    if (!container) return;
    if (msgs.length===0){container.innerHTML=`<div class="chat-system-msg">No messages yet. Say hello! 👋</div>`;return;}
    container.innerHTML = msgs.map(m=>renderChatMessage(m)).join('');
    container.scrollTop = container.scrollHeight;
  } catch {}
}

function renderChatMessage(msg) {
  if (msg.type === 'system') return `<div class="chat-system-msg">${msg.content}</div>`;
  const u = msg.author || {};
  const isAdmin = State.user?.role === 'admin';
  const roleClass = u.role === 'admin' ? 'chat-msg-role-admin' : 'chat-msg-role-member';
  return `<div class="chat-msg" data-id="${msg._id}">
    <div class="chat-msg-avatar" onclick="openUserProfile('${u._id||''}')">${u.avatar?`<img src="${u.avatar}">`:((u.username||'?')[0].toUpperCase())}</div>
    <div class="chat-msg-body">
      <div class="chat-msg-header">
        <span class="chat-msg-user ${roleClass}">${u.username||'Unknown'}${u.role==='admin'?' 👑':''}</span>
        <span class="chat-msg-time">${formatTime(msg.createdAt)}</span>
        ${isAdmin && msg._id ? `<button class="chat-delete-btn" onclick="deleteChatMessage('${msg._id}',this)" title="Delete message">🗑</button>` : ''}
      </div>
      <div class="chat-msg-content">${escapeHTML(msg.content)}</div>
    </div>
  </div>`;
}

async function deleteChatMessage(id, btn) {
  if (!confirm('Delete this message?')) return;
  try {
    await API.delete(`/api/chat/messages/${id}`);
    const msgEl = btn.closest('.chat-msg');
    if (msgEl) msgEl.remove();
    Toast.success('Message deleted');
  } catch (err) { Toast.error(err.message); }
}

async function clearAllChat() {
  if (!confirm('Clear ALL messages in this chat? This cannot be undone.')) return;
  try {
    await API.delete('/api/chat/messages/room/general');
    document.getElementById('chat-messages').innerHTML = '<div class="chat-system-msg">Chat cleared by admin.</div>';
    Toast.success('Chat cleared');
  } catch (err) { Toast.error(err.message); }
}

function appendChatMessage(msg) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const wasAtBottom = container.scrollHeight-container.scrollTop-container.clientHeight<80;
  const el = document.createElement('div');
  el.innerHTML = renderChatMessage(msg);
  container.appendChild(el.firstElementChild||el);
  if (wasAtBottom) container.scrollTop=container.scrollHeight;
}

function sendChatMessage() {
  const input=document.getElementById('chat-input');
  if (!input) return;
  const content=input.value.trim();
  if (!content||!State.socket) return;
  State.socket.emit('send_message',{content,room:'general'});
  input.value='';
}

function updateOnlineUsers() {
  const list=document.getElementById('online-users-list');
  const count=document.getElementById('online-count');
  if (!list) return;
  if (count) count.textContent=State.onlineUsers.length;
  list.innerHTML=State.onlineUsers.map(u=>`<div class="online-user" onclick="openUserProfile('${u.userId}')"><div class="online-avatar">${u.avatar?`<img src="${u.avatar}">`:u.username[0].toUpperCase()}</div><span class="online-name">${u.username}</span><span class="online-lvl">Lv.${u.level}</span></div>`).join('');
}

// ═══════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════
async function renderAdmin() {
  if (State.user?.role!=='admin'){document.getElementById('main-content').innerHTML=`<div class="empty-state"><div class="empty-icon">⬡</div><div class="empty-title">Access Denied</div></div>`;return;}
  const content=document.getElementById('main-content');
  content.innerHTML=`
  <div class="page-header fade-in"><div><div class="page-title">Admin Panel</div><div class="page-subtitle">Platform management</div></div></div>
  <div class="admin-tabs fade-in">
    <button class="admin-tab active" data-section="users">Users</button>
    <button class="admin-tab" data-section="challenges-admin">Challenges</button>
    <button class="admin-tab" data-section="projects-admin">Projects</button>
    <button class="admin-tab" data-section="resources-admin">Resources</button>
    <button class="admin-tab" data-section="missions-admin">Missions</button>
    <button class="admin-tab" data-section="shop-admin">Shop</button>
    <button class="admin-tab" data-section="files-admin">📁 Files</button>
  </div>
  <div id="admin-users" class="admin-section active"><div class="loading"><div class="spinner"></div></div></div>
  <div id="admin-challenges-admin" class="admin-section"></div>
  <div id="admin-projects-admin" class="admin-section"></div>
  <div id="admin-resources-admin" class="admin-section"></div>
  <div id="admin-missions-admin" class="admin-section"></div>
  <div id="admin-shop-admin" class="admin-section"></div>
  <div id="admin-files-admin" class="admin-section"><div id="admin-files-container"></div></div>`;
  document.querySelectorAll('.admin-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
      tab.classList.add('active');
      const section=document.getElementById(`admin-${tab.dataset.section}`);
      if(section){
        section.classList.add('active');
        if(tab.dataset.section === 'files-admin') {
          renderAdminFileManager(document.getElementById('admin-files-container'));
        } else {
          loadAdminSection(tab.dataset.section);
        }
      }
    });
  });
  loadAdminSection('users');
}

async function loadAdminSection(name) {
  const el=document.getElementById(`admin-${name}`);
  if(!el||el.dataset.loaded==='true')return;
  el.dataset.loaded='true';
  el.innerHTML=`<div class="loading"><div class="spinner"></div></div>`;
  if(name==='users'){
    try{
      const users=await API.get('/api/users');
      el.innerHTML=`<div style="margin-bottom:12px"><span style="font-size:0.8rem;color:var(--text-muted)">${users.length} users</span></div>
      <div class="card" style="overflow:auto"><table class="admin-table"><thead><tr><th>User</th><th>Role</th><th>Level</th><th>XP</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
        ${users.map(u=>`<tr><td><div class="user-cell"><div class="user-avatar-sm">${u.avatar?`<img src="${u.avatar}">`:u.username[0].toUpperCase()}</div><div><div style="font-weight:600">${u.username}</div><div style="font-size:0.72rem;color:var(--text-muted)">${u.email}</div></div></div></td><td><span class="role-badge role-${u.role}">${u.role}</span></td><td>${u.level}</td><td style="color:var(--accent)">⚡ ${u.xp}</td><td style="font-size:0.75rem;color:var(--text-muted)">${formatDate(u.joinedAt)}</td><td><div style="display:flex;gap:4px"><button class="btn-secondary" style="font-size:0.72rem;padding:4px 8px" onclick="adminToggleRole('${u._id}','${u.role}')">${u.role==='admin'?'→Member':'→Admin'}</button><button class="btn-secondary" style="font-size:0.72rem;padding:4px 8px" onclick="adminAwardXP('${u._id}')">+XP</button><button class="btn-danger" onclick="adminDeleteUser('${u._id}','${u.username}')">Remove</button></div></td></tr>`).join('')}
      </tbody></table></div>`;
    }catch{el.innerHTML='<div class="empty-state">Failed to load</div>';}
  }
  if(name==='challenges-admin'){
    try{
      const c=await API.get('/api/challenges');
      el.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="font-size:0.8rem;color:var(--text-muted)">${c.length} challenges</span><button class="btn-primary" onclick="openNewChallenge()">+ New</button></div>
      <div class="card" style="overflow:auto"><table class="admin-table"><thead><tr><th>Title</th><th>Difficulty</th><th>XP</th><th>Status</th><th>Completions</th><th>Actions</th></tr></thead><tbody>
        ${c.map(ch=>`<tr><td style="font-weight:600">${ch.title}</td><td><span class="diff-badge diff-${ch.difficulty}">${ch.difficulty}</span></td><td style="color:var(--accent)">⚡${ch.xpReward}</td><td><span style="color:${ch.status==='open'?'var(--accent)':'var(--text-muted)'}">${ch.status}</span></td><td>${ch.completedBy?.length||0}</td><td><div style="display:flex;gap:4px"><button class="btn-secondary" style="font-size:0.72rem;padding:4px 8px" onclick="toggleChallengeStatus('${ch._id}','${ch.status}');document.querySelector('[data-section=challenges-admin]').dataset.loaded='';loadAdminSection('challenges-admin')">${ch.status==='open'?'Close':'Open'}</button><button class="btn-danger" onclick="deleteChallenge('${ch._id}');document.querySelector('[data-section=challenges-admin]').dataset.loaded='';loadAdminSection('challenges-admin')">Del</button></div></td></tr>`).join('')}
      </tbody></table></div>`;
    }catch{}
  }
  if(name==='projects-admin'){
    try{
      const data=await API.get('/api/projects?limit=50');
      const projects=data.projects||[];
      el.innerHTML=`<div class="card" style="overflow:auto"><table class="admin-table"><thead><tr><th>Title</th><th>Author</th><th>Likes</th><th>Date</th><th>Actions</th></tr></thead><tbody>
        ${projects.map(p=>`<tr><td style="font-weight:600">${p.title}</td><td>${p.author?.username||'?'}</td><td>♥${p.likes?.length||0}</td><td style="font-size:0.75rem;color:var(--text-muted)">${formatDate(p.createdAt)}</td><td><button class="btn-danger" onclick="deleteProject('${p._id}');document.querySelector('[data-section=projects-admin]').dataset.loaded='';loadAdminSection('projects-admin')">Delete</button></td></tr>`).join('')}
      </tbody></table></div>`;
    }catch{}
  }
  if(name==='resources-admin'){
    try{
      const resources=await API.get('/api/resources');
      el.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="font-size:0.8rem;color:var(--text-muted)">${resources.length} resources</span><button class="btn-primary" onclick="openNewResource()">+ Add</button></div>
      <div class="card" style="overflow:auto"><table class="admin-table"><thead><tr><th>Title</th><th>Category</th><th>Upvotes</th><th>Actions</th></tr></thead><tbody>
        ${resources.map(r=>`<tr><td><a href="${r.url}" target="_blank" style="color:var(--accent)">${r.title}</a></td><td>${r.category}</td><td>▲${r.upvotes?.length||0}</td><td><button class="btn-danger" onclick="deleteResource('${r._id}');document.querySelector('[data-section=resources-admin]').dataset.loaded='';loadAdminSection('resources-admin')">Delete</button></td></tr>`).join('')}
      </tbody></table></div>`;
    }catch{}
  }
  if(name==='missions-admin'){
    try{
      const missions=await API.get('/api/features/missions');
      el.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="font-size:0.8rem;color:var(--text-muted)">${missions.length} missions</span><button class="btn-primary" onclick="openNewMission()">+ New Mission</button></div>
      <div class="card" style="overflow:auto"><table class="admin-table"><thead><tr><th>Mission</th><th>Type</th><th>XP</th><th>Target</th></tr></thead><tbody>
        ${missions.map(m=>`<tr><td style="font-weight:600">${m.title}</td><td>${m.type}</td><td style="color:var(--accent)">⚡${m.xpReward}</td><td>${m.target}</td></tr>`).join('')}
      </tbody></table></div>`;
    }catch{}
  }
  if(name==='shop-admin'){
    try{
      const items=await API.get('/api/features/shop');
      el.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="font-size:0.8rem;color:var(--text-muted)">${items.length} items</span><button class="btn-primary" onclick="openNewShopItem()">+ Add Item</button></div>
      <div class="card" style="overflow:auto"><table class="admin-table"><thead><tr><th>Item</th><th>Type</th><th>Cost</th></tr></thead><tbody>
        ${items.map(i=>`<tr><td>${i.icon} ${i.name}</td><td>${i.type}</td><td style="color:var(--accent)">⚡${i.cost}</td></tr>`).join('')}
      </tbody></table></div>`;
    }catch{}
  }
}

function openNewMission() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="mis-title" placeholder="Send a message"></div>
    <div class="form-group"><label>Type</label><select id="mis-type"><option value="login">Login</option><option value="chat">Chat</option><option value="project">Project</option><option value="challenge">Challenge</option><option value="resource">Resource</option><option value="comment">Comment</option></select></div>
    <div class="form-group"><label>XP Reward</label><input type="number" id="mis-xp" value="25"></div>
    <div class="form-group"><label>Target Count</label><input type="number" id="mis-target" value="1"></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createMission()">Create Mission</button>
  `, 'New Daily Mission');
}

async function createMission() {
  const body={title:document.getElementById('mis-title').value,type:document.getElementById('mis-type').value,xpReward:Number(document.getElementById('mis-xp').value),target:Number(document.getElementById('mis-target').value)};
  try{await API.post('/api/features/missions',body);Toast.success('Mission created!');Modal.close();document.querySelector('[data-section=missions-admin]').dataset.loaded='';loadAdminSection('missions-admin');}catch(err){Toast.error(err.message);}
}

async function adminToggleRole(userId,currentRole) {
  const newRole=currentRole==='admin'?'member':'admin';
  if(!confirm(`Change to ${newRole}?`))return;
  try{await API.put(`/api/users/${userId}/role`,{role:newRole});Toast.success('Role changed');document.querySelector('[data-section=users]').dataset.loaded='';loadAdminSection('users');}catch(err){Toast.error(err.message);}
}

function adminAwardXP(userId) {
  Modal.open(`<div class="form-group"><label>XP Amount</label><input type="number" id="xp-amount" value="100" min="1"></div><button class="btn-primary btn-full" style="margin-top:12px" onclick="submitAwardXP('${userId}')">Award XP</button>`,'Award XP');
}

async function submitAwardXP(userId) {
  const amount=Number(document.getElementById('xp-amount').value);
  try{await API.put(`/api/users/${userId}/xp`,{amount});Toast.success(`Awarded ${amount} XP!`);Modal.close();document.querySelector('[data-section=users]').dataset.loaded='';loadAdminSection('users');}catch(err){Toast.error(err.message);}
}

async function adminDeleteUser(userId,username) {
  if(!confirm(`Delete user "${username}"?`))return;
  try{await API.delete(`/api/users/${userId}`);Toast.success('User removed');document.querySelector('[data-section=users]').dataset.loaded='';loadAdminSection('users');}catch(err){Toast.error(err.message);}
}

// ═══════════════════════════════════════════════════════
//  USER PROFILE MODAL
// ═══════════════════════════════════════════════════════
async function openUserProfile(userId) {
  if (!userId) return;
  try {
    const u=await API.get(`/api/users/${userId}`);
    const badges=(u.badges||[]).map(b=>`<span class="badge-chip badge-${b}">${formatBadge(b)}</span>`).join('');
    const currentUserId=State.user?._id||State.user?.id;
    let followData={following:false,followers:0,followings:0};
    if(userId!==currentUserId){try{followData=await API.get(`/api/features/follow/${userId}/status`);}catch{}}
    Modal.open(`
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
        <div class="profile-avatar-lg" style="width:60px;height:60px;font-size:1.5rem">${u.avatar?`<img src="${u.avatar}">`:u.username[0].toUpperCase()}</div>
        <div>
          <div style="font-size:1.2rem;font-weight:700">${u.username}</div>
          <div class="profile-rank" style="margin:4px 0">${u.rankTitle}</div>
          ${u.github?`<a href="https://github.com/${u.github}" target="_blank" style="font-size:0.75rem;color:var(--accent)">@${u.github}</a>`:''}
        </div>
        ${userId!==currentUserId?`<button class="${followData.following?'btn-secondary':'btn-primary'}" id="follow-btn" style="margin-left:auto" onclick="toggleFollow('${userId}')">
          ${followData.following?'Following':'+ Follow'}
        </button>`:''}
      </div>
      <div style="display:flex;gap:16px;margin-bottom:14px">
        <span style="font-size:0.78rem;color:var(--text-muted)">${followData.followers} followers</span>
        <span style="font-size:0.78rem;color:var(--text-muted)">${followData.followings} following</span>
      </div>
      ${u.bio?`<p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px">${u.bio}</p>`:''}
      <div class="stats-row" style="margin-bottom:14px">
        <div class="stat-card"><div class="stat-value">${u.level}</div><div class="stat-label">Level</div></div>
        <div class="stat-card"><div class="stat-value">${u.xp}</div><div class="stat-label">XP</div></div>
        <div class="stat-card"><div class="stat-value">${(u.completedChallenges||[]).length}</div><div class="stat-label">Challenges</div></div>
      </div>
      ${badges?`<div style="margin-bottom:14px"><div class="section-heading" style="margin-bottom:8px">Badges</div><div class="badges-row" style="justify-content:flex-start">${badges}</div></div>`:''}
      ${u.projects?.length?`<div><div class="section-heading" style="margin-bottom:8px">Projects</div>${u.projects.slice(0,3).map(p=>`<div style="padding:8px;background:var(--bg-elevated);border-radius:6px;margin-bottom:6px"><div style="font-weight:600;font-size:0.85rem">${p.title}</div></div>`).join('')}</div>`:''}
    `,u.username);
  } catch { Toast.error('Could not load profile'); }
}

async function toggleFollow(userId) {
  try {
    const data=await API.post(`/api/features/follow/${userId}`);
    const btn=document.getElementById('follow-btn');
    if(btn){btn.textContent=data.following?'Following':'+ Follow';btn.className=data.following?'btn-secondary':'btn-primary';}
    Toast.success(data.following?'Following!':'Unfollowed');
  } catch(err){Toast.error(err.message);}
}

// ═══════════════════════════════════════════════════════
//  SOCKET.IO
// ═══════════════════════════════════════════════════════
function initSocket() {
  State.socket = io({ transports: ['websocket','polling'] });
  State.socket.on('connect', () => console.log('🔌 Connected'));
  State.socket.on('disconnect', () => console.log('🔌 Disconnected'));
  State.socket.on('message', (msg) => {
    if (State.currentPage==='chat') appendChatMessage(msg);
    else if (msg.type!=='system') {
      State.unreadChats++;
      const badge=document.getElementById('chat-badge');
      if(badge){badge.textContent=State.unreadChats;badge.style.display='inline';}
    }
  });
  State.socket.on('online_users', (users) => { State.onlineUsers=users; if(State.currentPage==='chat')updateOnlineUsers(); });
  State.socket.on('user_typing', ({username,typing}) => {
    const el=document.getElementById('chat-typing');
    if(!el)return;
    el.textContent=typing&&username!==State.user?.username?`${username} is typing...`:'';
  });
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
async function init() {
  initAuthScreen();
  try { const user=await API.get('/api/auth/me'); State.user=user; showApp(); } catch {}
}
init();

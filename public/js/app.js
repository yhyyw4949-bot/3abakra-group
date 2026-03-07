/**
 * IT Team Platform — Main Application
 * Single-Page Application with Socket.io integration
 * Architecture: Module-based vanilla JS
 */

'use strict';

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
const State = {
  user:        null,
  socket:      null,
  currentPage: 'dashboard',
  onlineUsers: [],
  unreadChats: 0,
  chatVisible: false,
};

// ═══════════════════════════════════════════════════════
//  API HELPER
// ═══════════════════════════════════════════════════════
const API = {
  async request(method, url, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(url, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      throw err;
    }
  },
  get:    (url)       => API.request('GET', url),
  post:   (url, body) => API.request('POST', url, body),
  put:    (url, body) => API.request('PUT', url, body),
  delete: (url)       => API.request('DELETE', url),
};

// ═══════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(100px)'; t.style.transition='all 0.3s'; setTimeout(()=>t.remove(), 300); }, duration);
  },
  success: (m) => Toast.show(m, 'success'),
  error:   (m) => Toast.show(m, 'error'),
  info:    (m) => Toast.show(m, 'info'),
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
    document.getElementById('modal-content').innerHTML =
      (title ? `<h2 class="modal-title">${title}</h2>` : '') + html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() { document.getElementById('modal-overlay').classList.add('hidden'); },
};
document.getElementById('modal-close').addEventListener('click', Modal.close);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) Modal.close();
});

// ═══════════════════════════════════════════════════════
//  AUTH SCREEN
// ═══════════════════════════════════════════════════════
function initAuthScreen() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    });
  });

  // Login
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl    = document.getElementById('login-error');
    errEl.textContent = '';
    try {
      const data = await API.post('/api/auth/login', { email, password });
      State.user = data.user;
      showApp();
    } catch (err) { errEl.textContent = err.message; }
  });
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
  });

  // Register
  document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl    = document.getElementById('register-error');
    errEl.textContent = '';
    try {
      const data = await API.post('/api/auth/register', { username, email, password });
      State.user = data.user;
      showApp();
    } catch (err) { errEl.textContent = err.message; }
  });
}

// ═══════════════════════════════════════════════════════
//  SHOW / HIDE APP
// ═══════════════════════════════════════════════════════
async function showApp() {
  // Fetch full user profile
  try { State.user = await API.get('/api/auth/me'); } catch {}
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateSidebarUser();
  initSocket();
  navigateTo('dashboard');

  // Admin nav
  if (State.user?.role === 'admin') {
    document.getElementById('admin-nav-link').classList.remove('hidden');
  }
}

function updateSidebarUser() {
  const u = State.user;
  if (!u) return;
  document.getElementById('sidebar-username').textContent = u.username;
  document.getElementById('sidebar-level').textContent    = `Lv.${u.level} · ${u.rankTitle||''}`;
  const avatarEl = document.getElementById('sidebar-avatar');
  if (u.avatar) {
    avatarEl.innerHTML = `<img src="${u.avatar}" alt="${u.username}">`;
  } else {
    avatarEl.textContent = u.username[0].toUpperCase();
  }
  document.getElementById('mobile-user-avatar').textContent = u.username[0].toUpperCase();
}

// Logout
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
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  if (page === 'chat') {
    State.unreadChats = 0;
    State.chatVisible = true;
    document.getElementById('chat-badge').style.display = 'none';
  } else {
    State.chatVisible = false;
  }
  renderPage(page);
  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    if (item.dataset.page) navigateTo(item.dataset.page);
  });
});

// Mobile menu toggle
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Sidebar avatar click → profile
document.getElementById('sidebar-avatar').addEventListener('click', () => {
  if (State.user) openUserProfile(State.user._id || State.user.id);
});

// ═══════════════════════════════════════════════════════
//  PAGE RENDERER
// ═══════════════════════════════════════════════════════
async function renderPage(page) {
  const content = document.getElementById('main-content');
  content.innerHTML = `<div class="loading"><div class="spinner"></div> Loading...</div>`;
  switch (page) {
    case 'dashboard':   await renderDashboard(); break;
    case 'leaderboard': await renderLeaderboard(); break;
    case 'challenges':  await renderChallenges(); break;
    case 'projects':    await renderProjects(); break;
    case 'resources':   await renderResources(); break;
    case 'chat':        renderChat(); break;
    case 'admin':       await renderAdmin(); break;
    default:            content.innerHTML = `<div class="empty-state"><div class="empty-icon">◻</div><div class="empty-title">Page not found</div></div>`;
  }
}

// ═══════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════
async function renderDashboard() {
  const u = State.user;
  const content = document.getElementById('main-content');

  let recentChallenges = [], recentProjects = [];
  try { const c = await API.get('/api/challenges'); recentChallenges = c.slice(0,3); } catch {}
  try { const p = await API.get('/api/projects?limit=3'); recentProjects = p.projects || []; } catch {}

  const xpProg = u.xpProgress || 0;
  const xpNext = u.xpForNextLevel;
  const badges = (u.badges||[]).map(b => `<span class="badge-chip badge-${b}">${formatBadge(b)}</span>`).join('');

  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Welcome back, <span class="text-accent">${u.username}</span></div>
      <div class="page-subtitle">Here's what's happening in your team today.</div>
    </div>
  </div>
  <div class="dashboard-grid fade-in">
    <!-- Profile Card -->
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
        <div class="xp-bar-wrap">
          <div class="xp-bar-fill" style="width:0%" id="xp-bar-fill"></div>
        </div>
      </div>
      <div class="badges-row">
        ${badges || '<span class="text-muted text-sm">No badges yet</span>'}
      </div>
      <div class="stats-row" style="width:100%;margin-top:8px;margin-bottom:0">
        <div class="stat-card">
          <div class="stat-value">${u.level}</div>
          <div class="stat-label">Level</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${u.xp}</div>
          <div class="stat-label">Total XP</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(u.completedChallenges||[]).length}</div>
          <div class="stat-label">Challenges</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(u.badges||[]).length}</div>
          <div class="stat-label">Badges</div>
        </div>
      </div>
      <button class="btn-secondary" style="width:100%" onclick="openEditProfile()">Edit Profile</button>
    </div>

    <!-- Right Column -->
    <div class="dash-right">
      <!-- Quick Stats -->
      <div class="card">
        <div class="section-heading">Quick Actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn-secondary" onclick="navigateTo('challenges')">⚡ View Challenges</button>
          <button class="btn-secondary" onclick="openNewProject()">◻ New Project</button>
          <button class="btn-secondary" onclick="navigateTo('leaderboard')">◈ Leaderboard</button>
          <button class="btn-secondary" onclick="navigateTo('chat')">◉ Team Chat</button>
        </div>
      </div>

      <!-- Recent Challenges -->
      <div class="card">
        <div class="section-heading">Open Challenges</div>
        ${recentChallenges.length === 0
          ? '<div class="empty-state" style="padding:20px"><div class="empty-icon" style="font-size:1.5rem">⚡</div><div class="empty-sub">No challenges yet</div></div>'
          : recentChallenges.map(c => `
          <div class="activity-item">
            <div class="activity-dot" style="background:${diffColor(c.difficulty)}"></div>
            <div>
              <div class="activity-text">${c.title}</div>
              <div class="activity-time">⚡ ${c.xpReward} XP · ${c.difficulty} · ${c.completedBy?.length||0} completions</div>
            </div>
          </div>`).join('')}
        <button class="btn-secondary" style="width:100%;margin-top:10px" onclick="navigateTo('challenges')">View All →</button>
      </div>

      <!-- Recent Projects -->
      <div class="card">
        <div class="section-heading">Recent Projects</div>
        ${recentProjects.length === 0
          ? '<div class="empty-state" style="padding:20px"><div class="empty-icon" style="font-size:1.5rem">◻</div><div class="empty-sub">No projects yet</div></div>'
          : recentProjects.map(p => `
          <div class="activity-item">
            <div class="activity-dot" style="background:var(--accent-2)"></div>
            <div>
              <div class="activity-text">${p.title}</div>
              <div class="activity-time">by ${p.author?.username || 'unknown'} · ♥ ${p.likes?.length||0}</div>
            </div>
          </div>`).join('')}
        <button class="btn-secondary" style="width:100%;margin-top:10px" onclick="navigateTo('projects')">View All →</button>
      </div>
    </div>
  </div>`;

  // Animate XP bar
  setTimeout(() => {
    const bar = document.getElementById('xp-bar-fill');
    if (bar) bar.style.width = `${xpProg}%`;
  }, 100);
}

function openEditProfile() {
  const u = State.user;
  Modal.open(`
    <div class="form-group">
      <label>Bio</label>
      <textarea id="edit-bio" placeholder="Tell the team about yourself...">${u.bio||''}</textarea>
    </div>
    <div class="form-group">
      <label>GitHub Username</label>
      <input type="text" id="edit-github" value="${u.github||''}" placeholder="yourusername">
    </div>
    <div class="form-group">
      <label>Avatar URL</label>
      <input type="text" id="edit-avatar" value="${u.avatar||''}" placeholder="https://...">
    </div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="saveProfile()">Save Changes</button>
  `, 'Edit Profile');
}

async function saveProfile() {
  const bio    = document.getElementById('edit-bio').value;
  const github = document.getElementById('edit-github').value;
  const avatar = document.getElementById('edit-avatar').value;
  try {
    const data = await API.put('/api/auth/profile', { bio, github, avatar });
    State.user = { ...State.user, ...data.user };
    updateSidebarUser();
    Modal.close();
    Toast.success('Profile updated!');
    renderPage('dashboard');
  } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  LEADERBOARD
// ═══════════════════════════════════════════════════════
async function renderLeaderboard() {
  const content = document.getElementById('main-content');
  let users = [];
  try { users = await API.get('/api/users/leaderboard'); } catch (err) { Toast.error('Failed to load leaderboard'); }

  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Leaderboard</div>
      <div class="page-subtitle">Top developers ranked by XP</div>
    </div>
  </div>
  <div class="card fade-in" style="overflow:auto">
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th style="width:50px">#</th>
          <th>Developer</th>
          <th>Level</th>
          <th>XP</th>
          <th>Badges</th>
          <th>Joined</th>
        </tr>
      </thead>
      <tbody>
        ${users.length === 0 ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">No users yet</td></tr>` :
          users.map(u => `
          <tr style="cursor:pointer" onclick="openUserProfile('${u._id}')">
            <td><span class="rank-num rank-${u.rank}">${u.rank <= 3 ? ['🥇','🥈','🥉'][u.rank-1] : u.rank}</span></td>
            <td>
              <div class="user-cell">
                <div class="user-avatar-sm">
                  ${u.avatar ? `<img src="${u.avatar}" alt="${u.username}">` : u.username[0].toUpperCase()}
                </div>
                <div>
                  <div class="user-name-cell">${u.username}${u._id === (State.user?._id||State.user?.id) ? ' <span style="color:var(--accent);font-size:0.7rem">(you)</span>' : ''}</div>
                  <div class="user-rank-cell">${u.rankTitle}</div>
                </div>
              </div>
            </td>
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
  try { challenges = await API.get('/api/challenges'); } catch (err) { Toast.error('Failed to load challenges'); }

  const completedIds = new Set((State.user?.completedChallenges||[]).map(String));

  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Challenges</div>
      <div class="page-subtitle">Complete challenges to earn XP and badges</div>
    </div>
    ${State.user?.role === 'admin' ? `<button class="btn-primary" onclick="openNewChallenge()">+ New Challenge</button>` : ''}
  </div>
  <div class="challenges-grid fade-in" id="challenges-grid">
    ${challenges.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚡</div><div class="empty-title">No challenges yet</div><div class="empty-sub">Check back later!</div></div>` :
      challenges.map(c => {
        const isCompleted = completedIds.has(String(c._id));
        const isClosed    = c.status === 'closed';
        return `
        <div class="challenge-card ${isCompleted ? 'completed' : ''} ${isClosed ? 'closed' : ''}">
          <div class="challenge-header">
            <div class="challenge-title">${c.title}</div>
            <span class="diff-badge diff-${c.difficulty}">${c.difficulty}</span>
          </div>
          <div class="challenge-desc">${c.description}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            ${(c.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
          </div>
          <div class="challenge-footer">
            <span class="xp-reward">${c.xpReward} XP</span>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:0.72rem;color:var(--text-muted)">${c.completedBy?.length||0} completed</span>
              ${isCompleted
                ? `<span class="challenge-status status-completed">✓ Done</span>`
                : isClosed
                  ? `<span class="challenge-status status-closed">Closed</span>`
                  : `<button class="btn-primary" style="padding:6px 14px;font-size:0.78rem" onclick="completeChallenge('${c._id}')">Complete</button>`}
            </div>
          </div>
          ${State.user?.role === 'admin' ? `
          <div style="margin-top:10px;display:flex;gap:6px">
            <button class="btn-danger" onclick="deleteChallenge('${c._id}')">Delete</button>
            <button class="btn-secondary" style="font-size:0.75rem;padding:6px 10px" onclick="toggleChallengeStatus('${c._id}','${c.status}')">
              ${c.status === 'open' ? 'Close' : 'Reopen'}
            </button>
          </div>` : ''}
        </div>`;
      }).join('')}
  </div>`;
}

async function completeChallenge(id) {
  try {
    const data = await API.post(`/api/challenges/${id}/complete`);
    showXPPopup(data.xpGained);
    Toast.success(`Challenge completed! +${data.xpGained} XP`);
    if (data.leveledUp) Toast.info(`🎉 Level Up! You are now level ${data.newLevel}!`);
    // Refresh user
    State.user = await API.get('/api/auth/me');
    updateSidebarUser();
    renderPage('challenges');
  } catch (err) { Toast.error(err.message); }
}

async function deleteChallenge(id) {
  if (!confirm('Delete this challenge?')) return;
  try {
    await API.delete(`/api/challenges/${id}`);
    Toast.success('Challenge deleted');
    renderPage('challenges');
  } catch (err) { Toast.error(err.message); }
}

async function toggleChallengeStatus(id, current) {
  try {
    await API.put(`/api/challenges/${id}`, { status: current === 'open' ? 'closed' : 'open' });
    renderPage('challenges');
  } catch (err) { Toast.error(err.message); }
}

function openNewChallenge() {
  Modal.open(`
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="ch-title" placeholder="Build a REST API...">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="ch-desc" placeholder="Detailed challenge description..."></textarea>
    </div>
    <div class="form-group">
      <label>Difficulty</label>
      <select id="ch-diff">
        <option value="easy">Easy</option>
        <option value="medium" selected>Medium</option>
        <option value="hard">Hard</option>
        <option value="expert">Expert</option>
      </select>
    </div>
    <div class="form-group">
      <label>XP Reward</label>
      <input type="number" id="ch-xp" value="100" min="10" max="1000">
    </div>
    <div class="form-group">
      <label>Category</label>
      <input type="text" id="ch-cat" placeholder="e.g. Backend, Frontend, DevOps">
    </div>
    <div class="form-group">
      <label>Tags (comma-separated)</label>
      <input type="text" id="ch-tags" placeholder="node.js, api, rest">
    </div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createChallenge()">Create Challenge</button>
  `, 'New Challenge');
}

async function createChallenge() {
  const body = {
    title:       document.getElementById('ch-title').value,
    description: document.getElementById('ch-desc').value,
    difficulty:  document.getElementById('ch-diff').value,
    xpReward:    Number(document.getElementById('ch-xp').value),
    category:    document.getElementById('ch-cat').value,
    tags:        document.getElementById('ch-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
  };
  try {
    await API.post('/api/challenges', body);
    Toast.success('Challenge created!');
    Modal.close();
    renderPage('challenges');
  } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  PROJECTS
// ═══════════════════════════════════════════════════════
let projectsPage = 1, projectsSearch = '';

async function renderProjects() {
  const content = document.getElementById('main-content');
  let data = { projects:[], total:0, pages:1 };
  try { data = await API.get(`/api/projects?page=${projectsPage}&limit=9&search=${projectsSearch}`); } catch (err) { Toast.error('Failed to load projects'); }

  const currentUserId = State.user?._id || State.user?.id;
  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Projects</div>
      <div class="page-subtitle">${data.total} projects shared by the community</div>
    </div>
    <button class="btn-primary" onclick="openNewProject()">+ New Project</button>
  </div>
  <div class="search-bar fade-in">
    <input type="text" class="search-input" id="projects-search" placeholder="Search projects..." value="${projectsSearch}">
    <button class="btn-secondary" onclick="searchProjects()">Search</button>
  </div>
  <div class="projects-grid fade-in" id="projects-grid">
    ${data.projects.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">◻</div><div class="empty-title">No projects found</div><div class="empty-sub">Be the first to share your work!</div></div>` :
      data.projects.map(p => {
        const liked = (p.likes||[]).some(l => String(l) === currentUserId || (l._id && String(l._id) === currentUserId));
        return `
        <div class="project-card">
          <div class="project-image">
            ${p.image ? `<img src="${p.image}" alt="${p.title}">` : `<span class="project-image-placeholder">◻</span>`}
          </div>
          <div class="project-body">
            <div class="project-title">${p.title}</div>
            <div class="project-desc">${p.description.slice(0,120)}${p.description.length>120?'...':''}</div>
            <div class="project-tags">
              ${(p.techStack||[]).slice(0,4).map(t=>`<span class="tag">${t}</span>`).join('')}
            </div>
          </div>
          <div class="project-footer">
            <div class="project-author">
              <div class="user-avatar-sm" style="width:22px;height:22px;font-size:0.65rem">
                ${p.author?.avatar ? `<img src="${p.author.avatar}">` : (p.author?.username||'?')[0].toUpperCase()}
              </div>
              ${p.author?.username||'Unknown'}
            </div>
            <div class="project-actions">
              <button class="like-btn ${liked?'liked':''}" onclick="toggleLike('${p._id}',this)">
                ♥ <span class="like-count">${p.likes?.length||0}</span>
              </button>
              ${p.github ? `<a href="${p.github.startsWith('http')?p.github:'https://github.com/'+p.github}" target="_blank" class="github-link">GitHub →</a>` : ''}
              <button class="btn-secondary" style="font-size:0.72rem;padding:4px 8px" onclick="openProject('${p._id}')">View</button>
            </div>
          </div>
        </div>`;
      }).join('')}
  </div>
  ${data.pages > 1 ? `
  <div style="display:flex;justify-content:center;gap:8px;margin-top:20px" class="fade-in">
    ${Array.from({length:data.pages},(_,i)=>`
      <button class="${i+1===projectsPage?'btn-primary':'btn-secondary'}" style="padding:6px 12px" onclick="goProjectsPage(${i+1})">${i+1}</button>
    `).join('')}
  </div>` : ''}`;

  document.getElementById('projects-search')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchProjects();
  });
}

function searchProjects() {
  projectsSearch = document.getElementById('projects-search')?.value.trim() || '';
  projectsPage = 1;
  renderPage('projects');
}

function goProjectsPage(n) { projectsPage = n; renderPage('projects'); }

async function toggleLike(id, btn) {
  try {
    const data = await API.put(`/api/projects/${id}/like`);
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('.like-count').textContent = data.likes;
    if (data.liked) showXPPopup(10);
  } catch (err) { Toast.error(err.message); }
}

async function openProject(id) {
  let p;
  try { p = await API.get(`/api/projects/${id}`); } catch (err) { Toast.error('Failed to load project'); return; }

  const currentUserId = State.user?._id || State.user?.id;
  const isOwner = String(p.author?._id || p.author) === currentUserId || State.user?.role === 'admin';

  Modal.open(`
    ${p.image ? `<img src="${p.image}" alt="${p.title}" style="width:100%;border-radius:8px;margin-bottom:16px;max-height:200px;object-fit:cover">` : ''}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <h3 style="font-size:1.2rem;font-weight:700">${p.title}</h3>
      ${isOwner ? `<button class="btn-danger" onclick="deleteProject('${p._id}')">Delete</button>` : ''}
    </div>
    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:14px;line-height:1.7">${p.description}</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      ${(p.techStack||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      ${p.github ? `<a href="${p.github.startsWith('http')?p.github:'https://github.com/'+p.github}" target="_blank" class="github-link">GitHub →</a>` : ''}
      ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" class="resource-link">Live Demo →</a>` : ''}
    </div>
    <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:16px">
      By <strong style="color:var(--accent)">${p.author?.username||'Unknown'}</strong> · Lv.${p.author?.level||1} · ${formatDate(p.createdAt)}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:16px">
      <div class="section-heading" style="margin-bottom:12px">Comments (${p.comments?.length||0})</div>
      <div id="project-comments" style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
        ${(p.comments||[]).length === 0
          ? '<span style="color:var(--text-muted);font-size:0.8rem">No comments yet</span>'
          : (p.comments||[]).map(c => `
          <div style="display:flex;gap:8px;padding:8px;background:var(--bg-elevated);border-radius:6px">
            <div class="user-avatar-sm" style="width:28px;height:28px;font-size:0.65rem;flex-shrink:0">
              ${c.author?.avatar ? `<img src="${c.author.avatar}">` : (c.author?.username||'?')[0].toUpperCase()}
            </div>
            <div>
              <div style="font-size:0.78rem;font-weight:600;color:var(--accent)">${c.author?.username||'Unknown'}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary)">${c.content}</div>
              <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">${formatDate(c.createdAt)}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="form-group">
        <textarea id="comment-input" placeholder="Write a comment..." style="height:70px"></textarea>
      </div>
      <button class="btn-primary" style="margin-top:8px" onclick="addComment('${p._id}')">Post Comment</button>
    </div>
  `, p.title);
}

async function addComment(projectId) {
  const content = document.getElementById('comment-input').value.trim();
  if (!content) return;
  try {
    const data = await API.post(`/api/projects/${projectId}/comment`, { content });
    showXPPopup(15);
    Toast.success('Comment added! +15 XP');
    openProject(projectId);
  } catch (err) { Toast.error(err.message); }
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  try {
    await API.delete(`/api/projects/${id}`);
    Modal.close();
    Toast.success('Project deleted');
    renderPage('projects');
  } catch (err) { Toast.error(err.message); }
}

function openNewProject() {
  Modal.open(`
    <div class="form-group">
      <label>Project Title</label>
      <input type="text" id="proj-title" placeholder="My Awesome Project">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="proj-desc" placeholder="What did you build? What problem does it solve?"></textarea>
    </div>
    <div class="form-group">
      <label>GitHub URL or Username/Repo</label>
      <input type="text" id="proj-github" placeholder="https://github.com/user/repo or user/repo">
    </div>
    <div class="form-group">
      <label>Live URL (optional)</label>
      <input type="text" id="proj-live" placeholder="https://myproject.com">
    </div>
    <div class="form-group">
      <label>Tech Stack (comma-separated)</label>
      <input type="text" id="proj-tech" placeholder="React, Node.js, MongoDB">
    </div>
    <div class="form-group">
      <label>Tags (comma-separated)</label>
      <input type="text" id="proj-tags" placeholder="fullstack, api, dashboard">
    </div>
    <div class="form-group">
      <label>Preview Image URL (optional)</label>
      <input type="text" id="proj-image" placeholder="https://...">
    </div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createProject()">Upload Project</button>
    <p style="font-size:0.72rem;color:var(--accent);margin-top:8px;text-align:center">+75 XP for sharing your project!</p>
  `, 'Share a Project');
}

async function createProject() {
  const body = {
    title:       document.getElementById('proj-title').value,
    description: document.getElementById('proj-desc').value,
    github:      document.getElementById('proj-github').value,
    liveUrl:     document.getElementById('proj-live').value,
    techStack:   document.getElementById('proj-tech').value.split(',').map(t=>t.trim()).filter(Boolean),
    tags:        document.getElementById('proj-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    image:       document.getElementById('proj-image').value,
  };
  if (!body.title || !body.description) return Toast.error('Title and description required');
  try {
    const data = await API.post('/api/projects', body);
    showXPPopup(75);
    Toast.success('Project uploaded! +75 XP');
    State.user = await API.get('/api/auth/me');
    updateSidebarUser();
    Modal.close();
    renderPage('projects');
  } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  RESOURCES
// ═══════════════════════════════════════════════════════
let resourcesFilter = 'all';

async function renderResources() {
  const content = document.getElementById('main-content');
  let resources = [];
  try { resources = await API.get(`/api/resources?category=${resourcesFilter}`); } catch {}

  const catIcons = { Web:'🌐', AI:'🤖', Cybersecurity:'🔒', Tools:'🔧', Database:'🗄️', Mobile:'📱', DevOps:'⚙️', Other:'📚' };
  const categories = ['all','Web','AI','Cybersecurity','Tools','DevOps','Mobile','Other'];
  const currentUserId = State.user?._id || State.user?.id;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Resources</div>
      <div class="page-subtitle">Curated programming resources from the community</div>
    </div>
    <button class="btn-primary" onclick="openNewResource()">+ Share Resource</button>
  </div>
  <div class="resources-filter fade-in">
    ${categories.map(c => `
      <button class="filter-btn ${resourcesFilter===c?'active':''}" onclick="filterResources('${c}')">
        ${c === 'all' ? '⬡ All' : `${catIcons[c]||'◻'} ${c}`}
      </button>`).join('')}
  </div>
  <div class="resources-list fade-in">
    ${resources.length === 0 ? `<div class="empty-state"><div class="empty-icon">◈</div><div class="empty-title">No resources yet</div><div class="empty-sub">Share a resource with the community!</div></div>` :
      resources.map(r => {
        const upvoted = (r.upvotes||[]).some(u => String(u) === currentUserId);
        return `
        <div class="resource-item">
          <div class="resource-icon cat-${r.category}">${catIcons[r.category]||'📚'}</div>
          <div class="resource-info">
            <div class="resource-title">${r.title}</div>
            <div class="resource-desc">${r.description||''}</div>
            <div class="resource-meta">
              <span class="resource-cat" style="background:rgba(0,212,170,0.08);color:var(--accent)">${r.category}</span>
              <span class="tag">${r.type}</span>
              <span style="font-size:0.68rem;color:var(--text-muted)">by ${r.author?.username||'Unknown'}</span>
            </div>
          </div>
          <div class="resource-actions">
            <button class="upvote-btn ${upvoted?'upvoted':''}" onclick="toggleUpvote('${r._id}',this)">
              ▲ <span class="upvote-count">${r.upvotes?.length||0}</span>
            </button>
            <a href="${r.url}" target="_blank" class="resource-link">Visit →</a>
            ${State.user?.role === 'admin' ? `<button class="btn-danger" onclick="deleteResource('${r._id}')">✕</button>` : ''}
          </div>
        </div>`;
      }).join('')}
  </div>`;
}

function filterResources(cat) { resourcesFilter = cat; renderPage('resources'); }

async function toggleUpvote(id, btn) {
  try {
    const data = await API.put(`/api/resources/${id}/upvote`);
    btn.classList.toggle('upvoted', data.upvoted);
    btn.querySelector('.upvote-count').textContent = data.upvotes;
  } catch (err) { Toast.error(err.message); }
}

async function deleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  try {
    await API.delete(`/api/resources/${id}`);
    Toast.success('Resource deleted');
    renderPage('resources');
  } catch (err) { Toast.error(err.message); }
}

function openNewResource() {
  Modal.open(`
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="res-title" placeholder="Awesome React Tutorial">
    </div>
    <div class="form-group">
      <label>URL</label>
      <input type="url" id="res-url" placeholder="https://...">
    </div>
    <div class="form-group">
      <label>Description</label>
      <textarea id="res-desc" placeholder="Brief description of this resource..."></textarea>
    </div>
    <div class="form-group">
      <label>Category</label>
      <select id="res-cat">
        <option>Web</option><option>AI</option><option>Cybersecurity</option>
        <option>Tools</option><option>Database</option><option>Mobile</option>
        <option>DevOps</option><option>Other</option>
      </select>
    </div>
    <div class="form-group">
      <label>Type</label>
      <select id="res-type">
        <option>article</option><option>video</option><option>course</option>
        <option>tool</option><option>book</option><option>docs</option>
      </select>
    </div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createResource()">Share Resource</button>
    <p style="font-size:0.72rem;color:var(--accent);margin-top:8px;text-align:center">+30 XP for sharing!</p>
  `, 'Share a Resource');
}

async function createResource() {
  const body = {
    title:       document.getElementById('res-title').value,
    url:         document.getElementById('res-url').value,
    description: document.getElementById('res-desc').value,
    category:    document.getElementById('res-cat').value,
    type:        document.getElementById('res-type').value,
  };
  if (!body.title || !body.url) return Toast.error('Title and URL required');
  try {
    await API.post('/api/resources', body);
    showXPPopup(30);
    Toast.success('Resource shared! +30 XP');
    State.user = await API.get('/api/auth/me');
    updateSidebarUser();
    Modal.close();
    renderPage('resources');
  } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════
let chatMessages = [];
let typingTimeout = null;

function renderChat() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Team Chat</div>
      <div class="page-subtitle">Real-time communication with your team</div>
    </div>
  </div>
  <div class="chat-layout fade-in">
    <div class="chat-main">
      <div class="chat-header">
        <div class="chat-header-dot"></div>
        <span class="chat-room-name"># general</span>
        <span class="chat-room-desc">Team general discussion</span>
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="loading"><div class="spinner"></div> Loading messages...</div>
      </div>
      <div class="chat-typing" id="chat-typing"></div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Message #general... (Enter to send)" maxlength="1000" autocomplete="off">
        <button class="chat-send-btn" onclick="sendChatMessage()">Send</button>
      </div>
    </div>
    <div class="online-sidebar">
      <div class="online-header">
        Online
        <span class="online-count" id="online-count">0</span>
      </div>
      <div id="online-users-list"></div>
    </div>
  </div>`;

  loadChatMessages();
  updateOnlineUsers();

  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    else if (State.socket) {
      State.socket.emit('typing', { room: 'general', typing: true });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => State.socket.emit('typing', { room:'general', typing:false }), 1500);
    }
  });
}

async function loadChatMessages() {
  try {
    const msgs = await API.get('/api/chat/messages?room=general&limit=80');
    chatMessages = msgs;
    const container = document.getElementById('chat-messages');
    if (!container) return;
    if (msgs.length === 0) {
      container.innerHTML = `<div class="chat-system-msg">No messages yet. Say hello! 👋</div>`;
      return;
    }
    container.innerHTML = msgs.map(m => renderChatMessage(m)).join('');
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    const c = document.getElementById('chat-messages');
    if (c) c.innerHTML = `<div class="chat-system-msg">Failed to load messages</div>`;
  }
}

function renderChatMessage(msg) {
  if (msg.type === 'system') {
    return `<div class="chat-system-msg">${msg.content}</div>`;
  }
  const u = msg.author || {};
  const roleClass = u.role === 'admin' ? 'chat-msg-role-admin' : 'chat-msg-role-member';
  return `
  <div class="chat-msg">
    <div class="chat-msg-avatar" onclick="openUserProfile('${u._id||''}')">
      ${u.avatar ? `<img src="${u.avatar}" alt="${u.username}">` : (u.username||'?')[0].toUpperCase()}
    </div>
    <div class="chat-msg-body">
      <div class="chat-msg-header">
        <span class="chat-msg-user ${roleClass}">${u.username||'Unknown'}${u.role==='admin'?' 👑':''}</span>
        <span class="chat-msg-time">${formatTime(msg.createdAt)}</span>
      </div>
      <div class="chat-msg-content">${escapeHTML(msg.content)}</div>
    </div>
  </div>`;
}

function appendChatMessage(msg) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  const el = document.createElement('div');
  el.innerHTML = renderChatMessage(msg);
  container.appendChild(el.firstElementChild || el);
  if (wasAtBottom) container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const content = input.value.trim();
  if (!content || !State.socket) return;
  State.socket.emit('send_message', { content, room: 'general' });
  input.value = '';
}

function updateOnlineUsers() {
  const list = document.getElementById('online-users-list');
  const count = document.getElementById('online-count');
  if (!list) return;
  if (count) count.textContent = State.onlineUsers.length;
  list.innerHTML = State.onlineUsers.map(u => `
    <div class="online-user" onclick="openUserProfile('${u.userId}')">
      <div class="online-avatar">
        ${u.avatar ? `<img src="${u.avatar}" alt="${u.username}">` : u.username[0].toUpperCase()}
      </div>
      <span class="online-name">${u.username}</span>
      <span class="online-lvl">Lv.${u.level}</span>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════════
//  ADMIN PANEL
// ═══════════════════════════════════════════════════════
async function renderAdmin() {
  if (State.user?.role !== 'admin') {
    document.getElementById('main-content').innerHTML = `<div class="empty-state"><div class="empty-icon">⬡</div><div class="empty-title">Access Denied</div></div>`;
    return;
  }

  const content = document.getElementById('main-content');
  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Admin Panel</div>
      <div class="page-subtitle">Platform management and oversight</div>
    </div>
  </div>
  <div class="admin-tabs fade-in">
    <button class="admin-tab active" data-section="users">Users</button>
    <button class="admin-tab" data-section="challenges-admin">Challenges</button>
    <button class="admin-tab" data-section="projects-admin">Projects</button>
    <button class="admin-tab" data-section="resources-admin">Resources</button>
  </div>
  <div id="admin-users" class="admin-section active"><div class="loading"><div class="spinner"></div></div></div>
  <div id="admin-challenges-admin" class="admin-section"></div>
  <div id="admin-projects-admin" class="admin-section"></div>
  <div id="admin-resources-admin" class="admin-section"></div>`;

  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
      tab.classList.add('active');
      const section = document.getElementById(`admin-${tab.dataset.section}`);
      if (section) { section.classList.add('active'); loadAdminSection(tab.dataset.section); }
    });
  });

  loadAdminSection('users');
}

async function loadAdminSection(name) {
  const el = document.getElementById(`admin-${name}`);
  if (!el || el.dataset.loaded === 'true') return;
  el.dataset.loaded = 'true';
  el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;

  if (name === 'users') {
    try {
      const users = await API.get('/api/users');
      el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:0.8rem;color:var(--text-muted)">${users.length} total users</span>
      </div>
      <div class="card" style="overflow:auto">
        <table class="admin-table">
          <thead><tr><th>User</th><th>Role</th><th>Level</th><th>XP</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            ${users.map(u => `
            <tr>
              <td>
                <div class="user-cell">
                  <div class="user-avatar-sm">${u.avatar?`<img src="${u.avatar}">`:u.username[0].toUpperCase()}</div>
                  <div><div style="font-weight:600">${u.username}</div><div style="font-size:0.72rem;color:var(--text-muted)">${u.email}</div></div>
                </div>
              </td>
              <td><span class="role-badge role-${u.role}">${u.role}</span></td>
              <td>${u.level}</td>
              <td style="color:var(--accent)">⚡ ${u.xp}</td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${formatDate(u.joinedAt)}</td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="btn-secondary" style="font-size:0.72rem;padding:5px 8px" onclick="adminToggleRole('${u._id}','${u.role}')">
                    ${u.role==='admin'?'→ Member':'→ Admin'}
                  </button>
                  <button class="btn-secondary" style="font-size:0.72rem;padding:5px 8px" onclick="adminAwardXP('${u._id}')">XP</button>
                  <button class="btn-danger" onclick="adminDeleteUser('${u._id}','${u.username}')">Remove</button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (err) { el.innerHTML = `<div class="empty-state"><div class="empty-title">Failed to load users</div></div>`; }
  }

  if (name === 'challenges-admin') {
    try {
      const challenges = await API.get('/api/challenges');
      el.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <span style="font-size:0.8rem;color:var(--text-muted)">${challenges.length} challenges</span>
        <button class="btn-primary" onclick="openNewChallenge()">+ New Challenge</button>
      </div>
      <div class="card" style="overflow:auto">
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Difficulty</th><th>XP</th><th>Status</th><th>Completions</th><th>Actions</th></tr></thead>
          <tbody>
            ${challenges.map(c => `
            <tr>
              <td style="font-weight:600">${c.title}</td>
              <td><span class="diff-badge diff-${c.difficulty}">${c.difficulty}</span></td>
              <td style="color:var(--accent)">⚡ ${c.xpReward}</td>
              <td><span style="color:${c.status==='open'?'var(--accent)':'var(--text-muted)'}">${c.status}</span></td>
              <td>${c.completedBy?.length||0}</td>
              <td><div style="display:flex;gap:6px">
                <button class="btn-secondary" style="font-size:0.72rem;padding:5px 8px" onclick="toggleChallengeStatus('${c._id}','${c.status}');document.querySelector('[data-section=challenges-admin]').dataset.loaded='';loadAdminSection('challenges-admin')">
                  ${c.status==='open'?'Close':'Reopen'}
                </button>
                <button class="btn-danger" onclick="deleteChallenge('${c._id}');document.querySelector('[data-section=challenges-admin]').dataset.loaded='';loadAdminSection('challenges-admin')">Delete</button>
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    } catch {}
  }

  if (name === 'projects-admin') {
    try {
      const data = await API.get('/api/projects?limit=50');
      const projects = data.projects || [];
      el.innerHTML = `
      <div style="margin-bottom:16px"><span style="font-size:0.8rem;color:var(--text-muted)">${projects.length} projects</span></div>
      <div class="card" style="overflow:auto">
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Author</th><th>Likes</th><th>Comments</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${projects.map(p => `
            <tr>
              <td style="font-weight:600">${p.title}</td>
              <td>${p.author?.username||'?'}</td>
              <td>♥ ${p.likes?.length||0}</td>
              <td>${p.comments?.length||0}</td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${formatDate(p.createdAt)}</td>
              <td><button class="btn-danger" onclick="deleteProject('${p._id}');document.querySelector('[data-section=projects-admin]').dataset.loaded='';loadAdminSection('projects-admin')">Delete</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    } catch {}
  }

  if (name === 'resources-admin') {
    try {
      const resources = await API.get('/api/resources');
      el.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:16px">
        <span style="font-size:0.8rem;color:var(--text-muted)">${resources.length} resources</span>
        <button class="btn-primary" onclick="openNewResource()">+ Add Resource</button>
      </div>
      <div class="card" style="overflow:auto">
        <table class="admin-table">
          <thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Upvotes</th><th>Author</th><th>Actions</th></tr></thead>
          <tbody>
            ${resources.map(r => `
            <tr>
              <td><a href="${r.url}" target="_blank" style="color:var(--accent)">${r.title}</a></td>
              <td>${r.category}</td>
              <td>${r.type}</td>
              <td>▲ ${r.upvotes?.length||0}</td>
              <td style="font-size:0.75rem">${r.author?.username||'?'}</td>
              <td><button class="btn-danger" onclick="deleteResource('${r._id}');document.querySelector('[data-section=resources-admin]').dataset.loaded='';loadAdminSection('resources-admin')">Delete</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    } catch {}
  }
}

async function adminToggleRole(userId, currentRole) {
  const newRole = currentRole === 'admin' ? 'member' : 'admin';
  if (!confirm(`Change this user to ${newRole}?`)) return;
  try {
    await API.put(`/api/users/${userId}/role`, { role: newRole });
    Toast.success(`Role changed to ${newRole}`);
    document.querySelector('[data-section=users]').dataset.loaded = '';
    loadAdminSection('users');
  } catch (err) { Toast.error(err.message); }
}

function adminAwardXP(userId) {
  Modal.open(`
    <div class="form-group">
      <label>XP Amount to Award</label>
      <input type="number" id="xp-amount" value="100" min="1" max="10000">
    </div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="submitAwardXP('${userId}')">Award XP</button>
  `, 'Award XP');
}

async function submitAwardXP(userId) {
  const amount = Number(document.getElementById('xp-amount').value);
  try {
    await API.put(`/api/users/${userId}/xp`, { amount });
    Toast.success(`Awarded ${amount} XP!`);
    Modal.close();
    document.querySelector('[data-section=users]').dataset.loaded = '';
    loadAdminSection('users');
  } catch (err) { Toast.error(err.message); }
}

async function adminDeleteUser(userId, username) {
  if (!confirm(`Permanently delete user "${username}"? This cannot be undone.`)) return;
  try {
    await API.delete(`/api/users/${userId}`);
    Toast.success('User removed');
    document.querySelector('[data-section=users]').dataset.loaded = '';
    loadAdminSection('users');
  } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  USER PROFILE MODAL
// ═══════════════════════════════════════════════════════
async function openUserProfile(userId) {
  if (!userId) return;
  try {
    const u = await API.get(`/api/users/${userId}`);
    const badges = (u.badges||[]).map(b=>`<span class="badge-chip badge-${b}">${formatBadge(b)}</span>`).join('');
    Modal.open(`
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
        <div class="profile-avatar-lg" style="width:60px;height:60px;font-size:1.5rem">
          ${u.avatar?`<img src="${u.avatar}" alt="${u.username}">`:u.username[0].toUpperCase()}
        </div>
        <div>
          <div style="font-size:1.2rem;font-weight:700">${u.username}</div>
          <div class="profile-rank">${u.rankTitle}</div>
          ${u.github ? `<a href="https://github.com/${u.github}" target="_blank" style="font-size:0.75rem;color:var(--accent)">GitHub: @${u.github}</a>` : ''}
        </div>
      </div>
      ${u.bio ? `<p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:16px">${u.bio}</p>` : ''}
      <div class="stats-row" style="margin-bottom:16px">
        <div class="stat-card"><div class="stat-value">${u.level}</div><div class="stat-label">Level</div></div>
        <div class="stat-card"><div class="stat-value">${u.xp}</div><div class="stat-label">XP</div></div>
        <div class="stat-card"><div class="stat-value">${(u.completedChallenges||[]).length}</div><div class="stat-label">Challenges</div></div>
      </div>
      ${badges ? `<div style="margin-bottom:16px"><div class="section-heading" style="margin-bottom:8px">Badges</div><div class="badges-row" style="justify-content:flex-start">${badges}</div></div>` : ''}
      ${u.projects?.length ? `
      <div>
        <div class="section-heading" style="margin-bottom:8px">Recent Projects</div>
        ${u.projects.slice(0,3).map(p=>`
        <div style="padding:10px;background:var(--bg-elevated);border-radius:6px;margin-bottom:8px">
          <div style="font-weight:600;font-size:0.85rem">${p.title}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">${(p.description||'').slice(0,80)}...</div>
        </div>`).join('')}
      </div>` : ''}
    `, u.username);
  } catch (err) { Toast.error('Could not load profile'); }
}

// ═══════════════════════════════════════════════════════
//  SOCKET.IO
// ═══════════════════════════════════════════════════════
function initSocket() {
  State.socket = io({ transports: ['websocket', 'polling'] });

  State.socket.on('connect', () => console.log('🔌 Socket connected'));
  State.socket.on('disconnect', () => console.log('🔌 Socket disconnected'));

  State.socket.on('message', (msg) => {
    if (State.currentPage === 'chat') {
      appendChatMessage(msg);
    } else if (msg.type !== 'system') {
      State.unreadChats++;
      const badge = document.getElementById('chat-badge');
      if (badge) { badge.textContent = State.unreadChats; badge.style.display = 'inline'; }
    }
  });

  State.socket.on('online_users', (users) => {
    State.onlineUsers = users;
    if (State.currentPage === 'chat') updateOnlineUsers();
  });

  State.socket.on('user_typing', ({ username, typing }) => {
    const el = document.getElementById('chat-typing');
    if (!el) return;
    if (typing && username !== State.user?.username) {
      el.textContent = `${username} is typing...`;
    } else {
      el.textContent = '';
    }
  });
}

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
  div.textContent = str;
  return div.innerHTML;
}

function formatBadge(key) {
  const map = {
    welcome: '👋 Welcome', first_xp: '⚡ First XP',
    xp_1k: '🏅 1K XP', xp_5k: '💎 5K XP',
    level_5: '⭐ Level 5', level_10: '🌟 Level 10',
    first_challenge: '🎯 First Challenge',
    challenger: '⚔️ Challenger', challenge_master: '👑 Master',
  };
  return map[key] || key;
}

function diffColor(diff) {
  const map = { easy:'var(--accent)', medium:'var(--accent-warn)', hard:'var(--accent-3)', expert:'var(--accent-2)' };
  return map[diff] || 'var(--text-muted)';
}

// ═══════════════════════════════════════════════════════
//  INIT — Check session on load
// ═══════════════════════════════════════════════════════
async function init() {
  initAuthScreen();
  try {
    const user = await API.get('/api/auth/me');
    State.user = user;
    showApp();
  } catch {
    // Not logged in — show auth screen
  }
}

init();

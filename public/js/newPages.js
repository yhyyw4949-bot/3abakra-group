/**
 * IT Team Platform v2 — New Features JavaScript
 * Add this file as /public/js/newPages.js
 * Include it in index.html after app.js
 */

'use strict';

// ═══════════════════════════════════════════════════════
//  ANNOUNCEMENTS PAGE
// ═══════════════════════════════════════════════════════
async function renderAnnouncements() {
  const content = document.getElementById('main-content');
  let announcements = [];
  try { announcements = await API.get('/api/features/announcements'); } catch {}

  const typeColors = { info:'var(--accent)', warning:'var(--accent-warn)', success:'var(--accent)', event:'var(--accent-2)' };
  const typeIcons  = { info:'📢', warning:'⚠️', success:'✅', event:'🎉' };

  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Announcements</div>
      <div class="page-subtitle">Important updates from the team</div>
    </div>
    ${State.user?.role === 'admin' ? `<button class="btn-primary" onclick="openNewAnnouncement()">+ New Announcement</button>` : ''}
  </div>
  <div class="fade-in" style="display:flex;flex-direction:column;gap:12px">
    ${announcements.length === 0 ? `<div class="empty-state"><div class="empty-icon">📢</div><div class="empty-title">No announcements yet</div></div>` :
      announcements.map(a => `
      <div class="card" style="border-left:4px solid ${typeColors[a.type]||'var(--accent)'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:1.3rem">${typeIcons[a.type]||'📢'}</span>
            <div>
              <div style="font-weight:700;font-size:1rem">${a.title}${a.pinned?'  📌':''}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">by ${a.author?.username||'Admin'} · ${formatDate(a.createdAt)}</div>
            </div>
          </div>
          ${State.user?.role === 'admin' ? `<button class="btn-danger" onclick="deleteAnnouncement('${a._id}')">✕</button>` : ''}
        </div>
        <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.7">${a.content}</div>
      </div>`).join('')}
  </div>`;
}

function openNewAnnouncement() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="ann-title" placeholder="Announcement title"></div>
    <div class="form-group"><label>Content</label><textarea id="ann-content" placeholder="Write your announcement..."></textarea></div>
    <div class="form-group"><label>Type</label>
      <select id="ann-type"><option value="info">ℹ️ Info</option><option value="warning">⚠️ Warning</option><option value="success">✅ Success</option><option value="event">🎉 Event</option></select>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <input type="checkbox" id="ann-pinned"> <label for="ann-pinned" style="font-size:0.85rem">📌 Pin this announcement</label>
    </div>
    <button class="btn-primary btn-full" onclick="createAnnouncement()">Post Announcement</button>
  `, 'New Announcement');
}

async function createAnnouncement() {
  const body = {
    title:   document.getElementById('ann-title').value,
    content: document.getElementById('ann-content').value,
    type:    document.getElementById('ann-type').value,
    pinned:  document.getElementById('ann-pinned').checked,
  };
  if (!body.title || !body.content) return Toast.error('Title and content required');
  try {
    await API.post('/api/features/announcements', body);
    Toast.success('Announcement posted!');
    Modal.close();
    renderAnnouncements();
  } catch (err) { Toast.error(err.message); }
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  try { await API.delete(`/api/features/announcements/${id}`); renderAnnouncements(); } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  EVENTS PAGE
// ═══════════════════════════════════════════════════════
async function renderEvents() {
  const content = document.getElementById('main-content');
  let events = [];
  try { events = await API.get('/api/features/events'); } catch {}

  const typeColors = { meeting:'var(--accent)', hackathon:'var(--accent-2)', workshop:'var(--accent-warn)', other:'var(--text-secondary)' };
  const typeIcons  = { meeting:'🤝', hackathon:'⚡', workshop:'🎓', other:'📅' };
  const currentUserId = State.user?._id || State.user?.id;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Events</div><div class="page-subtitle">Team meetings, hackathons & workshops</div></div>
    ${State.user?.role === 'admin' ? `<button class="btn-primary" onclick="openNewEvent()">+ New Event</button>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px" class="fade-in">
    ${events.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📅</div><div class="empty-title">No events scheduled</div></div>` :
      events.map(e => {
        const attending = e.attendees?.some(a => (a._id||a).toString() === currentUserId);
        const isPast = new Date(e.date) < new Date();
        return `
        <div class="card" style="border-top:3px solid ${typeColors[e.type]||'var(--accent)'}">
          <div style="display:flex;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:1.5rem">${typeIcons[e.type]||'📅'}</span>
            <span style="font-size:0.7rem;padding:3px 8px;border-radius:20px;background:var(--bg-elevated);color:var(--text-secondary)">${e.type}</span>
          </div>
          <div style="font-weight:700;font-size:1rem;margin-bottom:6px">${e.title}</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px">${e.description||''}</div>
          <div style="font-size:0.75rem;color:var(--accent);margin-bottom:4px">📅 ${new Date(e.date).toLocaleString()}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px">📍 ${e.location||'Online'}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.75rem;color:var(--text-muted)">👥 ${e.attendees?.length||0}${e.maxAttendees?'/'+e.maxAttendees:''} attending</span>
            ${isPast ? `<span style="font-size:0.72rem;color:var(--text-muted)">Past event</span>` :
              `<button class="${attending?'btn-danger':'btn-primary'}" style="font-size:0.75rem;padding:6px 12px" onclick="toggleAttend('${e._id}',this)">
                ${attending ? 'Leave' : 'Attend'}
              </button>`}
          </div>
          ${State.user?.role === 'admin' ? `<button class="btn-danger" style="width:100%;margin-top:8px" onclick="deleteEvent('${e._id}')">Delete</button>` : ''}
        </div>`;
      }).join('')}
  </div>`;
}

function openNewEvent() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="ev-title" placeholder="Event title"></div>
    <div class="form-group"><label>Description</label><textarea id="ev-desc" placeholder="What's this event about?"></textarea></div>
    <div class="form-group"><label>Date & Time</label><input type="datetime-local" id="ev-date"></div>
    <div class="form-group"><label>Type</label>
      <select id="ev-type"><option value="meeting">🤝 Meeting</option><option value="hackathon">⚡ Hackathon</option><option value="workshop">🎓 Workshop</option><option value="other">📅 Other</option></select>
    </div>
    <div class="form-group"><label>Location</label><input type="text" id="ev-loc" placeholder="Online / Room 101 / Zoom link"></div>
    <div class="form-group"><label>Max Attendees (0 = unlimited)</label><input type="number" id="ev-max" value="0" min="0"></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createEvent()">Create Event</button>
  `, 'New Event');
}

async function createEvent() {
  const body = {
    title:       document.getElementById('ev-title').value,
    description: document.getElementById('ev-desc').value,
    date:        document.getElementById('ev-date').value,
    type:        document.getElementById('ev-type').value,
    location:    document.getElementById('ev-loc').value,
    maxAttendees:Number(document.getElementById('ev-max').value),
  };
  if (!body.title || !body.date) return Toast.error('Title and date required');
  try { await API.post('/api/features/events', body); Toast.success('Event created!'); Modal.close(); renderEvents(); }
  catch (err) { Toast.error(err.message); }
}

async function toggleAttend(id, btn) {
  try {
    const data = await API.put(`/api/features/events/${id}/attend`);
    btn.textContent = data.attending ? 'Leave' : 'Attend';
    btn.className = data.attending ? 'btn-danger' : 'btn-primary';
    btn.style.cssText = 'font-size:0.75rem;padding:6px 12px';
    Toast.success(data.attending ? 'Joined event!' : 'Left event');
  } catch (err) { Toast.error(err.message); }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  try { await API.delete(`/api/features/events/${id}`); renderEvents(); } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  LEARNING PATHS PAGE
// ═══════════════════════════════════════════════════════
async function renderLearning() {
  const content = document.getElementById('main-content');
  let paths = [];
  try { paths = await API.get('/api/features/learning'); } catch {}
  const currentUserId = State.user?._id || State.user?.id;
  const diffColors = { beginner:'var(--accent)', intermediate:'var(--accent-warn)', advanced:'var(--accent-3)' };

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Learning Paths</div><div class="page-subtitle">Structured roadmaps to level up your skills</div></div>
    ${State.user?.role === 'admin' ? `<button class="btn-primary" onclick="openNewLearningPath()">+ New Path</button>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px" class="fade-in">
    ${paths.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎓</div><div class="empty-title">No learning paths yet</div></div>` :
      paths.map(p => {
        const enrolled = p.enrolled?.some(e => (e._id||e).toString() === currentUserId);
        return `
        <div class="card" style="cursor:pointer" onclick="openLearningPath('${p._id}')">
          ${p.image ? `<img src="${p.image}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:12px">` : ''}
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="font-weight:700;font-size:0.95rem;flex:1">${p.title}</div>
            <span style="font-size:0.65rem;padding:2px 7px;border-radius:20px;background:rgba(0,0,0,0.2);color:${diffColors[p.difficulty]};border:1px solid ${diffColors[p.difficulty]};flex-shrink:0;margin-left:8px">${p.difficulty}</span>
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px">${p.description?.slice(0,100)||''}...</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:0.75rem;color:var(--text-muted)">📚 ${p.steps?.length||0} steps · 👥 ${p.enrolled?.length||0} enrolled</div>
            <span style="font-size:0.7rem;padding:2px 8px;border-radius:10px;background:var(--bg-elevated);color:var(--text-secondary)">${p.category}</span>
          </div>
          ${enrolled ? `<div style="margin-top:10px;font-size:0.75rem;color:var(--accent)">✓ Enrolled</div>` : ''}
        </div>`;
      }).join('')}
  </div>`;
}

async function openLearningPath(id) {
  let path;
  try { path = await API.get(`/api/features/learning/${id}`); } catch { Toast.error('Failed to load'); return; }
  const currentUserId = State.user?._id || State.user?.id;
  const enrolled = path.enrolled?.some(e => (e._id||e).toString() === currentUserId);

  Modal.open(`
    <div style="margin-bottom:16px">
      <div style="font-size:0.75rem;color:var(--accent);margin-bottom:4px">${path.category} · ${path.difficulty}</div>
      <p style="font-size:0.85rem;color:var(--text-secondary)">${path.description}</p>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="${enrolled?'btn-secondary':'btn-primary'}" onclick="toggleEnroll('${path._id}',this)">
          ${enrolled ? '✓ Enrolled' : '+ Enroll'}
        </button>
      </div>
    </div>
    <div class="section-heading" style="margin-bottom:12px">Steps (${path.steps?.length||0})</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${(path.steps||[]).map((s, i) => `
      <div style="display:flex;gap:12px;padding:12px;background:var(--bg-elevated);border-radius:8px;align-items:center">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;flex-shrink:0">${i+1}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:0.85rem">${s.title}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${s.type} · ⚡ ${s.xpReward} XP</div>
        </div>
        <div style="display:flex;gap:6px">
          ${s.url ? `<a href="${s.url}" target="_blank" class="resource-link">Open →</a>` : ''}
          ${enrolled ? `<button class="btn-primary" style="font-size:0.72rem;padding:5px 10px" onclick="completeStep('${path._id}','${s._id}')">Done</button>` : ''}
        </div>
      </div>`).join('')}
    </div>
  `, path.title);
}

async function toggleEnroll(id, btn) {
  try {
    const data = await API.put(`/api/features/learning/${id}/enroll`);
    btn.textContent = data.enrolled ? '✓ Enrolled' : '+ Enroll';
    btn.className = data.enrolled ? 'btn-secondary' : 'btn-primary';
    Toast.success(data.enrolled ? 'Enrolled!' : 'Unenrolled');
  } catch (err) { Toast.error(err.message); }
}

async function completeStep(pathId, stepId) {
  try {
    const data = await API.post(`/api/features/learning/${pathId}/complete-step`, { stepId });
    showXPPopup(data.xpGained);
    Toast.success(`Step completed! +${data.xpGained} XP`);
    State.user = await API.get('/api/auth/me');
    updateSidebarUser();
  } catch (err) { Toast.error(err.message); }
}

function openNewLearningPath() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="lp-title" placeholder="Path title"></div>
    <div class="form-group"><label>Description</label><textarea id="lp-desc" placeholder="What will learners achieve?"></textarea></div>
    <div class="form-group"><label>Category</label><input type="text" id="lp-cat" placeholder="Web, AI, Backend..."></div>
    <div class="form-group"><label>Difficulty</label>
      <select id="lp-diff"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
    </div>
    <div class="form-group"><label>Cover Image URL (optional)</label><input type="text" id="lp-img" placeholder="https://..."></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createLearningPath()">Create Path</button>
  `, 'New Learning Path');
}

async function createLearningPath() {
  const body = {
    title:      document.getElementById('lp-title').value,
    description:document.getElementById('lp-desc').value,
    category:   document.getElementById('lp-cat').value,
    difficulty: document.getElementById('lp-diff').value,
    image:      document.getElementById('lp-img').value,
    steps: []
  };
  if (!body.title) return Toast.error('Title required');
  try { await API.post('/api/features/learning', body); Toast.success('Learning path created!'); Modal.close(); renderLearning(); }
  catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  ANALYTICS PAGE
// ═══════════════════════════════════════════════════════
async function renderAnalytics() {
  const content = document.getElementById('main-content');
  if (State.user?.role !== 'admin') {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Admin only</div></div>`;
    return;
  }
  let stats = {};
  try { stats = await API.get('/api/features/analytics'); } catch {}

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Analytics</div><div class="page-subtitle">Platform statistics and insights</div></div>
  </div>
  <div class="stats-row fade-in" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
    ${[
      { label:'Total Users',      value: stats.totalUsers||0,      icon:'👥' },
      { label:'Online Now',       value: stats.onlineUsers||0,     icon:'🟢' },
      { label:'Total Projects',   value: stats.totalProjects||0,   icon:'◻' },
      { label:'Challenges',       value: stats.totalChallenges||0, icon:'⚡' },
      { label:'Messages Sent',    value: stats.totalMessages||0,   icon:'💬' },
      { label:'Resources',        value: stats.totalResources||0,  icon:'◈' },
      { label:'Blog Posts',       value: stats.totalBlogs||0,      icon:'📝' },
    ].map(s => `
    <div class="stat-card">
      <div style="font-size:1.5rem;margin-bottom:6px">${s.icon}</div>
      <div class="stat-value">${s.value.toLocaleString()}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px" class="fade-in">
    <div class="card">
      <div class="section-heading" style="margin-bottom:12px">🏆 Top Users by XP</div>
      ${(stats.topUsers||[]).map((u,i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-weight:800;color:var(--accent);width:20px">${i+1}</span>
        <div class="user-avatar-sm">${u.avatar?`<img src="${u.avatar}">`:u.username[0].toUpperCase()}</div>
        <span style="flex:1;font-size:0.85rem">${u.username}</span>
        <span style="color:var(--accent);font-size:0.82rem">⚡ ${u.xp.toLocaleString()}</span>
      </div>`).join('')}
    </div>
    <div class="card">
      <div class="section-heading" style="margin-bottom:12px">🆕 Recent Members</div>
      ${(stats.recentUsers||[]).map(u => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="user-avatar-sm">${u.avatar?`<img src="${u.avatar}">`:u.username[0].toUpperCase()}</div>
        <span style="flex:1;font-size:0.85rem">${u.username}</span>
        <span style="font-size:0.72rem;color:var(--text-muted)">${formatDate(u.joinedAt)}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
//  POLLS PAGE
// ═══════════════════════════════════════════════════════
async function renderPolls() {
  const content = document.getElementById('main-content');
  let polls = [];
  try { polls = await API.get('/api/features/polls'); } catch {}
  const currentUserId = State.user?._id || State.user?.id;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Polls & Voting</div><div class="page-subtitle">Vote on team decisions</div></div>
    ${State.user?.role === 'admin' ? `<button class="btn-primary" onclick="openNewPoll()">+ New Poll</button>` : ''}
  </div>
  <div style="display:flex;flex-direction:column;gap:16px" class="fade-in">
    ${polls.length === 0 ? `<div class="empty-state"><div class="empty-icon">🗳️</div><div class="empty-title">No polls yet</div></div>` :
      polls.map(p => {
        const totalVotes = p.options.reduce((s, o) => s + (o.votes?.length||0), 0);
        const expired = p.expiresAt && new Date() > new Date(p.expiresAt);
        const myVote = p.options.findIndex(o => o.votes?.some(v => (v._id||v).toString() === currentUserId));
        return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;margin-bottom:14px">
            <div style="font-weight:700;font-size:1rem">${p.question}</div>
            ${State.user?.role === 'admin' ? `<button class="btn-danger" onclick="deletePoll('${p._id}')">✕</button>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${p.options.map((o, i) => {
              const pct = totalVotes > 0 ? Math.round((o.votes?.length||0) / totalVotes * 100) : 0;
              const isMyVote = myVote === i;
              return `
              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <button style="background:none;border:none;color:${isMyVote?'var(--accent)':'var(--text-primary)'};cursor:${expired?'default':'pointer'};font-family:var(--font-mono);font-size:0.85rem;text-align:left;padding:0"
                    onclick="${expired?'':` votePoll('${p._id}',${i})`}">${isMyVote?'✓ ':''} ${o.text}</button>
                  <span style="font-size:0.78rem;color:var(--text-muted)">${o.votes?.length||0} (${pct}%)</span>
                </div>
                <div style="height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${isMyVote?'var(--accent)':'var(--border-light)'};border-radius:3px;transition:width 0.5s"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:10px">
            ${totalVotes} votes · by ${p.author?.username||'Admin'}
            ${expired ? ' · <span style="color:var(--accent-3)">Expired</span>' : ''}
            ${p.expiresAt && !expired ? ` · Expires ${formatDate(p.expiresAt)}` : ''}
          </div>
        </div>`;
      }).join('')}
  </div>`;
}

async function votePoll(pollId, optionIndex) {
  try {
    await API.post(`/api/features/polls/${pollId}/vote`, { optionIndex });
    Toast.success('Vote recorded!');
    renderPolls();
  } catch (err) { Toast.error(err.message); }
}

function openNewPoll() {
  Modal.open(`
    <div class="form-group"><label>Question</label><input type="text" id="poll-q" placeholder="What should we use for the backend?"></div>
    <div class="form-group"><label>Options (one per line)</label><textarea id="poll-opts" placeholder="Node.js&#10;Python&#10;Go&#10;Rust"></textarea></div>
    <div class="form-group"><label>Expires At (optional)</label><input type="datetime-local" id="poll-exp"></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createPoll()">Create Poll</button>
  `, 'New Poll');
}

async function createPoll() {
  const question = document.getElementById('poll-q').value;
  const options  = document.getElementById('poll-opts').value.split('\n').map(o=>o.trim()).filter(Boolean);
  const expiresAt= document.getElementById('poll-exp').value;
  if (!question || options.length < 2) return Toast.error('Question and at least 2 options required');
  try { await API.post('/api/features/polls', { question, options, expiresAt: expiresAt||undefined }); Toast.success('Poll created!'); Modal.close(); renderPolls(); }
  catch (err) { Toast.error(err.message); }
}

async function deletePoll(id) {
  if (!confirm('Delete this poll?')) return;
  try { await API.delete(`/api/features/polls/${id}`); renderPolls(); } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  BLOG PAGE
// ═══════════════════════════════════════════════════════
async function renderBlogs() {
  const content = document.getElementById('main-content');
  let blogs = [];
  try { blogs = await API.get('/api/features/blogs'); } catch {}
  const currentUserId = State.user?._id || State.user?.id;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Blog & Posts</div><div class="page-subtitle">Technical articles from the team</div></div>
    <button class="btn-primary" onclick="openNewBlog()">✍️ Write Post</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px" class="fade-in">
    ${blogs.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📝</div><div class="empty-title">No posts yet. Be the first to write!</div></div>` :
      blogs.map(b => {
        const liked = b.likes?.some(l => (l._id||l).toString() === currentUserId);
        return `
        <div class="card" style="cursor:pointer;display:flex;flex-direction:column">
          ${b.coverImage ? `<img src="${b.coverImage}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:12px">` : ''}
          <div style="font-weight:700;font-size:1rem;margin-bottom:6px" onclick="openBlogPost('${b._id}')">${b.title}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);flex:1;margin-bottom:12px">${b.excerpt||''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
            ${(b.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:10px">
            <div style="display:flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-secondary)">
              <div class="user-avatar-sm" style="width:22px;height:22px;font-size:0.6rem">${b.author?.avatar?`<img src="${b.author.avatar}">`:b.author?.username?.[0]?.toUpperCase()||'?'}</div>
              ${b.author?.username||'Unknown'}
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <span style="font-size:0.72rem;color:var(--text-muted)">👁️ ${b.views||0}</span>
              <button class="like-btn ${liked?'liked':''}" onclick="toggleBlogLike('${b._id}',this);event.stopPropagation()">
                ♥ <span>${b.likes?.length||0}</span>
              </button>
              <button class="btn-secondary" style="font-size:0.72rem;padding:4px 8px" onclick="openBlogPost('${b._id}')">Read →</button>
            </div>
          </div>
        </div>`;
      }).join('')}
  </div>`;
}

async function toggleBlogLike(id, btn) {
  try {
    const data = await API.put(`/api/features/blogs/${id}/like`);
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('span').textContent = data.likes;
  } catch (err) { Toast.error(err.message); }
}

async function openBlogPost(id) {
  let blog;
  try { blog = await API.get(`/api/features/blogs/${id}`); } catch { Toast.error('Failed to load'); return; }
  Modal.open(`
    ${blog.coverImage ? `<img src="${blog.coverImage}" style="width:100%;border-radius:8px;margin-bottom:16px;max-height:200px;object-fit:cover">` : ''}
    <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:8px">${formatDate(blog.createdAt)} · ${blog.views} views · by <strong style="color:var(--accent)">${blog.author?.username}</strong></div>
    <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.8;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:16px">${blog.content}</div>
    <div class="section-heading" style="margin-bottom:12px">Comments (${blog.comments?.length||0})</div>
    ${(blog.comments||[]).map(c=>`
    <div style="display:flex;gap:8px;padding:8px;background:var(--bg-elevated);border-radius:6px;margin-bottom:8px">
      <div class="user-avatar-sm" style="width:28px;height:28px;font-size:0.65rem;flex-shrink:0">${c.author?.username?.[0]?.toUpperCase()||'?'}</div>
      <div><div style="font-size:0.78rem;font-weight:600;color:var(--accent)">${c.author?.username}</div><div style="font-size:0.8rem;color:var(--text-secondary)">${c.content}</div></div>
    </div>`).join('')}
    <div class="form-group" style="margin-top:12px"><textarea id="blog-comment-input" placeholder="Write a comment..."></textarea></div>
    <button class="btn-primary" style="margin-top:8px" onclick="addBlogComment('${blog._id}')">Post Comment</button>
    ${(State.user?._id||State.user?.id) === (blog.author?._id||'').toString() || State.user?.role === 'admin'
      ? `<button class="btn-danger" style="margin-top:8px;margin-left:8px" onclick="deleteBlog('${blog._id}')">Delete Post</button>` : ''}
  `, blog.title);
}

async function addBlogComment(id) {
  const content = document.getElementById('blog-comment-input').value.trim();
  if (!content) return;
  try { await API.post(`/api/features/blogs/${id}/comment`, { content }); openBlogPost(id); }
  catch (err) { Toast.error(err.message); }
}

async function deleteBlog(id) {
  if (!confirm('Delete this post?')) return;
  try { await API.delete(`/api/features/blogs/${id}`); Modal.close(); renderBlogs(); Toast.success('Post deleted'); }
  catch (err) { Toast.error(err.message); }
}

function openNewBlog() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="blog-title" placeholder="My awesome article"></div>
    <div class="form-group"><label>Content</label><textarea id="blog-content" placeholder="Write your article here..." style="min-height:200px"></textarea></div>
    <div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="blog-tags" placeholder="javascript, tutorial, tips"></div>
    <div class="form-group"><label>Cover Image URL (optional)</label><input type="text" id="blog-cover" placeholder="https://..."></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createBlog()">Publish Post</button>
    <p style="font-size:0.72rem;color:var(--accent);text-align:center;margin-top:8px">+50 XP for publishing!</p>
  `, 'Write a Blog Post');
}

async function createBlog() {
  const body = {
    title:      document.getElementById('blog-title').value,
    content:    document.getElementById('blog-content').value,
    tags:       document.getElementById('blog-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    coverImage: document.getElementById('blog-cover').value,
  };
  if (!body.title || !body.content) return Toast.error('Title and content required');
  try {
    await API.post('/api/features/blogs', body);
    showXPPopup(50); Toast.success('Post published! +50 XP');
    State.user = await API.get('/api/auth/me'); updateSidebarUser();
    Modal.close(); renderBlogs();
  } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  TASKS PAGE — with file submission & admin review
// ═══════════════════════════════════════════════════════
async function renderTasks() {
  const content = document.getElementById('main-content');
  let tasks = [];
  try { tasks = await API.get('/api/features/tasks'); } catch {}

  const isAdmin = State.user?.role === 'admin';
  const currentUserId = State.user?._id || State.user?.id;

  const priorityColors = { low:'var(--text-muted)', medium:'var(--accent-warn)', high:'var(--accent-3)', urgent:'#ff4444' };
  const statusLabel = { todo:'📋 To Do', inprogress:'⚙️ In Progress', pending_review:'🔍 Pending Review', done:'✅ Done', rejected:'❌ Rejected' };
  const statusColor = { todo:'var(--text-muted)', inprogress:'var(--accent-warn)', pending_review:'#a78bfa', done:'var(--accent)', rejected:'#ff4444' };

  // Group for kanban (admin sees all columns, user sees their tasks)
  const cols = isAdmin
    ? ['todo','inprogress','pending_review','done','rejected']
    : ['todo','inprogress','pending_review','done','rejected'];

  const grouped = {};
  cols.forEach(c => grouped[c] = []);
  tasks.forEach(t => { if (grouped[t.status] !== undefined) grouped[t.status].push(t); });

  // Count pending reviews for admin badge
  const pendingCount = grouped['pending_review']?.length || 0;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">Task Manager</div>
      <div class="page-subtitle">${isAdmin ? `Manage tasks · ${pendingCount > 0 ? `<span style="color:#a78bfa">🔍 ${pendingCount} pending review</span>` : 'all caught up ✓'}` : 'Your assigned tasks'}</div>
    </div>
    ${isAdmin ? `<button class="btn-primary" onclick="openNewTask()">+ New Task</button>` : ''}
  </div>

  <div style="display:grid;grid-template-columns:repeat(${isAdmin?5:4},1fr);gap:12px;overflow-x:auto" class="fade-in">
    ${cols.map(status => `
    <div style="min-width:220px">
      <div style="font-size:0.75rem;font-weight:700;color:${statusColor[status]};margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ${statusColor[status]}">
        ${statusLabel[status]} <span style="font-weight:400;opacity:0.7">(${grouped[status].length})</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${grouped[status].length === 0
          ? `<div style="text-align:center;color:var(--text-muted);font-size:0.75rem;padding:20px 0">Empty</div>`
          : grouped[status].map(t => renderTaskCard(t, status, currentUserId, isAdmin, priorityColors)).join('')}
      </div>
    </div>`).join('')}
  </div>`;
}

function renderTaskCard(t, status, currentUserId, isAdmin, priorityColors) {
  const mySubmission = t.submissions?.find(s => (s.user?._id || s.user)?.toString() === currentUserId);
  const allSubmissions = t.submissions || [];

  return `
  <div class="card" style="padding:12px;border-left:3px solid ${priorityColors[t.priority]};font-size:0.82rem">
    <div style="font-weight:700;margin-bottom:4px">${t.title}</div>
    ${t.description ? `<div style="color:var(--text-secondary);font-size:0.75rem;margin-bottom:6px">${t.description.slice(0,80)}${t.description.length>80?'...':''}</div>` : ''}

    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
      ${(t.assignedTo||[]).map(u=>`<span class="tag" style="font-size:0.65rem">${u.username||'?'}</span>`).join('')}
    </div>

    <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:8px">
      ${t.dueDate ? `📅 ${formatDate(t.dueDate)} · ` : ''}
      ⚡ ${t.xpReward} XP ·
      <span style="color:${priorityColors[t.priority]}">${t.priority}</span>
    </div>

    <!-- User actions -->
    ${!isAdmin ? `
    <div style="display:flex;flex-direction:column;gap:4px">
      ${status === 'todo' ? `<button class="btn-secondary" style="font-size:0.7rem;padding:5px" onclick="moveTask('${t._id}','inprogress')">⚙️ Start Task</button>` : ''}
      ${status === 'inprogress' ? `<button class="btn-primary" style="font-size:0.7rem;padding:5px" onclick="openSubmitWork('${t._id}','${t.title}')">📎 Submit Work</button>` : ''}
      ${status === 'pending_review' ? `
        <div style="background:rgba(167,139,250,0.1);border:1px solid #a78bfa;border-radius:6px;padding:6px;font-size:0.7rem;color:#a78bfa">
          🔍 Awaiting admin review
          ${mySubmission ? `<div style="color:var(--text-muted);margin-top:2px">📎 ${mySubmission.fileName}</div>` : ''}
        </div>
        <button class="btn-secondary" style="font-size:0.7rem;padding:4px" onclick="openSubmitWork('${t._id}','${t.title}')">↻ Resubmit</button>
      ` : ''}
      ${status === 'rejected' ? `
        <div style="background:rgba(255,68,68,0.1);border:1px solid #ff4444;border-radius:6px;padding:6px;font-size:0.7rem;color:#ff4444;margin-bottom:4px">
          ❌ Rejected${mySubmission?.adminNote ? `<br><span style="color:var(--text-secondary)">"${mySubmission.adminNote}"</span>` : ''}
        </div>
        <button class="btn-primary" style="font-size:0.7rem;padding:5px" onclick="openSubmitWork('${t._id}','${t.title}')">📎 Resubmit Work</button>
      ` : ''}
      ${status === 'done' ? `<div style="color:var(--accent);font-size:0.75rem;text-align:center">✅ Approved! +${t.xpReward} XP</div>` : ''}
    </div>` : ''}

    <!-- Admin view -->
    ${isAdmin ? `
    <div style="display:flex;flex-direction:column;gap:4px">
      ${status === 'pending_review' ? `
        <div style="font-size:0.72rem;font-weight:600;color:#a78bfa;margin-bottom:4px">🔍 ${allSubmissions.filter(s=>s.status==='pending').length} submission(s) to review</div>
        ${allSubmissions.filter(s=>s.status==='pending').map(s => `
        <div style="background:var(--bg-elevated);border-radius:6px;padding:8px;margin-bottom:4px">
          <div style="font-size:0.72rem;font-weight:600;color:var(--accent)">${s.user?.username||'?'}</div>
          <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:6px">📎 ${s.fileName}</div>
          ${s.note ? `<div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:4px">"${s.note}"</div>` : ''}
          <div style="display:flex;gap:4px">
            <button class="btn-secondary" style="font-size:0.65rem;padding:3px 6px;flex:1" onclick="previewFile('${s._id}','${t._id}')">👁 View</button>
            <button class="btn-primary" style="font-size:0.65rem;padding:3px 6px;flex:1;background:var(--accent)" onclick="openReview('${t._id}','${s._id}','${s.user?.username||'?'}','approve')">✅ Approve</button>
            <button class="btn-danger" style="font-size:0.65rem;padding:3px 6px;flex:1" onclick="openReview('${t._id}','${s._id}','${s.user?.username||'?'}','reject')">❌ Reject</button>
          </div>
        </div>`).join('')}
      ` : ''}
      ${status === 'done' ? `<div style="color:var(--accent);font-size:0.72rem">✅ Completed & approved</div>` : ''}
      ${status !== 'pending_review' && status !== 'done' ? `
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn-danger" style="font-size:0.65rem;padding:3px 6px" onclick="deleteTask('${t._id}')">Delete</button>
        </div>` : ''}
    </div>` : ''}
  </div>`;
}

// ── Move task column ──────────────────────────────────────
async function moveTask(id, status) {
  try { await API.put(`/api/features/tasks/${id}/status`, { status }); renderTasks(); }
  catch (err) { Toast.error(err.message); }
}

// ── Open submit work modal ────────────────────────────────
function openSubmitWork(taskId, taskTitle) {
  Modal.open(`
    <div style="margin-bottom:14px">
      <div style="font-size:0.8rem;color:var(--text-muted)">Task: <strong style="color:var(--text-primary)">${taskTitle}</strong></div>
    </div>
    <div class="form-group">
      <label>Upload Your Work</label>
      <div id="file-drop-zone" style="border:2px dashed var(--border);border-radius:10px;padding:30px;text-align:center;cursor:pointer;transition:all 0.2s" onclick="document.getElementById('task-file-input').click()" ondragover="event.preventDefault();this.style.borderColor='var(--accent)'" ondrop="handleFileDrop(event)">
        <div id="file-drop-text">
          <div style="font-size:2rem;margin-bottom:8px">📎</div>
          <div style="font-weight:600;margin-bottom:4px">Click or drag to upload</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">PDF, PowerPoint, Images, Word · Max 10MB</div>
        </div>
      </div>
      <input type="file" id="task-file-input" style="display:none" accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip" onchange="handleFileSelect(this)">
    </div>
    <div class="form-group">
      <label>Note (optional)</label>
      <textarea id="task-submit-note" placeholder="Describe your work or add any notes..."></textarea>
    </div>
    <button class="btn-primary btn-full" id="submit-work-btn" onclick="submitWork('${taskId}')" disabled style="opacity:0.5">📤 Submit for Review</button>
  `, 'Submit Your Work');
}

// ── File drag & drop ─────────────────────────────────────
function handleFileDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) { Toast.error('File too large! Max 10MB'); return; }

  const dropZone = document.getElementById('file-drop-zone');
  const dropText = document.getElementById('file-drop-text');
  const submitBtn = document.getElementById('submit-work-btn');

  dropText.innerHTML = `
    <div style="font-size:1.5rem;margin-bottom:6px">${getFileIcon(file.type)}</div>
    <div style="font-weight:600;font-size:0.85rem;color:var(--accent)">${file.name}</div>
    <div style="font-size:0.72rem;color:var(--text-muted)">${(file.size/1024).toFixed(1)} KB · Click to change</div>`;
  dropZone.style.borderColor = 'var(--accent)';
  dropZone.style.background = 'rgba(0,212,170,0.05)';

  const reader = new FileReader();
  reader.onload = (e) => {
    window._taskFileData = { name: file.name, url: e.target.result, type: file.type, size: file.size };
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
  };
  reader.readAsDataURL(file);
}

function getFileIcon(mimeType) {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('zip')) return '🗜️';
  return '📎';
}

// ── Submit work to server ─────────────────────────────────
async function submitWork(taskId) {
  const fileData = window._taskFileData;
  if (!fileData) { Toast.error('Please select a file first'); return; }
  const note = document.getElementById('task-submit-note')?.value || '';
  const btn = document.getElementById('submit-work-btn');
  btn.textContent = '⏳ Uploading...';
  btn.disabled = true;
  try {
    await API.post(`/api/features/tasks/${taskId}/submit`, {
      fileName: fileData.name,
      fileUrl:  fileData.url,
      fileType: fileData.type,
      fileSize: fileData.size,
      note
    });
    window._taskFileData = null;
    Toast.success('Work submitted! Admin will review it soon 🎉');
    Modal.close();
    renderTasks();
  } catch (err) {
    Toast.error(err.message);
    btn.textContent = '📤 Submit for Review';
    btn.disabled = false;
  }
}

// ── Preview submitted file ────────────────────────────────
async function previewFile(subId, taskId) {
  let tasks = [];
  try { tasks = await API.get('/api/features/tasks'); } catch {}
  const task = tasks.find(t => t._id === taskId);
  const sub = task?.submissions?.find(s => s._id === subId);
  if (!sub) { Toast.error('File not found'); return; }

  const isImage = sub.fileType?.includes('image');
  const isPDF   = sub.fileType?.includes('pdf');

  Modal.open(`
    <div style="margin-bottom:12px">
      <div style="font-size:0.8rem;color:var(--text-muted)">Submitted by <strong style="color:var(--accent)">${sub.user?.username||'?'}</strong></div>
      <div style="font-size:0.75rem;color:var(--text-muted)">📎 ${sub.fileName} · ${sub.fileSize ? (sub.fileSize/1024).toFixed(1)+' KB' : ''}</div>
      ${sub.note ? `<div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary);background:var(--bg-elevated);padding:8px;border-radius:6px">"${sub.note}"</div>` : ''}
    </div>
    ${isImage ? `<img src="${sub.fileUrl}" style="width:100%;border-radius:8px;max-height:400px;object-fit:contain">` :
      isPDF    ? `<iframe src="${sub.fileUrl}" style="width:100%;height:400px;border:none;border-radius:8px"></iframe>` :
      `<div style="text-align:center;padding:30px">
        <div style="font-size:3rem;margin-bottom:12px">${getFileIcon(sub.fileType||'')}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:14px">Preview not available for this file type</div>
        <a href="${sub.fileUrl}" download="${sub.fileName}" class="btn-primary" style="display:inline-block">⬇ Download File</a>
      </div>`}
    <div style="margin-top:14px;display:flex;justify-content:center">
      <a href="${sub.fileUrl}" download="${sub.fileName}" class="btn-secondary" style="font-size:0.8rem">⬇ Download</a>
    </div>
  `, sub.fileName);
}

// ── Admin review modal ────────────────────────────────────
function openReview(taskId, subId, username, action) {
  const isApprove = action === 'approve';
  const verdict   = isApprove ? 'approved' : 'rejected';
  Modal.open(`
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:2.5rem;margin-bottom:8px">${isApprove ? '✅' : '❌'}</div>
      <div style="font-weight:700;font-size:1rem">${isApprove ? 'Approve' : 'Reject'} submission by <span style="color:var(--accent)">${username}</span>?</div>
    </div>
    ${!isApprove ? `
    <div class="form-group">
      <label>Reason for rejection (optional)</label>
      <textarea id="review-note" placeholder="e.g. Missing requirements, please redo section 3..."></textarea>
    </div>` : ''}
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn-secondary" style="flex:1" onclick="Modal.close()">Cancel</button>
      <button class="${isApprove ? 'btn-primary' : 'btn-danger'}" style="flex:1" onclick="submitReview('${taskId}','${subId}','${verdict}')">
        ${isApprove ? '✅ Approve & Award XP' : '❌ Reject'}
      </button>
    </div>
  `, isApprove ? 'Approve Submission' : 'Reject Submission');
}

async function submitReview(taskId, subId, verdict) {
  const adminNote = document.getElementById('review-note')?.value || '';
  try {
    await API.put(`/api/features/tasks/${taskId}/submissions/${subId}/review`, { verdict, adminNote });
    Toast.success(verdict === 'approved' ? '✅ Approved! XP awarded!' : '❌ Submission rejected');
    Modal.close();
    renderTasks();
    if (verdict === 'approved') { State.user = await API.get('/api/auth/me'); updateSidebarUser(); }
  } catch (err) { Toast.error(err.message); }
}

// ── Create task modal ────────────────────────────────────
async function openNewTask() {
  let users = [];
  try { users = await API.get('/api/users'); } catch {}
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="task-title" placeholder="Task title"></div>
    <div class="form-group"><label>Description</label><textarea id="task-desc" placeholder="Task details..."></textarea></div>
    <div class="form-group">
      <label>Assign To (hold Ctrl/Cmd for multiple)</label>
      <select id="task-users" multiple style="height:120px">
        ${users.map(u=>`<option value="${u._id}">${u.username}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Priority</label>
      <select id="task-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select>
    </div>
    <div class="form-group"><label>Due Date</label><input type="date" id="task-due"></div>
    <div class="form-group"><label>XP Reward</label><input type="number" id="task-xp" value="50" min="0"></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createTask()">Create Task</button>
  `, 'New Task');
}

async function createTask() {
  const select = document.getElementById('task-users');
  const assignedTo = Array.from(select.selectedOptions).map(o => o.value);
  const body = {
    title:       document.getElementById('task-title').value,
    description: document.getElementById('task-desc').value,
    assignedTo,
    priority:    document.getElementById('task-priority').value,
    dueDate:     document.getElementById('task-due').value || undefined,
    xpReward:    Number(document.getElementById('task-xp').value),
  };
  if (!body.title) return Toast.error('Title required');
  try { await API.post('/api/features/tasks', body); Toast.success('Task created!'); Modal.close(); renderTasks(); }
  catch (err) { Toast.error(err.message); }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try { await API.delete(`/api/features/tasks/${id}`); renderTasks(); }
  catch (err) { Toast.error(err.message); }
}

async function updateTaskStatus(id, status) {
  try { await moveTask(id, status); } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  TEAMS PAGE
// ═══════════════════════════════════════════════════════
async function renderTeams() {
  const content = document.getElementById('main-content');
  let teams = [];
  try { teams = await API.get('/api/features/teams'); } catch {}
  const currentUserId = State.user?._id || State.user?.id;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Teams</div><div class="page-subtitle">Join or create a team and climb the group leaderboard</div></div>
    <button class="btn-primary" onclick="openNewTeam()">+ Create Team</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px" class="fade-in">
    ${teams.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏅</div><div class="empty-title">No teams yet. Create the first one!</div></div>` :
      teams.map((t, i) => {
        const isMember = t.members?.some(m => (m._id||m).toString() === currentUserId);
        return `
        <div class="card">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--accent-glow);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.2rem">
              ${t.avatar||'🏅'}
            </div>
            <div>
              <div style="font-weight:700">${i<3?['🥇','🥈','🥉'][i]+' ':''} ${t.name}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">Led by ${t.leader?.username||'Unknown'}</div>
            </div>
          </div>
          ${t.description ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:10px">${t.description}</div>` : ''}
          <div style="font-size:0.82rem;color:var(--accent);margin-bottom:10px">⚡ ${t.totalXP?.toLocaleString()||0} Team XP</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">
            ${(t.members||[]).slice(0,6).map(m=>`
            <div class="user-avatar-sm" style="width:28px;height:28px;font-size:0.65rem" title="${m.username||''}">
              ${m.avatar?`<img src="${m.avatar}">`:((m.username||'?')[0].toUpperCase())}
            </div>`).join('')}
            ${t.members?.length > 6 ? `<span style="font-size:0.72rem;color:var(--text-muted);align-self:center">+${t.members.length-6} more</span>` : ''}
          </div>
          <div style="display:flex;gap:8px">
            ${isMember
              ? `<button class="btn-danger" style="flex:1" onclick="leaveTeam('${t._id}')">Leave Team</button>`
              : `<button class="btn-primary" style="flex:1" onclick="joinTeam('${t._id}')">Join Team</button>`}
          </div>
        </div>`;
      }).join('')}
  </div>`;
}

async function joinTeam(id) {
  try { await API.put(`/api/features/teams/${id}/join`); Toast.success('Joined team!'); renderTeams(); }
  catch (err) { Toast.error(err.message); }
}

async function leaveTeam(id) {
  if (!confirm('Leave this team?')) return;
  try { await API.put(`/api/features/teams/${id}/leave`); Toast.success('Left team'); renderTeams(); }
  catch (err) { Toast.error(err.message); }
}

function openNewTeam() {
  Modal.open(`
    <div class="form-group"><label>Team Name</label><input type="text" id="team-name" placeholder="Team Awesome"></div>
    <div class="form-group"><label>Description</label><textarea id="team-desc" placeholder="What's this team about?"></textarea></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createTeam()">Create Team</button>
  `, 'Create a Team');
}

async function createTeam() {
  const body = { name: document.getElementById('team-name').value, description: document.getElementById('team-desc').value };
  if (!body.name) return Toast.error('Team name required');
  try { await API.post('/api/features/teams', body); Toast.success('Team created!'); Modal.close(); renderTeams(); }
  catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  SNIPPETS PAGE
// ═══════════════════════════════════════════════════════
async function renderSnippets() {
  const content = document.getElementById('main-content');
  let snippets = [];
  try { snippets = await API.get('/api/features/snippets'); } catch {}
  const currentUserId = State.user?._id || State.user?.id;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Code Snippets</div><div class="page-subtitle">Share useful code with the team</div></div>
    <button class="btn-primary" onclick="openNewSnippet()">+ Share Snippet</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px" class="fade-in">
    ${snippets.length === 0 ? `<div class="empty-state"><div class="empty-icon">🔗</div><div class="empty-title">No snippets yet. Share your first one!</div></div>` :
      snippets.map(s => {
        const liked = s.likes?.some(l => (l._id||l).toString() === currentUserId);
        return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-weight:700;font-size:0.95rem">${s.title}</div>
              <div style="font-size:0.72rem;color:var(--text-muted)">by ${s.author?.username||'?'} · ${s.language}</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="like-btn ${liked?'liked':''}" onclick="toggleSnippetLike('${s._id}',this)">♥ <span>${s.likes?.length||0}</span></button>
              <button class="btn-secondary" style="font-size:0.72rem;padding:5px 8px" onclick="copySnippet('${s._id}')">Copy</button>
              ${(s.author?._id||s.author)?.toString() === currentUserId || State.user?.role==='admin' ? `<button class="btn-danger" onclick="deleteSnippet('${s._id}')">✕</button>` : ''}
            </div>
          </div>
          ${s.description ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px">${s.description}</div>` : ''}
          <pre id="snippet-${s._id}" style="background:var(--bg-base);border:1px solid var(--border);border-radius:6px;padding:12px;overflow-x:auto;font-size:0.78rem;color:var(--accent);font-family:var(--font-mono);max-height:200px;overflow-y:auto">${escapeHTML(s.code)}</pre>
          <div style="display:flex;gap:4px;margin-top:8px">
            ${(s.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
          </div>
        </div>`;
      }).join('')}
  </div>`;
}

async function toggleSnippetLike(id, btn) {
  try {
    const data = await API.put(`/api/features/snippets/${id}/like`);
    btn.classList.toggle('liked', data.liked);
    btn.querySelector('span').textContent = data.likes;
  } catch (err) { Toast.error(err.message); }
}

function copySnippet(id) {
  const el = document.getElementById(`snippet-${id}`);
  if (el) { navigator.clipboard.writeText(el.textContent); Toast.success('Copied to clipboard!'); }
}

async function deleteSnippet(id) {
  if (!confirm('Delete this snippet?')) return;
  try { await API.delete(`/api/features/snippets/${id}`); renderSnippets(); } catch (err) { Toast.error(err.message); }
}

function openNewSnippet() {
  Modal.open(`
    <div class="form-group"><label>Title</label><input type="text" id="snip-title" placeholder="Useful array flatten function"></div>
    <div class="form-group"><label>Language</label>
      <select id="snip-lang"><option>javascript</option><option>python</option><option>typescript</option><option>css</option><option>html</option><option>bash</option><option>sql</option><option>go</option><option>rust</option><option>other</option></select>
    </div>
    <div class="form-group"><label>Code</label><textarea id="snip-code" placeholder="Paste your code here..." style="min-height:150px;font-family:monospace"></textarea></div>
    <div class="form-group"><label>Description</label><input type="text" id="snip-desc" placeholder="What does this do?"></div>
    <div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="snip-tags" placeholder="utility, array, functional"></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createSnippet()">Share Snippet</button>
    <p style="font-size:0.72rem;color:var(--accent);text-align:center;margin-top:8px">+20 XP for sharing!</p>
  `, 'Share Code Snippet');
}

async function createSnippet() {
  const body = {
    title:      document.getElementById('snip-title').value,
    language:   document.getElementById('snip-lang').value,
    code:       document.getElementById('snip-code').value,
    description:document.getElementById('snip-desc').value,
    tags:       document.getElementById('snip-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
  };
  if (!body.title || !body.code) return Toast.error('Title and code required');
  try {
    await API.post('/api/features/snippets', body);
    showXPPopup(20); Toast.success('Snippet shared! +20 XP');
    Modal.close(); renderSnippets();
  } catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  NOTIFICATIONS PAGE
// ═══════════════════════════════════════════════════════
async function renderNotifications() {
  const content = document.getElementById('main-content');
  let notifications = [];
  try { notifications = await API.get('/api/features/notifications'); } catch {}

  const typeIcons = { xp:'⚡', badge:'🏅', like:'♥', comment:'💬', follow:'👥', mention:'@', task:'📋', announcement:'📢', dm:'💬' };

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Notifications</div><div class="page-subtitle">${notifications.filter(n=>!n.read).length} unread</div></div>
    <button class="btn-secondary" onclick="markAllRead()">Mark All Read</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:6px" class="fade-in">
    ${notifications.length === 0 ? `<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">No notifications yet</div></div>` :
      notifications.map(n => `
      <div style="display:flex;gap:12px;padding:14px 16px;background:var(--bg-card);border:1px solid ${n.read?'var(--border)':'var(--accent)'};border-radius:10px;transition:all 0.15s">
        <div style="font-size:1.3rem;flex-shrink:0">${typeIcons[n.type]||'🔔'}</div>
        <div style="flex:1">
          <div style="font-weight:${n.read?'400':'700'};font-size:0.88rem">${n.title}</div>
          ${n.message ? `<div style="font-size:0.78rem;color:var(--text-secondary)">${n.message}</div>` : ''}
          <div style="font-size:0.68rem;color:var(--text-muted);margin-top:4px">${formatDate(n.createdAt)}</div>
        </div>
        ${!n.read ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px"></div>` : ''}
      </div>`).join('')}
  </div>`;
}

async function markAllRead() {
  try { await API.put('/api/features/notifications/read-all'); Toast.success('All marked as read'); renderNotifications(); }
  catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  XP SHOP PAGE
// ═══════════════════════════════════════════════════════
async function renderShop() {
  const content = document.getElementById('main-content');
  let items = [];
  try { items = await API.get('/api/features/shop'); } catch {}
  const userXP = State.user?.xp || 0;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">XP Shop</div><div class="page-subtitle">Spend your XP on exclusive items</div></div>
    <div style="background:var(--bg-card);border:1px solid var(--border);padding:10px 16px;border-radius:8px">
      <span style="color:var(--accent);font-weight:700">⚡ ${userXP.toLocaleString()} XP</span> available
    </div>
  </div>
  ${State.user?.role === 'admin' ? `<div style="margin-bottom:16px"><button class="btn-primary" onclick="openNewShopItem()">+ Add Shop Item</button></div>` : ''}
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px" class="fade-in">
    ${items.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎰</div><div class="empty-title">Shop is empty</div>${State.user?.role==='admin'?'<div class="empty-sub">Add items as admin</div>':''}</div>` :
      items.map(item => {
        const canAfford = userXP >= item.cost;
        return `
        <div class="card" style="text-align:center;${!canAfford?'opacity:0.6':''}">
          <div style="font-size:2.5rem;margin-bottom:10px">${item.icon||'🎁'}</div>
          <div style="font-weight:700;margin-bottom:6px">${item.name}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:12px">${item.description||''}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">${item.type}</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--accent);margin-bottom:14px">⚡ ${item.cost.toLocaleString()} XP</div>
          <button class="${canAfford?'btn-primary':'btn-secondary'}" style="width:100%" onclick="buyItem('${item._id}','${item.name}',${item.cost})" ${canAfford?'':''}>
            ${canAfford ? 'Purchase' : 'Need more XP'}
          </button>
        </div>`;
      }).join('')}
  </div>`;
}

async function buyItem(id, name, cost) {
  if (!confirm(`Buy "${name}" for ${cost} XP?`)) return;
  try {
    await API.post(`/api/features/shop/${id}/buy`);
    Toast.success(`Purchased ${name}!`);
    State.user = await API.get('/api/auth/me');
    updateSidebarUser();
    renderShop();
  } catch (err) { Toast.error(err.message); }
}

function openNewShopItem() {
  Modal.open(`
    <div class="form-group"><label>Name</label><input type="text" id="shop-name" placeholder="Golden Title"></div>
    <div class="form-group"><label>Description</label><input type="text" id="shop-desc" placeholder="Display a golden title on your profile"></div>
    <div class="form-group"><label>Type</label><select id="shop-type"><option value="title">Title</option><option value="badge">Badge</option><option value="border">Border</option><option value="theme">Theme</option></select></div>
    <div class="form-group"><label>XP Cost</label><input type="number" id="shop-cost" value="500" min="1"></div>
    <div class="form-group"><label>Icon (emoji)</label><input type="text" id="shop-icon" placeholder="🎁" maxlength="4"></div>
    <div class="form-group"><label>Value (applied to user)</label><input type="text" id="shop-val" placeholder="gold_title"></div>
    <button class="btn-primary btn-full" style="margin-top:12px" onclick="createShopItem()">Add to Shop</button>
  `, 'New Shop Item');
}

async function createShopItem() {
  const body = {
    name:        document.getElementById('shop-name').value,
    description: document.getElementById('shop-desc').value,
    type:        document.getElementById('shop-type').value,
    cost:        Number(document.getElementById('shop-cost').value),
    icon:        document.getElementById('shop-icon').value,
    value:       document.getElementById('shop-val').value,
  };
  if (!body.name || !body.cost) return Toast.error('Name and cost required');
  try { await API.post('/api/features/shop', body); Toast.success('Item added!'); Modal.close(); renderShop(); }
  catch (err) { Toast.error(err.message); }
}

// ═══════════════════════════════════════════════════════
//  DIRECT MESSAGES PAGE
// ═══════════════════════════════════════════════════════
async function renderDMs() {
  const content = document.getElementById('main-content');
  let dms = [], users = [];
  try { dms = await API.get('/api/features/dm'); } catch {}
  try { users = await API.get('/api/users/leaderboard'); } catch {}
  const currentUserId = State.user?._id || State.user?.id;

  content.innerHTML = `
  <div class="page-header fade-in">
    <div><div class="page-title">Direct Messages</div><div class="page-subtitle">Private conversations with team members</div></div>
  </div>
  <div style="display:grid;grid-template-columns:280px 1fr;gap:16px;height:calc(100vh - 160px)" class="fade-in">
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow-y:auto">
      <div style="padding:12px;border-bottom:1px solid var(--border);font-size:0.72rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted)">Conversations</div>
      ${users.filter(u => u._id !== currentUserId).map(u => `
      <div style="display:flex;align-items:center;gap:10px;padding:12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s" onclick="openDMConversation('${u._id}','${u.username}')" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background=''">
        <div class="user-avatar-sm">${u.avatar?`<img src="${u.avatar}">`:u.username[0].toUpperCase()}</div>
        <div>
          <div style="font-size:0.85rem;font-weight:600">${u.username}</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">Lv.${u.level}</div>
        </div>
      </div>`).join('')}
    </div>
    <div id="dm-conversation" style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-muted)">
      <div style="font-size:2rem;margin-bottom:8px">💬</div>
      <div>Select a conversation</div>
    </div>
  </div>`;
}

async function openDMConversation(userId, username) {
  const conv = document.getElementById('dm-conversation');
  conv.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  let dm;
  try { dm = await API.get(`/api/features/dm/${userId}`); } catch { Toast.error('Failed to load'); return; }
  const currentUserId = State.user?._id || State.user?.id;

  conv.innerHTML = `
    <div style="padding:14px;border-bottom:1px solid var(--border);font-weight:600">${username}</div>
    <div id="dm-messages" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:6px">
      ${(dm.messages||[]).map(m => {
        const isMe = (m.sender?._id||m.sender)?.toString() === currentUserId;
        return `<div style="display:flex;justify-content:${isMe?'flex-end':'flex-start'}">
          <div style="max-width:70%;padding:8px 12px;border-radius:${isMe?'12px 12px 4px 12px':'12px 12px 12px 4px'};background:${isMe?'var(--accent)':'var(--bg-elevated)'};color:${isMe?'#000':'var(--text-primary)'};font-size:0.83rem">${escapeHTML(m.content)}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="padding:12px;border-top:1px solid var(--border);display:flex;gap:8px">
      <input type="text" id="dm-input" placeholder="Message ${username}..." style="flex:1;background:var(--bg-surface);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:var(--font-mono);font-size:0.85rem;padding:8px 12px;outline:none">
      <button class="chat-send-btn" onclick="sendDM('${userId}')">Send</button>
    </div>`;

  conv.style.display = 'flex';
  conv.style.flexDirection = 'column';
  const msgs = document.getElementById('dm-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
  document.getElementById('dm-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendDM(userId); });
}

async function sendDM(userId) {
  const input = document.getElementById('dm-input');
  const content = input?.value?.trim();
  if (!content) return;
  try {
    await API.post(`/api/features/dm/${userId}/send`, { content });
    input.value = '';
    openDMConversation(userId, '');
  } catch (err) { Toast.error(err.message); }
}

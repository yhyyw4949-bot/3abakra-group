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
    ${State.user?.role === 'admin' ? `
      <div style="display:flex;gap:8px">
        <button class="btn-secondary" onclick="openAdminFileUpload('announcements','Announcements',()=>renderAnnouncements())">📎 Attach File</button>
        <button class="btn-primary" onclick="openNewAnnouncement()">+ New Announcement</button>
      </div>` : ''}
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

// ═══════════════════════════════════════════════════════
//  SHARED FILE UPLOAD HELPER (used across all sections)
// ═══════════════════════════════════════════════════════
function openAdminFileUpload(section, sectionLabel, onSuccess) {
  Modal.open(`
    <div style="margin-bottom:14px;padding:10px;background:rgba(0,212,170,0.08);border-radius:8px;font-size:0.8rem;color:var(--accent)">
      📎 Uploading file to: <strong>${sectionLabel}</strong>
    </div>
    <div class="form-group"><label>Title / Description</label>
      <input type="text" id="afu-title" placeholder="e.g. Week 3 Slides, Project Guidelines...">
    </div>
    <div class="form-group">
      <label>File</label>
      <div id="afu-drop" style="border:2px dashed var(--border);border-radius:10px;padding:28px;text-align:center;cursor:pointer"
        onclick="document.getElementById('afu-input').click()"
        ondragover="event.preventDefault();this.style.borderColor='var(--accent)'"
        ondrop="afuDrop(event)">
        <div id="afu-drop-text">
          <div style="font-size:2rem;margin-bottom:8px">📁</div>
          <div style="font-weight:600;margin-bottom:4px">Click or drag to upload</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">PDF, PPT, Word, Images, ZIP · Max 50MB</div>
        </div>
      </div>
      <input type="file" id="afu-input" style="display:none"
        accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.gif,.zip,.txt,.xlsx,.csv"
        onchange="afuSelect(this)">
    </div>
    <div class="form-group"><label>Note (optional)</label>
      <textarea id="afu-note" placeholder="Additional notes..."></textarea>
    </div>
    <button class="btn-primary btn-full" id="afu-btn" onclick="afuSubmit('${section}', onSuccessCallback)" disabled style="opacity:0.5">📤 Upload File</button>
  `, 'Upload File');
  window._afuOnSuccess = onSuccess;
  window._afuSection = section;
  // fix the onclick after modal renders
  setTimeout(() => {
    document.getElementById('afu-btn').onclick = () => afuSubmit(section);
  }, 50);
}

function afuDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) afuProcess(file);
}
function afuSelect(input) {
  if (input.files[0]) afuProcess(input.files[0]);
}
function afuProcess(file) {
  if (file.size > 50 * 1024 * 1024) { Toast.error('Max 50MB'); return; }
  const icons = { 'application/pdf':'📄', 'application/vnd.ms-powerpoint':'📊', 'application/vnd.openxmlformats-officedocument.presentationml.presentation':'📊', 'application/msword':'📝', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'📝', 'image/png':'🖼️', 'image/jpeg':'🖼️', 'application/zip':'🗜️' };
  const icon = icons[file.type] || '📎';
  document.getElementById('afu-drop-text').innerHTML = `
    <div style="font-size:1.8rem;margin-bottom:6px">${icon}</div>
    <div style="font-weight:600;font-size:0.88rem;color:var(--accent)">${file.name}</div>
    <div style="font-size:0.72rem;color:var(--text-muted)">${(file.size/1024).toFixed(1)} KB · click to change</div>`;
  document.getElementById('afu-drop').style.borderColor = 'var(--accent)';
  const reader = new FileReader();
  reader.onload = e => {
    window._afuFile = { name: file.name, data: e.target.result, type: file.type, size: file.size };
    const btn = document.getElementById('afu-btn');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  };
  reader.readAsDataURL(file);
}
async function afuSubmit(section) {
  const f = window._afuFile;
  if (!f) { Toast.error('Select a file first'); return; }
  const title = document.getElementById('afu-title')?.value?.trim();
  if (!title) { Toast.error('Title required'); return; }
  const note = document.getElementById('afu-note')?.value || '';
  const btn = document.getElementById('afu-btn');
  if (btn) { btn.textContent = '⏳ Uploading...'; btn.disabled = true; }
  try {
    await API.post('/api/features/uploads', {
      title, section, fileData: f.data, fileName: f.name,
      fileType: f.type, fileSize: f.size, note
    });
    window._afuFile = null;
    Toast.success('File uploaded!');
    Modal.close();
    if (window._afuOnSuccess) window._afuOnSuccess();
  } catch (err) {
    Toast.error(err.message);
    if (btn) { btn.textContent = '📤 Upload File'; btn.disabled = false; }
  }
}

// ─── Download / preview any uploaded file ────────────────
async function downloadUploadedFile(fileId) {
  try {
    const data = await API.get(`/api/features/uploads/${fileId}/download`);
    const a = document.createElement('a');
    a.href = data.fileData;
    a.download = data.fileName;
    a.click();
  } catch (err) { Toast.error('Failed to download'); }
}

// ═══════════════════════════════════════════════════════
//  VIDEO LESSONS PAGE
// ═══════════════════════════════════════════════════════
let videoCatFilter = 'all';

async function renderVideos() {
  const content = document.getElementById('main-content');
  const isAdmin = State.user?.role === 'admin';
  let videos = [], cats = [];
  try {
    [videos, cats] = await Promise.all([
      API.get(`/api/features/videos${videoCatFilter !== 'all' ? `?category=${videoCatFilter}` : ''}`),
      API.get('/api/features/videos/categories')
    ]);
  } catch {}

  const allCats = ['all', ...cats];

  content.innerHTML = `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">🎬 Video Lessons</div>
      <div class="page-subtitle">${videos.length} videos · learn programming step by step</div>
    </div>
    ${isAdmin ? `<button class="btn-primary" onclick="openUploadVideo()">🎬 Upload Video</button>` : ''}
  </div>

  <!-- Category filter -->
  <div class="resources-filter fade-in" style="flex-wrap:wrap;gap:6px;margin-bottom:20px">
    ${allCats.map(c => `
    <button class="filter-btn ${videoCatFilter === c ? 'active' : ''}" onclick="filterVideos('${c}')">
      ${c === 'all' ? '⬡ All' : c}
    </button>`).join('')}
  </div>

  <!-- Video grid -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px" class="fade-in">
    ${videos.length === 0 ? `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🎬</div>
      <div class="empty-title">No videos yet</div>
      <div class="empty-sub">${isAdmin ? 'Upload your first video lesson!' : 'Check back soon!'}</div>
      ${isAdmin ? `<button class="btn-primary" style="margin-top:16px" onclick="openUploadVideo()">🎬 Upload Video</button>` : ''}
    </div>` :
    videos.map(v => renderVideoCard(v, isAdmin)).join('')}
  </div>`;
}

function renderVideoCard(v, isAdmin) {
  const liked = (v.likes || []).includes(State.user?._id || State.user?.id);
  return `
  <div class="card" style="padding:0;overflow:hidden;cursor:pointer" onclick="openVideo('${v._id}')">
    <!-- Thumbnail -->
    <div style="width:100%;height:170px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
      ${v.thumbnail
        ? `<img src="${v.thumbnail}" style="width:100%;height:100%;object-fit:cover">`
        : `<div style="text-align:center"><div style="font-size:3.5rem">🎬</div><div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">${v.fileName||''}</div></div>`}
      <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.7);color:#fff;font-size:0.7rem;padding:2px 7px;border-radius:4px">
        ${v.duration || '▶'}
      </div>
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0);transition:background 0.2s;display:flex;align-items:center;justify-content:center" class="play-overlay">
        <div style="width:50px;height:50px;background:rgba(0,212,170,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;opacity:0;transition:opacity 0.2s" class="play-btn-icon">▶</div>
      </div>
    </div>
    <!-- Info -->
    <div style="padding:14px">
      <div style="font-weight:700;font-size:0.92rem;margin-bottom:4px;line-height:1.3">${v.title}</div>
      ${v.description ? `<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:8px;line-height:1.5">${v.description.slice(0,90)}${v.description.length>90?'...':''}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
        <span style="background:rgba(0,212,170,0.12);color:var(--accent);font-size:0.68rem;padding:2px 8px;border-radius:4px">${v.category}</span>
        ${(v.tags||[]).slice(0,2).map(t=>`<span class="tag">${t}</span>`).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:0.7rem;color:var(--text-muted)">
          👁 ${v.views||0} · 💬 ${v.comments?.length||0} · by ${v.author?.username||'?'}
        </div>
        <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
          <button class="like-btn ${liked?'liked':''}" onclick="likeVideo('${v._id}',this)" style="font-size:0.75rem;padding:3px 8px">♥ ${v.likes?.length||0}</button>
          ${isAdmin ? `<button class="btn-danger" style="font-size:0.65rem;padding:3px 7px" onclick="deleteVideo('${v._id}')">🗑</button>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

function filterVideos(cat) {
  videoCatFilter = cat;
  renderVideos();
}

async function likeVideo(id, btn) {
  try {
    const data = await API.put(`/api/features/videos/${id}/like`);
    btn.classList.toggle('liked', data.liked);
    btn.textContent = `♥ ${data.likes}`;
  } catch (err) { Toast.error(err.message); }
}

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  try { await API.delete(`/api/features/videos/${id}`); renderVideos(); }
  catch (err) { Toast.error(err.message); }
}

// ── Open video player modal ───────────────────────────────
async function openVideo(id) {
  let v;
  try { v = await API.get(`/api/features/videos/${id}`); }
  catch { Toast.error('Failed to load video'); return; }

  const isAdmin = State.user?.role === 'admin';
  const currentUserId = State.user?._id || State.user?.id;

  Modal.open(`
    <!-- Video player -->
    <div style="background:#000;border-radius:10px;overflow:hidden;margin-bottom:16px;position:relative">
      <video controls style="width:100%;max-height:360px;display:block" preload="metadata" id="video-player-${id}">
        <source src="${v.fileData}" type="${v.fileName?.endsWith('.mp4')?'video/mp4':v.fileName?.endsWith('.webm')?'video/webm':'video/mp4'}">
        Your browser does not support the video tag.
      </video>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <h3 style="font-size:1rem;font-weight:700;flex:1;margin-right:12px">${v.title}</h3>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="like-btn ${(v.likes||[]).some(l=>l.toString()===currentUserId)?'liked':''}" id="video-like-btn" onclick="likeVideoModal('${v._id}')">♥ ${v.likes?.length||0}</button>
        ${isAdmin ? `<button class="btn-danger" style="font-size:0.75rem" onclick="deleteVideo('${v._id}');Modal.close()">🗑 Delete</button>` : ''}
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <span style="background:rgba(0,212,170,0.12);color:var(--accent);font-size:0.72rem;padding:2px 8px;border-radius:4px">${v.category}</span>
      ${(v.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
    </div>

    ${v.description ? `<p style="font-size:0.83rem;color:var(--text-secondary);line-height:1.7;margin-bottom:14px">${v.description}</p>` : ''}

    <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:16px">
      by <strong style="color:var(--accent)">${v.author?.username||'?'}</strong> ·
      ${formatDate(v.createdAt)} · 👁 ${v.views} views
    </div>

    <!-- Comments -->
    <div style="border-top:1px solid var(--border);padding-top:14px">
      <div style="font-weight:700;font-size:0.85rem;margin-bottom:12px">💬 Comments (${v.comments?.length||0})</div>
      <div id="video-comments-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;max-height:200px;overflow-y:auto">
        ${(v.comments||[]).length === 0
          ? '<div style="color:var(--text-muted);font-size:0.8rem">No comments yet. Be the first!</div>'
          : (v.comments||[]).map(c => `
          <div style="display:flex;gap:8px;padding:8px;background:var(--bg-elevated);border-radius:8px" id="vc-${c._id}">
            <div class="user-avatar-sm" style="width:28px;height:28px;font-size:0.68rem;flex-shrink:0">${c.author?.avatar?`<img src="${c.author.avatar}">`:((c.author?.username||'?')[0].toUpperCase())}</div>
            <div style="flex:1">
              <div style="font-size:0.75rem;font-weight:600;color:var(--accent)">${c.author?.username||'?'}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.5">${c.content}</div>
            </div>
            ${isAdmin ? `<button onclick="deleteVideoComment('${v._id}','${c._id}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.8rem;flex-shrink:0" title="Delete">🗑</button>` : ''}
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <input type="text" id="video-comment-input" placeholder="Write a comment..." style="flex:1;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-primary);font-size:0.82rem">
        <button class="btn-primary" style="padding:8px 14px;font-size:0.8rem" onclick="postVideoComment('${v._id}')">Send</button>
      </div>
    </div>
  `, v.title);

  document.getElementById('video-comment-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') postVideoComment(v._id);
  });
}

async function postVideoComment(videoId) {
  const input = document.getElementById('video-comment-input');
  const content = input?.value?.trim();
  if (!content) return;
  try {
    const data = await API.post(`/api/features/videos/${videoId}/comment`, { content });
    const list = document.getElementById('video-comments-list');
    if (list) {
      const c = data.comment;
      const div = document.createElement('div');
      div.id = `vc-${c._id}`;
      div.style.cssText = 'display:flex;gap:8px;padding:8px;background:var(--bg-elevated);border-radius:8px';
      div.innerHTML = `
        <div class="user-avatar-sm" style="width:28px;height:28px;font-size:0.68rem;flex-shrink:0">${State.user.username[0].toUpperCase()}</div>
        <div><div style="font-size:0.75rem;font-weight:600;color:var(--accent)">${State.user.username}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary)">${content}</div></div>`;
      list.appendChild(div);
      list.scrollTop = list.scrollHeight;
    }
    if (input) input.value = '';
  } catch (err) { Toast.error(err.message); }
}

async function likeVideoModal(videoId) {
  try {
    const data = await API.put(`/api/features/videos/${videoId}/like`);
    const btn = document.getElementById('video-like-btn');
    if (btn) { btn.classList.toggle('liked', data.liked); btn.textContent = `♥ ${data.likes}`; }
  } catch (err) { Toast.error(err.message); }
}

async function deleteVideoComment(videoId, commentId) {
  try {
    await API.delete(`/api/features/videos/${videoId}/comment/${commentId}`);
    document.getElementById(`vc-${commentId}`)?.remove();
    Toast.success('Comment deleted');
  } catch (err) { Toast.error(err.message); }
}

// ── Upload video modal (admin) ────────────────────────────
function openUploadVideo() {
  Modal.open(`
    <div class="form-group"><label>Title</label>
      <input type="text" id="vid-title" placeholder="e.g. JavaScript Basics - Variables & Functions">
    </div>
    <div class="form-group"><label>Description</label>
      <textarea id="vid-desc" placeholder="What will students learn in this video?"></textarea>
    </div>
    <div class="form-group"><label>Category</label>
      <input type="text" id="vid-cat" placeholder="e.g. JavaScript, Python, Web Dev, Databases..." list="vid-cats">
      <datalist id="vid-cats">
        <option>JavaScript</option><option>Python</option><option>Web Dev</option>
        <option>Databases</option><option>Cybersecurity</option><option>DevOps</option>
        <option>Mobile Dev</option><option>Algorithms</option><option>General</option>
      </datalist>
    </div>
    <div class="form-group"><label>Tags (comma-separated)</label>
      <input type="text" id="vid-tags" placeholder="tutorial, beginner, node.js">
    </div>
    <div class="form-group"><label>Duration (optional)</label>
      <input type="text" id="vid-duration" placeholder="e.g. 12:34">
    </div>
    <div class="form-group">
      <label>Video File (MP4, WebM · max 100MB)</label>
      <div id="vid-drop" style="border:2px dashed var(--border);border-radius:10px;padding:28px;text-align:center;cursor:pointer"
        onclick="document.getElementById('vid-file-input').click()"
        ondragover="event.preventDefault();this.style.borderColor='var(--accent)'"
        ondrop="vidDrop(event)">
        <div id="vid-drop-text">
          <div style="font-size:2.5rem;margin-bottom:8px">🎬</div>
          <div style="font-weight:600;margin-bottom:4px">Click or drag video here</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">MP4, WebM · Max 100MB</div>
        </div>
      </div>
      <input type="file" id="vid-file-input" style="display:none" accept="video/mp4,video/webm,.mp4,.webm" onchange="vidSelect(this)">
    </div>
    <div class="form-group">
      <label>Thumbnail Image (optional)</label>
      <input type="file" id="vid-thumb-input" accept="image/*" onchange="vidThumbSelect(this)" style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:8px;width:100%;color:var(--text-primary)">
    </div>
    <div id="vid-upload-progress" style="display:none;margin-bottom:10px">
      <div style="height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden">
        <div id="vid-progress-bar" style="height:100%;width:0%;background:var(--accent);border-radius:3px;transition:width 0.3s"></div>
      </div>
      <div id="vid-progress-text" style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;text-align:center">Processing...</div>
    </div>
    <button class="btn-primary btn-full" id="vid-upload-btn" onclick="submitVideoUpload()" disabled style="opacity:0.5">🎬 Upload Video</button>
  `, 'Upload Video Lesson');
}

function vidDrop(e) {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('video/')) vidProcess(f);
  else Toast.error('Please drop a video file (MP4 or WebM)');
}
function vidSelect(input) { if (input.files[0]) vidProcess(input.files[0]); }
function vidProcess(file) {
  if (file.size > 100 * 1024 * 1024) { Toast.error('Max 100MB'); return; }
  document.getElementById('vid-drop-text').innerHTML = `
    <div style="font-size:2rem;margin-bottom:6px">🎬</div>
    <div style="font-weight:600;font-size:0.85rem;color:var(--accent)">${file.name}</div>
    <div style="font-size:0.72rem;color:var(--text-muted)">${(file.size/1024/1024).toFixed(1)} MB · click to change</div>`;
  document.getElementById('vid-drop').style.borderColor = 'var(--accent)';
  const prog = document.getElementById('vid-upload-progress');
  const bar  = document.getElementById('vid-progress-bar');
  const txt  = document.getElementById('vid-progress-text');
  if (prog) { prog.style.display='block'; bar.style.width='0%'; txt.textContent='Reading file...'; }
  const reader = new FileReader();
  let progress = 0;
  const interval = setInterval(() => {
    progress = Math.min(progress + 5, 90);
    if (bar) bar.style.width = progress + '%';
  }, 100);
  reader.onload = e => {
    clearInterval(interval);
    if (bar) bar.style.width = '100%';
    if (txt) txt.textContent = 'Ready to upload!';
    window._vidFile = { name: file.name, data: e.target.result, type: file.type, size: file.size };
    const btn = document.getElementById('vid-upload-btn');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  };
  reader.readAsDataURL(file);
}
function vidThumbSelect(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { window._vidThumb = e.target.result; };
  reader.readAsDataURL(file);
}
async function submitVideoUpload() {
  const f = window._vidFile;
  if (!f) { Toast.error('Select a video file'); return; }
  const title = document.getElementById('vid-title')?.value?.trim();
  if (!title) { Toast.error('Title required'); return; }
  const btn = document.getElementById('vid-upload-btn');
  if (btn) { btn.textContent = '⏳ Uploading... (may take a moment)'; btn.disabled = true; }
  try {
    await API.post('/api/features/videos', {
      title,
      description: document.getElementById('vid-desc')?.value || '',
      category:    document.getElementById('vid-cat')?.value || 'General',
      tags:        (document.getElementById('vid-tags')?.value||'').split(',').map(t=>t.trim()).filter(Boolean),
      duration:    document.getElementById('vid-duration')?.value || '',
      fileData:    f.data,
      fileName:    f.name,
      fileSize:    f.size,
      thumbnail:   window._vidThumb || '',
    });
    window._vidFile = null;
    window._vidThumb = null;
    Toast.success('Video uploaded! 🎬');
    Modal.close();
    videoCatFilter = 'all';
    renderVideos();
  } catch (err) {
    Toast.error(err.message);
    if (btn) { btn.textContent = '🎬 Upload Video'; btn.disabled = false; }
  }
}

// ═══════════════════════════════════════════════════════
//  ADMIN FILE MANAGER — view/manage all uploaded files
// ═══════════════════════════════════════════════════════
async function renderAdminFileManager(containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  let files = [];
  try { files = await API.get('/api/features/uploads'); } catch {}

  const sections = ['all', 'announcements', 'resources', 'challenges', 'projects', 'blog', 'events', 'general'];
  const sectionIcons = { announcements:'📢', resources:'📚', challenges:'⚡', projects:'◻', blog:'📝', events:'📅', general:'📁', all:'⬡' };

  containerEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:0.8rem;color:var(--text-muted)">${files.length} total files uploaded</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${sections.map(s => `<button class="filter-btn afm-filter active" data-s="${s}" onclick="afmFilter('${s}',this)" style="${s==='all'?'':''}">
          ${sectionIcons[s]||'📁'} ${s}</button>`).join('')}
      </div>
    </div>
    <button class="btn-primary" style="margin-bottom:14px" onclick="openAdminFileUpload('general','General Files',()=>renderAdminFileManager(document.getElementById('admin-files-container')))">📎 Upload New File</button>
    <div id="afm-list">
      ${files.length === 0
        ? '<div class="empty-state" style="padding:30px"><div class="empty-icon">📁</div><div class="empty-title">No files uploaded yet</div></div>'
        : `<div class="card" style="overflow-x:auto"><table class="admin-table">
            <thead><tr><th>File</th><th>Section</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody id="afm-tbody">
              ${files.map(f => afmRow(f)).join('')}
            </tbody>
          </table></div>`}
    </div>`;
}

function afmRow(f) {
  const typeIcon = f.fileType?.includes('pdf') ? '📄' : f.fileType?.includes('image') ? '🖼️' : f.fileType?.includes('presentation') ? '📊' : f.fileType?.includes('word') ? '📝' : '📎';
  return `<tr data-section="${f.section}" id="afm-row-${f._id}">
    <td>
      <div style="font-weight:600;font-size:0.82rem">${typeIcon} ${f.title}</div>
      <div style="font-size:0.7rem;color:var(--text-muted)">${f.fileName} · ${f.fileSize ? (f.fileSize/1024).toFixed(0)+' KB' : ''}</div>
      ${f.note ? `<div style="font-size:0.7rem;color:var(--text-secondary)">${f.note}</div>` : ''}
    </td>
    <td><span style="background:rgba(0,212,170,0.1);color:var(--accent);font-size:0.7rem;padding:2px 6px;border-radius:4px">${f.section}</span></td>
    <td style="font-size:0.78rem">${f.author?.username || '?'}</td>
    <td style="font-size:0.72rem;color:var(--text-muted)">${formatDate(f.createdAt)}</td>
    <td>
      <div style="display:flex;gap:4px">
        <button class="btn-secondary" style="font-size:0.68rem;padding:3px 7px" onclick="downloadUploadedFile('${f._id}')">⬇ Download</button>
        <button class="btn-danger" style="font-size:0.68rem;padding:3px 6px" onclick="afmDelete('${f._id}')">🗑</button>
      </div>
    </td>
  </tr>`;
}

function afmFilter(section, btn) {
  document.querySelectorAll('.afm-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#afm-tbody tr').forEach(row => {
    row.style.display = (section === 'all' || row.dataset.section === section) ? '' : 'none';
  });
}

async function afmDelete(id) {
  if (!confirm('Delete this file?')) return;
  try {
    await API.delete(`/api/features/uploads/${id}`);
    document.getElementById(`afm-row-${id}`)?.remove();
    Toast.success('File deleted');
  } catch (err) { Toast.error(err.message); }
}

// ── Add "Upload Files" button + file attachments to key sections ──
// Patch renderAnnouncements to show admin upload button
const _origRenderAnnouncements = typeof renderAnnouncements === 'function' ? renderAnnouncements : null;

// Inject "Admin Files" tab into admin panel
const _origLoadAdminSection = typeof loadAdminSection === 'function' ? loadAdminSection : null;

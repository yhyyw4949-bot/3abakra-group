// public/js/game.js — Bulls & Cows Number Game

let gameSocket = null;
let gameState = {
  phase: 'lobby',   // lobby | setup | playing | over
  roomId: null,
  mode: null,
  mySecret: null,
  isMyTurn: false,
  myGuesses: [],        // what I guessed about opponent's number
  opponentGuesses: [],  // what opponent guessed about MY number
};

// ── Socket ────────────────────────────────────────────────
function initGameSocket() {
  if (gameSocket?.connected) return;
  try {
    gameSocket = io('/game', { transports: ['websocket', 'polling'] });
    gameSocket.on('connect',          () => gameSocket.emit('get_rooms'));
    gameSocket.on('rooms_list',       onRoomsList);
    gameSocket.on('room_created',     onRoomCreated);
    gameSocket.on('room_joined',      onRoomJoined);
    gameSocket.on('room_updated',     onRoomUpdated);
    gameSocket.on('secret_set',       onSecretSet);
    gameSocket.on('opponent_ready',   onOpponentReady);
    gameSocket.on('game_started',     onGameStarted);
    gameSocket.on('guess_result',     onGuessResult);
    gameSocket.on('opponent_guessed', onOpponentGuessed);
    gameSocket.on('computer_guessed', onComputerGuessed);
    gameSocket.on('turn_changed',     onTurnChanged);
    gameSocket.on('game_over',        onGameOver);
    gameSocket.on('opponent_left',    () => { Toast.error('Opponent left!'); setTimeout(renderGame, 2000); });
    gameSocket.on('game_chat_msg',    onGameChat);
    gameSocket.on('game_error',       msg => Toast.error(msg));
  } catch(e) { console.error('Game socket error:', e); }
}

function leaveGame() {
  if (gameState.roomId) gameSocket?.emit('leave_room', { roomId: gameState.roomId });
  gameState = { phase:'lobby', roomId:null, mode:null, mySecret:null, isMyTurn:false, myGuesses:[], opponentGuesses:[] };
  renderGame();
}

// ── Main render ───────────────────────────────────────────
async function renderGame() {
  gameState.phase = 'lobby';
  gameState.roomId = null;
  const content = document.getElementById('main-content');
  content.innerHTML = buildLobbyHTML();
  initGameSocket();
  if (gameSocket) {
    gameSocket.connected ? gameSocket.emit('get_rooms') : gameSocket.once('connect', () => gameSocket.emit('get_rooms'));
  }
}

function buildLobbyHTML() {
  return `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">🎮 Bulls & Cows</div>
      <div class="page-subtitle">Guess the secret 3-digit number</div>
    </div>
  </div>

  <div class="game-rules-bar fade-in">
    <span>📖 Rules:</span>
    <span>Each player picks a secret <strong>3-digit number</strong> (no repeats, no leading zero)</span>
    <span>·</span>
    <span>Take turns guessing the opponent's number</span>
    <span>·</span>
    <span>🐂 <strong>Bull</strong> = right digit, right position</span>
    <span>·</span>
    <span>🐄 <strong>Cow</strong> = right digit, wrong position</span>
    <span>·</span>
    <span>First to get <strong>3 Bulls</strong> wins!</span>
  </div>

  <div class="game-modes fade-in">
    <div class="game-mode-card" onclick="createGameRoom('computer')">
      <div class="mode-icon">🤖</div>
      <div class="mode-title">vs Computer</div>
      <div class="mode-desc">Play solo · AI guesses your number intelligently</div>
      <button class="btn-primary" style="margin-top:14px;width:100%">Play Now</button>
    </div>
    <div class="game-mode-card" onclick="showCreateHuman()">
      <div class="mode-icon">👥</div>
      <div class="mode-title">vs Human</div>
      <div class="mode-desc">Create a room · Challenge a friend</div>
      <button class="btn-primary" style="margin-top:14px;width:100%">Create Room</button>
    </div>
    <div class="game-mode-card" onclick="showJoinRoom()">
      <div class="mode-icon">🔗</div>
      <div class="mode-title">Join Room</div>
      <div class="mode-desc">Enter a room code to join a friend</div>
      <button class="btn-secondary" style="margin-top:14px;width:100%">Join</button>
    </div>
  </div>

  <div class="fade-in" style="margin-top:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-family:'Cinzel',serif;font-size:0.85rem;color:var(--accent);letter-spacing:0.1em">OPEN ROOMS</div>
      <button class="btn-secondary" style="font-size:0.7rem;padding:4px 10px" onclick="gameSocket?.emit('get_rooms')">↻ Refresh</button>
    </div>
    <div id="game-rooms-list"><div class="game-empty">No open rooms · Create one!</div></div>
  </div>`;
}

// ── Lobby events ──────────────────────────────────────────
function onRoomsList(rooms) {
  const el = document.getElementById('game-rooms-list');
  if (!el) return;
  if (!rooms.length) { el.innerHTML = `<div class="game-empty">No open rooms · Create one!</div>`; return; }
  el.innerHTML = rooms.map(r => `
    <div class="game-room-row">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="user-avatar-sm">${r.hostAvatar?`<img src="${r.hostAvatar}">`:(r.host||'?')[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:600;font-size:0.88rem">${r.host}'s Room</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">Code: <strong style="color:var(--accent)">${r.id}</strong></div>
        </div>
      </div>
      <button class="btn-primary" style="font-size:0.78rem;padding:6px 16px" onclick="joinGameRoom('${r.id}')">Join ▶</button>
    </div>`).join('');
}

function showCreateHuman() {
  Modal.open(`
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:3rem">👥</div>
      <div style="font-family:'Cinzel',serif;font-size:1rem;margin-top:8px">Create Room</div>
    </div>
    <div class="form-group"><label>Visibility</label>
      <select id="room-vis">
        <option value="true">🌐 Public — anyone can join</option>
        <option value="false">🔒 Private — share the code</option>
      </select>
    </div>
    <button class="btn-primary btn-full" onclick="createGameRoom('human')">Create Room</button>
  `, 'New Game');
}

function showJoinRoom() {
  Modal.open(`
    <div style="text-align:center;margin-bottom:20px"><div style="font-size:3rem">🔗</div></div>
    <div class="form-group"><label>Room Code</label>
      <input type="text" id="join-code" placeholder="5-letter code" maxlength="5"
        style="text-transform:uppercase;letter-spacing:0.2em;font-size:1.2rem;text-align:center"
        onkeyup="this.value=this.value.toUpperCase()"
        onkeydown="if(event.key==='Enter')joinGameRoom(this.value)">
    </div>
    <button class="btn-primary btn-full" onclick="joinGameRoom(document.getElementById('join-code').value)">Join ▶</button>
  `, 'Join Room');
}

function createGameRoom(mode) {
  Modal.close();
  const isPublic = mode === 'human' ? (document.getElementById('room-vis')?.value !== 'false') : false;
  gameState.mode = mode;
  gameSocket?.emit('create_room', { mode, isPublic });
}

function joinGameRoom(roomId) {
  if (!roomId?.trim()) { Toast.error('Enter a room code'); return; }
  Modal.close();
  gameSocket?.emit('join_room', { roomId: roomId.trim().toUpperCase() });
}

// ── Room created/joined → setup phase ────────────────────
function onRoomCreated(room) {
  gameState.roomId = room.id;
  gameState.phase = 'setup';
  gameState.mode = room.mode;
  renderSetupPhase(room);
}
function onRoomJoined(room) {
  gameState.roomId = room.id;
  gameState.phase = 'setup';
  gameState.mode = room.mode;
  renderSetupPhase(room);
}
function onRoomUpdated(room) {
  if (gameState.phase === 'setup') renderSetupPhase(room);
}

// ── Setup phase: pick your secret number ─────────────────
let pickerDigits = ['','',''];
let activeSlot = 0;

function renderSetupPhase(room) {
  const content = document.getElementById('main-content');
  const userId = State.user?._id || State.user?.id;
  const me = room.host?.id === userId ? room.host : room.guest;
  const opponent = room.host?.id === userId ? room.guest : room.host;
  const alreadySet = me?.ready;

  content.innerHTML = `
  <div class="game-arena fade-in">
    <div class="game-header">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn-secondary" style="font-size:0.72rem;padding:5px 12px" onclick="leaveGame()">← Leave</button>
        <div>
          <div style="font-family:'Cinzel',serif;font-size:1rem;color:var(--accent)">
            🎮 ${room.mode === 'computer' ? 'vs Computer' : 'vs Human'}
          </div>
          ${room.mode === 'human' ? `<div style="font-size:0.7rem;color:var(--text-muted)">Room: <strong style="color:var(--accent);letter-spacing:0.1em">${room.id}</strong>
            <button class="btn-secondary" style="font-size:0.6rem;padding:2px 7px;margin-left:6px" onclick="navigator.clipboard.writeText('${room.id}').then(()=>Toast.success('Copied!'))">📋</button>
          </div>` : ''}
        </div>
      </div>
      <div class="game-players">
        ${room.host ? playerChip(room.host, room.host.id === userId) : ''}
        <div style="font-size:1rem;color:var(--text-muted)">⚔️</div>
        ${room.guest ? playerChip(room.guest, room.guest.id === userId) : `<div style="font-size:0.75rem;color:var(--text-muted);padding:8px">⏳ Waiting...</div>`}
      </div>
    </div>

    <div class="game-setup-box">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:2.5rem">🔐</div>
        <div style="font-family:'Cinzel',serif;font-size:1.1rem;color:var(--accent);margin-top:8px">Pick Your Secret Number</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">3 unique digits · no leading zero · opponent must guess this!</div>
      </div>

      ${alreadySet ? `
      <div style="text-align:center;padding:24px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:12px">
        <div style="font-size:1.8rem;margin-bottom:8px">✅</div>
        <div style="color:var(--accent);font-weight:700;font-size:1rem">Secret locked in!</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:8px">
          ${opponent?.ready ? '🟢 Both ready — starting game...' : '⏳ Waiting for opponent to pick their number...'}
        </div>
        ${!opponent?.ready && !opponent?.isComputer ? `
        <div style="display:flex;gap:6px;justify-content:center;margin-top:12px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--accent);animation:dot-pulse 1.2s infinite;display:inline-block;opacity:0.3"></span>
          <span style="width:8px;height:8px;border-radius:50%;background:var(--accent);animation:dot-pulse 1.2s 0.2s infinite;display:inline-block;opacity:0.3"></span>
          <span style="width:8px;height:8px;border-radius:50%;background:var(--accent);animation:dot-pulse 1.2s 0.4s infinite;display:inline-block;opacity:0.3"></span>
        </div>` : ''}
      </div>` : `
      <div class="number-picker" id="number-picker">
        <div class="digit-slot" id="d0" onclick="selectDigitSlot(0)">?</div>
        <div class="digit-slot" id="d1" onclick="selectDigitSlot(1)">?</div>
        <div class="digit-slot" id="d2" onclick="selectDigitSlot(2)">?</div>
      </div>
      <div id="digit-error" style="text-align:center;color:var(--error);font-size:0.75rem;min-height:18px;margin:4px 0"></div>
      <div class="digit-pad" id="digit-pad">
        ${[1,2,3,4,5,6,7,8,9,0].map(d=>`<button class="digit-btn" id="dpad-${d}" onclick="digitPadPress(${d})">${d}</button>`).join('')}
        <button class="digit-btn digit-del" onclick="digitPadDel()">⌫</button>
      </div>
      <button class="btn-primary btn-full" style="margin-top:14px;opacity:0.5" id="lock-btn" onclick="lockSecret()" disabled>
        🔐 Lock In My Secret Number
      </button>`}
    </div>
  </div>`;

  if (!alreadySet) { pickerDigits=['','','']; activeSlot=0; updatePickerUI(); selectDigitSlot(0); }
}

function playerChip(p, isMe) {
  return `<div style="display:flex;align-items:center;gap:8px;background:${isMe?'rgba(201,168,76,0.08)':'var(--bg-elevated)'};border:1px solid ${isMe?'rgba(201,168,76,0.3)':'var(--border)'};border-radius:10px;padding:7px 12px">
    <div class="user-avatar-sm" style="width:28px;height:28px;font-size:0.7rem">${p.avatar?`<img src="${p.avatar}">`:p.name[0].toUpperCase()}</div>
    <div>
      <div style="font-size:0.8rem;font-weight:600">${p.name}${isMe?' <span style="color:var(--accent);font-size:0.65rem">(you)</span>':''}</div>
      <div style="font-size:0.65rem;color:${p.ready?'#7dd87d':'var(--text-muted)'}">${p.ready?'✅ Ready':'⏳ Picking...'}</div>
    </div>
  </div>`;
}

// ── Digit picker ──────────────────────────────────────────
function selectDigitSlot(i) {
  activeSlot = i;
  document.querySelectorAll('#number-picker .digit-slot, #guess-picker .digit-slot').forEach((s,idx) => s.classList.toggle('active', idx===i));
}
function digitPadPress(d) {
  const s = String(d);
  if (pickerDigits.includes(s)) { showPickerError(`${d} already used!`); return; }
  if (activeSlot===0 && d===0) { showPickerError('Cannot start with 0!'); return; }
  pickerDigits[activeSlot] = s;
  const btn = document.getElementById(`dpad-${d}`);
  if (btn) { btn.disabled=true; btn.style.opacity='0.25'; }
  const next = pickerDigits.findIndex((v,i) => i>activeSlot && v==='');
  selectDigitSlot(next !== -1 ? next : pickerDigits.findIndex(v=>v==='') !== -1 ? pickerDigits.findIndex(v=>v==='') : activeSlot);
  updatePickerUI();
}
function digitPadDel() {
  const removed = pickerDigits[activeSlot];
  if (removed) {
    const btn = document.getElementById(`dpad-${removed}`);
    if (btn) { btn.disabled=false; btn.style.opacity='1'; }
    pickerDigits[activeSlot] = '';
  } else if (activeSlot > 0) {
    activeSlot--;
    const removed2 = pickerDigits[activeSlot];
    if (removed2) { const btn=document.getElementById(`dpad-${removed2}`); if(btn){btn.disabled=false;btn.style.opacity='1';} pickerDigits[activeSlot]=''; }
    selectDigitSlot(activeSlot);
  }
  document.getElementById('digit-error').textContent = '';
  updatePickerUI();
}
function showPickerError(msg) {
  const el = document.getElementById('digit-error');
  if (el) { el.textContent = msg; setTimeout(() => { if(el) el.textContent=''; }, 1500); }
}
function updatePickerUI() {
  ['d0','d1','d2'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = pickerDigits[i]||'?'; el.classList.toggle('filled', !!pickerDigits[i]); }
  });
  const btn = document.getElementById('lock-btn');
  if (btn) { const ok=pickerDigits.every(d=>d!==''); btn.disabled=!ok; btn.style.opacity=ok?'1':'0.5'; }
}
function lockSecret() {
  const secret = pickerDigits.join('');
  if (secret.length!==3) return;
  gameState.mySecret = secret;
  gameSocket?.emit('set_secret', { roomId: gameState.roomId, secret });
}
function onSecretSet() { Toast.success('Secret locked! Waiting for opponent...'); }
function onOpponentReady() { Toast.info('Opponent locked their number!'); }

// ── Game starts ───────────────────────────────────────────
function onGameStarted({ currentTurn }) {
  const userId = State.user?._id || State.user?.id;
  gameState.isMyTurn = currentTurn === userId;
  gameState.phase = 'playing';
  gameState.myGuesses = [];
  gameState.opponentGuesses = [];
  renderPlayingPhase();
}

// ── Playing phase ─────────────────────────────────────────
let guessDigits = ['','',''];
let activeGuessSlot = 0;

function renderPlayingPhase() {
  const content = document.getElementById('main-content');
  const isMyTurn = gameState.isMyTurn;

  content.innerHTML = `
  <div class="game-arena fade-in">

    <!-- Header with turn status -->
    <div class="game-header">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn-secondary" style="font-size:0.72rem;padding:5px 12px" onclick="leaveGame()">← Leave</button>
        <div>
          <div style="font-family:'Cinzel',serif;font-size:1rem;color:var(--accent)">🎮 Bulls & Cows</div>
          <div id="turn-indicator" style="font-size:0.78rem;margin-top:2px;font-weight:600">
            ${isMyTurn ? '<span style="color:#7dd87d">🟢 Your turn — make a guess!</span>' : '<span style="color:var(--text-muted)">⏳ Opponent is guessing...</span>'}
          </div>
        </div>
      </div>
      <div style="font-size:0.72rem;color:var(--text-muted)">My secret: <strong style="color:var(--accent);letter-spacing:0.15em">${gameState.mySecret || '???'}</strong></div>
    </div>

    <div class="game-board">

      <!-- LEFT: My guesses about opponent's number -->
      <div class="game-panel">
        <div class="panel-title">
          ⚔️ My Guesses
          <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400;font-family:inherit"> — guessing opponent's secret</span>
          <span id="my-guess-count" style="float:right;color:var(--text-muted);font-weight:400;font-size:0.72rem">0/10</span>
        </div>

        <!-- Input area -->
        <div id="guess-input-area" style="margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div class="number-picker small" id="guess-picker">
              <div class="digit-slot small" id="gd0" onclick="selectGuessSlot(0)">?</div>
              <div class="digit-slot small" id="gd1" onclick="selectGuessSlot(1)">?</div>
              <div class="digit-slot small" id="gd2" onclick="selectGuessSlot(2)">?</div>
            </div>
            <button class="btn-primary" id="guess-btn" onclick="submitGuess()" disabled style="opacity:0.5;flex-shrink:0">
              ${isMyTurn ? 'Guess ▶' : 'Wait...'}
            </button>
          </div>
          <div class="digit-pad small">
            ${[1,2,3,4,5,6,7,8,9,0].map(d=>`<button class="digit-btn" id="gdpad-${d}" onclick="guessDigitPress(${d})">${d}</button>`).join('')}
            <button class="digit-btn digit-del" onclick="guessDigitDel()">⌫</button>
          </div>
          <div id="guess-error" style="font-size:0.7rem;color:var(--error);min-height:14px;margin-top:3px;text-align:center"></div>
        </div>

        <div id="my-guesses-list" class="guesses-list">
          <div class="guess-placeholder">Make your first guess above ↑</div>
        </div>
      </div>

      <!-- RIGHT: Opponent's guesses about MY number -->
      <div class="game-panel">
        <div class="panel-title">
          🛡️ Opponent's Guesses
          <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400;font-family:inherit"> — guessing my secret (${gameState.mySecret || '???'})</span>
          <span id="opp-guess-count" style="float:right;color:var(--text-muted);font-weight:400;font-size:0.72rem">0/10</span>
        </div>
        <div id="opp-guesses-list" class="guesses-list">
          <div class="guess-placeholder">Waiting for opponent's guess...</div>
        </div>
      </div>
    </div>

    ${gameState.mode === 'human' ? `
    <div class="game-chat-box">
      <div class="game-chat-title">💬 Chat</div>
      <div id="game-chat-msgs" class="game-chat-msgs"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="game-chat-input" placeholder="Say something..." maxlength="200"
          style="flex:1;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:7px 12px;color:var(--text-primary);font-size:0.8rem"
          onkeydown="if(event.key==='Enter')sendGameChat()">
        <button class="btn-secondary" style="font-size:0.8rem;padding:7px 14px" onclick="sendGameChat()">Send</button>
      </div>
    </div>` : ''}
  </div>`;

  guessDigits=['','','']; activeGuessSlot=0;
  if (isMyTurn) { updateGuessPickerUI(); selectGuessSlot(0); }
  else disableGuessPicker();
}

// ── Guess picker ──────────────────────────────────────────
function selectGuessSlot(i) {
  activeGuessSlot = i;
  document.querySelectorAll('#guess-picker .digit-slot').forEach((s,idx) => s.classList.toggle('active', idx===i));
}
function guessDigitPress(d) {
  if (!gameState.isMyTurn) return;
  const s = String(d);
  if (guessDigits.includes(s)) { showGuessError(`${d} already used!`); return; }
  if (activeGuessSlot===0 && d===0) { showGuessError('Cannot start with 0!'); return; }
  guessDigits[activeGuessSlot] = s;
  const btn = document.getElementById(`gdpad-${d}`);
  if (btn) { btn.disabled=true; btn.style.opacity='0.25'; }
  const next = guessDigits.findIndex((v,i) => i>activeGuessSlot && v==='');
  selectGuessSlot(next !== -1 ? next : guessDigits.findIndex(v=>v==='') !== -1 ? guessDigits.findIndex(v=>v==='') : activeGuessSlot);
  updateGuessPickerUI();
}
function guessDigitDel() {
  const removed = guessDigits[activeGuessSlot];
  if (removed) {
    const btn = document.getElementById(`gdpad-${removed}`);
    if (btn) { btn.disabled=false; btn.style.opacity='1'; }
    guessDigits[activeGuessSlot]='';
  } else if (activeGuessSlot>0) {
    activeGuessSlot--;
    const r2=guessDigits[activeGuessSlot];
    if(r2){const b=document.getElementById(`gdpad-${r2}`);if(b){b.disabled=false;b.style.opacity='1';}guessDigits[activeGuessSlot]='';}
    selectGuessSlot(activeGuessSlot);
  }
  showGuessError(''); updateGuessPickerUI();
}
function showGuessError(msg) {
  const el=document.getElementById('guess-error');
  if(el){el.textContent=msg; if(msg) setTimeout(()=>{if(el)el.textContent='';},1500);}
}
function updateGuessPickerUI() {
  ['gd0','gd1','gd2'].forEach((id,i)=>{
    const el=document.getElementById(id);
    if(el){el.textContent=guessDigits[i]||'?';el.classList.toggle('filled',!!guessDigits[i]);}
  });
  const btn=document.getElementById('guess-btn');
  if(btn){const ok=guessDigits.every(d=>d!=='')&&gameState.isMyTurn;btn.disabled=!ok;btn.style.opacity=ok?'1':'0.5';btn.textContent=gameState.isMyTurn?'Guess ▶':'Wait...';}
}
function disableGuessPicker() {
  const btn=document.getElementById('guess-btn');
  if(btn){btn.disabled=true;btn.style.opacity='0.4';btn.textContent='Wait...';}
  document.querySelectorAll('#guess-picker .digit-slot').forEach(s=>s.classList.remove('active'));
}
function resetGuessPicker() {
  guessDigits=['','','']; activeGuessSlot=0;
  document.querySelectorAll('.digit-btn:not(.digit-del)').forEach(b=>{b.disabled=false;b.style.opacity='1';});
  updateGuessPickerUI(); selectGuessSlot(0);
}
function submitGuess() {
  const guess = guessDigits.join('');
  if (guess.length!==3 || !gameState.isMyTurn) return;
  gameSocket?.emit('make_guess', { roomId: gameState.roomId, guess });
  resetGuessPicker(); disableGuessPicker();
}

// ── Guess result events ───────────────────────────────────
function onGuessResult({ guess, bulls, cows, turn, gameOver }) {
  // I guessed — add to MY guesses list
  gameState.myGuesses.push({ guess, bulls, cows });
  const list = document.getElementById('my-guesses-list');
  if (list) {
    const ph = list.querySelector('.guess-placeholder'); if(ph) ph.remove();
    list.insertAdjacentHTML('afterbegin', buildGuessRow(guess, bulls, cows, turn));
  }
  const cnt = document.getElementById('my-guess-count');
  if(cnt) cnt.textContent = `${turn}/10`;
  if (!gameOver) { gameState.isMyTurn=false; disableGuessPicker(); updateTurnIndicator(); }
}

function onOpponentGuessed({ guess, bulls, cows, turn, gameOver }) {
  // Opponent guessed my number — show THEIR guess + the feedback I'd give them
  gameState.opponentGuesses.push({ guess, bulls, cows });
  const list = document.getElementById('opp-guesses-list');
  if (list) {
    const ph = list.querySelector('.guess-placeholder'); if(ph) ph.remove();
    list.insertAdjacentHTML('afterbegin', buildGuessRow(guess, bulls, cows, turn));
  }
  const cnt = document.getElementById('opp-guess-count');
  if(cnt) cnt.textContent = `${turn}/10`;
  if (!gameOver) { gameState.isMyTurn=true; resetGuessPicker(); updateTurnIndicator(); }
}

function onComputerGuessed({ guess, bulls, cows, turn, gameOver }) {
  gameState.opponentGuesses.push({ guess, bulls, cows });
  const list = document.getElementById('opp-guesses-list');
  if (list) {
    const ph = list.querySelector('.guess-placeholder'); if(ph) ph.remove();
    list.insertAdjacentHTML('afterbegin', buildGuessRow(guess, bulls, cows, turn));
  }
  const cnt = document.getElementById('opp-guess-count');
  if(cnt) cnt.textContent = `${turn}/10`;
  if (!gameOver) { gameState.isMyTurn=true; resetGuessPicker(); updateTurnIndicator(); }
}

function onTurnChanged({ isYourTurn }) {
  gameState.isMyTurn = isYourTurn;
  updateTurnIndicator();
  if (isYourTurn) resetGuessPicker();
  else disableGuessPicker();
}

function updateTurnIndicator() {
  const el = document.getElementById('turn-indicator');
  if (el) el.innerHTML = gameState.isMyTurn
    ? '<span style="color:#7dd87d">🟢 Your turn — make a guess!</span>'
    : '<span style="color:var(--text-muted)">⏳ Opponent is guessing...</span>';
}

function buildGuessRow(guess, bulls, cows, turn) {
  const win = bulls===3;
  return `
  <div class="guess-row ${win?'guess-winner':''}">
    <span class="guess-turn">#${turn}</span>
    <span class="guess-number">${guess}</span>
    <span class="guess-feedback">
      <span style="color:${win?'#ffd700':bulls>0?'#7dd87d':'var(--text-muted)'}">🐂 ${bulls} Bull${bulls!==1?'s':''}</span>
      <span style="color:${cows>0?'#60b4ff':'var(--text-muted)'}">🐄 ${cows} Cow${cows!==1?'s':''}</span>
    </span>
  </div>`;
}

// ── Game over ─────────────────────────────────────────────
function onGameOver({ hostSecret, guestSecret, winner }) {
  const userId = State.user?._id || State.user?.id;
  const iWon = winner === userId;
  const isDraw = winner === 'draw';
  const compWon = winner === 'computer';

  document.getElementById('main-content').innerHTML = `
  <div class="game-arena fade-in">
    <div class="game-over-screen">
      <div class="game-over-icon">${isDraw?'🤝':iWon?'🏆':'💀'}</div>
      <div class="game-over-title ${iWon?'win':isDraw?'draw':'lose'}">
        ${isDraw?"It's a Draw!":iWon?'You Win! 🎉':compWon?'Computer Wins!':'You Lose!'}
      </div>
      <div class="game-over-subtitle">
        ${iWon?'You cracked the code first!':isDraw?'Nobody cracked the code in time.':'Better luck next time!'}
      </div>
      <div class="secrets-reveal">
        <div class="secret-card">
          <div class="secret-label">Your Secret</div>
          <div class="secret-number">${gameState.mySecret||'???'}</div>
        </div>
        <div class="secret-card">
          <div class="secret-label">Opponent's Secret</div>
          <div class="secret-number" style="color:#60b4ff">${guestSecret||hostSecret||'???'}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap">
        <button class="btn-primary" style="padding:12px 32px" onclick="leaveGame()">🎮 Play Again</button>
        <button class="btn-secondary" style="padding:12px 32px" onclick="navigateTo('dashboard')">🏠 Home</button>
      </div>
    </div>
  </div>`;
}

// ── Chat ──────────────────────────────────────────────────
function sendGameChat() {
  const input=document.getElementById('game-chat-input');
  if(!input?.value.trim()) return;
  gameSocket?.emit('game_chat', { roomId: gameState.roomId, message: input.value.trim() });
  input.value='';
}
function onGameChat({ from, avatar, text }) {
  const msgs=document.getElementById('game-chat-msgs');
  if(!msgs) return;
  const isMe=from===State.user?.username;
  msgs.insertAdjacentHTML('beforeend',`
  <div style="display:flex;gap:6px;align-items:flex-start;${isMe?'flex-direction:row-reverse':''}">
    <div class="user-avatar-sm" style="width:22px;height:22px;font-size:0.6rem;flex-shrink:0">${avatar?`<img src="${avatar}">`:from[0].toUpperCase()}</div>
    <div style="background:${isMe?'rgba(201,168,76,0.1)':'var(--bg-elevated)'};border-radius:8px;padding:5px 10px;max-width:75%">
      ${!isMe?`<div style="font-size:0.62rem;color:var(--accent);margin-bottom:2px">${from}</div>`:''}
      <div style="font-size:0.78rem">${text}</div>
    </div>
  </div>`);
  msgs.scrollTop=msgs.scrollHeight;
}

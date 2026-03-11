// public/js/game.js — Number Guessing Game Frontend

let gameSocket = null;
let gameState  = {
  phase: 'lobby',   // lobby | setup | playing | over
  roomId: null,
  mode: null,       // human | computer
  myGuesses: [],
  opponentGuesses: [],
  isMyTurn: false,
  winner: null,
};

// ── Connect to game namespace ─────────────────────────────
function initGameSocket() {
  if (gameSocket?.connected) return;
  try {
    gameSocket = io('/game', { transports: ['websocket', 'polling'] });
  } catch(e) {
    console.error('Game socket error:', e);
    return;
  }

  gameSocket.on('connect', () => {
    console.log('Game socket connected');
    gameSocket.emit('get_rooms');
  });

  gameSocket.on('rooms_list',      onRoomsList);
  gameSocket.on('room_created',    onRoomCreated);
  gameSocket.on('room_joined',     onRoomJoined);
  gameSocket.on('room_updated',    onRoomUpdated);
  gameSocket.on('secret_set',      onSecretSet);
  gameSocket.on('opponent_ready',  onOpponentReady);
  gameSocket.on('game_started',    onGameStarted);
  gameSocket.on('guess_result',    onGuessResult);
  gameSocket.on('opponent_guessed',onOpponentGuessed);
  gameSocket.on('computer_guessed',onComputerGuessed);
  gameSocket.on('turn_changed',    onTurnChanged);
  gameSocket.on('game_over',       onGameOver);
  gameSocket.on('opponent_left',   onOpponentLeft);
  gameSocket.on('game_chat_msg',   onGameChat);
  gameSocket.on('game_error',      (msg) => Toast.error(msg));
}

function disconnectGameSocket() {
  if (gameSocket) { gameSocket.disconnect(); gameSocket = null; }
  gameState = { phase:'lobby', roomId:null, mode:null, myGuesses:[], opponentGuesses:[], isMyTurn:false, winner:null };
}

// ── Main render ───────────────────────────────────────────
async function renderGame() {
  gameState.phase = 'lobby';
  gameState.roomId = null;
  const content = document.getElementById('main-content');
  content.innerHTML = buildLobbyHTML();
  initGameSocket();
  // emit only after socket is created (it connects async)
  if (gameSocket) {
    if (gameSocket.connected) {
      gameSocket.emit('get_rooms');
    } else {
      gameSocket.once('connect', () => gameSocket.emit('get_rooms'));
    }
  }
}

function buildLobbyHTML() {
  return `
  <div class="page-header fade-in">
    <div>
      <div class="page-title">🎮 Number Game</div>
      <div class="page-subtitle">Guess the 3-digit secret number · Bulls & Cows</div>
    </div>
  </div>

  <!-- How to play -->
  <div class="game-rules-bar fade-in">
    <span>📖 How to play:</span>
    <span>Each player picks a <strong>3-digit secret</strong> (no repeats, no leading zero)</span>
    <span>·</span>
    <span>🐂 <strong>Bull</strong> = right digit, right spot</span>
    <span>·</span>
    <span>🐄 <strong>Cow</strong> = right digit, wrong spot</span>
    <span>·</span>
    <span>First to <strong>3 Bulls</strong> wins!</span>
  </div>

  <!-- Mode selection -->
  <div class="game-modes fade-in">
    <div class="game-mode-card" onclick="createGameRoom('computer')">
      <div class="mode-icon">🤖</div>
      <div class="mode-title">vs Computer</div>
      <div class="mode-desc">Play solo against the AI<br>AI uses elimination strategy</div>
      <button class="btn-primary" style="margin-top:14px;width:100%">Play Now</button>
    </div>
    <div class="game-mode-card" onclick="showCreateHuman()">
      <div class="mode-icon">👥</div>
      <div class="mode-title">vs Human</div>
      <div class="mode-desc">Create a room or join one<br>Challenge a friend!</div>
      <button class="btn-primary" style="margin-top:14px;width:100%">Create Room</button>
    </div>
    <div class="game-mode-card" onclick="showJoinRoom()">
      <div class="mode-icon">🔗</div>
      <div class="mode-title">Join Room</div>
      <div class="mode-desc">Enter a room code<br>or pick from the list</div>
      <button class="btn-secondary" style="margin-top:14px;width:100%">Join</button>
    </div>
  </div>

  <!-- Public rooms -->
  <div class="fade-in" style="margin-top:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-family:'Cinzel',serif;font-size:0.85rem;color:var(--accent);letter-spacing:0.1em">OPEN ROOMS</div>
      <button class="btn-secondary" style="font-size:0.7rem;padding:4px 10px" onclick="gameSocket.emit('get_rooms')">↻ Refresh</button>
    </div>
    <div id="game-rooms-list">
      <div class="game-empty">No open rooms · Create one to invite a friend!</div>
    </div>
  </div>`;
}

// ── Lobby events ──────────────────────────────────────────
function onRoomsList(rooms) {
  const el = document.getElementById('game-rooms-list');
  if (!el) return;
  if (!rooms.length) {
    el.innerHTML = `<div class="game-empty">No open rooms · Create one to invite a friend!</div>`;
    return;
  }
  el.innerHTML = rooms.map(r => `
    <div class="game-room-row">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="user-avatar-sm">${r.hostAvatar ? `<img src="${r.hostAvatar}">` : r.host[0].toUpperCase()}</div>
        <div>
          <div style="font-weight:600;font-size:0.88rem">${r.host}'s Room</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">Code: <strong style="color:var(--accent)">${r.id}</strong> · Waiting for opponent</div>
        </div>
      </div>
      <button class="btn-primary" style="font-size:0.78rem;padding:6px 16px" onclick="joinGameRoom('${r.id}')">Join ▶</button>
    </div>`).join('');
}

function showCreateHuman() {
  Modal.open(`
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:3rem">👥</div>
      <div style="font-family:'Cinzel',serif;font-size:1rem;margin-top:8px">Create Human Room</div>
    </div>
    <div class="form-group">
      <label>Visibility</label>
      <select id="room-vis">
        <option value="true">🌐 Public — anyone can join</option>
        <option value="false">🔒 Private — share the code</option>
      </select>
    </div>
    <button class="btn-primary btn-full" onclick="createGameRoom('human')">Create Room</button>
  `, 'New Game Room');
}

function showJoinRoom() {
  Modal.open(`
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:3rem">🔗</div>
      <div style="font-family:'Cinzel',serif;font-size:1rem;margin-top:8px">Join a Room</div>
    </div>
    <div class="form-group">
      <label>Room Code</label>
      <input type="text" id="join-code" placeholder="Enter 5-letter code" maxlength="5"
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
  gameSocket.emit('create_room', { mode, isPublic });
}

function joinGameRoom(roomId) {
  if (!roomId?.trim()) { Toast.error('Enter a room code'); return; }
  Modal.close();
  gameSocket.emit('join_room', { roomId: roomId.trim().toUpperCase() });
}

// ── Room created / joined ─────────────────────────────────
function onRoomCreated(room) {
  gameState.roomId = room.id;
  gameState.phase = 'setup';
  gameState.mode = room.mode;
  renderSetupPhase(room, true);
}

function onRoomJoined(room) {
  gameState.roomId = room.id;
  gameState.phase = 'setup';
  gameState.mode = room.mode;
  renderSetupPhase(room, false);
}

function onRoomUpdated(room) {
  if (gameState.phase === 'setup') {
    const isHost = room.host.id === (State.user?._id || State.user?.id);
    renderSetupPhase(room, isHost);
  }
}

// ── Setup phase ───────────────────────────────────────────
function renderSetupPhase(room, isHost) {
  const content = document.getElementById('main-content');
  const userId  = State.user?._id || State.user?.id;
  const me      = isHost ? room.host : room.guest;
  const opponent = isHost ? room.guest : room.host;
  const alreadySet = me?.ready;

  content.innerHTML = `
  <div class="game-arena fade-in">
    <!-- Header -->
    <div class="game-header">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn-secondary" style="font-size:0.72rem;padding:5px 12px" onclick="leaveGame()">← Leave</button>
        <div>
          <div style="font-family:'Cinzel',serif;font-size:1rem;color:var(--accent)">🎮 ${room.mode === 'computer' ? 'vs Computer' : 'vs Human'}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">Room: <strong style="color:var(--accent);letter-spacing:0.1em">${room.id}</strong></div>
        </div>
      </div>
      <div class="game-players">
        ${renderPlayerBadge(room.host, room.host.id === userId)}
        <div style="font-size:1.2rem;color:var(--text-muted)">⚔️</div>
        ${room.guest ? renderPlayerBadge(room.guest, room.guest?.id === userId) : `<div class="player-badge waiting-badge">⏳ Waiting...</div>`}
      </div>
    </div>

    <!-- Setup box -->
    <div class="game-setup-box">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:2.5rem;margin-bottom:8px">🔐</div>
        <div style="font-family:'Cinzel',serif;font-size:1.1rem;color:var(--accent)">Set Your Secret Number</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px">3 unique digits · No leading zero · e.g. 4 7 2</div>
      </div>

      ${alreadySet ? `
      <div style="text-align:center;padding:20px;background:rgba(201,168,76,0.08);border-radius:12px;border:1px solid rgba(201,168,76,0.2)">
        <div style="font-size:1.5rem;margin-bottom:8px">✅</div>
        <div style="color:var(--accent);font-weight:600">Secret number locked in!</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px">
          ${opponent?.ready ? "Both ready — starting..." : "Waiting for opponent..."}
        </div>
        ${!opponent?.ready && opponent && !opponent.isComputer ? `<div class="opponent-waiting-dots"><span></span><span></span><span></span></div>` : ''}
      </div>` : `
      <!-- Number picker -->
      <div class="number-picker" id="number-picker">
        <div class="digit-slot" id="d0" onclick="selectDigitSlot(0)">?</div>
        <div class="digit-slot" id="d1" onclick="selectDigitSlot(1)">?</div>
        <div class="digit-slot" id="d2" onclick="selectDigitSlot(2)">?</div>
      </div>
      <div id="digit-error" style="text-align:center;color:var(--error);font-size:0.75rem;min-height:18px;margin-top:4px"></div>
      <div class="digit-pad" id="digit-pad">
        ${[1,2,3,4,5,6,7,8,9,0].map(d => `<button class="digit-btn" id="dpad-${d}" onclick="digitPadPress(${d})">${d}</button>`).join('')}
        <button class="digit-btn digit-del" onclick="digitPadDel()">⌫</button>
      </div>
      <button class="btn-primary btn-full" style="margin-top:16px" id="lock-btn" onclick="lockSecret()" disabled style="opacity:0.5">
        🔐 Lock In Secret
      </button>`}
    </div>

    ${room.mode === 'human' ? `
    <div style="text-align:center;margin-top:16px;font-size:0.75rem;color:var(--text-muted)">
      Share room code with your friend: <strong style="color:var(--accent);font-size:0.9rem;letter-spacing:0.15em">${room.id}</strong>
      <button class="btn-secondary" style="font-size:0.65rem;padding:3px 8px;margin-left:8px" onclick="navigator.clipboard.writeText('${room.id}').then(()=>Toast.success('Copied!'))">📋 Copy</button>
    </div>` : ''}
  </div>`;

  if (!alreadySet) initDigitPicker();
}

// ── Digit picker logic ────────────────────────────────────
let pickerDigits = ['', '', ''];
let activeSlot = 0;

function initDigitPicker() {
  pickerDigits = ['', '', ''];
  activeSlot = 0;
  updatePickerUI();
  selectDigitSlot(0);
}

function selectDigitSlot(i) {
  activeSlot = i;
  document.querySelectorAll('.digit-slot').forEach((s, idx) => s.classList.toggle('active', idx === i));
}

function digitPadPress(d) {
  // Find next empty slot from activeSlot, or fill activeSlot
  const s = String(d);

  // Can't repeat digits
  if (pickerDigits.includes(s)) {
    document.getElementById('digit-error').textContent = `Digit ${d} already used!`;
    setTimeout(() => { const e = document.getElementById('digit-error'); if(e) e.textContent = ''; }, 1200);
    return;
  }
  // No leading zero
  if (activeSlot === 0 && d === 0) {
    document.getElementById('digit-error').textContent = 'First digit cannot be 0!';
    setTimeout(() => { const e = document.getElementById('digit-error'); if(e) e.textContent = ''; }, 1200);
    return;
  }

  pickerDigits[activeSlot] = s;
  // Disable used digit in pad
  const btn = document.getElementById(`dpad-${d}`);
  if (btn) { btn.disabled = true; btn.style.opacity = '0.3'; }

  // Move to next empty slot
  const next = pickerDigits.findIndex((v, i) => i > activeSlot && v === '');
  if (next !== -1) selectDigitSlot(next);
  else {
    const any = pickerDigits.findIndex(v => v === '');
    if (any !== -1) selectDigitSlot(any);
  }

  updatePickerUI();
}

function digitPadDel() {
  // Clear active slot
  const removed = pickerDigits[activeSlot];
  if (removed) {
    const btn = document.getElementById(`dpad-${removed}`);
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    pickerDigits[activeSlot] = '';
    document.getElementById('digit-error').textContent = '';
  } else {
    // Go back one
    if (activeSlot > 0) {
      activeSlot--;
      const removed2 = pickerDigits[activeSlot];
      if (removed2) {
        const btn = document.getElementById(`dpad-${removed2}`);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        pickerDigits[activeSlot] = '';
      }
      selectDigitSlot(activeSlot);
    }
  }
  updatePickerUI();
}

function updatePickerUI() {
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`d${i}`);
    if (el) {
      el.textContent = pickerDigits[i] || '?';
      el.classList.toggle('filled', !!pickerDigits[i]);
    }
  }
  const lockBtn = document.getElementById('lock-btn');
  if (lockBtn) {
    const full = pickerDigits.every(d => d !== '');
    lockBtn.disabled = !full;
    lockBtn.style.opacity = full ? '1' : '0.5';
  }
}

function lockSecret() {
  const secret = pickerDigits.join('');
  if (secret.length !== 3) return;
  gameSocket.emit('set_secret', { roomId: gameState.roomId, secret });
}

function onSecretSet() {
  const lockBtn = document.getElementById('lock-btn');
  if (lockBtn) lockBtn.textContent = '✅ Locked!';
  Toast.success('Secret locked in! Waiting for opponent...');
}

function onOpponentReady() {
  const el = document.querySelector('.opponent-waiting-dots');
  if (el) el.parentElement.querySelector('div:last-child').textContent = 'Opponent is ready!';
  Toast.info('Opponent locked their secret!');
}

// ── Game starts ───────────────────────────────────────────
function onGameStarted({ currentTurn }) {
  const userId = State.user?._id || State.user?.id;
  gameState.isMyTurn = currentTurn === userId;
  gameState.phase = 'playing';
  gameState.myGuesses = [];
  gameState.opponentGuesses = [];
  renderPlayingPhase();
}

function onRoomUpdated_playing(room) {
  // Already handled by individual events
}

function renderPlayingPhase() {
  const content = document.getElementById('main-content');
  const userId  = State.user?._id || State.user?.id;

  content.innerHTML = `
  <div class="game-arena fade-in">
    <div class="game-header">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn-secondary" style="font-size:0.72rem;padding:5px 12px" onclick="leaveGame()">← Leave</button>
        <div>
          <div style="font-family:'Cinzel',serif;font-size:1rem;color:var(--accent)">🎮 ${gameState.mode === 'computer' ? 'vs Computer' : 'vs Human'}</div>
          <div id="turn-indicator" style="font-size:0.75rem;margin-top:2px">
            ${gameState.isMyTurn ? '<span style="color:#7dd87d;font-weight:600">🟢 Your Turn</span>' : '<span style="color:var(--text-muted)">⏳ Opponent\'s Turn</span>'}
          </div>
        </div>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Room: <strong style="color:var(--accent)">${gameState.roomId}</strong></div>
    </div>

    <div class="game-board">
      <!-- My attack panel -->
      <div class="game-panel">
        <div class="panel-title">⚔️ Your Guesses <span id="my-guess-count" style="color:var(--text-muted);font-weight:400;font-size:0.75rem">(0/10)</span></div>

        <!-- Guess input -->
        <div id="guess-input-area">
          <div class="guess-input-row">
            <div class="number-picker small" id="guess-picker">
              <div class="digit-slot small" id="gd0" onclick="selectGuessSlot(0)">?</div>
              <div class="digit-slot small" id="gd1" onclick="selectGuessSlot(1)">?</div>
              <div class="digit-slot small" id="gd2" onclick="selectGuessSlot(2)">?</div>
            </div>
            <button class="btn-primary" id="guess-btn" onclick="submitGuess()" disabled style="opacity:0.5">
              ${gameState.isMyTurn ? 'Guess ▶' : 'Wait...'}
            </button>
          </div>
          <div id="guess-digit-pad" class="digit-pad small">
            ${[1,2,3,4,5,6,7,8,9,0].map(d => `<button class="digit-btn" id="gdpad-${d}" onclick="guessDigitPress(${d})">${d}</button>`).join('')}
            <button class="digit-btn digit-del" onclick="guessDigitDel()">⌫</button>
          </div>
          <div id="guess-error" style="font-size:0.72rem;color:var(--error);min-height:16px;margin-top:4px;text-align:center"></div>
        </div>

        <!-- Guess history -->
        <div id="my-guesses-list" class="guesses-list"></div>
      </div>

      <!-- Opponent defense panel -->
      <div class="game-panel">
        <div class="panel-title">🛡️ Opponent's Guesses <span id="opp-guess-count" style="color:var(--text-muted);font-weight:400;font-size:0.75rem">(0/10)</span></div>
        <div id="opp-guesses-list" class="guesses-list">
          <div class="guess-placeholder">Waiting for opponent to guess...</div>
        </div>
      </div>
    </div>

    <!-- Game chat -->
    ${gameState.mode === 'human' ? `
    <div class="game-chat-box">
      <div class="game-chat-title">💬 Game Chat</div>
      <div id="game-chat-msgs" class="game-chat-msgs"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" id="game-chat-input" placeholder="Say something..." maxlength="200"
          style="flex:1;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text-primary);font-size:0.8rem"
          onkeydown="if(event.key==='Enter')sendGameChat()">
        <button class="btn-secondary" style="font-size:0.8rem;padding:8px 14px" onclick="sendGameChat()">Send</button>
      </div>
    </div>` : ''}
  </div>`;

  if (gameState.isMyTurn) initGuessPicker();
  else disableGuessPicker();
}

// ── Guess picker (in-game) ────────────────────────────────
let guessDigits = ['', '', ''];
let activeGuessSlot = 0;

function initGuessPicker() {
  guessDigits = ['', '', ''];
  activeGuessSlot = 0;
  updateGuessPickerUI();
  selectGuessSlot(0);
}

function selectGuessSlot(i) {
  activeGuessSlot = i;
  document.querySelectorAll('#guess-picker .digit-slot').forEach((s, idx) => s.classList.toggle('active', idx === i));
}

function guessDigitPress(d) {
  if (!gameState.isMyTurn) return;
  const s = String(d);
  if (guessDigits.includes(s)) {
    document.getElementById('guess-error').textContent = `Digit ${d} already used!`;
    setTimeout(() => { const e = document.getElementById('guess-error'); if(e) e.textContent=''; }, 1200);
    return;
  }
  if (activeGuessSlot === 0 && d === 0) {
    document.getElementById('guess-error').textContent = 'First digit cannot be 0!';
    setTimeout(() => { const e = document.getElementById('guess-error'); if(e) e.textContent=''; }, 1200);
    return;
  }
  guessDigits[activeGuessSlot] = s;
  const btn = document.getElementById(`gdpad-${d}`);
  if (btn) { btn.disabled = true; btn.style.opacity = '0.3'; }
  const next = guessDigits.findIndex((v, i) => i > activeGuessSlot && v === '');
  if (next !== -1) selectGuessSlot(next);
  else { const any = guessDigits.findIndex(v => v === ''); if (any !== -1) selectGuessSlot(any); }
  updateGuessPickerUI();
}

function guessDigitDel() {
  const removed = guessDigits[activeGuessSlot];
  if (removed) {
    const btn = document.getElementById(`gdpad-${removed}`);
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    guessDigits[activeGuessSlot] = '';
  } else if (activeGuessSlot > 0) {
    activeGuessSlot--;
    const removed2 = guessDigits[activeGuessSlot];
    if (removed2) {
      const btn = document.getElementById(`gdpad-${removed2}`);
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      guessDigits[activeGuessSlot] = '';
    }
    selectGuessSlot(activeGuessSlot);
  }
  document.getElementById('guess-error').textContent = '';
  updateGuessPickerUI();
}

function updateGuessPickerUI() {
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`gd${i}`);
    if (el) { el.textContent = guessDigits[i] || '?'; el.classList.toggle('filled', !!guessDigits[i]); }
  }
  const btn = document.getElementById('guess-btn');
  if (btn) {
    const full = guessDigits.every(d => d !== '');
    btn.disabled = !full || !gameState.isMyTurn;
    btn.style.opacity = (full && gameState.isMyTurn) ? '1' : '0.5';
    btn.textContent = gameState.isMyTurn ? 'Guess ▶' : 'Wait...';
  }
}

function disableGuessPicker() {
  const btn = document.getElementById('guess-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.textContent = 'Wait...'; }
}

function submitGuess() {
  const guess = guessDigits.join('');
  if (guess.length !== 3 || !gameState.isMyTurn) return;
  gameSocket.emit('make_guess', { roomId: gameState.roomId, guess });
  // Reset picker
  guessDigits = ['', '', ''];
  document.querySelectorAll('#guess-digit-pad .digit-btn:not(.digit-del)').forEach(b => {
    b.disabled = false; b.style.opacity = '1';
  });
  updateGuessPickerUI();
  disableGuessPicker();
}

// ── Game events ───────────────────────────────────────────
function onGuessResult({ guess, bulls, cows, turn, gameOver, winner }) {
  const list = document.getElementById('my-guesses-list');
  if (list) {
    const entry = buildGuessRow(guess, bulls, cows, turn, true);
    list.innerHTML = entry + list.innerHTML;
    const cnt = document.getElementById('my-guess-count');
    if (cnt) cnt.textContent = `(${turn}/10)`;
  }
  gameState.myGuesses.push({ guess, bulls, cows });

  if (!gameOver) {
    gameState.isMyTurn = false;
    disableGuessPicker();
  }
}

function onOpponentGuessed({ bulls, cows, turn, gameOver, winner }) {
  const list = document.getElementById('opp-guesses-list');
  if (list) {
    const ph = list.querySelector('.guess-placeholder');
    if (ph) ph.remove();
    const entry = buildGuessRow('???', bulls, cows, turn, false);
    list.innerHTML = entry + list.innerHTML;
    const cnt = document.getElementById('opp-guess-count');
    if (cnt) cnt.textContent = `(${turn}/10)`;
  }

  if (!gameOver) {
    gameState.isMyTurn = true;
    initGuessPicker();
  }
}

function onComputerGuessed({ guess, bulls, cows, turn, gameOver, winner }) {
  const list = document.getElementById('opp-guesses-list');
  if (list) {
    const ph = list.querySelector('.guess-placeholder');
    if (ph) ph.remove();
    const entry = buildGuessRow(guess, bulls, cows, turn, false);
    list.innerHTML = entry + list.innerHTML;
    const cnt = document.getElementById('opp-guess-count');
    if (cnt) cnt.textContent = `(${turn}/10)`;
  }

  if (!gameOver) {
    gameState.isMyTurn = true;
    initGuessPicker();
    const ti = document.getElementById('turn-indicator');
    if (ti) ti.innerHTML = '<span style="color:#7dd87d;font-weight:600">🟢 Your Turn</span>';
  }
}

function onTurnChanged({ currentTurn, isYourTurn }) {
  gameState.isMyTurn = isYourTurn;
  const ti = document.getElementById('turn-indicator');
  if (ti) ti.innerHTML = isYourTurn
    ? '<span style="color:#7dd87d;font-weight:600">🟢 Your Turn</span>'
    : '<span style="color:var(--text-muted)">⏳ Opponent\'s Turn</span>';
  if (isYourTurn) initGuessPicker();
  else disableGuessPicker();
}

function buildGuessRow(guess, bulls, cows, turn, isMe) {
  const bullColor = bulls === 3 ? '#ffd700' : bulls > 0 ? '#7dd87d' : 'var(--text-muted)';
  return `
  <div class="guess-row ${bulls===3?'guess-winner':''}">
    <div class="guess-number">${guess}</div>
    <div class="guess-feedback">
      <span class="bull-badge" style="color:${bullColor}">🐂 ${bulls}</span>
      <span class="cow-badge">🐄 ${cows}</span>
    </div>
    <div class="guess-turn">#${turn}</div>
  </div>`;
}

function onGameOver({ hostSecret, guestSecret, winner, hostGuesses, guestGuesses }) {
  gameState.phase = 'over';
  const userId = State.user?._id || State.user?.id;
  const iWon = winner === userId;
  const isDraw = winner === 'draw';
  const computerWon = winner === 'computer';

  const content = document.getElementById('main-content');
  content.innerHTML = `
  <div class="game-arena fade-in">
    <div class="game-over-screen">
      <div class="game-over-icon">${isDraw ? '🤝' : (iWon ? '🏆' : '💀')}</div>
      <div class="game-over-title ${iWon?'win':isDraw?'draw':'lose'}">
        ${isDraw ? "It's a Draw!" : iWon ? 'You Win!' : computerWon ? 'Computer Wins!' : 'You Lose!'}
      </div>
      <div class="game-over-subtitle">
        ${iWon ? 'Congratulations! You cracked the code!' : isDraw ? 'Neither player cracked the code in time.' : 'Better luck next time!'}
      </div>

      <div class="secrets-reveal">
        <div class="secret-card">
          <div class="secret-label">Your Secret Was</div>
          <div class="secret-number">${hostSecret || guestSecret}</div>
        </div>
        <div class="secret-card">
          <div class="secret-label">Opponent's Secret Was</div>
          <div class="secret-number">${guestSecret || hostSecret}</div>
        </div>
      </div>

      <div class="game-over-stats">
        <div><span style="color:var(--text-muted)">Your guesses:</span> <strong>${hostGuesses || guestGuesses}</strong></div>
        <div><span style="color:var(--text-muted)">Opponent guesses:</span> <strong>${guestGuesses || hostGuesses}</strong></div>
      </div>

      <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap">
        <button class="btn-primary" style="padding:12px 32px" onclick="renderGame()">🎮 Play Again</button>
        <button class="btn-secondary" style="padding:12px 32px" onclick="navigateTo('dashboard')">🏠 Home</button>
      </div>
    </div>
  </div>`;
}

function onOpponentLeft() {
  Toast.error('Opponent left the game!');
  setTimeout(() => renderGame(), 2000);
}

// ── Chat ──────────────────────────────────────────────────
function sendGameChat() {
  const input = document.getElementById('game-chat-input');
  if (!input?.value.trim()) return;
  gameSocket.emit('game_chat', { roomId: gameState.roomId, message: input.value.trim() });
  input.value = '';
}

function onGameChat({ from, avatar, text }) {
  const msgs = document.getElementById('game-chat-msgs');
  if (!msgs) return;
  const isMe = from === State.user?.username;
  msgs.innerHTML += `
  <div style="display:flex;gap:6px;align-items:flex-start;${isMe?'flex-direction:row-reverse':''}">
    <div class="user-avatar-sm" style="width:22px;height:22px;font-size:0.6rem;flex-shrink:0">
      ${avatar ? `<img src="${avatar}">` : from[0].toUpperCase()}
    </div>
    <div style="background:${isMe?'rgba(201,168,76,0.12)':'var(--bg-elevated)'};border-radius:8px;padding:5px 10px;max-width:75%">
      ${!isMe ? `<div style="font-size:0.65rem;color:var(--accent);margin-bottom:2px">${from}</div>` : ''}
      <div style="font-size:0.78rem">${text}</div>
    </div>
  </div>`;
  msgs.scrollTop = msgs.scrollHeight;
}

// ── Helpers ───────────────────────────────────────────────
function renderPlayerBadge(player, isMe) {
  return `
  <div class="player-badge ${isMe?'my-badge':''}">
    <div class="user-avatar-sm" style="width:30px;height:30px;font-size:0.75rem;flex-shrink:0">
      ${player.avatar ? `<img src="${player.avatar}">` : player.name[0].toUpperCase()}
    </div>
    <div>
      <div style="font-size:0.8rem;font-weight:600">${player.name}${isMe?' (you)':''}</div>
      <div style="font-size:0.65rem;color:${player.ready?'#7dd87d':'var(--text-muted)'}">
        ${player.ready ? '✅ Ready' : '⏳ Setting up...'}
      </div>
    </div>
  </div>`;
}

function leaveGame() {
  if (gameState.roomId) gameSocket.emit('leave_room', { roomId: gameState.roomId });
  gameState = { phase:'lobby', roomId:null, mode:null, myGuesses:[], opponentGuesses:[], isMyTurn:false, winner:null };
  renderGame();
}

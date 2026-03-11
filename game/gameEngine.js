// game/gameEngine.js — Number Guessing Game Engine
// Game: Each player sets a secret 3-digit number (no repeated digits, no leading zero)
// Players take turns guessing the opponent's number
// Feedback: Bulls (right digit, right position) + Cows (right digit, wrong position)

const rooms = new Map(); // roomId -> Room

function generateRoomId() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function validateNumber(num) {
  const s = String(num);
  if (!/^\d{3}$/.test(s)) return false;
  if (s[0] === '0') return false;
  if (new Set(s).size !== 3) return false;
  return true;
}

function getBullsCows(secret, guess) {
  let bulls = 0, cows = 0;
  for (let i = 0; i < 3; i++) {
    if (guess[i] === secret[i]) bulls++;
    else if (secret.includes(guess[i])) cows++;
  }
  return { bulls, cows };
}

function generateComputerNumber() {
  const digits = [1,2,3,4,5,6,7,8,9];
  // Shuffle and pick first as hundreds (non-zero), then add from 0-9
  const pool = [0,1,2,3,4,5,6,7,8,9];
  const first = Math.floor(Math.random() * 9) + 1;
  const remaining = pool.filter(d => d !== first);
  remaining.sort(() => Math.random() - 0.5);
  return `${first}${remaining[0]}${remaining[1]}`;
}

// Computer AI — uses minimax-like elimination
function computerGuess(triedGuesses, feedback) {
  // Generate all valid numbers
  let possible = [];
  for (let i = 100; i <= 999; i++) {
    const s = String(i);
    if (new Set(s).size === 3 && s[0] !== '0') possible.push(s);
  }

  // Filter by all previous feedback
  for (const { guess, bulls, cows } of feedback) {
    possible = possible.filter(p => {
      const r = getBullsCows(p, guess);
      return r.bulls === bulls && r.cows === cows;
    });
  }

  // Filter out already tried
  possible = possible.filter(p => !triedGuesses.includes(p));

  if (possible.length === 0) {
    // Fallback — pick any untried valid number
    for (let i = 100; i <= 999; i++) {
      const s = String(i);
      if (new Set(s).size === 3 && s[0] !== '0' && !triedGuesses.includes(s)) return s;
    }
  }

  // Pick the guess that minimizes worst case (simplified: pick middle of sorted possible)
  return possible[Math.floor(possible.length / 2)];
}

// ── Room management ────────────────────────────────────────

function createRoom({ hostId, hostName, hostAvatar, mode, isPublic = true }) {
  const id = generateRoomId();
  const room = {
    id,
    mode,           // 'human' | 'computer'
    isPublic,
    status: 'waiting',  // waiting | setup | playing | finished
    host: { id: hostId, name: hostName, avatar: hostAvatar, secret: null, ready: false, guesses: [], socketId: null },
    guest: mode === 'computer'
      ? { id: 'computer', name: '🤖 Computer', avatar: null, secret: null, ready: false, guesses: [], isComputer: true }
      : null,
    currentTurn: null,  // hostId or guestId
    winner: null,
    createdAt: Date.now(),
    maxGuesses: 10,
    chat: [],
  };

  // Computer sets its number immediately
  if (mode === 'computer') {
    room.guest.secret = generateComputerNumber();
    room.guest.ready = true;
  }

  rooms.set(id, room);
  return room;
}

function getRoom(id) { return rooms.get(id); }

function getRoomSafe(room, userId) {
  // Return room state but hide the opponent's secret
  const r = JSON.parse(JSON.stringify(room));
  if (r.host && r.host.id !== userId) delete r.host.secret;
  if (r.guest && r.guest.id !== userId && !r.guest.isComputer) delete r.guest.secret;
  return r;
}

function getPublicRooms() {
  return Array.from(rooms.values())
    .filter(r => r.isPublic && r.status === 'waiting' && r.mode === 'human')
    .map(r => ({
      id: r.id,
      host: r.host.name,
      hostAvatar: r.host.avatar,
      createdAt: r.createdAt,
    }));
}

function joinRoom(roomId, { guestId, guestName, guestAvatar }) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.mode !== 'human') return { error: 'Cannot join a computer game' };
  if (room.status !== 'waiting') return { error: 'Game already started' };
  if (room.host.id === guestId) return { error: 'You are the host' };
  if (room.guest) return { error: 'Room is full' };

  room.guest = { id: guestId, name: guestName, avatar: guestAvatar, secret: null, ready: false, guesses: [], socketId: null };
  room.status = 'setup';
  return { room };
}

function setSecret(roomId, userId, secret) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (!validateNumber(secret)) return { error: 'Invalid number — must be 3 unique digits, no leading zero' };

  const player = room.host.id === userId ? room.host : room.guest?.id === userId ? room.guest : null;
  if (!player) return { error: 'Not in this room' };

  player.secret = secret;
  player.ready = true;

  // Check if both ready
  const bothReady = room.host.ready && room.guest?.ready;
  if (bothReady) {
    room.status = 'playing';
    room.currentTurn = room.host.id;
  }

  return { room, bothReady };
}

function makeGuess(roomId, userId, guess) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'playing') return { error: 'Game not in progress' };
  if (room.currentTurn !== userId) return { error: "Not your turn" };
  if (!validateNumber(guess)) return { error: 'Invalid number — 3 unique digits, no leading zero' };

  const attacker = room.host.id === userId ? room.host : room.guest;
  const defender = room.host.id === userId ? room.guest : room.host;

  // Check already guessed
  if (attacker.guesses.some(g => g.guess === guess)) return { error: 'Already guessed that number' };

  const { bulls, cows } = getBullsCows(defender.secret, guess);
  const guessEntry = { guess, bulls, cows, turn: attacker.guesses.length + 1 };
  attacker.guesses.push(guessEntry);

  let gameOver = false;
  let winner = null;

  if (bulls === 3) {
    gameOver = true;
    winner = userId;
    room.status = 'finished';
    room.winner = userId;
  } else if (attacker.guesses.length >= room.maxGuesses) {
    gameOver = true;
    room.status = 'finished';
    room.winner = 'draw';
  } else {
    // Switch turn
    room.currentTurn = defender.id;
  }

  // If next turn is computer, auto-guess
  let computerGuessResult = null;
  if (!gameOver && room.guest?.isComputer && room.currentTurn === 'computer') {
    computerGuessResult = doComputerTurn(room);
  }

  return { room, guessEntry, gameOver, winner, computerGuessResult };
}

function doComputerTurn(room) {
  const triedGuesses = room.guest.guesses.map(g => g.guess);
  const feedback = room.guest.guesses.map(g => ({ guess: g.guess, bulls: g.bulls, cows: g.cows }));
  const guess = computerGuess(triedGuesses, feedback);

  const { bulls, cows } = getBullsCows(room.host.secret, guess);
  const guessEntry = { guess, bulls, cows, turn: room.guest.guesses.length + 1 };
  room.guest.guesses.push(guessEntry);

  let gameOver = false;
  if (bulls === 3) {
    gameOver = true;
    room.status = 'finished';
    room.winner = 'computer';
  } else if (room.guest.guesses.length >= room.maxGuesses) {
    gameOver = true;
    room.status = 'finished';
    room.winner = room.host.guesses.length > 0 ? 'draw' : 'draw';
  } else {
    room.currentTurn = room.host.id;
  }

  return { guessEntry, gameOver, winner: room.winner };
}

function deleteRoom(roomId) { rooms.delete(roomId); }

// Clean up old rooms every 30 min
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, room] of rooms.entries()) {
    if (room.createdAt < cutoff) rooms.delete(id);
  }
}, 30 * 60 * 1000);

module.exports = {
  createRoom, getRoom, getRoomSafe, getPublicRooms,
  joinRoom, setSecret, makeGuess, deleteRoom, validateNumber
};

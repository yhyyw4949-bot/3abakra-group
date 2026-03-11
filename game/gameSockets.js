// game/gameSockets.js — Socket.io handlers for the Number Game
const {
  createRoom, getRoom, getRoomSafe, getPublicRooms,
  joinRoom, setSecret, makeGuess, deleteRoom
} = require('./gameEngine');

// Track which socket is in which game room
const socketRooms = new Map(); // socketId -> roomId

module.exports = function setupGameSockets(io, onlineUsers) {

  const gameIo = io.of('/game');

  gameIo.on('connection', (socket) => {
    const session = socket.request.session;
    const userId  = session?.userId;
    if (!userId) { socket.disconnect(); return; }

    // Get user info from onlineUsers or session
    function getUserInfo() {
      for (const u of onlineUsers.values()) {
        if (u.userId === userId) return u;
      }
      return { userId, username: 'Player', avatar: null };
    }

    // ── Lobby ──────────────────────────────────────────────
    socket.on('get_rooms', () => {
      socket.emit('rooms_list', getPublicRooms());
    });

    socket.on('create_room', ({ mode, isPublic = true }) => {
      const u = getUserInfo();
      const room = createRoom({
        hostId: userId,
        hostName: u.username,
        hostAvatar: u.avatar,
        mode: mode || 'human',
        isPublic
      });
      room.host.socketId = socket.id;
      socket.join('game:' + room.id);
      socketRooms.set(socket.id, room.id);
      socket.emit('room_created', getRoomSafe(room, userId));

      if (mode === 'computer') {
        // Auto-move to setup since computer is always ready
        socket.emit('room_updated', getRoomSafe(room, userId));
      } else {
        // Broadcast new room to lobby
        gameIo.emit('rooms_list', getPublicRooms());
      }
    });

    socket.on('join_room', ({ roomId }) => {
      const u = getUserInfo();
      const result = joinRoom(roomId, {
        guestId: userId,
        guestName: u.username,
        guestAvatar: u.avatar
      });
      if (result.error) { socket.emit('game_error', result.error); return; }

      const room = result.room;
      room.guest.socketId = socket.id;
      socket.join('game:' + room.id);
      socketRooms.set(socket.id, room.id);

      // Tell both players room updated
      socket.emit('room_joined', getRoomSafe(room, userId));
      // Tell host
      const hostSocket = findSocket(gameIo, room.host.socketId);
      if (hostSocket) hostSocket.emit('room_updated', getRoomSafe(room, room.host.id));

      // Update lobby for everyone
      gameIo.emit('rooms_list', getPublicRooms());
    });

    socket.on('set_secret', ({ roomId, secret }) => {
      const result = setSecret(roomId, userId, secret);
      if (result.error) { socket.emit('game_error', result.error); return; }

      const room = result.room;
      socket.emit('secret_set', { ready: true });

      if (result.bothReady) {
        // Game starts — tell both players
        broadcastToRoom(gameIo, room, (pid) => getRoomSafe(room, pid));
        broadcastToRoom(gameIo, room, () => ({ event: 'game_started', currentTurn: room.currentTurn }));
      } else {
        // Tell other player their opponent is ready
        const other = getOtherPlayer(room, userId);
        if (other?.socketId) {
          const otherSocket = findSocket(gameIo, other.socketId);
          if (otherSocket) otherSocket.emit('opponent_ready');
        }
      }
    });

    socket.on('make_guess', ({ roomId, guess }) => {
      const result = makeGuess(roomId, userId, guess);
      if (result.error) { socket.emit('game_error', result.error); return; }

      const room = result.room;
      const { guessEntry, gameOver, computerGuessResult } = result;

      // Send guess result to attacker
      socket.emit('guess_result', {
        guess: guessEntry.guess,
        bulls: guessEntry.bulls,
        cows: guessEntry.cows,
        turn: guessEntry.turn,
        gameOver,
        winner: room.winner,
        myGuess: true
      });

      // Tell defender their opponent guessed
      const other = getOtherPlayer(room, userId);
      if (other && !other.isComputer && other.socketId) {
        const otherSocket = findSocket(gameIo, other.socketId);
        if (otherSocket) {
          otherSocket.emit('opponent_guessed', {
            bulls: guessEntry.bulls,
            cows: guessEntry.cows,
            turn: guessEntry.turn,
            gameOver,
            winner: room.winner
          });
        }
      }

      // Computer's turn result
      if (computerGuessResult) {
        const cg = computerGuessResult;
        setTimeout(() => {
          socket.emit('computer_guessed', {
            guess: cg.guessEntry.guess,
            bulls: cg.guessEntry.bulls,
            cows: cg.guessEntry.cows,
            turn: cg.guessEntry.turn,
            gameOver: cg.gameOver,
            winner: room.winner,
            yourSecret: cg.gameOver ? room.host.secret : undefined
          });
        }, 1200); // Small delay so it feels natural
      }

      if (!gameOver && !computerGuessResult) {
        // Update turn indicator for both
        socket.emit('turn_changed', { currentTurn: room.currentTurn, isYourTurn: room.currentTurn === userId });
        if (other && !other.isComputer && other.socketId) {
          const otherSocket = findSocket(gameIo, other.socketId);
          if (otherSocket) otherSocket.emit('turn_changed', { currentTurn: room.currentTurn, isYourTurn: room.currentTurn === other.id });
        }
      }

      if (gameOver) {
        // Reveal secrets
        const revealData = {
          hostSecret: room.host.secret,
          guestSecret: room.guest.secret,
          winner: room.winner,
          hostGuesses: room.host.guesses.length,
          guestGuesses: room.guest.guesses.length
        };
        gameIo.to('game:' + roomId).emit('game_over', revealData);
        // Clean up after 2 min
        setTimeout(() => deleteRoom(roomId), 2 * 60 * 1000);
      }
    });

    socket.on('game_chat', ({ roomId, message }) => {
      if (!message?.trim() || message.length > 200) return;
      const u = getUserInfo();
      const room = getRoom(roomId);
      if (!room) return;
      const msg = { from: u.username, avatar: u.avatar, text: message.trim(), at: Date.now() };
      room.chat.push(msg);
      gameIo.to('game:' + roomId).emit('game_chat_msg', msg);
    });

    socket.on('leave_room', ({ roomId }) => {
      handleLeave(socket, roomId);
    });

    socket.on('disconnect', () => {
      const roomId = socketRooms.get(socket.id);
      if (roomId) handleLeave(socket, roomId);
    });

    function handleLeave(socket, roomId) {
      const room = getRoom(roomId);
      socketRooms.delete(socket.id);
      socket.leave('game:' + roomId);
      if (!room) return;

      // Notify other player
      const other = getOtherPlayer(room, userId);
      if (other && !other.isComputer && other.socketId) {
        const otherSocket = findSocket(gameIo, other.socketId);
        if (otherSocket) otherSocket.emit('opponent_left');
      }

      // If host left, delete room
      if (room.host.id === userId) {
        deleteRoom(roomId);
        gameIo.emit('rooms_list', getPublicRooms());
      } else if (room.guest?.id === userId) {
        room.guest = null;
        room.status = 'waiting';
        gameIo.emit('rooms_list', getPublicRooms());
      }
    }
  });

  function findSocket(nsp, socketId) {
    return nsp.sockets.get(socketId);
  }

  function getOtherPlayer(room, userId) {
    if (room.host.id === userId) return room.guest;
    return room.host;
  }

  function broadcastToRoom(nsp, room, dataFn) {
    const players = [room.host, room.guest].filter(Boolean);
    for (const p of players) {
      if (p.isComputer || !p.socketId) continue;
      const s = findSocket(nsp, p.socketId);
      if (s) s.emit('room_updated', dataFn(p.id));
    }
  }
};

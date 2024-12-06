const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

let lobbies = {
  'general': { users: {}, targetNumber: Math.floor(Math.random() * 10) + 1 }
};

io.on('connection', (socket) => {
  console.log('New client connected');
  let currentLobby = null;

  socket.on('join', ({ username, lobby = 'general' }) => {
    // If user was in a previous lobby, remove them from it
    if (currentLobby) {
      socket.leave(currentLobby);
      delete lobbies[currentLobby].users[socket.id];
      io.to(currentLobby).emit('updateUsers', Object.values(lobbies[currentLobby].users));
    }

    if (!lobbies[lobby]) {
      lobbies[lobby] = { users: {}, targetNumber: Math.floor(Math.random() * 10) + 1 };
    }
    
    socket.join(lobby);
    currentLobby = lobby;
    lobbies[lobby].users[socket.id] = { username, score: 0 };
    io.to(lobby).emit('updateUsers', Object.values(lobbies[lobby].users));
    io.emit('updateLobbies', Object.keys(lobbies));
  });

  socket.on('guess', ({ guess, lobby }) => {
    if (lobbies[lobby] && lobbies[lobby].users[socket.id]) {
      const user = lobbies[lobby].users[socket.id];
      if (parseInt(guess) === lobbies[lobby].targetNumber) {
        user.score++;
        socket.emit('guessResult', 'Correct Guess!');
        lobbies[lobby].targetNumber = Math.floor(Math.random() * 10) + 1;
        io.to(lobby).emit('updateUsers', Object.values(lobbies[lobby].users));
      } else {
        socket.emit('guessResult', 'Incorrect Guess');
      }
    }
  });

  socket.on('createLobby', (lobbyName) => {
    if (!lobbies[lobbyName]) {
      lobbies[lobbyName] = { users: {}, targetNumber: Math.floor(Math.random() * 10) + 1 };
      io.emit('updateLobbies', Object.keys(lobbies));
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (currentLobby) {
      delete lobbies[currentLobby].users[socket.id];
      io.to(currentLobby).emit('updateUsers', Object.values(lobbies[currentLobby].users));
      if (Object.keys(lobbies[currentLobby].users).length === 0 && currentLobby !== 'general') {
        delete lobbies[currentLobby];
      }
      io.emit('updateLobbies', Object.keys(lobbies));
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
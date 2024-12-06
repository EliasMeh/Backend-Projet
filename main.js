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
  'general': { 
    users: {},
    teams: {},
    targetNumber: Math.floor(Math.random() * 10) + 1 
  }
};

io.on('connection', (socket) => {
  console.log('New client connected');
  let currentLobby = null;

  socket.on('join', ({ username, lobby = 'general' }) => {
    if (currentLobby) {
      leaveCurrentLobbyAndTeam(socket);
    }

    if (!lobbies[lobby]) {
      lobbies[lobby] = { users: {}, teams: {}, targetNumber: Math.floor(Math.random() * 10) + 1 };
    }
    
    socket.join(lobby);
    currentLobby = lobby;
    const newTeamName = `${username}'s team`;
    lobbies[lobby].users[socket.id] = { username, score: 0, team: newTeamName };
    lobbies[lobby].teams[newTeamName] = [socket.id];

    updateLobbyState(lobby);
    io.emit('updateLobbies', Object.keys(lobbies));
  });

  socket.on('guess', ({ guess, lobby }) => {
    if (lobbies[lobby] && lobbies[lobby].users[socket.id]) {
      if (parseInt(guess) === lobbies[lobby].targetNumber) {
        const team = lobbies[lobby].users[socket.id].team;
        lobbies[lobby].teams[team].forEach(userId => {
          lobbies[lobby].users[userId].score++;
        });
        socket.emit('guessResult', 'Correct Guess!');
        lobbies[lobby].targetNumber = Math.floor(Math.random() * 10) + 1;
        updateLobbyState(lobby);
      } else {
        socket.emit('guessResult', 'Incorrect Guess');
      }
    }
  });

  socket.on('createLobby', (lobbyName) => {
    if (!lobbies[lobbyName]) {
      lobbies[lobbyName] = { users: {}, teams: {}, targetNumber: Math.floor(Math.random() * 10) + 1 };
      io.emit('updateLobbies', Object.keys(lobbies));
    }
  });

  socket.on('joinTeam', ({ teamName, lobby }) => {
    if (lobbies[lobby] && lobbies[lobby].users[socket.id]) {
      const oldTeam = lobbies[lobby].users[socket.id].team;
      lobbies[lobby].teams[oldTeam] = lobbies[lobby].teams[oldTeam].filter(id => id !== socket.id);
      if (lobbies[lobby].teams[oldTeam].length === 0) {
        delete lobbies[lobby].teams[oldTeam];
      }

      if (!lobbies[lobby].teams[teamName]) {
        lobbies[lobby].teams[teamName] = [];
      }
      lobbies[lobby].teams[teamName].push(socket.id);
      lobbies[lobby].users[socket.id].team = teamName;

      updateLobbyState(lobby);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (currentLobby) {
      leaveCurrentLobbyAndTeam(socket);
    }
  });

  function leaveCurrentLobbyAndTeam(socket) {
    const lobby = currentLobby;
    const team = lobbies[lobby].users[socket.id].team;
    lobbies[lobby].teams[team] = lobbies[lobby].teams[team].filter(id => id !== socket.id);
    if (lobbies[lobby].teams[team].length === 0) {
      delete lobbies[lobby].teams[team];
    }
    delete lobbies[lobby].users[socket.id];
    socket.leave(lobby);
    updateLobbyState(lobby);

    if (Object.keys(lobbies[lobby].users).length === 0 && lobby !== 'general') {
      delete lobbies[lobby];
      io.emit('updateLobbies', Object.keys(lobbies));
    }
  }

  function updateLobbyState(lobby) {
    io.to(lobby).emit('updateLobbyState', {
      users: Object.values(lobbies[lobby].users),
      teams: lobbies[lobby].teams
    });
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
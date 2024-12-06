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
    targetNumber: Math.floor(Math.random() * 999999) + 1 
  }
};
//gestion de la connexion des utilisateurs
io.on('connection', (socket) => {
  console.log('New client connected');
  let currentLobby = null;

  socket.on('join', ({ username, lobby = 'general' }) => {
    if (currentLobby) {
      leaveCurrentLobbyAndTeam(socket);
    }

    if (!lobbies[lobby]) {
      lobbies[lobby] = { users: {}, teams: {}, targetNumber: Math.floor(Math.random() * 999999) + 1 };
    }
    
    socket.join(lobby);
    currentLobby = lobby;
    const newTeamName = `${username}'s team`;
    lobbies[lobby].users[socket.id] = { username, score: 0, team: newTeamName };
    lobbies[lobby].teams[newTeamName] = [socket.id];

    updateLobbyState(lobby);
    io.emit('updateLobbies', Object.keys(lobbies));
  });
  //gestion de la création du targetNumber et des choix utilisateurs
  socket.on('guess', ({ guess, lobby }) => {
    if (lobbies[lobby] && lobbies[lobby].users[socket.id]) {
      const targetNumber = lobbies[lobby].targetNumber;
      const guessedNumber = parseInt(guess);
      const difference = Math.abs(guessedNumber - targetNumber);
      const team = lobbies[lobby].users[socket.id].team;
      const username = lobbies[lobby].users[socket.id].username;

      let message = `Incorrect Guess.`;
      
      if (guessedNumber === targetNumber) {
        lobbies[lobby].teams[team].forEach(userId => {
          lobbies[lobby].users[userId].score++;
        });
        message = 'Bien joué! 🎉';
        lobbies[lobby].targetNumber = Math.floor(Math.random() * 999999) + 1;
        updateLobbyState(lobby);
      } else {
        if (difference >= 750000) message += 'Nan la tu forces de fou ...🦍';
        else if (difference >= 500000) message += 'Tu tes perdu je crois. 🏔️';
        else if (difference >= 250000) message += 'Tes pas mal. 🧊';
        else if (difference >= 100000) message += 'Tu t\'approches. 🥶';
        else if (difference >= 50000) message += 'La distance se fait courte. ❄️';
        else if (difference >= 1000) message += 'Hmm tes proche. 🤨';
        else if (difference >= 500) message += 'Il commence à faire chaud ici. 😡';
        else if (difference >= 100) message += 'AHHHHH il commance à faire chaud. C\'est le sauna ici? 🌋';
        else if (difference >= 10) message += 'C\'EST TROP CHAUUDDDD. 🔥🔥🔥';
        else message += '🔥LES🔥 🔥FLAMME🔥S ME🔥 BRULENT. 🔥🔥';
      }
      //gestion du chat d'équipe
      io.to(lobbies[lobby].teams[team]).emit('teamMessage', {
        message: `${username} guessed ${guess}. Result: ${message}`,
        team,
        username
      });

      socket.emit('guessResult', message);
    }
  });

  socket.on('createLobby', (lobbyName) => {
    if (!lobbies[lobbyName]) {
      lobbies[lobbyName] = { users: {}, teams: {}, targetNumber: Math.floor(Math.random() * 999999) + 1 };
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
  //gestion de la déconnexion
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (currentLobby) {
      leaveCurrentLobbyAndTeam(socket);
    }
  });
  //permet de garder à jour les lobbies et teams
  function leaveCurrentLobbyAndTeam(socket) {
    const lobby = currentLobby;
    const team = lobbies[lobby]?.users[socket.id]?.team;
    
    if (team) {
      lobbies[lobby].teams[team] = lobbies[lobby].teams[team].filter(id => id !== socket.id);
      if (lobbies[lobby].teams[team].length === 0) {
        delete lobbies[lobby].teams[team];
      }
    }

    delete lobbies[lobby]?.users[socket.id];
    
    socket.leave(lobby);
    
    updateLobbyState(lobby);

    if (Object.keys(lobbies[lobby]?.users).length === 0 && lobby !== 'general') {
      delete lobbies[lobby];
      io.emit('updateLobbies', Object.keys(lobbies));
    }
  }
  //mise à jour de l'état du lobby
  function updateLobbyState(lobby) {
    io.to(lobby).emit('updateLobbyState', {
      users: Object.values(lobbies[lobby]?.users),
      teams: lobbies[lobby]?.teams
    });
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
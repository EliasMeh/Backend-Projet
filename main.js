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

let users = {};
let targetNumber = Math.floor(Math.random() * 10) + 1;

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (username) => {
    users[socket.id] = { username, score: 0 };
    io.emit('updateUsers', Object.values(users));
  });

  socket.on('guess', (guess) => {
    const user = users[socket.id];
    if (user) {
      if (parseInt(guess) === targetNumber) {
        user.score++;
        socket.emit('guessResult', 'Correct Guess!');
        targetNumber = Math.floor(Math.random() * 10) + 1;
        io.emit('updateUsers', Object.values(users));
      } else {
        socket.emit('guessResult', 'Incorrect Guess');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    delete users[socket.id];
    io.emit('updateUsers', Object.values(users));
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
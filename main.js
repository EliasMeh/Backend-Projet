const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const sent_guess = 'send_guess';
let nombreale = Math.floor(Math.random() * 10) + 1;
let connectedUsers = {}; 


app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  connectedUsers[socket.id] = 0;

  socket.emit('update_leaderboard', connectedUsers);

  io.emit('update_leaderboard', connectedUsers);

  socket.on('request_leaderboard', () => {
    socket.emit('update_leaderboard', connectedUsers);
  });

  socket.on(sent_guess, (data) => {
    if (data == nombreale) {
      connectedUsers[socket.id] += 1; 
      io.emit('correct_guess', { message: "Correct guess!", guess: data, points: connectedUsers[socket.id] });
      nombreale = Math.floor(Math.random() * 10) + 1; 
    } else {
      io.emit('incorrect_guess', { message: "Incorrect guess.", guess: data });
    }
    io.emit('update_leaderboard', connectedUsers);
  });

  socket.on("disconnect", () => {
    delete connectedUsers[socket.id]; 

    io.emit('update_leaderboard', connectedUsers);
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
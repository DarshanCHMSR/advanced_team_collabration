
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.userId = decoded.userId;
      next();
    });
  } else {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  // Join user to their personal room
  socket.join(`user_${socket.userId}`);

  // Join team rooms
  socket.on('join_team', (teamId) => {
    socket.join(`team_${teamId}`);
    console.log(`User ${socket.userId} joined team ${teamId}`);
  });

  // Leave team rooms
  socket.on('leave_team', (teamId) => {
    socket.leave(`team_${teamId}`);
    console.log(`User ${socket.userId} left team ${teamId}`);
  });

  // Handle team messages
  socket.on('send_message', (data) => {
    const { teamId, message, type = 'TEXT' } = data;
    io.to(`team_${teamId}`).emit('new_message', {
      id: Date.now(), // This should be replaced with actual DB ID
      content: message,
      type,
      userId: socket.userId,
      teamId,
      createdAt: new Date()
    });
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(`team_${data.teamId}`).emit('user_typing', {
      userId: socket.userId,
      teamId: data.teamId
    });
  });

  socket.on('stop_typing', (data) => {
    socket.to(`team_${data.teamId}`).emit('user_stop_typing', {
      userId: socket.userId,
      teamId: data.teamId
    });
  });

  // Handle online status
  socket.on('user_online', () => {
    socket.broadcast.emit('user_status_change', {
      userId: socket.userId,
      isOnline: true
    });
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    socket.broadcast.emit('user_status_change', {
      userId: socket.userId,
      isOnline: false
    });
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/invites', require('./routes/invites'));

app.get('/', (req, res) => {
  res.send('SynergySphere - Advanced Team Collaboration Platform API');
});

server.listen(port, () => {
  console.log(`SynergySphere server is running on port: ${port}`);
});

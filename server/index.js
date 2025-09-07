
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Socket.io setup with enhanced CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
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

  // Meeting-related socket events
  socket.on('join-meeting', async (data) => {
    try {
      const { meetingUrl } = data;
      socket.meetingUrl = meetingUrl;
      socket.join(`meeting-${meetingUrl}`);
      
      // Notify others that user joined
      socket.to(`meeting-${meetingUrl}`).emit('user-joined', {
        userId: socket.userId,
        socketId: socket.id
      });

      console.log(`User ${socket.userId} joined meeting ${meetingUrl}`);
    } catch (error) {
      console.error('Join meeting error:', error);
      socket.emit('error', { message: 'Failed to join meeting' });
    }
  });

  socket.on('leave-meeting', () => {
    if (socket.meetingUrl) {
      socket.to(`meeting-${socket.meetingUrl}`).emit('user-left', {
        userId: socket.userId,
        socketId: socket.id
      });
      socket.leave(`meeting-${socket.meetingUrl}`);
      console.log(`User ${socket.userId} left meeting ${socket.meetingUrl}`);
    }
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.targetSocketId).emit('offer', {
      offer: data.offer,
      fromSocketId: socket.id,
      fromUserId: socket.userId
    });
  });

  socket.on('answer', (data) => {
    socket.to(data.targetSocketId).emit('answer', {
      answer: data.answer,
      fromSocketId: socket.id,
      fromUserId: socket.userId
    });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.targetSocketId).emit('ice-candidate', {
      candidate: data.candidate,
      fromSocketId: socket.id,
      fromUserId: socket.userId
    });
  });

  // Meeting controls
  socket.on('toggle-audio', (data) => {
    if (socket.meetingUrl) {
      socket.to(`meeting-${socket.meetingUrl}`).emit('user-audio-toggle', {
        userId: socket.userId,
        isMuted: data.isMuted
      });
    }
  });

  socket.on('toggle-video', (data) => {
    if (socket.meetingUrl) {
      socket.to(`meeting-${socket.meetingUrl}`).emit('user-video-toggle', {
        userId: socket.userId,
        isVideoOn: data.isVideoOn
      });
    }
  });

  socket.on('toggle-screen-share', (data) => {
    if (socket.meetingUrl) {
      socket.to(`meeting-${socket.meetingUrl}`).emit('user-screen-share-toggle', {
        userId: socket.userId,
        isScreenSharing: data.isScreenSharing
      });
    }
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
    
    // Notify meeting participants if user was in a meeting
    if (socket.meetingUrl) {
      socket.to(`meeting-${socket.meetingUrl}`).emit('user-left', {
        userId: socket.userId,
        socketId: socket.id
      });
    }

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
app.use('/api/agents', require('./routes/agents'));
app.use('/api/meetings', require('./routes/meetings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('SynergySphere - Advanced Team Collaboration Platform API');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

server.listen(port, () => {
  console.log(`🚀 SynergySphere server is running on port: ${port}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

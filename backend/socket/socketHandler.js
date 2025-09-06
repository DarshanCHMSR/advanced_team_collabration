const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const socketHandler = (io) => {
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user exists
      const result = await pool.query(
        'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.userId;
      socket.user = result.rows[0];
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected with socket ${socket.id}`);

    // Join meeting room
    socket.on('join-meeting', async (data) => {
      try {
        const { meetingId, meetingCode } = data;
        
        // Verify meeting exists and user has access
        const meetingResult = await pool.query(
          'SELECT * FROM meetings WHERE id = $1 OR meeting_code = $2',
          [meetingId, meetingCode]
        );

        if (meetingResult.rows.length === 0) {
          socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        const meeting = meetingResult.rows[0];

        // Check if user is a participant
        const participantResult = await pool.query(
          'SELECT * FROM participants WHERE meeting_id = $1 AND (user_id = $2 OR name = $3)',
          [meeting.id, socket.userId, socket.user.name]
        );

        if (participantResult.rows.length === 0) {
          socket.emit('error', { message: 'You are not authorized to join this meeting' });
          return;
        }

        socket.meetingId = meeting.id;
        socket.join(`meeting-${meeting.id}`);

        // Notify others that user joined
        socket.to(`meeting-${meeting.id}`).emit('user-joined', {
          userId: socket.userId,
          name: socket.user.name,
          avatar_url: socket.user.avatar_url,
          socketId: socket.id
        });

        // Send current participants to the new user
        const participantsResult = await pool.query(
          `SELECT p.*, u.avatar_url
           FROM participants p
           LEFT JOIN users u ON p.user_id = u.id
           WHERE p.meeting_id = $1 AND p.is_active = true`,
          [meeting.id]
        );

        socket.emit('meeting-joined', {
          meeting: {
            id: meeting.id,
            title: meeting.title,
            meeting_code: meeting.meeting_code
          },
          participants: participantsResult.rows
        });

        // Send current participants to all users in the meeting
        io.to(`meeting-${meeting.id}`).emit('participants-updated', participantsResult.rows);

      } catch (error) {
        console.error('Join meeting error:', error);
        socket.emit('error', { message: 'Failed to join meeting' });
      }
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
      socket.to(`meeting-${socket.meetingId}`).emit('offer', {
        offer: data.offer,
        from: socket.userId,
        fromName: socket.user.name,
        to: data.to
      });
    });

    socket.on('answer', (data) => {
      socket.to(`meeting-${socket.meetingId}`).emit('answer', {
        answer: data.answer,
        from: socket.userId,
        fromName: socket.user.name,
        to: data.to
      });
    });

    socket.on('ice-candidate', (data) => {
      socket.to(`meeting-${socket.meetingId}`).emit('ice-candidate', {
        candidate: data.candidate,
        from: socket.userId,
        fromName: socket.user.name,
        to: data.to
      });
    });

    // Chat messages
    socket.on('send-message', async (data) => {
      try {
        if (!socket.meetingId) {
          socket.emit('error', { message: 'Not in a meeting' });
          return;
        }

        const { message } = data;

        // Save message to database
        const result = await pool.query(
          'INSERT INTO chat_messages (meeting_id, sender_id, sender_name, message) VALUES ($1, $2, $3, $4) RETURNING *',
          [socket.meetingId, socket.userId, socket.user.name, message]
        );

        const savedMessage = result.rows[0];

        // Broadcast message to all participants
        io.to(`meeting-${socket.meetingId}`).emit('new-message', {
          id: savedMessage.id,
          sender_id: savedMessage.sender_id,
          sender_name: savedMessage.sender_name,
          message: savedMessage.message,
          sent_at: savedMessage.sent_at
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Get chat history
    socket.on('get-chat-history', async () => {
      try {
        if (!socket.meetingId) {
          socket.emit('error', { message: 'Not in a meeting' });
          return;
        }

        const result = await pool.query(
          'SELECT * FROM chat_messages WHERE meeting_id = $1 ORDER BY sent_at ASC',
          [socket.meetingId]
        );

        socket.emit('chat-history', result.rows);
      } catch (error) {
        console.error('Get chat history error:', error);
        socket.emit('error', { message: 'Failed to get chat history' });
      }
    });

    // User actions
    socket.on('toggle-mute', (data) => {
      socket.to(`meeting-${socket.meetingId}`).emit('user-muted', {
        userId: socket.userId,
        name: socket.user.name,
        isMuted: data.isMuted
      });
    });

    socket.on('toggle-video', (data) => {
      socket.to(`meeting-${socket.meetingId}`).emit('user-video-toggled', {
        userId: socket.userId,
        name: socket.user.name,
        isVideoOn: data.isVideoOn
      });
    });

    socket.on('raise-hand', () => {
      socket.to(`meeting-${socket.meetingId}`).emit('hand-raised', {
        userId: socket.userId,
        name: socket.user.name
      });
    });

    socket.on('lower-hand', () => {
      socket.to(`meeting-${socket.meetingId}`).emit('hand-lowered', {
        userId: socket.userId,
        name: socket.user.name
      });
    });

    // Screen sharing
    socket.on('start-screen-share', () => {
      socket.to(`meeting-${socket.meetingId}`).emit('screen-share-started', {
        userId: socket.userId,
        name: socket.user.name
      });
    });

    socket.on('stop-screen-share', () => {
      socket.to(`meeting-${socket.meetingId}`).emit('screen-share-stopped', {
        userId: socket.userId,
        name: socket.user.name
      });
    });

    // Host controls
    socket.on('mute-participant', (data) => {
      socket.to(`meeting-${socket.meetingId}`).emit('participant-muted', {
        targetUserId: data.userId,
        targetName: data.name,
        mutedBy: socket.user.name
      });
    });

    socket.on('remove-participant', async (data) => {
      try {
        // Update participant status in database
        await pool.query(
          'UPDATE participants SET is_active = false, left_at = CURRENT_TIMESTAMP WHERE meeting_id = $1 AND user_id = $2',
          [socket.meetingId, data.userId]
        );

        // Notify the participant to leave
        io.to(`meeting-${socket.meetingId}`).emit('participant-removed', {
          targetUserId: data.userId,
          targetName: data.name,
          removedBy: socket.user.name
        });

        // Update participants list
        const participantsResult = await pool.query(
          `SELECT p.*, u.avatar_url
           FROM participants p
           LEFT JOIN users u ON p.user_id = u.id
           WHERE p.meeting_id = $1 AND p.is_active = true`,
          [socket.meetingId]
        );

        io.to(`meeting-${socket.meetingId}`).emit('participants-updated', participantsResult.rows);

      } catch (error) {
        console.error('Remove participant error:', error);
        socket.emit('error', { message: 'Failed to remove participant' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.name} disconnected`);

      if (socket.meetingId) {
        try {
          // Update participant status
          await pool.query(
            'UPDATE participants SET is_active = false, left_at = CURRENT_TIMESTAMP WHERE meeting_id = $1 AND user_id = $2',
            [socket.meetingId, socket.userId]
          );

          // Notify others that user left
          socket.to(`meeting-${socket.meetingId}`).emit('user-left', {
            userId: socket.userId,
            name: socket.user.name
          });

          // Update participants list
          const participantsResult = await pool.query(
            `SELECT p.*, u.avatar_url
             FROM participants p
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.meeting_id = $1 AND p.is_active = true`,
            [socket.meetingId]
          );

          io.to(`meeting-${socket.meetingId}`).emit('participants-updated', participantsResult.rows);

        } catch (error) {
          console.error('Disconnect error:', error);
        }
      }
    });
  });
};

module.exports = socketHandler;

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Import custom modules
const authService = require('./services/authService');
const chatService = require('./services/chatService');
const webrtcService = require('./services/webrtcService');
const meetingService = require('./services/meetingService');
const privacyService = require('./services/privacyService');
const securityMiddleware = require('./middleware/security');
const { defaultRateLimiter } = require('./middleware/rateLimiter');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS for cross-platform compatibility
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:8080",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Support both for better compatibility
  allowEIO3: true // Support older clients
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for WebRTC compatibility
  crossOriginEmbedderPolicy: false // Allow cross-origin for media
}));

// CORS configuration for cross-platform support
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:8080",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(defaultRateLimiter);

// Serve static files (for frontend)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/webrtc', require('./routes/webrtc'));
app.use('/api/meeting', require('./routes/meeting'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    platform: 'cross-platform-compatible'
  });
});

// Anonymous ID generation endpoint
app.post('/api/generate-anon-id', (req, res) => {
  const anonId = authService.generateAnonId();
  const tempToken = authService.generateTempToken(anonId);
  
  res.json({
    anonId,
    tempToken,
    expiresIn: '1h'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);
  
  // Handle anonymous authentication
  socket.on('auth', async (data) => {
    try {
      const { tempToken } = data;
      const decoded = authService.verifyTempToken(tempToken);
      
      if (decoded) {
        socket.anonId = decoded.anonId;
        socket.authenticated = true;
        socket.emit('auth_success', { anonId: decoded.anonId });
        console.log(`User authenticated: ${decoded.anonId}`);
      } else {
        socket.emit('auth_error', { message: 'Invalid token' });
      }
    } catch (error) {
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
  });

  // Handle anonymous messages
  socket.on('anon_msg', async (data) => {
    if (!socket.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const message = await chatService.processMessage(data, socket.anonId);
      
      // Broadcast to room
      if (data.room) {
        socket.to(data.room).emit('msg', message);
      } else {
        socket.broadcast.emit('msg', message);
      }
      
      // Send confirmation to sender
      socket.emit('msg_sent', { messageId: message.id });
      
    } catch (error) {
      socket.emit('error', { message: 'Message processing failed' });
    }
  });

  // Handle room joining
  socket.on('join_room', (data) => {
    if (!socket.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { room } = data;
    socket.join(room);
    socket.currentRoom = room;
    
    // Notify others in room
    socket.to(room).emit('user_joined', {
      anonId: socket.anonId,
      timestamp: Date.now()
    });
    
    socket.emit('room_joined', { room });
    console.log(`${socket.anonId} joined room: ${room}`);
  });

  // Handle room leaving
  socket.on('leave_room', (data) => {
    const { room } = data;
    socket.leave(room);
    
    // Notify others in room
    socket.to(room).emit('user_left', {
      anonId: socket.anonId,
      timestamp: Date.now()
    });
    
    socket.emit('room_left', { room });
  });

  // Handle WebRTC signaling for video calls
  socket.on('join_video_room', (data) => {
    if (!socket.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { roomId } = data;
    const result = webrtcService.joinRoom(socket.id, socket.anonId, roomId);
    
    if (result.success) {
      socket.join(roomId);
      socket.currentVideoRoom = roomId;
      
      // Notify the user
      socket.emit('joined_video_room', result);
      
      // Notify other participants
      socket.to(roomId).emit('participant_joined', {
        anonId: socket.anonId,
        participantCount: result.participantCount
      });
      
      console.log(`📹 ${socket.anonId} joined video room: ${roomId}`);
    } else {
      socket.emit('video_room_error', result);
    }
  });

  socket.on('leave_video_room', () => {
    const result = webrtcService.leaveRoom(socket.id);
    
    if (result.success && socket.currentVideoRoom) {
      socket.leave(socket.currentVideoRoom);
      
      // Notify other participants
      socket.to(socket.currentVideoRoom).emit('participant_left', {
        participantCount: result.participantCount
      });
      
      socket.currentVideoRoom = null;
      console.log(`📹 ${socket.anonId} left video room: ${result.roomId}`);
    }
  });

  socket.on('webrtc_offer', (data) => {
    const { offer, targetSocketId } = data;
    
    const result = webrtcService.handleOffer(socket.id, offer, targetSocketId);
    
    if (result.success && result.targetSocketId) {
      socket.to(result.targetSocketId).emit('webrtc_offer', {
        offer: result.offer,
        fromAnonId: result.fromAnonId,
        fromSocketId: result.fromSocketId
      });
    } else {
      // Fallback to original behavior
      socket.to(data.target).emit('webrtc_offer', {
        offer: data.offer,
        from: socket.id
      });
    }
  });

  socket.on('webrtc_answer', (data) => {
    const { answer, targetSocketId } = data;
    
    const result = webrtcService.handleAnswer(socket.id, answer, targetSocketId);
    
    if (result.success && result.targetSocketId) {
      socket.to(result.targetSocketId).emit('webrtc_answer', {
        answer: result.answer,
        fromAnonId: result.fromAnonId,
        fromSocketId: result.fromSocketId
      });
    } else {
      // Fallback to original behavior
      socket.to(data.target).emit('webrtc_answer', {
        answer: data.answer,
        from: socket.id
      });
    }
  });

  socket.on('webrtc_ice_candidate', (data) => {
    const { candidate, targetSocketId } = data;
    
    const result = webrtcService.handleIceCandidate(socket.id, candidate, targetSocketId);
    
    if (result.success && result.targetSocketId) {
      socket.to(result.targetSocketId).emit('webrtc_ice_candidate', {
        candidate: result.candidate,
        fromAnonId: result.fromAnonId,
        fromSocketId: result.fromSocketId
      });
    } else {
      // Fallback to original behavior
      socket.to(data.target).emit('webrtc_ice_candidate', {
        candidate: data.candidate,
        from: socket.id
      });
    }
  });

  // Meeting events
  socket.on('join_meeting', (data) => {
    if (!socket.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { meetingId, passcode } = data;
    const result = meetingService.joinMeeting(socket.id, socket.anonId, meetingId, passcode);
    
    if (result.success) {
      socket.join(meetingId);
      socket.currentMeeting = meetingId;
      
      // Notify the user
      socket.emit('joined_meeting', result);
      
      // Notify other participants
      socket.to(meetingId).emit('meeting_participant_joined', {
        anonId: socket.anonId,
        participantCount: result.meeting.metadata.participantCount,
        role: result.participantRole
      });
      
      console.log(`📅 ${socket.anonId} joined meeting: ${meetingId}`);
    } else {
      socket.emit('meeting_error', result);
    }
  });

  socket.on('leave_meeting', () => {
    if (!socket.currentMeeting) return;
    
    const result = meetingService.leaveMeeting(socket.id);
    
    if (result.success) {
      socket.leave(socket.currentMeeting);
      
      // Notify other participants
      socket.to(socket.currentMeeting).emit('meeting_participant_left', {
        anonId: socket.anonId,
        participantCount: result.participantCount
      });
      
      socket.currentMeeting = null;
      console.log(`📅 ${socket.anonId} left meeting: ${result.meetingId}`);
    }
  });

  socket.on('meeting_message', (data) => {
    if (!socket.authenticated || !socket.currentMeeting) {
      socket.emit('error', { message: 'Not in a meeting or not authenticated' });
      return;
    }

    const { message } = data;
    const result = meetingService.handleMeetingMessage(socket.id, message);
    
    if (result.success) {
      // Broadcast message to all meeting participants
      io.to(result.meetingId).emit('meeting_message', result.message);
    } else {
      socket.emit('meeting_error', result);
    }
  });

  socket.on('update_meeting', (data) => {
    if (!socket.authenticated || !socket.currentMeeting) {
      socket.emit('error', { message: 'Not in a meeting or not authenticated' });
      return;
    }

    const result = meetingService.updateMeeting(socket.id, socket.currentMeeting, data);
    
    if (result.success) {
      // Notify all participants of the update
      io.to(socket.currentMeeting).emit('meeting_updated', result.meeting);
    } else {
      socket.emit('meeting_error', result);
    }
  });

  socket.on('end_meeting', () => {
    if (!socket.authenticated || !socket.currentMeeting) {
      socket.emit('error', { message: 'Not in a meeting or not authenticated' });
      return;
    }

    const result = meetingService.endMeeting(socket.id, socket.currentMeeting);
    
    if (result.success) {
      // Notify all participants that meeting has ended
      io.to(result.meetingId).emit('meeting_ended', {
        meetingId: result.meetingId,
        endedBy: socket.anonId
      });
      
      // Remove all participants from the room
      result.participantIds.forEach(participantId => {
        const participantSocket = io.sockets.sockets.get(participantId);
        if (participantSocket) {
          participantSocket.leave(result.meetingId);
          participantSocket.currentMeeting = null;
        }
      });
    } else {
      socket.emit('meeting_error', result);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('user_left', {
        anonId: socket.anonId,
        timestamp: Date.now()
      });
    }

    // Clean up video room participation
    if (socket.currentVideoRoom) {
      const result = webrtcService.leaveRoom(socket.id);
      if (result.success) {
        socket.to(socket.currentVideoRoom).emit('participant_left', {
          participantCount: result.participantCount
        });
      }
    }

    // Clean up meeting participation
    if (socket.currentMeeting) {
      const result = meetingService.leaveMeeting(socket.id);
      if (result.success) {
        socket.to(socket.currentMeeting).emit('meeting_participant_left', {
          anonId: socket.anonId,
          participantCount: result.participantCount
        });
      }
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    service: 'GhostLink Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    connections: {
      websocket: io.engine.clientsCount || 0
    }
  };
  
  res.status(200).json(healthCheck);
});

// Metrics endpoint for Prometheus
app.get('/api/metrics', (req, res) => {
  const metrics = {
    // System metrics
    uptime_seconds: process.uptime(),
    memory_usage_bytes: process.memoryUsage().heapUsed,
    memory_total_bytes: process.memoryUsage().heapTotal,
    
    // Application metrics
    websocket_connections: io.engine.clientsCount || 0,
    active_rooms: chatService.getActiveRoomsCount ? chatService.getActiveRoomsCount() : 0,
    active_meetings: meetingService.getActiveMeetingsCount ? meetingService.getActiveMeetingsCount() : 0,
    
    // Privacy metrics (anonymized)
    total_messages_processed: chatService.getTotalMessagesCount ? chatService.getTotalMessagesCount() : 0,
    data_retention_cleanups: privacyService.getCleanupCount ? privacyService.getCleanupCount() : 0,
    
    timestamp: Date.now()
  };
  
  // Convert to Prometheus format
  let prometheusMetrics = '';
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'number') {
      prometheusMetrics += `ghostlink_${key} ${value}\n`;
    }
  }
  
  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// Status endpoint for load balancer
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'GhostLink Backend',
    timestamp: Date.now()
  });
});
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../public/index.html'));
// });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GhostLink Backend running on port ${PORT}`);
  console.log(`📱 Cross-platform compatible server ready`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});

module.exports = { app, server, io };

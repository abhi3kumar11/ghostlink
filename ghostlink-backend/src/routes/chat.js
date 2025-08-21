const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const authService = require('../services/authService');
const { createRateLimiter } = require('../middleware/rateLimiter');
const SecurityMiddleware = require('../middleware/security');

// Apply security middleware
router.use(SecurityMiddleware.secureHeaders);
router.use(SecurityMiddleware.sanitizeRequest);
router.use(SecurityMiddleware.fingerprintRequest);
router.use(SecurityMiddleware.validateAnonId);

/**
 * Create burner chat room
 * POST /api/chat/create-room
 */
router.post('/create-room',
  createRateLimiter('roomCreation'),
  (req, res) => {
    try {
      const { anonId } = req.body;
      
      if (!anonId) {
        return res.status(400).json({
          error: 'Anonymous ID required',
          message: 'Please provide a valid anonymous ID'
        });
      }
      
      const room = chatService.createBurnerRoom(anonId);
      
      res.json({
        success: true,
        room: {
          id: room.roomId,
          passcode: room.passcode,
          expiresIn: room.expiresIn,
          creator: anonId
        },
        message: 'Burner room created successfully'
      });
      
      console.log(`Burner room created: ${room.roomId} by ${anonId}`);
    } catch (error) {
      console.error('Room creation error:', error);
      res.status(500).json({
        error: 'Failed to create room',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Join burner chat room
 * POST /api/chat/join-room
 */
router.post('/join-room',
  createRateLimiter('api'),
  (req, res) => {
    try {
      const { roomId, passcode, anonId } = req.body;
      
      if (!roomId || !passcode || !anonId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Room ID, passcode, and anonymous ID are required'
        });
      }
      
      const result = chatService.joinBurnerRoom(roomId, passcode, anonId);
      
      res.json({
        success: true,
        room: {
          id: roomId,
          participantCount: result.participantCount
        },
        message: 'Successfully joined room'
      });
      
      console.log(`${anonId} joined room: ${roomId}`);
    } catch (error) {
      console.error('Room join error:', error);
      res.status(400).json({
        error: 'Failed to join room',
        message: error.message
      });
    }
  }
);

/**
 * Leave burner chat room
 * POST /api/chat/leave-room
 */
router.post('/leave-room',
  createRateLimiter('api'),
  (req, res) => {
    try {
      const { roomId, anonId } = req.body;
      
      if (!roomId || !anonId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Room ID and anonymous ID are required'
        });
      }
      
      chatService.leaveBurnerRoom(roomId, anonId);
      
      res.json({
        success: true,
        message: 'Successfully left room'
      });
      
      console.log(`${anonId} left room: ${roomId}`);
    } catch (error) {
      console.error('Room leave error:', error);
      res.status(500).json({
        error: 'Failed to leave room',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Get room information
 * GET /api/chat/room/:roomId
 */
router.get('/room/:roomId',
  createRateLimiter('api'),
  (req, res) => {
    try {
      const { roomId } = req.params;
      
      if (!roomId) {
        return res.status(400).json({
          error: 'Room ID required',
          message: 'Please provide a valid room ID'
        });
      }
      
      const roomInfo = chatService.getRoomInfo(roomId);
      
      if (!roomInfo) {
        return res.status(404).json({
          error: 'Room not found',
          message: 'The specified room does not exist or has expired'
        });
      }
      
      res.json({
        success: true,
        room: roomInfo
      });
    } catch (error) {
      console.error('Room info error:', error);
      res.status(500).json({
        error: 'Failed to get room information',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Get recent messages for a room
 * GET /api/chat/room/:roomId/messages
 */
router.get('/room/:roomId/messages',
  createRateLimiter('api'),
  (req, res) => {
    try {
      const { roomId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      
      if (!roomId) {
        return res.status(400).json({
          error: 'Room ID required',
          message: 'Please provide a valid room ID'
        });
      }
      
      if (limit > 100) {
        return res.status(400).json({
          error: 'Limit too high',
          message: 'Maximum 100 messages can be retrieved at once'
        });
      }
      
      const messages = chatService.getRecentMessages(roomId, limit);
      
      res.json({
        success: true,
        messages: messages.map(msg => ({
          id: msg.id,
          anonId: msg.anonId,
          text: msg.text,
          timestamp: msg.timestamp,
          timeRemaining: Math.max(0, msg.expires - Date.now())
        })),
        count: messages.length
      });
    } catch (error) {
      console.error('Messages retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve messages',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Send message to room (HTTP endpoint, mainly for testing)
 * POST /api/chat/send-message
 */
router.post('/send-message',
  createRateLimiter('messages'),
  SecurityMiddleware.validateContentLength(1000),
  async (req, res) => {
    try {
      const { text, room, anonId, type } = req.body;
      
      if (!text || !anonId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Text and anonymous ID are required'
        });
      }
      
      const messageData = { text, room, type };
      const message = await chatService.processMessage(messageData, anonId);
      
      res.json({
        success: true,
        message: {
          id: message.id,
          anonId: message.anonId,
          text: message.text,
          room: message.room,
          timestamp: message.timestamp,
          timeRemaining: Math.max(0, message.expires - Date.now())
        }
      });
      
      console.log(`Message sent by ${anonId} to room: ${room || 'global'}`);
    } catch (error) {
      console.error('Message send error:', error);
      res.status(400).json({
        error: 'Failed to send message',
        message: error.message
      });
    }
  }
);

/**
 * Get chat statistics
 * GET /api/chat/stats
 */
router.get('/stats', (req, res) => {
  try {
    const stats = {
      activeRooms: chatService.getActiveRoomsCount(),
      totalMessages: chatService.getTotalMessagesCount(),
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: 'Please try again later'
    });
  }
});

/**
 * Get chat service status
 * GET /api/chat/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'GhostLink Chat Service',
    version: '1.0.0',
    features: [
      'Ephemeral messaging',
      'Burner chat rooms',
      'Message sanitization',
      'Auto-cleanup',
      'Cross-platform support'
    ],
    timestamp: Date.now()
  });
});

module.exports = router;


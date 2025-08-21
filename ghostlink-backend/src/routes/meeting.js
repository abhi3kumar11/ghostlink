const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { createRateLimiter } = require('../middleware/rateLimiter');
const SecurityMiddleware = require('../middleware/security');

// Apply security middleware
router.use(SecurityMiddleware.secureHeaders);
router.use(SecurityMiddleware.sanitizeRequest);
router.use(SecurityMiddleware.fingerprintRequest);

// In-memory storage for meetings (in production, use Redis or database)
const meetings = new Map();

// Auto-cleanup expired meetings
setInterval(() => {
  const now = Date.now();
  for (const [roomId, meeting] of meetings.entries()) {
    if (meeting.expiresAt <= now) {
      meetings.delete(roomId);
      console.log(`🧹 Cleaned up expired meeting: ${roomId}`);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

/**
 * Create meeting room
 * POST /api/meeting/create
 */
router.post('/create',
  createRateLimiter('roomCreation'),
  (req, res) => {
    try {
      const { anonId, title, duration, maxParticipants } = req.body;
      
      if (!anonId) {
        return res.status(400).json({
          error: 'Anonymous ID required',
          message: 'Please provide a valid anonymous ID'
        });
      }
      
      const roomId = authService.generateMeetingRoomId();
      const passcode = authService.generateRoomPasscode();
      const passcodeHash = authService.hashRoomPasscode(passcode);
      
      const meeting = {
        roomId,
        passcodeHash,
        title: title || 'Anonymous Meeting',
        creator: anonId,
        createdAt: Date.now(),
        expiresAt: Date.now() + ((duration || 60) * 60 * 1000), // Default 1 hour
        maxParticipants: maxParticipants || 10,
        participants: new Set([anonId]),
        status: 'waiting'
      };
      
      meetings.set(roomId, meeting);
      
      res.json({
        success: true,
        meeting: {
          roomId,
          passcode,
          title: meeting.title,
          creator: anonId,
          expiresAt: meeting.expiresAt,
          maxParticipants: meeting.maxParticipants,
          participantCount: 1
        },
        message: 'Meeting room created successfully'
      });
      
      console.log(`Meeting room created: ${roomId} by ${anonId}`);
    } catch (error) {
      console.error('Meeting creation error:', error);
      res.status(500).json({
        error: 'Failed to create meeting',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Join meeting room
 * POST /api/meeting/join
 */
router.post('/join',
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
      
      const meeting = meetings.get(roomId);
      
      if (!meeting) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'The meeting room does not exist or has expired'
        });
      }
      
      if (meeting.expiresAt <= Date.now()) {
        meetings.delete(roomId);
        return res.status(410).json({
          error: 'Meeting expired',
          message: 'This meeting has expired'
        });
      }
      
      if (!authService.verifyRoomPasscode(passcode, meeting.passcodeHash)) {
        return res.status(401).json({
          error: 'Invalid passcode',
          message: 'The provided passcode is incorrect'
        });
      }
      
      if (meeting.participants.size >= meeting.maxParticipants) {
        return res.status(403).json({
          error: 'Meeting full',
          message: 'This meeting has reached its maximum capacity'
        });
      }
      
      meeting.participants.add(anonId);
      
      res.json({
        success: true,
        meeting: {
          roomId,
          title: meeting.title,
          participantCount: meeting.participants.size,
          maxParticipants: meeting.maxParticipants,
          timeRemaining: Math.max(0, meeting.expiresAt - Date.now()),
          status: meeting.status
        },
        message: 'Successfully joined meeting'
      });
      
      console.log(`${anonId} joined meeting: ${roomId}`);
    } catch (error) {
      console.error('Meeting join error:', error);
      res.status(500).json({
        error: 'Failed to join meeting',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Leave meeting room
 * POST /api/meeting/leave
 */
router.post('/leave',
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
      
      const meeting = meetings.get(roomId);
      
      if (meeting) {
        meeting.participants.delete(anonId);
        
        // Delete meeting if empty
        if (meeting.participants.size === 0) {
          meetings.delete(roomId);
        }
      }
      
      res.json({
        success: true,
        message: 'Successfully left meeting'
      });
      
      console.log(`${anonId} left meeting: ${roomId}`);
    } catch (error) {
      console.error('Meeting leave error:', error);
      res.status(500).json({
        error: 'Failed to leave meeting',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Get meeting service status
 * GET /api/meeting/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'GhostLink Meeting Service',
    version: '1.0.0',
    features: [
      'Anonymous meeting rooms',
      'Passcode protection',
      'Participant management',
      'Auto-expiry',
      'WebRTC support'
    ],
    timestamp: Date.now()
  });
});

/**
 * Get meeting statistics
 * GET /api/meeting/stats
 */
router.get('/stats', (req, res) => {
  try {
    const now = Date.now();
    const activeMeetings = Array.from(meetings.values()).filter(m => m.expiresAt > now);
    
    const stats = {
      totalMeetings: meetings.size,
      activeMeetings: activeMeetings.length,
      totalParticipants: activeMeetings.reduce((sum, m) => sum + m.participants.size, 0),
      timestamp: now
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Meeting stats error:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: 'Please try again later'
    });
  }
});

/**
 * Get meeting information
 * GET /api/meeting/:roomId
 */
router.get('/:roomId',
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
      
      const meeting = meetings.get(roomId);
      
      if (!meeting) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'The meeting room does not exist or has expired'
        });
      }
      
      if (meeting.expiresAt <= Date.now()) {
        meetings.delete(roomId);
        return res.status(410).json({
          error: 'Meeting expired',
          message: 'This meeting has expired'
        });
      }
      
      res.json({
        success: true,
        meeting: {
          roomId,
          title: meeting.title,
          participantCount: meeting.participants.size,
          maxParticipants: meeting.maxParticipants,
          createdAt: meeting.createdAt,
          expiresAt: meeting.expiresAt,
          timeRemaining: Math.max(0, meeting.expiresAt - Date.now()),
          status: meeting.status
        }
      });
    } catch (error) {
      console.error('Meeting info error:', error);
      res.status(500).json({
        error: 'Failed to get meeting information',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Update meeting status
 * POST /api/meeting/:roomId/status
 */
router.post('/:roomId/status',
  createRateLimiter('api'),
  (req, res) => {
    try {
      const { roomId } = req.params;
      const { status, anonId } = req.body;
      
      if (!roomId || !status || !anonId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Room ID, status, and anonymous ID are required'
        });
      }
      
      const meeting = meetings.get(roomId);
      
      if (!meeting) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'The meeting room does not exist'
        });
      }
      
      // Only creator can change status
      if (meeting.creator !== anonId) {
        return res.status(403).json({
          error: 'Permission denied',
          message: 'Only the meeting creator can change the status'
        });
      }
      
      const validStatuses = ['waiting', 'active', 'ended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status',
          message: 'Status must be one of: waiting, active, ended'
        });
      }
      
      meeting.status = status;
      
      res.json({
        success: true,
        meeting: {
          roomId,
          status: meeting.status
        },
        message: 'Meeting status updated successfully'
      });
      
      console.log(`Meeting ${roomId} status changed to: ${status}`);
    } catch (error) {
      console.error('Meeting status update error:', error);
      res.status(500).json({
        error: 'Failed to update meeting status',
        message: 'Please try again later'
      });
    }
  }
);

module.exports = router;


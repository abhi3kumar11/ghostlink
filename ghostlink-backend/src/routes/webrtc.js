const express = require('express');
const router = express.Router();
const webrtcService = require('../services/webrtcService');

// Create a new video room
router.post('/create-room', (req, res) => {
  try {
    const { anonId } = req.body;
    
    if (!anonId) {
      return res.status(400).json({
        success: false,
        error: 'Anonymous ID is required'
      });
    }

    const result = webrtcService.createRoom(anonId);
    
    res.json(result);
  } catch (error) {
    console.error('Error creating video room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create video room'
    });
  }
});

// Get room information
router.get('/room/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    
    const result = webrtcService.getRoomInfo(roomId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room information'
    });
  }
});

// Get all active rooms (for debugging)
router.get('/rooms', (req, res) => {
  try {
    const rooms = webrtcService.getAllRooms();
    
    res.json({
      success: true,
      rooms,
      count: rooms.length
    });
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rooms'
    });
  }
});

// Clean up expired rooms
router.post('/cleanup', (req, res) => {
  try {
    webrtcService.cleanupExpiredRooms();
    
    res.json({
      success: true,
      message: 'Cleanup completed'
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup rooms'
    });
  }
});

module.exports = router;


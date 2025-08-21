const { v4: uuidv4 } = require('uuid');

class WebRTCService {
  constructor() {
    this.rooms = new Map(); // roomId -> { participants: Set, offers: Map, answers: Map }
    this.participants = new Map(); // socketId -> { anonId, roomId }
  }

  // Create a new video room
  createRoom(anonId) {
    const roomId = uuidv4().substring(0, 8).toUpperCase();
    
    this.rooms.set(roomId, {
      participants: new Set(),
      offers: new Map(),
      answers: new Map(),
      iceCandidate: new Map(),
      createdBy: anonId,
      createdAt: Date.now(),
      maxParticipants: 2 // For now, limit to 2 participants
    });

    console.log(`📹 Video room created: ${roomId} by ${anonId}`);
    return { roomId, success: true };
  }

  // Join a video room
  joinRoom(socketId, anonId, roomId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.participants.size >= room.maxParticipants) {
      return { success: false, error: 'Room is full' };
    }

    // Add participant to room
    room.participants.add(socketId);
    this.participants.set(socketId, { anonId, roomId });

    console.log(`📹 ${anonId} joined video room: ${roomId}`);
    
    return { 
      success: true, 
      roomId,
      participantCount: room.participants.size,
      participants: Array.from(room.participants).map(id => {
        const participant = this.participants.get(id);
        return participant ? participant.anonId : 'Unknown';
      })
    };
  }

  // Leave a video room
  leaveRoom(socketId) {
    const participant = this.participants.get(socketId);
    
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    const { anonId, roomId } = participant;
    const room = this.rooms.get(roomId);

    if (room) {
      room.participants.delete(socketId);
      room.offers.delete(socketId);
      room.answers.delete(socketId);
      room.iceCandidate.delete(socketId);

      console.log(`📹 ${anonId} left video room: ${roomId}`);

      // Clean up empty rooms
      if (room.participants.size === 0) {
        this.rooms.delete(roomId);
        console.log(`📹 Video room deleted: ${roomId}`);
      }
    }

    this.participants.delete(socketId);
    
    return { 
      success: true, 
      roomId,
      participantCount: room ? room.participants.size : 0
    };
  }

  // Handle WebRTC offer
  handleOffer(socketId, offer, targetSocketId = null) {
    const participant = this.participants.get(socketId);
    
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    const { anonId, roomId } = participant;
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.offers.set(socketId, offer);

    console.log(`📹 WebRTC offer from ${anonId} in room ${roomId}`);

    return {
      success: true,
      roomId,
      offer,
      fromAnonId: anonId,
      fromSocketId: socketId,
      targetSocketId: targetSocketId || this.getOtherParticipant(socketId, room)
    };
  }

  // Handle WebRTC answer
  handleAnswer(socketId, answer, targetSocketId = null) {
    const participant = this.participants.get(socketId);
    
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    const { anonId, roomId } = participant;
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    room.answers.set(socketId, answer);

    console.log(`📹 WebRTC answer from ${anonId} in room ${roomId}`);

    return {
      success: true,
      roomId,
      answer,
      fromAnonId: anonId,
      fromSocketId: socketId,
      targetSocketId: targetSocketId || this.getOtherParticipant(socketId, room)
    };
  }

  // Handle ICE candidate
  handleIceCandidate(socketId, candidate, targetSocketId = null) {
    const participant = this.participants.get(socketId);
    
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    const { anonId, roomId } = participant;
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!room.iceCandidate.has(socketId)) {
      room.iceCandidate.set(socketId, []);
    }
    room.iceCandidate.get(socketId).push(candidate);

    console.log(`📹 ICE candidate from ${anonId} in room ${roomId}`);

    return {
      success: true,
      roomId,
      candidate,
      fromAnonId: anonId,
      fromSocketId: socketId,
      targetSocketId: targetSocketId || this.getOtherParticipant(socketId, room)
    };
  }

  // Get the other participant in a room (for 1-on-1 calls)
  getOtherParticipant(socketId, room) {
    const participants = Array.from(room.participants);
    return participants.find(id => id !== socketId) || null;
  }

  // Get room info
  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    return {
      success: true,
      roomId,
      participantCount: room.participants.size,
      maxParticipants: room.maxParticipants,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
      participants: Array.from(room.participants).map(id => {
        const participant = this.participants.get(id);
        return participant ? participant.anonId : 'Unknown';
      })
    };
  }

  // Get all active rooms (for debugging)
  getAllRooms() {
    const rooms = [];
    
    for (const [roomId, room] of this.rooms) {
      rooms.push({
        roomId,
        participantCount: room.participants.size,
        maxParticipants: room.maxParticipants,
        createdBy: room.createdBy,
        createdAt: room.createdAt
      });
    }

    return rooms;
  }

  // Clean up expired rooms (rooms older than 4 hours)
  cleanupExpiredRooms() {
    const now = Date.now();
    const maxAge = 4 * 60 * 60 * 1000; // 4 hours

    for (const [roomId, room] of this.rooms) {
      if (now - room.createdAt > maxAge) {
        this.rooms.delete(roomId);
        console.log(`📹 Expired video room deleted: ${roomId}`);
      }
    }
  }
}

module.exports = new WebRTCService();


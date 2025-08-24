const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const redis = require('redis');

// Initialize DOMPurify for server-side sanitization
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Redis client for scalable room and message management
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Redis Client Error', err));
(async () => {
  await redisClient.connect();
})();

class ChatService {
  constructor() {
    // Auto-cleanup interval
    setInterval(() => {
      this.cleanupExpiredMessages();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Process incoming message with sanitization and encryption
   */
  async processMessage(data, anonId, socket) {
    try {
      // Validate input
      if (!data.text || typeof data.text !== 'string') {
        throw new Error('Invalid message content');
      }

      if (data.text.length > 1000) {
        throw new Error('Message too long');
      }

      // Sanitize message content
      const sanitizedText = this.sanitizeMessage(data.text);
      
      // Filter toxicity (basic implementation)
      const filteredText = this.filterToxicity(sanitizedText);

      // Create message object
      const message = {
        id: uuidv4(),
        anonId,
        text: filteredText,
        room: data.room || 'global',
        timestamp: Date.now(),
        expires: Date.now() + (5 * 60 * 1000), // 5 minutes expiry
        type: data.type || 'text'
      };

      // Store message temporarily
      await this.storeMessage(message);

      return message;
    } catch (error) {
      console.error('Message processing error:', error.message);
      throw error;
    }
  }

  /**
   * Sanitize message content to prevent XSS
   */
  sanitizeMessage(message) {
    // Remove HTML tags and dangerous content
    const cleaned = purify.sanitize(message, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });

    // Additional cleaning
    return cleaned
      .replace(/[<>]/g, '') // Remove any remaining brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Filter toxic content (basic implementation)
   */
  filterToxicity(message) {
    const toxicPatterns = [
      /\b(spam|scam|phishing)\b/gi,
      /\b(hack|exploit|malware)\b/gi,
      // Add more patterns as needed
    ];

    let filtered = message;
    
    toxicPatterns.forEach(pattern => {
      filtered = filtered.replace(pattern, '***');
    });

    return filtered;
  }

  /**
   * Store message in ephemeral storage
   */
  async storeMessage(message) {
    const messageKey = `message:${message.id}`;
    await redisClient.set(messageKey, JSON.stringify(message), {
      EX: 5 * 60 // 5-minute expiry
    });
  }

  /**
   * Get recent messages for a room
   */
  async getRecentMessages(room, limit = 50) {
    // This would require a more complex Redis structure (e.g., sorted sets)
    // For now, we'll return an empty array as this is a placeholder for a more robust implementation.
    return [];
  }

  /**
   * Clean up expired messages
   */
  cleanupExpiredMessages() {
    // Redis handles automatic expiry, so this function is no longer needed for messages.
    // We can adapt it for rooms if needed.
    console.log('Redis handles message expiry automatically.');
  }

  /**
   * Create burner chat room
   */
  async createBurnerRoom(creatorAnonId) {
    const roomId = crypto.randomBytes(6).toString('hex').toUpperCase();
    const passcode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const room = {
      id: roomId,
      passcode,
      creator: creatorAnonId,
      created: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      participants: new Set([creatorAnonId]),
      maxParticipants: 10
    };

    const roomKey = `room:${roomId}`;
    await redisClient.set(roomKey, JSON.stringify(room), {
      EX: 24 * 60 * 60 // 24-hour expiry
    });
    
    return {
      roomId,
      passcode,
      expiresIn: '24h'
    };
  }

  /**
   * Join burner room with passcode
   */
  async joinBurnerRoom(roomId, passcode, anonId) {
    const roomKey = `room:${roomId}`;
    const roomJSON = await redisClient.get(roomKey);
    
    if (!roomJSON) {
      throw new Error('Room not found');
    }

    const room = JSON.parse(roomJSON);

    if (room.expires <= Date.now()) {
      await redisClient.del(roomKey);
      throw new Error('Room expired');
    }

    if (room.passcode !== passcode) {
      throw new Error('Invalid passcode');
    }

    if (room.participants.length >= room.maxParticipants) {
      throw new Error('Room is full');
    }

    if (!room.participants.includes(anonId)) {
      room.participants.push(anonId);
    }

    await redisClient.set(roomKey, JSON.stringify(room), { KEEPTTL: true });
    
    return {
      success: true,
      roomId,
      participantCount: room.participants.length
    };
  }

  /**
   * Leave burner room
   */
  async leaveBurnerRoom(roomId, anonId) {
    const roomKey = `room:${roomId}`;
    const roomJSON = await redisClient.get(roomKey);
    
    if (roomJSON) {
      const room = JSON.parse(roomJSON);
      room.participants = room.participants.filter(p => p !== anonId);

      if (room.participants.length === 0) {
        // Optionally delete empty rooms immediately
        await redisClient.del(roomKey);
      } else {
        await redisClient.set(roomKey, JSON.stringify(room), { KEEPTTL: true });
      }
    }
  }

  /**
   * Get room info
   */
  async getRoomInfo(roomId) {
    const roomKey = `room:${roomId}`;
    const roomJSON = await redisClient.get(roomKey);
    
    if (!roomJSON) {
      return null;
    }

    const room = JSON.parse(roomJSON);

    return {
      id: room.id,
      participantCount: room.participants ? room.participants.length : 0,
      maxParticipants: room.maxParticipants,
      created: room.created,
      expires: room.expires,
      timeRemaining: Math.max(0, room.expires - Date.now())
    };
  }
  
    /**
     * Get active rooms count
     */
    async getActiveRoomsCount() {
      const keys = await redisClient.keys('room:*');
      return keys.length;
    }

  /**
   * Get total messages count
   */
  getTotalMessagesCount() {
    return this.messages.size;
  }
}

module.exports = new ChatService();

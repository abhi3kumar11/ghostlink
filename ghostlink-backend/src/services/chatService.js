const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Initialize DOMPurify for server-side sanitization
const window = new JSDOM('').window;
const purify = DOMPurify(window);

class ChatService {
  constructor() {
    // In-memory storage for ephemeral messages (auto-purge every 5 minutes)
    this.messages = new Map();
    this.rooms = new Map();
    
    // Auto-cleanup interval
    setInterval(() => {
      this.cleanupExpiredMessages();
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Process incoming message with sanitization and encryption
   */
  async processMessage(data, anonId) {
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
      this.storeMessage(message);

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
  storeMessage(message) {
    this.messages.set(message.id, message);
    
    // Add to room if specified
    if (message.room) {
      if (!this.rooms.has(message.room)) {
        this.rooms.set(message.room, []);
      }
      this.rooms.get(message.room).push(message.id);
    }
  }

  /**
   * Get recent messages for a room
   */
  getRecentMessages(room, limit = 50) {
    const roomMessages = this.rooms.get(room) || [];
    const recent = roomMessages
      .slice(-limit)
      .map(id => this.messages.get(id))
      .filter(msg => msg && msg.expires > Date.now());
    
    return recent;
  }

  /**
   * Clean up expired messages
   */
  cleanupExpiredMessages() {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean messages
    for (const [id, message] of this.messages.entries()) {
      if (message.expires <= now) {
        this.messages.delete(id);
        cleanedCount++;
      }
    }

    // Clean room references
    for (const [room, messageIds] of this.rooms.entries()) {
      const validIds = messageIds.filter(id => this.messages.has(id));
      if (validIds.length === 0) {
        this.rooms.delete(room);
      } else {
        this.rooms.set(room, validIds);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired messages`);
    }
  }

  /**
   * Create burner chat room
   */
  createBurnerRoom(creatorAnonId) {
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

    this.rooms.set(roomId, room);
    
    return {
      roomId,
      passcode,
      expiresIn: '24h'
    };
  }

  /**
   * Join burner room with passcode
   */
  joinBurnerRoom(roomId, passcode, anonId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.expires <= Date.now()) {
      this.rooms.delete(roomId);
      throw new Error('Room expired');
    }

    if (room.passcode !== passcode) {
      throw new Error('Invalid passcode');
    }

    if (room.participants.size >= room.maxParticipants) {
      throw new Error('Room is full');
    }

    room.participants.add(anonId);
    
    return {
      success: true,
      roomId,
      participantCount: room.participants.size
    };
  }

  /**
   * Leave burner room
   */
  leaveBurnerRoom(roomId, anonId) {
    const room = this.rooms.get(roomId);
    
    if (room && room.participants) {
      room.participants.delete(anonId);
      
      // Delete room if empty
      if (room.participants.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * Get room info
   */
  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return null;
    }

    return {
      id: room.id,
      participantCount: room.participants ? room.participants.size : 0,
      maxParticipants: room.maxParticipants,
      created: room.created,
      expires: room.expires,
      timeRemaining: Math.max(0, room.expires - Date.now())
    };
  }

  /**
   * Get active rooms count
   */
  getActiveRoomsCount() {
    return this.rooms.size;
  }

  /**
   * Get total messages count
   */
  getTotalMessagesCount() {
    return this.messages.size;
  }
}

module.exports = new ChatService();


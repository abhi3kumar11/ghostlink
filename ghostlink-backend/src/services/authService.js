const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'ghostlink-super-secret-key-change-in-production';

if (JWT_SECRET === 'ghostlink-super-secret-key-change-in-production' && process.env.NODE_ENV === 'production') {
  console.error('FATAL ERROR: JWT_SECRET is not set. Please set a secure secret in your .env file.');
  process.exit(1);
}

class AuthService {
  /**
   * Generate anonymous ID with animal names for user-friendly display
   */
  generateAnonId() {
    const animals = [
      'Badger', 'Fox', 'Wolf', 'Bear', 'Eagle', 'Hawk', 'Lion', 'Tiger',
      'Panther', 'Jaguar', 'Leopard', 'Cheetah', 'Falcon', 'Raven', 'Owl',
      'Shark', 'Whale', 'Dolphin', 'Octopus', 'Phoenix', 'Dragon', 'Griffin',
      'Viper', 'Cobra', 'Python', 'Mongoose', 'Lynx', 'Puma', 'Cougar'
    ];
    
    const adjectives = [
      'Silent', 'Swift', 'Stealth', 'Shadow', 'Mystic', 'Phantom', 'Ghost',
      'Cyber', 'Digital', 'Quantum', 'Neon', 'Electric', 'Cosmic', 'Stellar',
      'Lunar', 'Solar', 'Arctic', 'Desert', 'Forest', 'Ocean', 'Storm',
      'Thunder', 'Lightning', 'Frost', 'Fire', 'Ice', 'Wind', 'Earth'
    ];
    
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${adjective}${animal}${number}`;
  }

  /**
   * Generate temporary JWT token for anonymous user
   */
  generateTempToken(anonId) {
    const payload = {
      anonId,
      type: 'anonymous',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
    };
    
    return jwt.sign(payload, JWT_SECRET);
  }

  /**
   * Verify temporary token
   */
  verifyTempToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Generate session ID for tracking (without storing personal data)
   */
  generateSessionId() {
    return uuidv4();
  }

  /**
   * Hash IP address for privacy (triple-hashed with salt and pepper)
   */
  hashIP(ip) {
    const salt = crypto.randomBytes(16).toString('hex');
    const pepper = 'ghostlink-pepper-secret'; // In production, use env variable
    
    // Triple hash for extra security
    let hash = crypto.createHash('sha256').update(ip + salt).digest('hex');
    hash = crypto.createHash('sha256').update(hash + pepper).digest('hex');
    hash = crypto.createHash('sha256').update(hash + salt).digest('hex');
    
    return hash;
  }

  /**
   * Generate room passcode hash
   */
  generateRoomPasscode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Hash room passcode for storage
   */
  hashRoomPasscode(passcode) {
    return crypto.createHash('sha256').update(passcode).digest('hex');
  }

  /**
   * Verify room passcode
   */
  verifyRoomPasscode(passcode, hash) {
    const inputHash = crypto.createHash('sha256').update(passcode).digest('hex');
    return inputHash === hash;
  }

  /**
   * Generate ephemeral encryption key for messages
   */
  generateEphemeralKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt message content
   */
  encryptMessage(message, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt message content
   */
  decryptMessage(encryptedData, key) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error.message);
      return null;
    }
  }

  /**
   * Validate anonymous ID format
   */
  validateAnonId(anonId) {
    // Check if it matches the expected pattern
    const pattern = /^[A-Za-z]+[A-Za-z]+\d{1,3}$/;
    return pattern.test(anonId) && anonId.length >= 5 && anonId.length <= 30;
  }

  /**
   * Generate meeting room ID
   */
  generateMeetingRoomId() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }
}

module.exports = new AuthService();

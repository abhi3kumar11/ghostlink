const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('redis');

// Redis client for distributed rate limiting (optional)
let redisClient;
try {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
  });
} catch (error) {
  console.log('Redis not available, using memory-based rate limiting');
}

// Rate limiters for different operations
const rateLimiters = {
  // General API requests
  api: new RateLimiterMemory({
    keyGenerator: (req) => req.fingerprint || req.ip,
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if exceeded
  }),

  // Message sending
  messages: new RateLimiterMemory({
    keyGenerator: (req) => req.fingerprint || req.ip,
    points: 30, // 30 messages
    duration: 60, // Per minute
    blockDuration: 120, // Block for 2 minutes
  }),

  // Anonymous ID generation
  anonId: new RateLimiterMemory({
    keyGenerator: (req) => req.fingerprint || req.ip,
    points: 5, // 5 anonymous IDs
    duration: 300, // Per 5 minutes
    blockDuration: 300, // Block for 5 minutes
  }),

  // Room creation
  roomCreation: new RateLimiterMemory({
    keyGenerator: (req) => req.fingerprint || req.ip,
    points: 3, // 3 rooms
    duration: 3600, // Per hour
    blockDuration: 1800, // Block for 30 minutes
  }),

  // WebRTC signaling
  webrtc: new RateLimiterMemory({
    keyGenerator: (req) => req.fingerprint || req.ip,
    points: 200, // 200 signaling messages
    duration: 60, // Per minute
    blockDuration: 60, // Block for 1 minute
  }),

  // Authentication attempts
  auth: new RateLimiterMemory({
    keyGenerator: (req) => req.fingerprint || req.ip,
    points: 10, // 10 auth attempts
    duration: 300, // Per 5 minutes
    blockDuration: 900, // Block for 15 minutes
  })
};

/**
 * Create rate limiting middleware for specific operation
 */
function createRateLimiter(type = 'api') {
  const limiter = rateLimiters[type];
  
  if (!limiter) {
    throw new Error(`Unknown rate limiter type: ${type}`);
  }

  return async (req, res, next) => {
    try {
      await limiter.consume(req);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      res.set('Retry-After', String(secs));
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${secs} seconds.`,
        retryAfter: secs,
        type: type
      });
    }
  };
}

/**
 * Socket.IO rate limiting
 */
function createSocketRateLimiter(type = 'messages') {
  const limiter = rateLimiters[type];
  
  return async (socket, data, next) => {
    try {
      const key = socket.fingerprint || socket.handshake.address;
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      socket.emit('rate_limit_exceeded', {
        error: 'Rate limit exceeded',
        type: type,
        retryAfter: secs
      });
      
      // Don't call next() to block the request
    }
  };
}

/**
 * Adaptive rate limiting based on server load
 */
class AdaptiveRateLimiter {
  constructor() {
    this.basePoints = 100;
    this.currentMultiplier = 1.0;
    this.lastCheck = Date.now();
    
    // Check server load every 30 seconds
    setInterval(() => {
      this.adjustLimits();
    }, 30000);
  }

  adjustLimits() {
    const now = Date.now();
    const timeDiff = now - this.lastCheck;
    
    // Simple load detection based on memory usage
    const memUsage = process.memoryUsage();
    const memPercent = memUsage.heapUsed / memUsage.heapTotal;
    
    if (memPercent > 0.8) {
      // High load - reduce limits
      this.currentMultiplier = Math.max(0.5, this.currentMultiplier - 0.1);
    } else if (memPercent < 0.5) {
      // Low load - increase limits
      this.currentMultiplier = Math.min(2.0, this.currentMultiplier + 0.1);
    }
    
    this.lastCheck = now;
    
    // Update rate limiters
    Object.keys(rateLimiters).forEach(key => {
      const limiter = rateLimiters[key];
      if (limiter.points) {
        limiter.points = Math.floor(this.basePoints * this.currentMultiplier);
      }
    });
  }

  getCurrentMultiplier() {
    return this.currentMultiplier;
  }
}

const adaptiveLimiter = new AdaptiveRateLimiter();

/**
 * Default rate limiter middleware
 */
const defaultRateLimiter = createRateLimiter('api');

/**
 * Get rate limit status for a key
 */
async function getRateLimitStatus(type, key) {
  const limiter = rateLimiters[type];
  if (!limiter) return null;
  
  try {
    const res = await limiter.get(key);
    return {
      points: limiter.points,
      remaining: res ? limiter.points - res.hitCount : limiter.points,
      resetTime: res ? new Date(Date.now() + res.msBeforeNext) : null
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  defaultRateLimiter,
  createRateLimiter,
  createSocketRateLimiter,
  getRateLimitStatus,
  adaptiveLimiter,
  rateLimiters
};


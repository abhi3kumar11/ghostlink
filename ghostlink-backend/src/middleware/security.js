const crypto = require('crypto');
const authService = require('../services/authService');
const privacyService = require('../services/privacyService');

/**
 * Enhanced Security middleware for GhostLink
 */
class SecurityMiddleware {
  /**
   * Enhanced IP hashing middleware for privacy
   */
  static hashIP(req, res, next) {
    if (req.ip) {
      req.hashedIP = privacyService.anonymizeIP(req.ip);
      req.originalIP = req.ip; // Keep for rate limiting, but don't log
    }
    next();
  }

  /**
   * Enhanced request sanitization middleware
   */
  static sanitizeRequest(req, res, next) {
    try {
      // Sanitize query parameters
      if (req.query) {
        for (const key in req.query) {
          if (typeof req.query[key] === 'string') {
            req.query[key] = privacyService.sanitizeText(req.query[key]);
          }
        }
      }

      // Sanitize body parameters
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body);
      }

      // Filter sensitive content
      if (req.body && req.body.text) {
        req.body.text = privacyService.filterSensitiveContent(req.body.text);
      }

      next();
    } catch (error) {
      const safeError = privacyService.sanitizeErrorMessage(error);
      res.status(400).json({
        error: 'Request sanitization failed',
        details: safeError.message
      });
    }
  }

  /**
   * Recursively sanitize object properties
   */
  static sanitizeObject(obj) {
    const sanitized = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'string') {
          sanitized[key] = privacyService.sanitizeText(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Enhanced anonymous ID validation middleware
   */
  static validateAnonId(req, res, next) {
    const anonId = req.body.anonId || req.query.anonId || req.headers['x-anon-id'];
    
    if (anonId && !authService.validateAnonId(anonId)) {
      privacyService.createPrivacyLog('invalid_anon_id', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(400).json({
        error: 'Invalid anonymous ID format'
      });
    }
    
    next();
  }

  /**
   * Enhanced content length validation
   */
  static validateContentLength(maxLength = 1000) {
    return (req, res, next) => {
      if (req.body && req.body.text && req.body.text.length > maxLength) {
        privacyService.createPrivacyLog('content_too_long', {
          length: req.body.text.length,
          maxLength,
          ip: req.ip
        });
        
        return res.status(400).json({
          error: `Content too long. Maximum ${maxLength} characters allowed.`
        });
      }
      next();
    };
  }

  /**
   * Enhanced CSRF protection
   */
  static csrfProtection(req, res, next) {
    const token = req.headers['x-csrf-token'] || req.body.csrfToken;
    
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      if (!token) {
        privacyService.createPrivacyLog('csrf_token_missing', {
          method: req.method,
          path: req.path,
          ip: req.ip
        });
        
        return res.status(403).json({
          error: 'CSRF token required'
        });
      }
      
      if (token.length < 16) {
        privacyService.createPrivacyLog('csrf_token_invalid', {
          tokenLength: token.length,
          ip: req.ip
        });
        
        return res.status(403).json({
          error: 'Invalid CSRF token'
        });
      }
    }
    
    next();
  }

  /**
   * Enhanced request fingerprinting for abuse detection
   */
  static fingerprintRequest(req, res, next) {
    const fingerprint = crypto.createHash('sha256')
      .update(privacyService.anonymizeIP(req.ip || 'unknown'))
      .update(privacyService.anonymizeUserAgent(req.headers['user-agent'] || 'unknown'))
      .update(req.headers['accept-language'] || 'unknown')
      .digest('hex');
    
    req.fingerprint = fingerprint;
    req.anonUserAgent = privacyService.anonymizeUserAgent(req.headers['user-agent']);
    next();
  }

  /**
   * Enhanced secure headers middleware
   */
  static secureHeaders(req, res, next) {
    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Add comprehensive security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Content Security Policy for enhanced security
    const self = "'self'";
    const ws = "ws: wss:";
    res.setHeader('Content-Security-Policy', 
      `default-src ${self}; ` +
      `script-src ${self}; ` + // Avoid 'unsafe-inline' and 'unsafe-eval' if possible. Use nonces or hashes.
      `style-src ${self} 'unsafe-inline'; ` + // 'unsafe-inline' is often needed for CSS-in-JS.
      `img-src ${self} data: blob:; ` +
      `media-src ${self} blob:; ` +
      `connect-src ${self} ${ws}; ` +
      `font-src ${self}; ` +
      "object-src 'none'; " +
      `base-uri ${self}; ` +
      `form-action ${self}`
    );
    
    // For WebRTC compatibility
    res.setHeader('Permissions-Policy', 'camera=*, microphone=*, display-capture=*');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Download-Options', 'noopen');
    
    next();
  }

  /**
   * Enhanced anonymous session tracking
   */
  static trackAnonymousSession(req, res, next) {
    if (!req.session) {
      req.session = {};
    }
    
    if (!req.session.anonSessionId) {
      req.session.anonSessionId = privacyService.generateSecureRandom(16);
      req.session.createdAt = Date.now();
      
      privacyService.createPrivacyLog('session_created', {
        sessionId: req.session.anonSessionId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    req.session.lastActivity = Date.now();
    
    // Schedule session cleanup
    privacyService.scheduleDataDeletion('sessions', req.session, (session) => {
      // Session cleanup logic would go here
      console.log(`🗑️ Session expired: ${session.anonSessionId}`);
    });
    
    next();
  }

  /**
   * Rate limiting with privacy protection
   */
  static privacyAwareRateLimit(windowMs = 15 * 60 * 1000, max = 100) {
    const requests = new Map();
    
    return (req, res, next) => {
      const key = req.fingerprint || req.hashedIP || 'unknown';
      const now = Date.now();
      
      // Clean up old entries
      for (const [k, v] of requests.entries()) {
        if (now - v.resetTime > windowMs) {
          requests.delete(k);
        }
      }
      
      const requestData = requests.get(key) || { count: 0, resetTime: now };
      
      if (now - requestData.resetTime > windowMs) {
        requestData.count = 0;
        requestData.resetTime = now;
      }
      
      requestData.count++;
      requests.set(key, requestData);
      
      if (requestData.count > max) {
        privacyService.createPrivacyLog('rate_limit_exceeded', {
          fingerprint: key,
          count: requestData.count,
          max
        });
        
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((windowMs - (now - requestData.resetTime)) / 1000)
        });
      }
      
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requestData.count));
      res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime + windowMs));
      
      next();
    };
  }

  /**
   * Data validation with privacy checks
   */
  static validatePrivacyCompliance(req, res, next) {
    try {
      if (req.body) {
        privacyService.validateDataCollection(req.body, 'anonymous_communication');
      }
      
      next();
    } catch (error) {
      privacyService.createPrivacyLog('privacy_violation', {
        error: error.message,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(400).json({
        error: 'Privacy compliance violation',
        message: 'Request contains data that violates privacy policies'
      });
    }
  }

  /**
   * Audit logging middleware
   */
  static auditLog(req, res, next) {
    const startTime = Date.now();
    
    // Log request
    privacyService.createPrivacyLog('request_received', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: req.session?.anonSessionId
    });
    
    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      privacyService.createPrivacyLog('request_completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        success: res.statusCode < 400,
        sessionId: req.session?.anonSessionId
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  }

  /**
   * Memory cleanup middleware
   */
  static memoryCleanup(req, res, next) {
    // Clean up request data after processing
    res.on('finish', () => {
      // Remove sensitive data from request object
      delete req.originalIP;
      delete req.session;
      
      // Force garbage collection hint
      if (global.gc) {
        global.gc();
      }
    });
    
    next();
  }
}

module.exports = SecurityMiddleware;

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { createRateLimiter } = require('../middleware/rateLimiter');
const SecurityMiddleware = require('../middleware/security');

// Apply security middleware
router.use(SecurityMiddleware.secureHeaders);
router.use(SecurityMiddleware.sanitizeRequest);
router.use(SecurityMiddleware.fingerprintRequest);

/**
 * Generate anonymous ID and temporary token
 * POST /api/auth/generate-anon-id
 */
router.post('/generate-anon-id', 
  createRateLimiter('anonId'),
  (req, res) => {
    try {
      const anonId = authService.generateAnonId();
      const tempToken = authService.generateTempToken(anonId);
      
      res.json({
        success: true,
        anonId,
        tempToken,
        expiresIn: '1h',
        timestamp: Date.now()
      });
      
      console.log(`Generated anonymous ID: ${anonId}`);
    } catch (error) {
      console.error('Error generating anonymous ID:', error);
      res.status(500).json({
        error: 'Failed to generate anonymous ID',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Verify temporary token
 * POST /api/auth/verify-token
 */
router.post('/verify-token',
  createRateLimiter('auth'),
  (req, res) => {
    try {
      const { tempToken } = req.body;
      
      if (!tempToken) {
        return res.status(400).json({
          error: 'Token required',
          message: 'Temporary token is required for verification'
        });
      }
      
      const decoded = authService.verifyTempToken(tempToken);
      
      if (decoded) {
        res.json({
          success: true,
          valid: true,
          anonId: decoded.anonId,
          expiresAt: decoded.exp * 1000,
          timeRemaining: (decoded.exp * 1000) - Date.now()
        });
      } else {
        res.status(401).json({
          success: false,
          valid: false,
          error: 'Invalid or expired token'
        });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(500).json({
        error: 'Token verification failed',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Refresh temporary token
 * POST /api/auth/refresh-token
 */
router.post('/refresh-token',
  createRateLimiter('auth'),
  (req, res) => {
    try {
      const { tempToken } = req.body;
      
      if (!tempToken) {
        return res.status(400).json({
          error: 'Token required',
          message: 'Current token is required for refresh'
        });
      }
      
      const decoded = authService.verifyTempToken(tempToken);
      
      if (decoded) {
        // Check if token is close to expiry (within 10 minutes)
        const timeUntilExpiry = (decoded.exp * 1000) - Date.now();
        
        if (timeUntilExpiry < 10 * 60 * 1000) { // 10 minutes
          const newToken = authService.generateTempToken(decoded.anonId);
          
          res.json({
            success: true,
            tempToken: newToken,
            anonId: decoded.anonId,
            expiresIn: '1h'
          });
        } else {
          res.json({
            success: true,
            message: 'Token still valid, no refresh needed',
            timeRemaining: timeUntilExpiry
          });
        }
      } else {
        res.status(401).json({
          error: 'Invalid or expired token',
          message: 'Please generate a new anonymous ID'
        });
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Token refresh failed',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Generate session ID for tracking (anonymous)
 * POST /api/auth/generate-session
 */
router.post('/generate-session',
  createRateLimiter('auth'),
  (req, res) => {
    try {
      const sessionId = authService.generateSessionId();
      
      res.json({
        success: true,
        sessionId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Session generation error:', error);
      res.status(500).json({
        error: 'Failed to generate session',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Validate anonymous ID format
 * POST /api/auth/validate-anon-id
 */
router.post('/validate-anon-id',
  createRateLimiter('api'),
  (req, res) => {
    try {
      const { anonId } = req.body;
      
      if (!anonId) {
        return res.status(400).json({
          error: 'Anonymous ID required',
          message: 'Please provide an anonymous ID to validate'
        });
      }
      
      const isValid = authService.validateAnonId(anonId);
      
      res.json({
        success: true,
        valid: isValid,
        anonId: isValid ? anonId : null
      });
    } catch (error) {
      console.error('Anonymous ID validation error:', error);
      res.status(500).json({
        error: 'Validation failed',
        message: 'Please try again later'
      });
    }
  }
);

/**
 * Get authentication status
 * GET /api/auth/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'GhostLink Authentication',
    version: '1.0.0',
    features: [
      'Anonymous ID generation',
      'Temporary token authentication',
      'Session management',
      'Cross-platform compatibility'
    ],
    timestamp: Date.now()
  });
});

module.exports = router;


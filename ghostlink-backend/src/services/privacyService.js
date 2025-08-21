const crypto = require('crypto');

class PrivacyService {
  constructor() {
    this.dataRetentionPolicies = {
      messages: 5 * 60 * 1000, // 5 minutes
      meetings: 4 * 60 * 60 * 1000, // 4 hours
      sessions: 24 * 60 * 60 * 1000, // 24 hours
      logs: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    this.anonymizationSalt = process.env.ANON_SALT || crypto.randomBytes(16);
  }

  // Data Encryption
  encryptData(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
      cipher.setAAD(Buffer.from('ghostlink-data'));
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }

  decryptData(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
      
      decipher.setAAD(Buffer.from('ghostlink-data'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  // Data Anonymization
  anonymizeIP(ip) {
    if (!ip) return 'unknown';
    
    // Hash IP with salt for anonymization
    return crypto.createHash('sha256')
      .update(ip + this.anonymizationSalt.toString('hex'))
      .digest('hex')
      .substring(0, 16);
  }

  anonymizeUserAgent(userAgent) {
    if (!userAgent) return 'unknown';
    
    // Extract only browser family and OS, remove specific versions
    const simplified = userAgent
      .replace(/\d+\.\d+\.\d+/g, 'x.x.x') // Remove version numbers
      .replace(/\([^)]*\)/g, '(...)') // Remove detailed system info
      .substring(0, 100); // Limit length
    
    return crypto.createHash('sha256')
      .update(simplified + this.anonymizationSalt.toString('hex'))
      .digest('hex')
      .substring(0, 16);
  }

  // Data Minimization
  minimizeMessageData(message) {
    return {
      id: message.id,
      text: this.sanitizeText(message.text),
      timestamp: message.timestamp,
      anonId: message.anonId
      // Remove any other potentially identifying information
    };
  }

  minimizeMeetingData(meeting) {
    return {
      id: meeting.id,
      title: this.sanitizeText(meeting.title),
      participantCount: meeting.participants ? meeting.participants.size : 0,
      isActive: meeting.isActive,
      createdAt: meeting.createdAt,
      // Remove creator info, participant details, etc.
    };
  }

  // Text Sanitization
  sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove JS protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data URLs
      .replace(/vbscript:/gi, '') // Remove VBScript
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Privacy-Safe Logging
  createPrivacyLog(action, data = {}) {
    const logEntry = {
      timestamp: Date.now(),
      action: action,
      sessionId: data.sessionId ? this.anonymizeSessionId(data.sessionId) : null,
      anonId: data.anonId || null,
      ip: data.ip ? this.anonymizeIP(data.ip) : null,
      userAgent: data.userAgent ? this.anonymizeUserAgent(data.userAgent) : null,
      // Only log essential, non-identifying information
      metadata: {
        success: data.success || false,
        errorType: data.errorType || null,
        duration: data.duration || null
      }
    };

    console.log(`🔒 Privacy Log: ${JSON.stringify(logEntry)}`);
    return logEntry;
  }

  anonymizeSessionId(sessionId) {
    return crypto.createHash('sha256')
      .update(sessionId + this.anonymizationSalt.toString('hex'))
      .digest('hex')
      .substring(0, 12);
  }

  // Data Retention Management
  shouldRetainData(dataType, timestamp) {
    const retentionPeriod = this.dataRetentionPolicies[dataType];
    if (!retentionPeriod) return false;
    
    const now = Date.now();
    return (now - timestamp) < retentionPeriod;
  }

  scheduleDataDeletion(dataType, data, callback) {
    const retentionPeriod = this.dataRetentionPolicies[dataType];
    if (!retentionPeriod) return;
    
    setTimeout(() => {
      try {
        callback(data);
        this.createPrivacyLog('data_deleted', {
          dataType,
          dataId: data.id || 'unknown'
        });
      } catch (error) {
        console.error('Data deletion failed:', error);
      }
    }, retentionPeriod);
  }

  // Privacy Compliance Checks
  validateDataCollection(data, purpose) {
    const allowedPurposes = [
      'anonymous_communication',
      'service_functionality',
      'security_monitoring',
      'abuse_prevention'
    ];

    if (!allowedPurposes.includes(purpose)) {
      throw new Error('Data collection purpose not allowed');
    }

    // Check if data contains any potentially identifying information
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone pattern
      /\b\d{1,5}\s\w+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/i // Address pattern
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(JSON.stringify(data))) {
        throw new Error('Data contains potentially identifying information');
      }
    }

    return true;
  }

  // Generate Privacy Report
  generatePrivacyReport() {
    return {
      timestamp: Date.now(),
      dataRetentionPolicies: this.dataRetentionPolicies,
      encryptionStatus: 'enabled',
      anonymizationStatus: 'enabled',
      complianceFeatures: [
        'Automatic data deletion',
        'IP address anonymization',
        'User agent anonymization',
        'End-to-end encryption ready',
        'No personal data collection',
        'Privacy-safe logging',
        'Data minimization',
        'Purpose limitation'
      ],
      privacyPrinciples: [
        'Data minimization',
        'Purpose limitation',
        'Storage limitation',
        'Transparency',
        'Security by design',
        'Privacy by default'
      ]
    };
  }

  // Content Filtering for Privacy
  filterSensitiveContent(text) {
    if (!text || typeof text !== 'string') return text;

    // Replace potential personal information with placeholders
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED-EMAIL]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[REDACTED-PHONE]')
      .replace(/\b\d{1,5}\s\w+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi, '[REDACTED-ADDRESS]')
      .replace(/\b(?:my name is|i am|i'm)\s+[A-Za-z]+\b/gi, '[REDACTED-NAME]');
  }

  // Zero-Knowledge Proof Helpers
  generateZKProof(data, challenge) {
    // Simplified zero-knowledge proof concept
    // In production, use proper ZK libraries
    const commitment = crypto.createHash('sha256')
      .update(JSON.stringify(data) + challenge)
      .digest('hex');
    
    return {
      commitment,
      challenge,
      timestamp: Date.now()
    };
  }

  verifyZKProof(proof, expectedChallenge) {
    return proof.challenge === expectedChallenge && 
           proof.timestamp > (Date.now() - 300000); // 5 minute validity
  }

  // Secure Random Generation
  generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Privacy-Safe Error Messages
  sanitizeErrorMessage(error) {
    // Remove potentially sensitive information from error messages
    const safeMessage = error.message
      .replace(/\/[^\s]+/g, '[PATH]') // Remove file paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]') // Remove IP addresses
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g, '[EMAIL]') // Remove emails
      .substring(0, 200); // Limit length

    return {
      message: safeMessage,
      type: error.name || 'Error',
      timestamp: Date.now()
    };
  }
}

module.exports = new PrivacyService();


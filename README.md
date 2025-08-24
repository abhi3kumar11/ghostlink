# 👻 GhostLink - Anonymous Communication Platform

GhostLink is a secure, anonymous communication platform that enables ephemeral conversations without requiring personal information. Built with privacy-first principles and enterprise-grade security.

## 🌟 Features

### 🔒 Privacy & Security
- **Complete Anonymity**: No personal information required
- **Auto-Delete Messages**: Messages automatically expire after 5 minutes
- **End-to-End Encryption Ready**: Infrastructure prepared for E2E encryption
- **IP Address Anonymization**: All IP addresses are hashed and anonymized
- **GDPR Compliant**: Automatic data deletion and privacy-safe logging
- **Zero-Knowledge Architecture**: No personal data collection or storage

### 💬 Communication Features
- **Anonymous Text Chat**: Real-time messaging with temporary identities
- **Masked Video Calls**: WebRTC video calls with privacy overlays
- **Meeting Hub**: Schedule and join anonymous meetings with passcode protection
- **Cross-Platform Support**: Works on web, mobile, and desktop devices
- **Burner Chat Rooms**: Temporary chat rooms that auto-expire

### 🛡️ Security Features
- **Rate Limiting**: Prevents abuse with intelligent rate limiting
- **Content Filtering**: Automatic detection and redaction of sensitive information
- **CSRF Protection**: Cross-site request forgery protection
- **XSS Prevention**: Input sanitization and content security policies
- **Secure Headers**: Comprehensive security headers for all responses
- **Request Fingerprinting**: Abuse detection without compromising privacy

## 🏗️ Architecture

### Backend (Node.js + Express + Socket.IO)
- **Real-time Communication**: WebSocket-based messaging
- **RESTful API**: Clean API design for all operations
- **Privacy Service**: Comprehensive data protection and anonymization
- **Security Middleware**: Multi-layered security protection
- **WebRTC Signaling**: Peer-to-peer video call coordination

### Frontend (React + Tailwind CSS + DaisyUI)
- **Responsive Design**: Mobile-first, cross-platform compatibility
- **Real-time UI**: Live updates for messages and participants
- **Privacy-Focused UX**: Clear privacy indicators and controls
- **Accessibility**: WCAG compliant interface design

### DevOps & Monitoring
- **Docker Containerization**: Easy deployment and scaling
- **Prometheus Metrics**: Comprehensive application monitoring
- **Grafana Dashboards**: Visual monitoring and alerting
- **Loki Log Aggregation**: Centralized, privacy-safe logging
- **Health Checks**: Automated service health monitoring
- **Backup & Recovery**: Automated backup procedures

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- 2GB+ RAM
- 10GB+ disk space

### Deployment

1. **Clone and Deploy**
   ```bash
   git clone <repository-url>
   cd ghostlink
   ./deploy.sh
   ```

2. **Access the Application**
   - **Frontend**: http://localhost:8080
   - **Backend API (via proxy)**: http://localhost:8080/api
   - Monitoring: http://localhost:3001 (Grafana)

### Development Setup

1. **Backend Development**
   ```bash
   cd ghostlink-backend
   pnpm install
   pnpm run dev
   ```

2. **Frontend Development**
   ```bash
   cd ghostlink-frontend
   pnpm install
   pnpm run dev
   ```

## 📊 Monitoring & Operations

### Health Checks
```bash
# Check all services
./deploy.sh health

# View service status
./deploy.sh status

# View logs
./deploy.sh logs
```

### Monitoring Endpoints
- **Health**: `GET /api/health`
- **Metrics**: `GET /api/metrics` (Prometheus format)
- **Status**: `GET /api/status`

### Backup & Recovery
```bash
# Create backup
./deploy.sh backup

# Restore from backup
./deploy.sh restore <backup-directory>
```

## 🔧 Configuration

### Environment Variables
```bash
# Security
ENCRYPTION_KEY=<32-byte-hex-key>
ANON_SALT=<16-byte-hex-salt>

# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*

# Privacy Settings
DATA_RETENTION_MESSAGES=300000    # 5 minutes
DATA_RETENTION_MEETINGS=14400000  # 4 hours
DATA_RETENTION_SESSIONS=86400000  # 24 hours

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100       # Max requests per window
```

### Privacy Configuration
- **Message Retention**: 5 minutes (configurable)
- **Meeting Retention**: 4 hours (configurable)
- **Session Retention**: 24 hours (configurable)
- **Log Retention**: 7 days (configurable)

## 🛡️ Security Features

### Data Protection
- **Automatic Anonymization**: All personal identifiers are hashed
- **Content Filtering**: PII detection and redaction
- **Secure Random Generation**: Cryptographically secure random values
- **Memory Cleanup**: Automatic cleanup of sensitive data

### Network Security
- **TLS/SSL Ready**: HTTPS configuration included
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: Per-IP and per-fingerprint limits
- **DDoS Protection**: Request throttling and abuse detection

### Privacy Compliance
- **GDPR Compliant**: Right to erasure through auto-deletion
- **No Personal Data**: Zero collection of identifying information
- **Privacy by Design**: Built-in privacy protection
- **Audit Logging**: Privacy-safe audit trails

## 📈 Performance & Scaling

### Resource Requirements
- **Minimum**: 1 CPU, 2GB RAM, 10GB storage
- **Recommended**: 2 CPU, 4GB RAM, 50GB storage
- **High Load**: 4+ CPU, 8GB+ RAM, 100GB+ storage

### Scaling Options
- **Horizontal Scaling**: Multiple backend instances with load balancing
- **Database Scaling**: Redis clustering for session storage
- **CDN Integration**: Static asset delivery optimization
- **Container Orchestration**: Kubernetes deployment ready

## 🔍 API Documentation

### Authentication
```javascript
// Anonymous authentication
POST /api/auth/generate-anon-id
Response: { anonId: "ANON_ABC123", tempToken: "..." }
```

### Chat Operations
```javascript
// Join chat room
POST /api/chat/join
Body: { anonId, roomId }

// Send message
Socket: 'send_message'
Data: { text, roomId }
```

### Meeting Operations
```javascript
// Create meeting
POST /api/meeting/create
Body: { anonId, title, duration, maxParticipants }

// Join meeting
POST /api/meeting/join
Body: { meetingId, passcode, anonId }
```

### WebRTC Signaling
```javascript
// Join video room
Socket: 'join_video_room'
Data: { roomId }

// WebRTC offer/answer
Socket: 'webrtc_offer' | 'webrtc_answer' | 'webrtc_ice_candidate'
```

## 🧪 Testing

### Unit Tests
```bash
cd ghostlink-backend
npm test
```

### Integration Tests
```bash
cd ghostlink-backend
npm run test:integration
```

### Load Testing
```bash
cd tests
npm install
# Run realistic load test
node realistic-test.js
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Ensure privacy compliance
5. Submit a pull request

### Development Guidelines
- **Privacy First**: All features must maintain user anonymity
- **Security by Design**: Security considerations in all code
- **Performance Focused**: Optimize for real-time communication
- **Cross-Platform**: Ensure compatibility across devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues
- **Connection Issues**: Check firewall and network settings
- **Performance Issues**: Monitor resource usage and scale accordingly
- **Privacy Concerns**: Review privacy settings and data retention policies

### Getting Help
- **Documentation**: Check the `/docs` directory
- **Issues**: Report bugs via GitHub issues
- **Security**: Report security issues privately

## 🔮 Roadmap

### Upcoming Features
- [ ] Mobile applications (iOS/Android)
- [ ] File sharing with auto-delete
- [ ] Voice-only calls with distortion
- [ ] Advanced meeting scheduling
- [ ] Integration APIs
- [ ] Multi-language support

### Security Enhancements
- [ ] Hardware security module integration
- [ ] Advanced threat detection
- [ ] Blockchain-based identity verification
- [ ] Quantum-resistant encryption

---

**Built with privacy in mind. No tracking, no data collection, no compromises.**

🌐 **Cross-Platform** | 🔒 **Privacy-First** | ⚡ **Real-Time** | 🛡️ **Secure**

import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL ||
  (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3000');

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.isAuthenticated = false
    this.eventListeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
  }

  /**
   * Connect to the socket server
   */
  connect() {
    if (this.socket && this.isConnected) {
      return this.socket
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    })

    this.setupEventListeners()
    return this.socket
  }

  /**
   * Setup default event listeners
   */
  setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('🔗 Connected to GhostLink server')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.emit('connection_status', { connected: true })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason)
      this.isConnected = false
      this.isAuthenticated = false
      this.emit('connection_status', { connected: false, reason })
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      this.reconnectAttempts++
      this.emit('connection_error', { error, attempts: this.reconnectAttempts })
    })

    this.socket.on('auth_success', (data) => {
      console.log('✅ Authentication successful:', data.anonId)
      this.isAuthenticated = true
      this.emit('auth_success', data)
    })

    this.socket.on('auth_error', (data) => {
      console.error('❌ Authentication failed:', data.message)
      this.isAuthenticated = false
      this.emit('auth_error', data)
    })

    this.socket.on('msg', (message) => {
      console.log('📨 Message received:', message)
      this.emit('message_received', message)
    })

    this.socket.on('msg_sent', (data) => {
      console.log('✅ Message sent confirmation:', data)
      this.emit('message_sent', data)
    })

    this.socket.on('user_joined', (data) => {
      console.log('👋 User joined:', data.anonId)
      this.emit('user_joined', data)
    })

    this.socket.on('user_left', (data) => {
      console.log('👋 User left:', data.anonId)
      this.emit('user_left', data)
    })

    this.socket.on('room_joined', (data) => {
      console.log('🏠 Joined room:', data.room)
      this.emit('room_joined', data)
    })

    this.socket.on('room_left', (data) => {
      console.log('🚪 Left room:', data.room)
      this.emit('room_left', data)
    })

    this.socket.on('rate_limit_exceeded', (data) => {
      console.warn('⚠️ Rate limit exceeded:', data)
      this.emit('rate_limit_exceeded', data)
    })

    this.socket.on('error', (data) => {
      console.error('❌ Socket error:', data)
      this.emit('socket_error', data)
    })

    // WebRTC signaling events
    this.socket.on('webrtc_offer', (data) => {
      this.emit('webrtc_offer', data)
    })

    this.socket.on('webrtc_answer', (data) => {
      this.emit('webrtc_answer', data)
    })

    this.socket.on('webrtc_ice_candidate', (data) => {
      this.emit('webrtc_ice_candidate', data)
    })
  }

  /**
   * Authenticate with the server
   */
  authenticate(tempToken) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected')
      return false
    }

    this.socket.emit('auth', { tempToken })
    return true
  }

  /**
   * Send anonymous message
   */
  sendMessage(text, room = null, type = 'text') {
    if (!this.isAuthenticated) {
      console.error('Not authenticated')
      return false
    }

    this.socket.emit('anon_msg', {
      text,
      room,
      type,
      timestamp: Date.now()
    })
    return true
  }

  /**
   * Join a room
   */
  joinRoom(room) {
    if (!this.isAuthenticated) {
      console.error('Not authenticated')
      return false
    }

    this.socket.emit('join_room', { room })
    return true
  }

  /**
   * Leave a room
   */
  leaveRoom(room) {
    if (!this.isAuthenticated) {
      console.error('Not authenticated')
      return false
    }

    this.socket.emit('leave_room', { room })
    return true
  }

  /**
   * WebRTC signaling methods
   */
  sendWebRTCOffer(offer, target) {
    if (!this.isAuthenticated) return false
    
    this.socket.emit('webrtc_offer', { offer, target })
    return true
  }

  sendWebRTCAnswer(answer, target) {
    if (!this.isAuthenticated) return false
    
    this.socket.emit('webrtc_answer', { answer, target })
    return true
  }

  sendWebRTCIceCandidate(candidate, target) {
    if (!this.isAuthenticated) return false
    
    this.socket.emit('webrtc_ice_candidate', { candidate, target })
    return true
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event).push(callback)
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.eventListeners.has(event)) return
    
    const listeners = this.eventListeners.get(event)
    const index = listeners.indexOf(callback)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (!this.eventListeners.has(event)) return
    
    this.eventListeners.get(event).forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error)
      }
    })
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    this.isConnected = false
    this.isAuthenticated = false
    this.eventListeners.clear()
    console.log('🔌 Disconnected from GhostLink server')
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      authenticated: this.isAuthenticated,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    }
  }

  /**
   * Force reconnection
   */
  reconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket.connect()
    } else {
      this.connect()
    }
  }
}

export const socketService = new SocketService()

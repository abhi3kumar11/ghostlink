import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Send, Plus, Users, Clock, Shield, Copy, Check, AlertCircle } from 'lucide-react'
import { socketService } from '../services/socketService'

function ChatRoom({ anonId }) {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [currentRoom, setCurrentRoom] = useState(roomId || 'global')
  const [isConnected, setIsConnected] = useState(false)
  const [participants, setParticipants] = useState(new Set())
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [roomPasscode, setRoomPasscode] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [error, setError] = useState(null)
  const [copiedPasscode, setCopiedPasscode] = useState(false)
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)

  useEffect(() => {
    // Setup socket event listeners
    socketService.on('connection_status', handleConnectionStatus)
    socketService.on('message_received', handleMessageReceived)
    socketService.on('user_joined', handleUserJoined)
    socketService.on('user_left', handleUserLeft)
    socketService.on('room_joined', handleRoomJoined)
    socketService.on('rate_limit_exceeded', handleRateLimit)
    socketService.on('socket_error', handleSocketError)

    // Join the current room
    if (currentRoom && isConnected) {
      socketService.joinRoom(currentRoom)
    }

    return () => {
      // Cleanup event listeners
      socketService.off('connection_status', handleConnectionStatus)
      socketService.off('message_received', handleMessageReceived)
      socketService.off('user_joined', handleUserJoined)
      socketService.off('user_left', handleUserLeft)
      socketService.off('room_joined', handleRoomJoined)
      socketService.off('rate_limit_exceeded', handleRateLimit)
      socketService.off('socket_error', handleSocketError)
      
      // Leave room when component unmounts
      if (currentRoom) {
        socketService.leaveRoom(currentRoom)
      }
    }
  }, [currentRoom, isConnected])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Check socket connection status
    const status = socketService.getStatus()
    setIsConnected(status.connected && status.authenticated)
  }, [])

  const handleConnectionStatus = (data) => {
    setIsConnected(data.connected)
  }

  const handleMessageReceived = (message) => {
    if (message.room === currentRoom || (!message.room && currentRoom === 'global')) {
      setMessages(prev => [...prev, message])
    }
  }

  const handleUserJoined = (data) => {
    setParticipants(prev => new Set([...prev, data.anonId]))
    
    // Add system message
    const systemMessage = {
      id: `system-${Date.now()}`,
      type: 'system',
      text: `${data.anonId} joined the room`,
      timestamp: data.timestamp,
      expires: Date.now() + (5 * 60 * 1000)
    }
    setMessages(prev => [...prev, systemMessage])
  }

  const handleUserLeft = (data) => {
    setParticipants(prev => {
      const newSet = new Set(prev)
      newSet.delete(data.anonId)
      return newSet
    })
    
    // Add system message
    const systemMessage = {
      id: `system-${Date.now()}`,
      type: 'system',
      text: `${data.anonId} left the room`,
      timestamp: data.timestamp,
      expires: Date.now() + (5 * 60 * 1000)
    }
    setMessages(prev => [...prev, systemMessage])
  }

  const handleRoomJoined = (data) => {
    setCurrentRoom(data.room)
    setMessages([]) // Clear messages when joining new room
    setError(null)
  }

  const handleRateLimit = (data) => {
    setError(`Rate limit exceeded. Please wait ${data.retryAfter} seconds.`)
    setTimeout(() => setError(null), data.retryAfter * 1000)
  }

  const handleSocketError = (data) => {
    setError(data.message || 'An error occurred')
    setTimeout(() => setError(null), 5000)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected) return

    const success = socketService.sendMessage(
      newMessage.trim(),
      currentRoom === 'global' ? null : currentRoom
    )

    if (success) {
      setNewMessage('')
      messageInputRef.current?.focus()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const createBurnerRoom = async () => {
    setIsCreatingRoom(true)
    setError(null)

    try {
      const response = await fetch('/api/chat/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anonId }),
      })

      const data = await response.json()

      if (data.success) {
        setRoomPasscode(data.room.passcode)
        setCurrentRoom(data.room.id)
        navigate(`/chat/${data.room.id}`)
        setShowRoomModal(false)
        socketService.joinRoom(data.room.id)
      } else {
        setError(data.message || 'Failed to create room')
      }
    } catch (error) {
      setError('Failed to create room. Please try again.')
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const joinBurnerRoom = async () => {
    if (!joinRoomId.trim() || !roomPasscode.trim()) {
      setError('Please enter both room ID and passcode')
      return
    }

    setIsJoiningRoom(true)
    setError(null)

    try {
      const response = await fetch('/api/chat/join-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: joinRoomId.trim(),
          passcode: roomPasscode.trim(),
          anonId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCurrentRoom(joinRoomId.trim())
        navigate(`/chat/${joinRoomId.trim()}`)
        setShowRoomModal(false)
        socketService.joinRoom(joinRoomId.trim())
        setJoinRoomId('')
        setRoomPasscode('')
      } else {
        setError(data.message || 'Failed to join room')
      }
    } catch (error) {
      setError('Failed to join room. Please try again.')
    } finally {
      setIsJoiningRoom(false)
    }
  }

  const copyPasscode = async () => {
    try {
      await navigator.clipboard.writeText(roomPasscode)
      setCopiedPasscode(true)
      setTimeout(() => setCopiedPasscode(false), 2000)
    } catch (error) {
      console.error('Failed to copy passcode:', error)
    }
  }

  const formatTimeRemaining = (expires) => {
    const remaining = Math.max(0, expires - Date.now())
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]">
      <Helmet>
        <title>{`Chat Room: ${currentRoom === 'global' ? 'Global' : currentRoom} - GhostLink`}</title>
        <meta name="description" content={`Join an anonymous and ephemeral text chat on GhostLink. Room: ${currentRoom}.`} />
      </Helmet>

      <div className="card bg-base-200/50 backdrop-blur-sm shadow-xl h-full flex flex-col border border-base-300/10">
        {/* Chat Header */}
        <div className="card-body pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="card-title">
                {currentRoom === 'global' ? 'Global Chat' : `Room: ${currentRoom}`}
              </h2>
              <div className={`badge ${isConnected ? 'badge-success' : 'badge-error'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-base-content/60">
                <Users className="w-4 h-4" />
                <span>{participants.size + 1}</span>
              </div>
              
              <button
                onClick={() => setShowRoomModal(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Room
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 space-y-3 bg-base-100/30 rounded-lg m-4 p-4">
          {messages.length === 0 ? (
            <div className="text-center text-base-content/50 py-8">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
              <p className="text-sm mt-2">Messages auto-delete after 5 minutes</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`chat ${
                  message.anonId === anonId ? 'chat-end' : 'chat-start'
                } ${message.type === 'system' ? 'opacity-60' : ''}`}
              >
                <div className="chat-image avatar placeholder">
                  <div className={`w-8 h-8 rounded-full ${
                    message.type === 'system' 
                      ? 'bg-base-300' 
                      : message.anonId === anonId 
                        ? 'bg-primary text-primary-content' 
                        : 'bg-secondary text-secondary-content'
                  }`}>
                    <span className="text-xs">
                      {message.type === 'system' 
                        ? '!' 
                        : message.anonId?.slice(0, 2).toUpperCase() || 'AN'}
                    </span>
                  </div>
                </div>
                
                <div className="chat-header">
                  {message.type !== 'system' && (
                    <>
                      <span className="font-semibold">{message.anonId}</span>
                      <time className="text-xs opacity-50 ml-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </time>
                      {message.expires && (
                        <span className="text-xs opacity-50 ml-2 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimeRemaining(message.expires)}
                        </span>
                      )}
                    </>
                  )}
                </div>
                
                <div className={`chat-bubble ${
                  message.type === 'system'
                    ? 'chat-bubble-info text-xs'
                    : message.anonId === anonId
                      ? 'chat-bubble-primary rounded-br-none'
                      : 'chat-bubble-secondary rounded-bl-none'
                }`}>
                  {message.text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="card-body pt-4">
          <div className="flex space-x-2">
            <input
              ref={messageInputRef}
              type="text"
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              className="input input-bordered flex-1"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected}
              maxLength={1000}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !isConnected}
              className="btn btn-primary"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-xs text-base-content/50 mt-2">
            Messages are encrypted and auto-delete after 5 minutes
          </div>
        </div>
      </div>

      {/* Room Modal */}
      {showRoomModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Burner Chat Rooms</h3>
            
            <div className="tabs tabs-boxed mb-4">
              <a className="tab tab-active">Create Room</a>
              <a className="tab">Join Room</a>
            </div>

            {/* Create Room Tab */}
            <div className="space-y-4">
              <div className="alert alert-info">
                <Shield className="w-4 h-4" />
                <span>Burner rooms auto-delete after 24 hours</span>
              </div>
              
              <button
                onClick={createBurnerRoom}
                disabled={isCreatingRoom}
                className="btn btn-primary w-full"
              >
                {isCreatingRoom ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  'Create Burner Room'
                )}
              </button>

              {roomPasscode && (
                <div className="alert alert-success">
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <p className="font-semibold">Room Created!</p>
                      <p className="text-sm">Passcode: <code>{roomPasscode}</code></p>
                    </div>
                    <button
                      onClick={copyPasscode}
                      className="btn btn-ghost btn-sm"
                    >
                      {copiedPasscode ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="divider">OR</div>

              {/* Join Room Section */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Room ID"
                  className="input input-bordered w-full"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Passcode"
                  className="input input-bordered w-full"
                  value={roomPasscode}
                  onChange={(e) => setRoomPasscode(e.target.value)}
                />
                <button
                  onClick={joinBurnerRoom}
                  disabled={isJoiningRoom || !joinRoomId.trim() || !roomPasscode.trim()}
                  className="btn btn-secondary w-full"
                >
                  {isJoiningRoom ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Joining...
                    </>
                  ) : (
                    'Join Room'
                  )}
                </button>
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowRoomModal(false)}
                className="btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatRoom

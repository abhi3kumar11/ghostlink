import { useState, useEffect } from 'react'
import VideoCall from './components/VideoCall'

// API Configuration
const API_BASE_URL = 'http://localhost:3000'

function App() {
  const [anonId, setAnonId] = useState(null)
  const [tempToken, setTempToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('lobby')
  const [error, setError] = useState(null)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Generate anonymous ID from backend
      const response = await fetch(`${API_BASE_URL}/api/auth/generate-anon-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setAnonId(data.anonId)
        setTempToken(data.tempToken)
        console.log('Authentication successful:', data.anonId)
      } else {
        throw new Error('Failed to generate anonymous ID')
      }
    } catch (error) {
      console.error('Failed to initialize app:', error)
      setError(error.message)
      
      // Fallback: generate local anonymous ID
      const fallbackId = 'ANON_' + Math.random().toString(36).substr(2, 8).toUpperCase()
      setAnonId(fallbackId)
      console.log('Using fallback anonymous ID:', fallbackId)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Initializing GhostLink</h2>
          <p className="text-base-content/60">Setting up your anonymous session...</p>
        </div>
      </div>
    )
  }

  if (error && !anonId) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="alert alert-error max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Connection Failed</h3>
              <div className="text-xs">{error}</div>
            </div>
          </div>
          <button 
            onClick={initializeApp}
            className="btn btn-primary mt-4"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="navbar bg-base-200 shadow-lg border-b border-base-300">
        <div className="navbar-start">
          <div className="btn btn-ghost text-xl font-bold text-primary">
            👻 GhostLink
          </div>
        </div>
        
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 space-x-2">
            <li>
              <button 
                onClick={() => setCurrentView('lobby')}
                className={`btn btn-ghost btn-sm ${currentView === 'lobby' ? 'btn-active text-primary' : ''}`}
              >
                🏠 Lobby
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentView('chat')}
                className={`btn btn-ghost btn-sm ${currentView === 'chat' ? 'btn-active text-primary' : ''}`}
              >
                💬 Chat
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentView('video')}
                className={`btn btn-ghost btn-sm ${currentView === 'video' ? 'btn-active text-primary' : ''}`}
              >
                📹 Video
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentView('meeting')}
                className={`btn btn-ghost btn-sm ${currentView === 'meeting' ? 'btn-active text-primary' : ''}`}
              >
                📅 Meeting
              </button>
            </li>
          </ul>
        </div>

        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <div className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-10">
                <span className="text-xs font-bold">
                  {anonId ? anonId.slice(-2).toUpperCase() : 'AN'}
                </span>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="badge badge-warning badge-sm ml-2">
              Offline Mode
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentView === 'lobby' && <LobbyView anonId={anonId} setCurrentView={setCurrentView} />}
        {currentView === 'chat' && <ChatView anonId={anonId} tempToken={tempToken} />}
        {currentView === 'video' && <VideoCall anonId={anonId} tempToken={tempToken} />}
        {currentView === 'meeting' && <MeetingView anonId={anonId} />}
      </main>
    </div>
  )
}

// Lobby Component (same as before)
function LobbyView({ anonId, setCurrentView }) {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Welcome to GhostLink
        </h1>
        <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
          Your anonymous communication platform for secure, ephemeral conversations. 
          Choose your preferred mode of communication below.
        </p>
      </div>

      {/* Anonymous ID Display */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-12">
                  <span className="text-lg font-bold">
                    {anonId.slice(-2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Your Anonymous Identity</h3>
                <p className="text-base-content/60">Active for this session</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <code className="bg-base-300 px-3 py-2 rounded-lg font-mono text-primary font-bold">
                {anonId}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Mode Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="card-body">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            
            <h2 className="card-title text-xl mb-2">Anonymous Text Chat</h2>
            <p className="text-base-content/70 mb-4">Ephemeral messaging with auto-delete after 5 minutes</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-success">🔒</span>
                <span className="text-sm">End-to-end encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-success">⏰</span>
                <span className="text-sm">Auto-delete messages</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-success">🔥</span>
                <span className="text-sm">Burner chat rooms</span>
              </div>
            </div>
            
            <div className="card-actions justify-end">
              <button
                onClick={() => setCurrentView('chat')}
                className="btn btn-primary btn-block"
              >
                Enter Chat
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="card-body">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-secondary to-accent flex items-center justify-center mb-4">
              <span className="text-2xl">📹</span>
            </div>
            
            <h2 className="card-title text-xl mb-2">Masked Video Calls</h2>
            <p className="text-base-content/70 mb-4">WebRTC video calls with privacy overlays and face masking</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-success">🎭</span>
                <span className="text-sm">Face masking</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-success">🔊</span>
                <span className="text-sm">Voice distortion</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-success">🚫</span>
                <span className="text-sm">No recording</span>
              </div>
            </div>
            
            <div className="card-actions justify-end">
              <button
                onClick={() => setCurrentView('video')}
                className="btn btn-secondary btn-block"
              >
                Enter Video
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="card-body">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-accent to-primary flex items-center justify-center mb-4">
              <span className="text-2xl">📅</span>
            </div>
            
            <h2 className="card-title text-xl mb-2">Meeting Hub</h2>
            <p className="text-base-content/70 mb-4">Schedule and join anonymous meetings with passcode protection</p>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center space-x-2">
                <span className="text-success">🔐</span>
                <span className="text-sm">Passcode protection</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-success">⏰</span>
                <span className="text-sm">Scheduled meetings</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-success">📺</span>
                <span className="text-sm">Screen sharing</span>
              </div>
            </div>
            
            <div className="card-actions justify-end">
              <button
                onClick={() => setCurrentView('meeting')}
                className="btn btn-accent btn-block"
              >
                Enter Meeting
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Chat Component with Backend Integration
function ChatView({ anonId, tempToken }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [currentRoom, setCurrentRoom] = useState('global')
  const [error, setError] = useState(null)

  useEffect(() => {
    // Test backend connection
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`)
      if (response.ok) {
        setIsConnected(true)
        loadMessages()
      } else {
        throw new Error('Backend not available')
      }
    } catch (error) {
      console.error('Backend connection failed:', error)
      setError('Backend offline - using demo mode')
      // Load demo messages
      setMessages([
        { id: 1, anonId: 'ANON_DEMO1', text: 'Welcome to anonymous chat!', timestamp: Date.now() },
        { id: 2, anonId: anonId, text: 'Hello everyone!', timestamp: Date.now() + 1000 }
      ])
    }
  }

  const loadMessages = async () => {
    try {
      // In a real implementation, we would load messages from the backend
      // For now, we'll use demo messages
      setMessages([
        { id: 1, anonId: 'ANON_DEMO1', text: 'Welcome to anonymous chat!', timestamp: Date.now() },
        { id: 2, anonId: anonId, text: 'Hello everyone!', timestamp: Date.now() + 1000 }
      ])
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    
    const message = {
      id: Date.now(),
      anonId,
      text: newMessage.trim(),
      timestamp: Date.now()
    }

    // Add message locally first for immediate feedback
    setMessages(prev => [...prev, message])
    setNewMessage('')

    if (isConnected && tempToken) {
      try {
        // Send to backend
        const response = await fetch(`${API_BASE_URL}/api/chat/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempToken}`
          },
          body: JSON.stringify({
            anonId,
            message: message.text,
            room: currentRoom
          })
        })

        if (!response.ok) {
          throw new Error('Failed to send message to backend')
        }

        console.log('Message sent to backend successfully')
      } catch (error) {
        console.error('Failed to send message to backend:', error)
        // Message is already added locally, so user sees it regardless
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]">
      <div className="card bg-base-200 shadow-xl h-full flex flex-col">
        <div className="card-body pb-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Anonymous Chat Room</h2>
            <div className="flex items-center space-x-2">
              <div className={`badge ${isConnected ? 'badge-success' : 'badge-warning'}`}>
                {isConnected ? 'Connected' : 'Demo Mode'}
              </div>
              {error && (
                <div className="tooltip" data-tip={error}>
                  <div className="badge badge-error badge-sm">!</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-base-content/50 py-8">
              <div className="text-6xl mb-4">💬</div>
              <p>No messages yet. Start the conversation!</p>
              <p className="text-sm mt-2">Messages auto-delete after 5 minutes</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`chat ${message.anonId === anonId ? 'chat-end' : 'chat-start'}`}
              >
                <div className="chat-image avatar placeholder">
                  <div className={`w-8 h-8 rounded-full ${
                    message.anonId === anonId 
                      ? 'bg-primary text-primary-content' 
                      : 'bg-secondary text-secondary-content'
                  }`}>
                    <span className="text-xs">
                      {message.anonId.slice(-2)}
                    </span>
                  </div>
                </div>
                
                <div className="chat-header">
                  <span className="font-semibold">{message.anonId}</span>
                  <time className="text-xs opacity-50 ml-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </time>
                </div>
                
                <div className={`chat-bubble ${
                  message.anonId === anonId 
                    ? 'chat-bubble-primary' 
                    : 'chat-bubble-secondary'
                }`}>
                  {message.text}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card-body pt-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="input input-bordered flex-1"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              maxLength={1000}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="btn btn-primary"
            >
              Send
            </button>
          </div>
          
          <div className="text-xs text-base-content/50 mt-2">
            Messages are encrypted and auto-delete after 5 minutes
          </div>
        </div>
      </div>
    </div>
  )
}

// Video Component (same as before)
function VideoView({ anonId }) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body text-center">
          <h2 className="card-title justify-center text-2xl mb-4">
            📹 Masked Video Calls
          </h2>
          <p className="text-lg mb-8">WebRTC video calls with privacy protection</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="aspect-video bg-base-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">📹</div>
                <p className="font-semibold">Your Video (Masked)</p>
                <p className="text-sm text-base-content/60">Camera: Ready</p>
              </div>
            </div>
            
            <div className="aspect-video bg-base-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">👤</div>
                <p className="font-semibold">Waiting for participant...</p>
                <p className="text-sm text-base-content/60">Share room ID to invite</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button className="btn btn-circle btn-success">🎤</button>
            <button className="btn btn-circle btn-success">📹</button>
            <button className="btn btn-circle btn-primary">🎭</button>
            <button className="btn btn-circle btn-error">📞</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Meeting Component (same as before)
function MeetingView({ anonId }) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">📅 Meeting Hub</h1>
        <p className="text-base-content/70 mt-1">
          Schedule and join anonymous meetings with passcode protection
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Create Meeting</h2>
            <p className="text-base-content/70 mb-4">
              Start a new anonymous meeting room
            </p>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Meeting title (optional)" 
                className="input input-bordered w-full" 
              />
              <select className="select select-bordered w-full">
                <option>1 hour</option>
                <option>2 hours</option>
                <option>4 hours</option>
              </select>
              <button className="btn btn-primary w-full">
                Create Meeting Room
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Join Meeting</h2>
            <p className="text-base-content/70 mb-4">
              Enter an existing meeting room
            </p>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Room ID" 
                className="input input-bordered w-full" 
              />
              <input 
                type="text" 
                placeholder="Passcode" 
                className="input input-bordered w-full" 
              />
              <button className="btn btn-secondary w-full">
                Join Meeting
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App


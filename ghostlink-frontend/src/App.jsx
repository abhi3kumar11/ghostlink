import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './App.css'

// Components
import Lobby from './components/Lobby'
import ChatRoom from './components/ChatRoom'
import VideoRoom from './components/VideoRoom'
import MeetingHub from './components/MeetingHub'
import Header from './components/Header'

// Services
import { authService } from './services/authService'
import { socketService } from './services/socketService'

function App() {
  const [anonId, setAnonId] = useState(null)
  const [tempToken, setTempToken] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing authentication
    const storedToken = localStorage.getItem('ghostlink_token')
    const storedAnonId = localStorage.getItem('ghostlink_anon_id')
    
    if (storedToken && storedAnonId) {
      authService.verifyToken(storedToken)
        .then(response => {
          if (response.valid) {
            setTempToken(storedToken)
            setAnonId(storedAnonId)
            setIsAuthenticated(true)
            
            // Initialize socket connection
            socketService.connect()
            socketService.authenticate(storedToken)
          } else {
            // Token expired, clear storage
            localStorage.removeItem('ghostlink_token')
            localStorage.removeItem('ghostlink_anon_id')
          }
        })
        .catch(error => {
          console.error('Token verification failed:', error)
          localStorage.removeItem('ghostlink_token')
          localStorage.removeItem('ghostlink_anon_id')
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  const handleAuthentication = (newAnonId, newToken) => {
    setAnonId(newAnonId)
    setTempToken(newToken)
    setIsAuthenticated(true)
    
    // Store in localStorage
    localStorage.setItem('ghostlink_token', newToken)
    localStorage.setItem('ghostlink_anon_id', newAnonId)
    
    // Initialize socket connection
    socketService.connect()
    socketService.authenticate(newToken)
  }

  const handleLogout = () => {
    setAnonId(null)
    setTempToken(null)
    setIsAuthenticated(false)
    
    // Clear storage
    localStorage.removeItem('ghostlink_token')
    localStorage.removeItem('ghostlink_anon_id')
    
    // Disconnect socket
    socketService.disconnect()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/70">Initializing GhostLink...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-base-100">
        <Header 
          anonId={anonId} 
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
        />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Lobby anonId={anonId} />
                ) : (
                  <div className="max-w-md mx-auto">
                    <div className="card bg-base-200 shadow-xl">
                      <div className="card-body text-center">
                        <h2 className="card-title justify-center text-2xl mb-4">
                          Welcome to GhostLink
                        </h2>
                        <p className="text-base-content/70 mb-6">
                          Anonymous communication platform for secure, ephemeral conversations
                        </p>
                        <AuthenticationForm onAuthenticate={handleAuthentication} />
                      </div>
                    </div>
                  </div>
                )
              } 
            />
            
            <Route 
              path="/chat/:roomId?" 
              element={
                isAuthenticated ? (
                  <ChatRoom anonId={anonId} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            
            <Route 
              path="/video/:roomId?" 
              element={
                isAuthenticated ? (
                  <VideoRoom anonId={anonId} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            
            <Route 
              path="/meeting/:roomId?" 
              element={
                isAuthenticated ? (
                  <MeetingHub anonId={anonId} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

// Authentication Form Component
function AuthenticationForm({ onAuthenticate }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  const generateAnonId = async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await authService.generateAnonId()
      onAuthenticate(response.anonId, response.tempToken)
    } catch (error) {
      console.error('Authentication failed:', error)
      setError('Failed to generate anonymous ID. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      
      <button 
        className="btn btn-primary btn-lg w-full"
        onClick={generateAnonId}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Generating...
          </>
        ) : (
          'Generate Anonymous ID'
        )}
      </button>
      
      <div className="text-xs text-base-content/50 space-y-1">
        <p>• Your identity remains completely anonymous</p>
        <p>• Messages auto-delete after 5 minutes</p>
        <p>• No personal data is stored</p>
      </div>
    </div>
  )
}

export default App

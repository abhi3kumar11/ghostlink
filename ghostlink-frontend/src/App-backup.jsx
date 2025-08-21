import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Lobby from './components/Lobby'
import ChatRoom from './components/ChatRoom'
import VideoRoom from './components/VideoRoom'
import MeetingHub from './components/MeetingHub'
import { authService } from './services/authService'
import { socketService } from './services/socketService'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [anonId, setAnonId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeApp()
  }, [])

  const initializeApp = async () => {
    try {
      setIsLoading(true)
      
      // Check if user has existing session
      const existingAuth = authService.getStoredAuth()
      
      if (existingAuth && existingAuth.anonId && existingAuth.tempToken) {
        // Verify the existing session is still valid
        const isValid = await authService.verifySession(existingAuth.tempToken)
        
        if (isValid) {
          setAnonId(existingAuth.anonId)
          setIsAuthenticated(true)
          
          // Initialize socket connection
          await socketService.connect(existingAuth.anonId, existingAuth.tempToken)
        } else {
          // Session expired, clear stored data
          authService.clearStoredAuth()
          await generateNewSession()
        }
      } else {
        // No existing session, generate new one
        await generateNewSession()
      }
    } catch (error) {
      console.error('Failed to initialize app:', error)
      // Fallback: generate new session
      await generateNewSession()
    } finally {
      setIsLoading(false)
    }
  }

  const generateNewSession = async () => {
    try {
      const authData = await authService.generateAnonId()
      
      if (authData.success) {
        setAnonId(authData.anonId)
        setIsAuthenticated(true)
        
        // Store authentication data
        authService.storeAuth(authData.anonId, authData.tempToken)
        
        // Initialize socket connection
        await socketService.connect(authData.anonId, authData.tempToken)
      } else {
        throw new Error('Failed to generate anonymous ID')
      }
    } catch (error) {
      console.error('Failed to generate new session:', error)
      // Show error state or retry mechanism
    }
  }

  const handleLogout = async () => {
    try {
      // Disconnect socket
      socketService.disconnect()
      
      // Clear stored authentication
      authService.clearStoredAuth()
      
      // Reset state
      setIsAuthenticated(false)
      setAnonId(null)
      
      // Generate new session
      await generateNewSession()
    } catch (error) {
      console.error('Logout error:', error)
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="alert alert-error max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Authentication Failed</h3>
              <div className="text-xs">Unable to establish anonymous session</div>
            </div>
          </div>
          <button 
            onClick={generateNewSession}
            className="btn btn-primary mt-4"
          >
            Retry Connection
          </button>
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
              element={<Lobby anonId={anonId} />} 
            />
            <Route 
              path="/chat" 
              element={<ChatRoom anonId={anonId} />} 
            />
            <Route 
              path="/chat/:roomId" 
              element={<ChatRoom anonId={anonId} />} 
            />
            <Route 
              path="/video" 
              element={<VideoRoom anonId={anonId} />} 
            />
            <Route 
              path="/video/:roomId" 
              element={<VideoRoom anonId={anonId} />} 
            />
            <Route 
              path="/meeting" 
              element={<MeetingHub anonId={anonId} />} 
            />
            <Route 
              path="/meeting/:roomId" 
              element={<MeetingHub anonId={anonId} />} 
            />
            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App


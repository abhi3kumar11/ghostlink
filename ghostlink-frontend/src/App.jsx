import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Components
import Lobby from './components/Lobby'
import ChatRoom from './components/ChatRoom'
import VideoRoom from './components/VideoRoom'
import MeetingHub from './components/MeetingHub'
import Header from './components/Header'

// State Management
import { useAuthStore } from './stores/authStore'

function App() {
  const { anonId, isAuthenticated, isLoading, initializeAuth, logout } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [])

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
          onLogout={logout}
        />
        
        <main className="px-4 py-8">
          <Routes>
            <Route 
              path="/" 
              element={
                isAuthenticated ? (
                  <Lobby anonId={anonId} />
                ) : (
                  <div className="max-w-md mx-auto mt-20">
                    <div className="card bg-base-200/50 shadow-2xl shadow-primary/10 border border-primary/20 animate-pulse-glow">
                      <div className="card-body text-center">
                        <h2 className="card-title justify-center text-2xl mb-4">
                          Welcome to GhostLink
                        </h2>
                        <p className="text-base-content/70 mb-6">
                          Anonymous communication platform for secure, ephemeral conversations
                        </p>
                        <AuthenticationForm />
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
function AuthenticationForm() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const { login } = useAuthStore()

  const generateAnonId = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      await login()
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

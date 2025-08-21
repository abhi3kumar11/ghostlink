import { useState, useEffect } from 'react'
import VideoCall from './components/VideoCall'

function App() {
  const [anonId, setAnonId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('lobby')
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  useEffect(() => {
    // Simulate generating anonymous ID with loading animation
    setTimeout(() => {
      const id = `ANON_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      setAnonId(id)
      setIsLoading(false)
      setIsConnected(true)
      setConnectionStatus('connected')
    }, 2000)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/30"></div>
              <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-2xl">👻</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                GhostLink
              </span>
            </h1>
            <p className="text-purple-200 text-lg animate-pulse">
              Initializing secure anonymous session...
            </p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-xl">👻</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    GhostLink
                  </span>
                </h1>
                <p className="text-xs text-purple-300">Anonymous Communication</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isConnected 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <span className="capitalize">{connectionStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-black/10 backdrop-blur-sm border-b border-purple-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-3">
            {[
              { id: 'lobby', icon: '🏠', label: 'Lobby' },
              { id: 'chat', icon: '💬', label: 'Chat' },
              { id: 'video', icon: '📹', label: 'Video' },
              { id: 'meeting', icon: '📅', label: 'Meeting' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  currentView === item.id
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50 shadow-lg shadow-purple-500/20'
                    : 'text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 border border-transparent'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'lobby' && (
          <div className="space-y-8 animate-fade-in">
            {/* Welcome Section */}
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-white">
                  Welcome to <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">GhostLink</span>
                </h2>
                <p className="text-xl text-purple-200 max-w-3xl mx-auto">
                  Your anonymous communication platform for secure, ephemeral conversations. 
                  Choose your preferred mode of communication below.
                </p>
              </div>

              {/* Anonymous Identity Card */}
              <div className="max-w-md mx-auto">
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl border border-purple-500/30 p-6 shadow-2xl">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-2xl">🎭</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-purple-200 mb-2">Your Anonymous Identity</h3>
                      <div className="bg-black/30 rounded-lg px-4 py-3 border border-purple-500/20">
                        <p className="text-2xl font-mono font-bold text-white tracking-wider">{anonId}</p>
                        <p className="text-sm text-purple-300 mt-1">Active for this session</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-sm text-purple-300">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Secure & Anonymous</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Anonymous Text Chat */}
              <div className="group bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-lg rounded-2xl border border-blue-500/20 p-6 hover:border-blue-400/40 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Anonymous Text Chat</h3>
                    <p className="text-blue-200 mb-4">Ephemeral messaging with auto-delete after 5 minutes</p>
                    <div className="space-y-2 text-sm text-blue-300">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">🔒</span>
                        <span>End-to-end encryption</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400">⏰</span>
                        <span>Auto-delete messages</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-400">🔥</span>
                        <span>Burner chat rooms</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('chat')}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Enter Chat
                  </button>
                </div>
              </div>

              {/* Masked Video Calls */}
              <div className="group bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-lg rounded-2xl border border-purple-500/20 p-6 hover:border-purple-400/40 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">📹</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Masked Video Calls</h3>
                    <p className="text-purple-200 mb-4">WebRTC video calls with privacy overlays and face masking</p>
                    <div className="space-y-2 text-sm text-purple-300">
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400">🎭</span>
                        <span>Face masking</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400">🔊</span>
                        <span>Voice distortion</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-400">🚫</span>
                        <span>No recording</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('video')}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Enter Video
                  </button>
                </div>
              </div>

              {/* Meeting Hub */}
              <div className="group bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-lg rounded-2xl border border-emerald-500/20 p-6 hover:border-emerald-400/40 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-2xl">📅</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Meeting Hub</h3>
                    <p className="text-emerald-200 mb-4">Schedule and join anonymous meetings with passcode protection</p>
                    <div className="space-y-2 text-sm text-emerald-300">
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-400">🔐</span>
                        <span>Passcode protection</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400">👥</span>
                        <span>Anonymous participants</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-400">⏰</span>
                        <span>Auto-expiry</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('meeting')}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    Enter Meeting Hub
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Features */}
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-lg rounded-2xl border border-slate-700/50 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Privacy-First Design</h3>
                <p className="text-slate-300">Built with your anonymity and security in mind</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: '🔒', title: 'Zero Data Collection', desc: 'No personal information required or stored' },
                  { icon: '⏰', title: 'Auto-Delete', desc: 'All data automatically expires and deletes' },
                  { icon: '🛡️', title: 'Anonymous IDs', desc: 'Temporary identities for each session' },
                  { icon: '🌐', title: 'Cross-Platform', desc: 'Works on all devices and browsers' }
                ].map((feature, index) => (
                  <div key={index} className="text-center space-y-3 group">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <span className="text-2xl">{feature.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{feature.title}</h4>
                      <p className="text-sm text-slate-400">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentView === 'chat' && (
          <div className="animate-fade-in">
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-lg rounded-2xl border border-blue-500/20 p-8">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-3xl">💬</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4">Anonymous Text Chat</h2>
                  <p className="text-blue-200 text-lg mb-6">
                    Secure, ephemeral messaging with end-to-end encryption
                  </p>
                  <div className="bg-black/30 rounded-lg p-4 mb-6 border border-blue-500/20">
                    <p className="text-blue-300 text-sm mb-2">🔒 Your messages are encrypted and auto-delete after 5 minutes</p>
                    <p className="text-blue-300 text-sm">👻 Your identity: <span className="font-mono font-bold text-white">{anonId}</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-blue-200 mb-4">Chat functionality will be integrated here</p>
                    <div className="inline-flex items-center space-x-2 text-blue-300">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span>Ready for real-time messaging</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'video' && (
          <div className="animate-fade-in">
            <VideoCall anonId={anonId} />
          </div>
        )}

        {currentView === 'meeting' && (
          <div className="animate-fade-in">
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-lg rounded-2xl border border-emerald-500/20 p-8">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <span className="text-3xl">📅</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-4">Meeting Hub</h2>
                  <p className="text-emerald-200 text-lg mb-6">
                    Schedule and join anonymous meetings with passcode protection
                  </p>
                  <div className="bg-black/30 rounded-lg p-4 mb-6 border border-emerald-500/20">
                    <p className="text-emerald-300 text-sm mb-2">🔐 All meetings are protected with unique passcodes</p>
                    <p className="text-emerald-300 text-sm">⏰ Meetings automatically expire after the scheduled duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-200 mb-4">Meeting functionality will be integrated here</p>
                    <div className="inline-flex items-center space-x-2 text-emerald-300">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span>Ready for anonymous meetings</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-lg border-t border-purple-500/20 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">👻</span>
              <span className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                GhostLink
              </span>
            </div>
            <p className="text-purple-300 text-sm">
              Anonymous communication platform • Privacy-first design • No data collection
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-purple-400">
              <span>🌐 Cross-Platform</span>
              <span>🔒 Privacy-First</span>
              <span>⚡ Real-Time</span>
              <span>🛡️ Secure</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Add custom CSS for animations
const style = document.createElement('style')
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.6s ease-out;
  }
  
  .group:hover .group-hover\\:scale-110 {
    transform: scale(1.1);
  }
`
document.head.appendChild(style)

export default App


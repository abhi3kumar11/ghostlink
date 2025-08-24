import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MessageCircle, Video, Calendar, Users, Shield, Clock, Zap, Copy, Check } from 'lucide-react'

function Lobby({ anonId }) {
  const navigate = useNavigate()
  const [copiedAnonId, setCopiedAnonId] = useState(false)
  const [stats, setStats] = useState({
    activeRooms: 0,
    totalMessages: 0,
    activeMeetings: 0
  })

  useEffect(() => {
    // Fetch platform statistics
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const [chatStats, meetingStats] = await Promise.all([
        fetch('/api/chat/stats').then(r => r.json()),
        fetch('/api/meeting/stats').then(r => r.json())
      ])
      
      setStats({
        activeRooms: chatStats.stats?.activeRooms || 0,
        totalMessages: chatStats.stats?.totalMessages || 0,
        activeMeetings: meetingStats.stats?.activeMeetings || 0
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const copyAnonId = async () => {
    try {
      await navigator.clipboard.writeText(anonId)
      setCopiedAnonId(true)
      setTimeout(() => setCopiedAnonId(false), 2000)
    } catch (error) {
      console.error('Failed to copy anonymous ID:', error)
    }
  }

  const communicationModes = [
    {
      id: 'text',
      title: 'Anonymous Text Chat',
      description: 'Ephemeral messaging with auto-delete after 5 minutes',
      icon: MessageCircle,
      color: 'primary',
      features: ['End-to-end encryption', 'Auto-delete messages', 'Burner chat rooms'],
      action: () => navigate('/chat'),
      gradient: 'from-primary to-secondary'
    },
    {
      id: 'video',
      title: 'Masked Video Calls',
      description: 'WebRTC video calls with privacy overlays and face masking',
      icon: Video,
      color: 'secondary',
      features: ['Face masking', 'Voice distortion', 'No recording'],
      action: () => navigate('/video'),
      gradient: 'from-secondary to-accent'
    },
    {
      id: 'meeting',
      title: 'Meeting Hub',
      description: 'Schedule and join anonymous meetings with passcode protection',
      icon: Calendar,
      color: 'accent',
      features: ['Passcode protection', 'Scheduled meetings', 'Screen sharing'],
      action: () => navigate('/meeting'),
      gradient: 'from-accent to-primary'
    }
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Helmet>
        <title>Lobby - GhostLink</title>
        <meta name="description" content="Welcome to the GhostLink lobby. Choose your mode of anonymous communication: text chat, masked video calls, or scheduled meetings." />
      </Helmet>

      {/* Welcome Section */}
      <section aria-labelledby="welcome-heading" className="text-center space-y-4 py-12">
        <h1 id="welcome-heading" className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient-pan bg-[length:200%_auto]">
          Welcome to GhostLink
        </h1>
        <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
          Your anonymous communication platform for secure, ephemeral conversations. 
          Choose your preferred mode of communication below.
        </p>
      </section>

      {/* Anonymous ID Display */}
      <section aria-labelledby="anon-id-heading" className="card bg-base-200/50 shadow-xl border border-base-300/20">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="avatar placeholder online">
                <div className="bg-primary text-primary-content rounded-full w-12">
                  <span className="text-lg font-bold">
                    {anonId.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <h2 id="anon-id-heading" className="font-semibold text-lg">Your Anonymous Identity</h2>
                <p className="text-base-content/60">Active for this session</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <code className="bg-base-300/50 px-3 py-2 rounded-lg font-mono text-primary font-bold">
                {anonId}
              </code>
              <button
                onClick={copyAnonId}
                className="btn btn-ghost btn-sm btn-circle"
                title="Copy Anonymous ID"
              >
                {copiedAnonId ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section aria-label="Platform Statistics" className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-figure text-primary">
            <Users className="w-8 h-8" />
          </div>
          <div className="stat-title">Active Rooms</div>
          <div className="stat-value text-primary">{stats.activeRooms}</div>
          <div className="stat-desc">Currently active chat rooms</div>
        </div>
        
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-figure text-secondary">
            <MessageCircle className="w-8 h-8" />
          </div>
          <div className="stat-title">Messages Today</div>
          <div className="stat-value text-secondary">{stats.totalMessages}</div>
          <div className="stat-desc">Ephemeral messages sent</div>
        </div>
        
        <div className="stat bg-base-200 rounded-lg">
          <div className="stat-figure text-accent">
            <Video className="w-8 h-8" />
          </div>
          <div className="stat-title">Live Meetings</div>
          <div className="stat-value text-accent">{stats.activeMeetings}</div>
          <div className="stat-desc">Anonymous meetings in progress</div>
        </div>
      </section>

      {/* Communication Mode Cards */}
      <section aria-label="Communication Modes" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {communicationModes.map((mode) => {
          const IconComponent = mode.icon
          return (
            <div
              key={mode.id}
              className={`card bg-base-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-transparent hover:border-primary/50 cursor-pointer`}
              onClick={mode.action}
            >
              <div className="card-body">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                
                <h2 className="card-title text-xl mb-2">{mode.title}</h2>
                <p className="text-base-content/70 mb-4">{mode.description}</p>
                
                <div className="space-y-2 mb-6">
                  {mode.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-success" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="card-actions justify-end">
                  <button
                    tabIndex={-1}
                    className={`btn btn-${mode.color} btn-block`}
                  >
                    Enter {mode.title.split(' ')[0]}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* Security Features */}
      <section aria-labelledby="security-features-heading" className="card bg-base-200/30 shadow-xl border border-base-300/10">
        <div className="card-body">
          <h2 id="security-features-heading" className="card-title text-2xl mb-4 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-primary" />
            Privacy & Security Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Ephemeral Messages</h4>
                <p className="text-sm text-base-content/60">Auto-delete after 5 minutes</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h4 className="font-semibold">No Data Storage</h4>
                <p className="text-sm text-base-content/60">Zero personal information</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold">End-to-End Encryption</h4>
                <p className="text-sm text-base-content/60">Military-grade security</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div>
                <h4 className="font-semibold">Anonymous Identity</h4>
                <p className="text-sm text-base-content/60">Rotating anonymous IDs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => navigate('/chat')}
          className="btn btn-outline btn-primary"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Quick Chat
        </button>
        <button
          onClick={() => navigate('/video')}
          className="btn btn-outline btn-secondary"
        >
          <Video className="w-4 h-4 mr-2" />
          Start Video Call
        </button>
        <button
          onClick={() => navigate('/meeting')}
          className="btn btn-outline btn-accent"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Meeting
        </button>
      </div>
    </div>
  )
}

export default Lobby

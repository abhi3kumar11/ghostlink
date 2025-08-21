import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

const API_BASE_URL = 'http://localhost:3000'

function MeetingHubNew({ anonId, tempToken }) {
  const [isConnected, setIsConnected] = useState(false)
  const [currentView, setCurrentView] = useState('hub') // hub, create, join, meeting
  const [meetings, setMeetings] = useState([])
  const [activeMeeting, setActiveMeeting] = useState(null)
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Form states
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    duration: 60, // minutes
    maxParticipants: 10,
    allowScreenShare: true,
    allowChat: true,
    requirePasscode: true
  })
  const [joinForm, setJoinForm] = useState({
    meetingId: '',
    passcode: ''
  })
  const [messageInput, setMessageInput] = useState('')

  const socketRef = useRef(null)

  useEffect(() => {
    if (tempToken) {
      initializeSocket()
      loadUserMeetings()
    }

    return () => {
      cleanup()
    }
  }, [tempToken])

  const initializeSocket = () => {
    try {
      socketRef.current = io(API_BASE_URL, {
        transports: ['websocket', 'polling']
      })

      socketRef.current.on('connect', () => {
        console.log('📅 Connected to meeting server')
        setIsConnected(true)
        
        // Authenticate
        socketRef.current.emit('auth', { tempToken })
      })

      socketRef.current.on('auth_success', (data) => {
        console.log('📅 Meeting authentication successful:', data.anonId)
      })

      socketRef.current.on('joined_meeting', (data) => {
        console.log('📅 Joined meeting:', data)
        setActiveMeeting(data.meeting)
        setParticipants(data.participants || [])
        setCurrentView('meeting')
        setMessages([])
      })

      socketRef.current.on('meeting_participant_joined', (data) => {
        console.log('📅 Participant joined meeting:', data)
        setParticipants(prev => [...prev.filter(p => p.anonId !== data.anonId), {
          anonId: data.anonId,
          role: data.role,
          joinedAt: Date.now()
        }])
      })

      socketRef.current.on('meeting_participant_left', (data) => {
        console.log('📅 Participant left meeting:', data)
        setParticipants(prev => prev.filter(p => p.anonId !== data.anonId))
      })

      socketRef.current.on('meeting_message', (message) => {
        console.log('📅 Meeting message received:', message)
        setMessages(prev => [...prev, message])
      })

      socketRef.current.on('meeting_updated', (meeting) => {
        console.log('📅 Meeting updated:', meeting)
        setActiveMeeting(meeting)
      })

      socketRef.current.on('meeting_ended', (data) => {
        console.log('📅 Meeting ended:', data)
        setActiveMeeting(null)
        setParticipants([])
        setMessages([])
        setCurrentView('hub')
        alert(`Meeting ended by ${data.endedBy}`)
      })

      socketRef.current.on('meeting_error', (data) => {
        console.error('📅 Meeting error:', data)
        setError(data.error)
      })

      socketRef.current.on('disconnect', () => {
        console.log('📅 Disconnected from meeting server')
        setIsConnected(false)
      })

    } catch (error) {
      console.error('📅 Socket initialization failed:', error)
      setError('Failed to connect to meeting server')
    }
  }

  const loadUserMeetings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/meeting/user/${anonId}`, {
        headers: {
          'Authorization': `Bearer ${tempToken}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setMeetings(data.meetings || [])
      }
    } catch (error) {
      console.error('📅 Failed to load meetings:', error)
    }
  }

  const createMeeting = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/meeting/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({
          anonId,
          ...meetingForm,
          duration: meetingForm.duration * 60 * 1000 // Convert to milliseconds
        })
      })

      const data = await response.json()

      if (data.success) {
        setMeetings(prev => [data.meeting, ...prev])
        setCurrentView('hub')
        setMeetingForm({
          title: '',
          duration: 60,
          maxParticipants: 10,
          allowScreenShare: true,
          allowChat: true,
          requirePasscode: true
        })
        
        // Show meeting details
        alert(`Meeting created!\nMeeting ID: ${data.meeting.roomId}\nPasscode: ${data.passcode}`)
      } else {
        throw new Error(data.error || 'Failed to create meeting')
      }
    } catch (error) {
      console.error('📅 Failed to create meeting:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const joinMeeting = () => {
    if (!joinForm.meetingId.trim()) {
      setError('Please enter a meeting ID')
      return
    }

    setError(null)
    
    if (socketRef.current) {
      socketRef.current.emit('join_meeting', {
        meetingId: joinForm.meetingId.trim().toUpperCase(),
        passcode: joinForm.passcode.trim()
      })
    }
  }

  const leaveMeeting = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_meeting')
    }
    
    setActiveMeeting(null)
    setParticipants([])
    setMessages([])
    setCurrentView('hub')
  }

  const sendMessage = () => {
    if (!messageInput.trim() || !socketRef.current) return

    socketRef.current.emit('meeting_message', {
      message: messageInput.trim()
    })

    setMessageInput('')
  }

  const endMeeting = () => {
    if (confirm('Are you sure you want to end this meeting for all participants?')) {
      if (socketRef.current) {
        socketRef.current.emit('end_meeting')
      }
    }
  }

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave_meeting')
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setIsConnected(false)
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  // Main Hub View
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">📅 Meeting Hub</h1>
        <p className="text-base-content/70">
          Schedule and join anonymous meetings with passcode protection
        </p>
        
        <div className={`badge ${isConnected ? 'badge-success' : 'badge-error'} mt-2`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Create Meeting</h2>
            <p className="text-base-content/70 mb-4">
              Start a new anonymous meeting with custom settings
            </p>
            
            <button
              onClick={() => setCurrentView('create')}
              disabled={!isConnected}
              className="btn btn-primary w-full"
            >
              Create New Meeting
            </button>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Join Meeting</h2>
            <p className="text-base-content/70 mb-4">
              Enter an existing meeting with ID and passcode
            </p>
            
            <button
              onClick={() => setCurrentView('join')}
              disabled={!isConnected}
              className="btn btn-secondary w-full"
            >
              Join Existing Meeting
            </button>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg">Meeting Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-semibold">Passcode Protection</p>
                <p className="text-sm text-base-content/60">Secure meeting access</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">👥</span>
              <div>
                <p className="font-semibold">Anonymous Participants</p>
                <p className="text-sm text-base-content/60">No personal info required</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="font-semibold">Auto-Expiry</p>
                <p className="text-sm text-base-content/60">Meetings auto-delete</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MeetingHubNew


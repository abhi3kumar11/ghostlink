import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Calendar, Clock, Users, Shield, Plus, Copy, Check, 
  Video, MessageCircle, Settings, Lock, AlertCircle 
} from 'lucide-react'

function MeetingHub({ anonId }) {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState(null)
  const [copiedInfo, setCopiedInfo] = useState(null)

  // Form states
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDuration, setMeetingDuration] = useState(60)
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinPasscode, setJoinPasscode] = useState('')

  useEffect(() => {
    // If roomId is provided, try to join that meeting
    if (roomId) {
      setJoinRoomId(roomId)
      setShowJoinModal(true)
    }
  }, [roomId])

  const createMeeting = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/meeting/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anonId,
          title: meetingTitle || 'Anonymous Meeting',
          duration: meetingDuration,
          maxParticipants,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMeetings(prev => [...prev, data.meeting])
        setShowCreateModal(false)
        setMeetingTitle('')
        setMeetingDuration(60)
        setMaxParticipants(10)
        
        // Show success with meeting details
        setCopiedInfo({
          roomId: data.meeting.roomId,
          passcode: data.meeting.passcode
        })
      } else {
        setError(data.message || 'Failed to create meeting')
      }
    } catch (error) {
      setError('Failed to create meeting. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const joinMeeting = async () => {
    if (!joinRoomId.trim() || !joinPasscode.trim()) {
      setError('Please enter both room ID and passcode')
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      const response = await fetch('/api/meeting/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: joinRoomId.trim(),
          passcode: joinPasscode.trim(),
          anonId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Navigate to video room for the meeting
        navigate(`/video/${joinRoomId.trim()}`)
      } else {
        setError(data.message || 'Failed to join meeting')
      }
    } catch (error) {
      setError('Failed to join meeting. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  const copyMeetingInfo = async (roomId, passcode) => {
    const meetingInfo = `Meeting Room: ${roomId}\nPasscode: ${passcode}\nJoin at: ${window.location.origin}/meeting/${roomId}`
    
    try {
      await navigator.clipboard.writeText(meetingInfo)
      setCopiedInfo({ roomId, passcode })
      setTimeout(() => setCopiedInfo(null), 3000)
    } catch (error) {
      console.error('Failed to copy meeting info:', error)
    }
  }

  const formatTimeRemaining = (expiresAt) => {
    const remaining = Math.max(0, expiresAt - Date.now())
    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meeting Hub</h1>
          <p className="text-base-content/70 mt-1">
            Schedule and join anonymous meetings with passcode protection
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn btn-outline btn-secondary"
          >
            <Users className="w-4 h-4 mr-2" />
            Join Meeting
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Meeting
          </button>
        </div>
      </div>

      {/* Success Message */}
      {copiedInfo && (
        <div className="alert alert-success">
          <Check className="w-4 h-4" />
          <div>
            <p className="font-semibold">Meeting details copied to clipboard!</p>
            <p className="text-sm">Room: {copiedInfo.roomId} | Passcode: {copiedInfo.passcode}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body text-center">
            <Video className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="card-title justify-center">Instant Video Call</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Start an immediate video call with face masking
            </p>
            <button
              onClick={() => navigate('/video')}
              className="btn btn-primary btn-sm"
            >
              Start Call
            </button>
          </div>
        </div>

        <div className="card bg-base-200 shadow-lg">
          <div className="card-body text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-secondary" />
            <h3 className="card-title justify-center">Anonymous Chat</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Join ephemeral text conversations
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="btn btn-secondary btn-sm"
            >
              Start Chat
            </button>
          </div>
        </div>

        <div className="card bg-base-200 shadow-lg">
          <div className="card-body text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-accent" />
            <h3 className="card-title justify-center">Scheduled Meeting</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Create a meeting room for later use
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-accent btn-sm"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Active Meetings */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">Your Meetings</h2>
          
          {meetings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
              <p className="text-base-content/60">No meetings created yet</p>
              <p className="text-sm text-base-content/40 mt-2">
                Create a meeting to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div key={meeting.roomId} className="card bg-base-100 shadow-md">
                  <div className="card-body">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-base-content/60 mt-2">
                          <div className="flex items-center space-x-1">
                            <Lock className="w-4 h-4" />
                            <span>Room: {meeting.roomId}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{meeting.participantCount}/{meeting.maxParticipants}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Expires in {formatTimeRemaining(meeting.expiresAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyMeetingInfo(meeting.roomId, meeting.passcode)}
                          className="btn btn-ghost btn-sm"
                          title="Copy meeting details"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/video/${meeting.roomId}`)}
                          className="btn btn-primary btn-sm"
                        >
                          <Video className="w-4 h-4 mr-1" />
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Meeting</h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Meeting Title</span>
                </label>
                <input
                  type="text"
                  placeholder="Anonymous Meeting"
                  className="input input-bordered"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Duration (minutes)</span>
                </label>
                <select
                  className="select select-bordered"
                  value={meetingDuration}
                  onChange={(e) => setMeetingDuration(parseInt(e.target.value))}
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Max Participants</span>
                </label>
                <select
                  className="select select-bordered"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                >
                  <option value={2}>2 participants</option>
                  <option value={5}>5 participants</option>
                  <option value={10}>10 participants</option>
                  <option value={20}>20 participants</option>
                </select>
              </div>

              <div className="alert alert-info">
                <Shield className="w-4 h-4" />
                <span>Meeting rooms are protected with auto-generated passcodes</span>
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={createMeeting}
                disabled={isCreating}
                className="btn btn-primary"
              >
                {isCreating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  'Create Meeting'
                )}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Meeting Modal */}
      {showJoinModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Join Meeting</h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Room ID</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter room ID"
                  className="input input-bordered"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Passcode</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter passcode"
                  className="input input-bordered"
                  value={joinPasscode}
                  onChange={(e) => setJoinPasscode(e.target.value)}
                />
              </div>

              <div className="alert alert-warning">
                <AlertCircle className="w-4 h-4" />
                <span>Make sure you have the correct room ID and passcode from the meeting organizer</span>
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={joinMeeting}
                disabled={isJoining || !joinRoomId.trim() || !joinPasscode.trim()}
                className="btn btn-primary"
              >
                {isJoining ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Joining...
                  </>
                ) : (
                  'Join Meeting'
                )}
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false)
                  setJoinRoomId('')
                  setJoinPasscode('')
                  setError(null)
                }}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MeetingHub


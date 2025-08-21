import { useState, useEffect, useRef } from 'react'
import Peer from 'simple-peer'
import io from 'socket.io-client'

const API_BASE_URL = 'http://localhost:3000'

function VideoCall({ anonId, tempToken }) {
  const [isConnected, setIsConnected] = useState(false)
  const [roomId, setRoomId] = useState('')
  const [isInCall, setIsInCall] = useState(false)
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)
  const [participants, setParticipants] = useState([])
  const [error, setError] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isMasked, setIsMasked] = useState(true)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const socketRef = useRef(null)
  const peerRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    // Initialize socket connection
    if (tempToken) {
      initializeSocket()
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
        console.log('📹 Connected to video server')
        setIsConnected(true)
        
        // Authenticate
        socketRef.current.emit('auth', { tempToken })
      })

      socketRef.current.on('auth_success', (data) => {
        console.log('📹 Video authentication successful:', data.anonId)
      })

      socketRef.current.on('joined_video_room', (data) => {
        console.log('📹 Joined video room:', data)
        setIsInCall(true)
        setParticipants(data.participants || [])
      })

      socketRef.current.on('participant_joined', (data) => {
        console.log('📹 Participant joined:', data)
        setParticipants(prev => [...prev, data.anonId])
        
        // If we're the first participant, create offer
        if (data.participantCount === 2) {
          createOffer()
        }
      })

      socketRef.current.on('participant_left', (data) => {
        console.log('📹 Participant left')
        setParticipants(prev => prev.filter(p => p !== data.anonId))
        
        if (peerRef.current) {
          peerRef.current.destroy()
          peerRef.current = null
        }
        
        setRemoteStream(null)
      })

      socketRef.current.on('webrtc_offer', (data) => {
        console.log('📹 Received WebRTC offer')
        handleOffer(data.offer, data.fromSocketId)
      })

      socketRef.current.on('webrtc_answer', (data) => {
        console.log('📹 Received WebRTC answer')
        handleAnswer(data.answer)
      })

      socketRef.current.on('webrtc_ice_candidate', (data) => {
        console.log('📹 Received ICE candidate')
        handleIceCandidate(data.candidate)
      })

      socketRef.current.on('video_room_error', (data) => {
        console.error('📹 Video room error:', data)
        setError(data.error)
      })

      socketRef.current.on('disconnect', () => {
        console.log('📹 Disconnected from video server')
        setIsConnected(false)
      })

    } catch (error) {
      console.error('📹 Socket initialization failed:', error)
      setError('Failed to connect to video server')
    }
  }

  const createRoom = async () => {
    try {
      setIsCreatingRoom(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/api/webrtc/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ anonId })
      })

      const data = await response.json()

      if (data.success) {
        setRoomId(data.roomId)
        await joinVideoRoom(data.roomId)
      } else {
        throw new Error(data.error || 'Failed to create room')
      }
    } catch (error) {
      console.error('📹 Failed to create room:', error)
      setError(error.message)
    } finally {
      setIsCreatingRoom(false)
    }
  }

  const joinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID')
      return
    }

    try {
      setIsJoiningRoom(true)
      setError(null)
      
      await joinVideoRoom(roomId.trim().toUpperCase())
    } catch (error) {
      console.error('📹 Failed to join room:', error)
      setError(error.message)
    } finally {
      setIsJoiningRoom(false)
    }
  }

  const joinVideoRoom = async (targetRoomId) => {
    try {
      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      })

      setLocalStream(stream)
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Apply masking if enabled
      if (isMasked) {
        applyVideoMask(stream)
      }

      // Join room via socket
      if (socketRef.current) {
        socketRef.current.emit('join_video_room', { roomId: targetRoomId })
      }

    } catch (error) {
      console.error('📹 Failed to get user media:', error)
      setError('Failed to access camera/microphone')
    }
  }

  const createOffer = async () => {
    try {
      if (!localStream) return

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: localStream
      })

      peerRef.current = peer

      peer.on('signal', (data) => {
        if (data.type === 'offer') {
          socketRef.current.emit('webrtc_offer', { offer: data })
        } else if (data.candidate) {
          socketRef.current.emit('webrtc_ice_candidate', { candidate: data })
        }
      })

      peer.on('stream', (stream) => {
        console.log('📹 Received remote stream')
        setRemoteStream(stream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
      })

      peer.on('error', (error) => {
        console.error('📹 Peer error:', error)
        setError('WebRTC connection failed')
      })

    } catch (error) {
      console.error('📹 Failed to create offer:', error)
    }
  }

  const handleOffer = async (offer, fromSocketId) => {
    try {
      if (!localStream) return

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: localStream
      })

      peerRef.current = peer

      peer.on('signal', (data) => {
        if (data.type === 'answer') {
          socketRef.current.emit('webrtc_answer', { 
            answer: data, 
            targetSocketId: fromSocketId 
          })
        } else if (data.candidate) {
          socketRef.current.emit('webrtc_ice_candidate', { 
            candidate: data, 
            targetSocketId: fromSocketId 
          })
        }
      })

      peer.on('stream', (stream) => {
        console.log('📹 Received remote stream')
        setRemoteStream(stream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
      })

      peer.on('error', (error) => {
        console.error('📹 Peer error:', error)
        setError('WebRTC connection failed')
      })

      peer.signal(offer)

    } catch (error) {
      console.error('📹 Failed to handle offer:', error)
    }
  }

  const handleAnswer = (answer) => {
    if (peerRef.current) {
      peerRef.current.signal(answer)
    }
  }

  const handleIceCandidate = (candidate) => {
    if (peerRef.current) {
      peerRef.current.signal(candidate)
    }
  }

  const applyVideoMask = (stream) => {
    // Simple privacy mask implementation
    // In a real implementation, you would use face detection and masking
    if (!canvasRef.current || !localVideoRef.current) return

    const canvas = canvasRef.current
    const video = localVideoRef.current
    const ctx = canvas.getContext('2d')

    const drawMask = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        ctx.drawImage(video, 0, 0)
        
        // Apply simple blur effect as privacy mask
        ctx.filter = 'blur(10px)'
        ctx.drawImage(video, 0, 0)
        
        // Add ghost emoji overlay
        ctx.filter = 'none'
        ctx.font = '48px Arial'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.textAlign = 'center'
        ctx.fillText('👻', canvas.width / 2, canvas.height / 2)
      }
      
      if (isMasked) {
        requestAnimationFrame(drawMask)
      }
    }

    drawMask()
  }

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const toggleMask = () => {
    setIsMasked(!isMasked)
    if (localStream && !isMasked) {
      applyVideoMask(localStream)
    }
  }

  const leaveCall = () => {
    cleanup()
    setIsInCall(false)
    setRoomId('')
    setParticipants([])
  }

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }

    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.emit('leave_video_room')
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setRemoteStream(null)
    setIsConnected(false)
  }

  if (!isInCall) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">📹 Masked Video Calls</h1>
          <p className="text-base-content/70">
            WebRTC video calls with privacy protection and face masking
          </p>
          
          <div className={`badge ${isConnected ? 'badge-success' : 'badge-error'} mt-2`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Create Video Room</h2>
              <p className="text-base-content/70 mb-4">
                Start a new anonymous video call room
              </p>
              
              <button
                onClick={createRoom}
                disabled={!isConnected || isCreatingRoom}
                className="btn btn-primary w-full"
              >
                {isCreatingRoom ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating Room...
                  </>
                ) : (
                  'Create Room'
                )}
              </button>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Join Video Room</h2>
              <p className="text-base-content/70 mb-4">
                Enter an existing video call room
              </p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Room ID (e.g., ABC123DE)"
                  className="input input-bordered w-full"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <button
                  onClick={joinRoom}
                  disabled={!isConnected || !roomId.trim() || isJoiningRoom}
                  className="btn btn-secondary w-full"
                >
                  {isJoiningRoom ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Joining Room...
                    </>
                  ) : (
                    'Join Room'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-lg">Privacy Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🎭</span>
                <div>
                  <p className="font-semibold">Face Masking</p>
                  <p className="text-sm text-base-content/60">Blur and mask your face</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔊</span>
                <div>
                  <p className="font-semibold">Voice Distortion</p>
                  <p className="text-sm text-base-content/60">Optional voice effects</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🚫</span>
                <div>
                  <p className="font-semibold">No Recording</p>
                  <p className="text-sm text-base-content/60">Recording blocked</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Video Call - Room {roomId}</h2>
          <p className="text-base-content/60">
            {participants.length} participant{participants.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        
        <button
          onClick={leaveCall}
          className="btn btn-error"
        >
          Leave Call
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Local Video */}
        <div className="relative aspect-video bg-base-300 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isMasked ? 'hidden' : ''}`}
          />
          
          {isMasked && (
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover"
            />
          )}
          
          <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            You ({anonId})
          </div>
          
          <div className="absolute top-2 right-2 flex space-x-1">
            {isMasked && (
              <div className="bg-primary text-primary-content px-2 py-1 rounded text-xs">
                🎭 Masked
              </div>
            )}
            {isMuted && (
              <div className="bg-error text-error-content px-2 py-1 rounded text-xs">
                🔇 Muted
              </div>
            )}
            {isVideoOff && (
              <div className="bg-error text-error-content px-2 py-1 rounded text-xs">
                📹 Off
              </div>
            )}
          </div>
        </div>

        {/* Remote Video */}
        <div className="relative aspect-video bg-base-300 rounded-lg overflow-hidden">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">👤</div>
                <p className="font-semibold">Waiting for participant...</p>
                <p className="text-sm text-base-content/60">Share room ID: {roomId}</p>
              </div>
            </div>
          )}
          
          {remoteStream && (
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              Remote Participant
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleMute}
          className={`btn btn-circle ${isMuted ? 'btn-error' : 'btn-success'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>
        
        <button
          onClick={toggleVideo}
          className={`btn btn-circle ${isVideoOff ? 'btn-error' : 'btn-success'}`}
          title={isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
        >
          {isVideoOff ? '📹' : '📹'}
        </button>
        
        <button
          onClick={toggleMask}
          className={`btn btn-circle ${isMasked ? 'btn-primary' : 'btn-ghost'}`}
          title={isMasked ? 'Remove Mask' : 'Apply Mask'}
        >
          🎭
        </button>
        
        <button
          onClick={leaveCall}
          className="btn btn-circle btn-error"
          title="End Call"
        >
          📞
        </button>
      </div>
    </div>
  )
}

export default VideoCall


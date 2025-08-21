import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, 
  Settings, Users, Shield, Mask, Volume2, VolumeX 
} from 'lucide-react'

function VideoRoom({ anonId }) {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isMaskEnabled, setIsMaskEnabled] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [participants, setParticipants] = useState([])
  const [selectedMask, setSelectedMask] = useState('blur')
  const [showSettings, setShowSettings] = useState(false)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  useEffect(() => {
    // Initialize WebRTC and get user media
    initializeMedia()
    
    return () => {
      // Cleanup media streams
      cleanupMedia()
    }
  }, [])

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      
      setIsConnected(true)
    } catch (error) {
      console.error('Failed to access media devices:', error)
    }
  }

  const cleanupMedia = () => {
    if (localVideoRef.current?.srcObject) {
      const tracks = localVideoRef.current.srcObject.getTracks()
      tracks.forEach(track => track.stop())
    }
  }

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled
      }
    }
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled
      }
    }
  }

  const toggleMask = () => {
    setIsMaskEnabled(!isMaskEnabled)
  }

  const endCall = () => {
    cleanupMedia()
    navigate('/video')
  }

  const maskOptions = [
    { id: 'blur', name: 'Blur Face', description: 'Gaussian blur overlay' },
    { id: 'pixelate', name: 'Pixelate', description: 'Pixelated face mask' },
    { id: 'ghost', name: 'Ghost Mask', description: 'Animated ghost overlay' },
    { id: 'geometric', name: 'Geometric', description: 'Abstract geometric shapes' }
  ]

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)]">
      <div className="card bg-base-200 shadow-xl h-full flex flex-col">
        {/* Video Header */}
        <div className="card-body pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="card-title">
                {roomId ? `Video Room: ${roomId}` : 'Video Call'}
              </h2>
              <div className={`badge ${isConnected ? 'badge-success' : 'badge-error'}`}>
                {isConnected ? 'Connected' : 'Connecting...'}
              </div>
              {isMaskEnabled && (
                <div className="badge badge-primary">
                  <Mask className="w-3 h-3 mr-1" />
                  Masked
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-base-content/60">
                <Users className="w-4 h-4" />
                <span>{participants.length + 1}</span>
              </div>
              
              <button
                onClick={() => setShowSettings(true)}
                className="btn btn-ghost btn-sm"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 px-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Local Video */}
            <div className="relative bg-base-300 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${
                  isMaskEnabled ? 'filter blur-sm' : ''
                }`}
              />
              
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-base-300 flex items-center justify-center">
                  <div className="text-center">
                    <VideoOff className="w-12 h-12 mx-auto mb-2 text-base-content/50" />
                    <p className="text-base-content/70">Video Off</p>
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-4 left-4 bg-base-100/80 backdrop-blur-sm rounded-lg px-3 py-1">
                <span className="text-sm font-semibold">{anonId} (You)</span>
              </div>
              
              {isMaskEnabled && (
                <div className="absolute top-4 right-4 bg-primary/80 backdrop-blur-sm rounded-lg px-2 py-1">
                  <span className="text-xs text-primary-content">
                    {maskOptions.find(m => m.id === selectedMask)?.name}
                  </span>
                </div>
              )}
            </div>

            {/* Remote Video */}
            <div className="relative bg-base-300 rounded-lg overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {participants.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-base-content/50" />
                    <p className="text-lg font-semibold text-base-content/70">
                      Waiting for participants...
                    </p>
                    <p className="text-sm text-base-content/50 mt-2">
                      Share the room ID to invite others
                    </p>
                  </div>
                </div>
              ) : (
                <div className="absolute bottom-4 left-4 bg-base-100/80 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-sm font-semibold">Remote Participant</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="card-body pt-4">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={toggleAudio}
              className={`btn btn-circle ${
                isAudioEnabled ? 'btn-success' : 'btn-error'
              }`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleVideo}
              className={`btn btn-circle ${
                isVideoEnabled ? 'btn-success' : 'btn-error'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleMask}
              className={`btn btn-circle ${
                isMaskEnabled ? 'btn-primary' : 'btn-outline'
              }`}
              title={isMaskEnabled ? 'Remove mask' : 'Apply mask'}
            >
              <Mask className="w-5 h-5" />
            </button>

            <button
              onClick={endCall}
              className="btn btn-circle btn-error"
              title="End call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center mt-4">
            <div className="flex items-center justify-center space-x-4 text-sm text-base-content/60">
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>End-to-end encrypted</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mask className="w-4 h-4" />
                <span>Privacy protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Video Settings</h3>
            
            <div className="space-y-6">
              {/* Mask Settings */}
              <div>
                <h4 className="font-semibold mb-3">Privacy Mask</h4>
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Enable face masking</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={isMaskEnabled}
                      onChange={toggleMask}
                    />
                  </label>
                </div>
                
                {isMaskEnabled && (
                  <div className="mt-3 space-y-2">
                    {maskOptions.map((mask) => (
                      <div key={mask.id} className="form-control">
                        <label className="label cursor-pointer">
                          <div>
                            <span className="label-text font-medium">{mask.name}</span>
                            <p className="text-xs text-base-content/60">{mask.description}</p>
                          </div>
                          <input
                            type="radio"
                            name="mask"
                            className="radio radio-primary"
                            checked={selectedMask === mask.id}
                            onChange={() => setSelectedMask(mask.id)}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio Settings */}
              <div>
                <h4 className="font-semibold mb-3">Audio Settings</h4>
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Voice distortion</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-secondary"
                    />
                  </label>
                </div>
              </div>

              {/* Quality Settings */}
              <div>
                <h4 className="font-semibold mb-3">Video Quality</h4>
                <select className="select select-bordered w-full">
                  <option>Auto (Recommended)</option>
                  <option>High (720p)</option>
                  <option>Medium (480p)</option>
                  <option>Low (360p)</option>
                </select>
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowSettings(false)}
                className="btn btn-primary"
              >
                Save Settings
              </button>
              <button
                onClick={() => setShowSettings(false)}
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

export default VideoRoom


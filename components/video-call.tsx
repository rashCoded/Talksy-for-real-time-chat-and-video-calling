import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2 } from "lucide-react"
import { useWebRTC } from "@/hooks/use-webrtc"

interface VideoCallProps {
  contactName: string
  callType?: "voice" | "video"
  isIncoming?: boolean
  isAccepted?: boolean
  onEndCall: () => void
}

export function VideoCall({
  contactName,
  callType = "video",
  isIncoming = false,
  isAccepted = false,
  onEndCall
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(callType === "voice")
  const [callDuration, setCallDuration] = useState(0)

  const { localStream, remoteStream, isConnected, connectionState, toggleAudio, toggleVideo, endCall } = useWebRTC({
    contactName,
    initiateOffer: isAccepted && !isIncoming,
    videoEnabled: true
  })

  // Debug logging - disabled for production
  // console.log(`🎥 [VideoCall-DEBUG] Props: isIncoming=${isIncoming}, isAccepted=${isAccepted}`)
  // console.log(`🎥 [VideoCall-DEBUG] Calculated initiateOffer=${isAccepted && !isIncoming}`)
  // console.log(`🎥 [VideoCall-DEBUG] WebRTC connectionState=${connectionState}`)

  // Listen for call events - REMOVED (Handled in page.tsx)
  // useWebSocket logic moved to parent or unnecessary here since page.tsx handles global state propagation.


  // Initialize call type specific settings
  useEffect(() => {
    if (callType === "voice") {
      setIsVideoOff(true)
    }
  }, [callType])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    // Only start timer when actually connected
    if (connectionState === "connected") {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }

    // Auto-end call on failure/close
    if (connectionState === "failed" || connectionState === "closed") {
      handleEndCall()
    }
  }, [connectionState])

  const handleToggleMute = () => {
    toggleAudio()
    setIsMuted(!isMuted)
  }

  const handleToggleVideo = () => {
    toggleVideo()
    setIsVideoOff(!isVideoOff)
  }

  const handleEndCall = () => {
    endCall()
    onEndCall()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const isCallActive = connectionState === "connected"

  return (
    <div className="flex-1 relative bg-background h-full w-full flex flex-col">
      {/* Remote Video (Main) */}
      <div className="flex-1 relative bg-black/90 flex items-center justify-center overflow-hidden">
        {callType === "video" && !isVideoOff && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-primary/20 flex items-center justify-center text-4xl font-bold text-primary-foreground">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <p className="text-xl text-white font-medium">{contactName}</p>
            <p className="text-sm text-white/60">
              {isCallActive ? "In Call" : (isIncoming ? "Connecting..." : "Calling...")}
              <br />
              <span className="text-xs opacity-50">({connectionState})</span>
            </p>
          </div>
        )}
      </div>

      {/* Connection Status Overlay - Only show if NOT connected */}
      {!isCallActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">
              {isIncoming ? "Connecting..." : `Calling ${contactName}...`}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Status: {connectionState}
            </p>
          </div>
        </div>
      )}

      {/* Local Video (Picture-in-Picture) */}
      {callType === "video" && !isVideoOff && (
        <div className="absolute top-4 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-lg overflow-hidden border-2 border-border shadow-lg bg-black z-20">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      {/* Call Info */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg z-10">
        <p className="text-sm font-medium text-foreground">{contactName}</p>
        <p className="text-xs text-muted-foreground">{formatDuration(callDuration)}</p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
        <Button
          onClick={handleToggleMute}
          size="icon"
          variant={isMuted ? "destructive" : "secondary"}
          className="h-14 w-14 rounded-full"
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button
          onClick={handleToggleVideo}
          size="icon"
          variant={isVideoOff ? "destructive" : "secondary"}
          className="h-14 w-14 rounded-full"
          disabled={callType === "voice"} // Disable video toggle if it's a voice call
        >
          {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>

        <Button onClick={handleEndCall} size="icon" variant="destructive" className="h-16 w-16 rounded-full">
          <PhoneOff className="h-7 w-7" />
        </Button>

        <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full">
          <Maximize2 className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )
}

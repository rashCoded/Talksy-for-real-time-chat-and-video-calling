"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PhoneOff, Mic, MicOff, VolumeX, Volume2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useWebRTC } from "@/hooks/use-webrtc"

interface VoiceCallProps {
  contactName: string
  isIncoming?: boolean
  isAccepted?: boolean
  onEndCall: () => void
}

export function VoiceCall({
  contactName,
  isIncoming = false,
  isAccepted = false,
  onEndCall
}: VoiceCallProps) {
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)

  const { isConnected, connectionState, toggleAudio, endCall } = useWebRTC({
    contactName,
    initiateOffer: isAccepted && !isIncoming,
    videoEnabled: false
  })

  // Debug logging - disabled for production
  // console.log(`📞 [VoiceCall-DEBUG] Props: isIncoming=${isIncoming}, isAccepted=${isAccepted}`)
  // console.log(`📞 [VoiceCall-DEBUG] Calculated initiateOffer=${isAccepted && !isIncoming}`)
  // console.log(`📞 [VoiceCall-DEBUG] WebRTC connectionState=${connectionState}`)

  const contactAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contactName)}`
  const initials = contactName.charAt(0).toUpperCase()

  useEffect(() => {
    // Timer Effect
    if (connectionState === "connected") {
      const interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }

    // Auto-end on failure
    if (connectionState === "failed" || connectionState === "closed") {
      handleEndCall()
    }
  }, [connectionState])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleEndCall = () => {
    endCall()
    onEndCall()
  }

  const handleToggleMute = () => {
    toggleAudio()
    setIsMuted(!isMuted)
  }

  const isCallActive = connectionState === "connected"

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/20 p-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Contact Avatar and Info */}
        <div className="space-y-4">
          <div className="relative">
            <Avatar className={`w-32 h-32 mx-auto border-4 border-border ${!isCallActive ? "animate-pulse" : ""}`}>
              <AvatarImage src={contactAvatar} alt={contactName} />
              <AvatarFallback className="bg-primary/20 text-primary-foreground text-4xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isCallActive && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-background flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">{contactName}</h2>
            <p className="text-muted-foreground text-lg">
              {!isCallActive && (isIncoming ? "Connecting..." : "Calling...")}
              {isCallActive && formatDuration(callDuration)}
              <br />
              <span className="text-xs opacity-50">({connectionState})</span>
            </p>
          </div>
        </div>

        {/* Call Status */}
        {!isCallActive && (
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-1">
              <div className="h-1 bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Waiting for response... ({connectionState})
            </p>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center space-x-6">
          <Button
            variant={isMuted ? "default" : "outline"}
            size="lg"
            className={`w-14 h-14 rounded-full ${isMuted ? "bg-red-500 hover:bg-red-600" : ""}`}
            onClick={handleToggleMute}
            disabled={!isAccepted}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
            onClick={handleEndCall}
          >
            <PhoneOff className="w-7 h-7" />
          </Button>

          <Button
            variant={isSpeakerOn ? "default" : "outline"}
            size="lg"
            className={`w-14 h-14 rounded-full ${isSpeakerOn ? "bg-blue-500 hover:bg-blue-600" : ""}`}
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            disabled={!isAccepted}
          >
            {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </Button>
        </div>

        {/* Call Stats */}
        {isAccepted && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Call Quality</p>
              <p className="font-semibold text-green-600">Excellent</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Connection</p>
              <p className="font-semibold">{isConnected ? "Secure" : "Reconnecting..."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Phone, PhoneOff, Video } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { toast } from "sonner"

interface IncomingCallProps {
  callerName: string
  callType: "voice" | "video"
  onAccept: () => void
  onDecline: () => void
}

export function IncomingCall({ callerName, callType, onAccept, onDecline }: IncomingCallProps) {
  const [ringing, setRinging] = useState(true)
  const callerAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(callerName)}`
  const initials = callerName.charAt(0).toUpperCase()

  useEffect(() => {
    // Play ringtone (simplified)
    const audio = new Audio('data:audio/wav;base64,UklGRmQBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=')
    audio.loop = true
    audio.volume = 0.3
    
    if (ringing) {
      audio.play().catch(() => {})
    }

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [ringing])

  const handleAccept = () => {
    setRinging(false)
    onAccept()
  }

  const handleDecline = () => {
    setRinging(false)
    onDecline()
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border border-border rounded-xl p-8 shadow-2xl max-w-sm w-full mx-4">
        <div className="text-center space-y-6">
          {/* Caller Info */}
          <div className="space-y-4">
            <Avatar className={`w-24 h-24 mx-auto border-4 border-border ${ringing ? "animate-pulse" : ""}`}>
              <AvatarImage src={callerAvatar} alt={callerName} />
              <AvatarFallback className="bg-primary/20 text-primary-foreground text-3xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="text-xl font-bold text-foreground">{callerName}</h3>
              <p className="text-muted-foreground">
                Incoming {callType} call
              </p>
            </div>
          </div>

          {/* Call Actions */}
          <div className="flex justify-center space-x-8">
            <Button
              variant="destructive"
              size="lg"
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
              onClick={handleDecline}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>

            <Button
              variant="default"
              size="lg"
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600"
              onClick={handleAccept}
            >
              {callType === "voice" ? (
                <Phone className="w-6 h-6" />
              ) : (
                <Video className="w-6 h-6" />
              )}
            </Button>
          </div>

          {/* Ringing Animation */}
          {ringing && (
            <div className="flex justify-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Demo function to simulate incoming calls
export function simulateIncomingCall(callerName: string, callType: "voice" | "video" = "voice") {
  toast.custom((t) => (
    <IncomingCall
      callerName={callerName}
      callType={callType}
      onAccept={() => {
        toast.dismiss(t)
        toast.success(`Answered ${callType} call from ${callerName}`)
      }}
      onDecline={() => {
        toast.dismiss(t)
        toast.info(`Declined ${callType} call from ${callerName}`)
      }}
    />
  ), {
    duration: 30000, // 30 seconds timeout
    position: "top-center"
  })
}
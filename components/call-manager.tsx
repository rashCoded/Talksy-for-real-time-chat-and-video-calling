"use client"

import { IncomingCall } from "./incoming-call"
import { VideoCall } from "./video-call"

export type CallState = "IDLE" | "INCOMING" | "OUTGOING" | "ACTIVE" | "ENDED"
export type CallType = "voice" | "video"

interface CallManagerProps {
    callState: CallState
    callType: CallType
    contactName: string | null
    callerName?: string // Name of person calling US (for incoming)
    onAccept: () => void
    onReject: () => void
    onEnd: () => void
}

export function CallManager({
    callState,
    callType,
    contactName,
    callerName,
    onAccept,
    onReject,
    onEnd
}: CallManagerProps) {

    if (callState === "IDLE") return null

    if (callState === "INCOMING" && callerName) {
        return (
            <IncomingCall
                callerName={callerName}
                callType={callType}
                onAccept={onAccept}
                onDecline={onReject}
            />
        )
    }

    if (callState === "ACTIVE" || callState === "OUTGOING") {
        // If we are calling someone, show the VideoCall component immediately
        // Ideally OUTGOING would show a specific "Calling..." screen, 
        // but VideoCall handles "Connecting..." overlay so it's fine.
        // Note: VideoCall expects 'contactName' to be the person on the OTHER end.
        if (!contactName) return null

        return (
            <div className="fixed inset-0 z-50 bg-background">
                <VideoCall
                    contactName={contactName}
                    callType={callType}
                    onEndCall={onEnd}
                />
            </div>
        )
    }

    return null
}

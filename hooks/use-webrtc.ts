"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useWebSocket } from "./use-websocket"

interface UseWebRTCProps {
  contactName: string
  initiateOffer?: boolean
  videoEnabled?: boolean
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ],
}

export function useWebRTC({ contactName, initiateOffer = false, videoEnabled = true }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new")

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([])
  const pendingSignalsQueue = useRef<any[]>([]) // Queue signals that arrive before peer connection is ready

  const processIceQueue = async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) return
    // console.log("[v0] Processing ICE queue:", iceCandidatesQueue.current.length)

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift()
      if (candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          console.error("[v0] Error processing queued ICE candidate:", e)
        }
      }
    }
  }

  // Process any signals that arrived before peer connection was ready
  const processPendingSignals = async () => {
    // console.log("[v0] Processing pending signals queue:", pendingSignalsQueue.current.length)
    while (pendingSignalsQueue.current.length > 0) {
      const signal = pendingSignalsQueue.current.shift()
      if (signal) {
        await handleSignal(signal)
      }
    }
  }

  // Signal handler function (extracted so it can be called from queue)
  const handleSignal = async (signal: any) => {
    if (!peerConnectionRef.current) {
      // console.warn("[v0] Signal arrived but peer connection not ready, queueing:", signal.type)
      pendingSignalsQueue.current.push(signal)
      return
    }

    try {
      if (signal.type === "offer") {
        // console.log("[v0] Received offer, creating answer")
        if (peerConnectionRef.current.signalingState !== "stable") {
          // console.warn("[v0] Signaling state not stable, but proceeding...")
        }
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.data))
        await processIceQueue() // Process queued candidates
        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)
        // console.log("[v0] Sending answer...")
        sendSignal({ type: "answer", data: answer, to: contactName })

      } else if (signal.type === "answer") {
        // console.log("[v0] Received answer")
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.data))
        await processIceQueue() // Process queued candidates

      } else if (signal.type === "ice-candidate") {
        const candidate = new RTCIceCandidate(signal.data)
        if (peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(candidate)
        } else {
          // console.log("[v0] Queueing ICE candidate (remote desc not set)")
          iceCandidatesQueue.current.push(signal.data)
        }
      }
    } catch (error) {
      console.error("[v0] Error handling signal:", error)
    }
  }

  const { sendSignal } = useWebSocket({
    onSignal: async (signal) => {
      // console.log("[v0] Received signal:", signal.type)
      await handleSignal(signal)
    },
  })

  // Connection Timeout Logic
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isConnected && connectionState !== "connected") {
        console.warn("[v0] Connection timed out after 15s")
        // endCall() // endCall is defined later, so this would cause a lint error or runtime error if not careful.
        // Instead, we can set the state to failed, and let other effects react to it.
        setConnectionState("failed")
      }
    }, 15000)

    return () => clearTimeout(timeout)
  }, [isConnected, connectionState]) // endCall is not needed here if we just set state.

  const initializePeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS)

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // console.log("[v0] Sending ICE candidate")
        sendSignal({ type: "ice-candidate", data: event.candidate, to: contactName })
      }
    }

    peerConnection.ontrack = (event) => {
      console.log("[v0] Received remote track")
      setRemoteStream(event.streams[0])
    }

    peerConnection.onconnectionstatechange = () => {
      console.log("[v0] Connection state:", peerConnection.connectionState)
      setConnectionState(peerConnection.connectionState)

      if (peerConnection.connectionState === "connected") {
        setIsConnected(true)
      } else if (
        peerConnection.connectionState === "disconnected" ||
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "closed"
      ) {
        setIsConnected(false)
        // Optionally trigger endCall here, but let the component handle the state change reaction
      }
    }

    // Also Listen to ICE state
    peerConnection.oniceconnectionstatechange = () => {
      console.log("[v0] ICE Connection state:", peerConnection.iceConnectionState)

      if (peerConnection.iceConnectionState === "failed") {
        console.error("[v0] ICE Connection FAILED - possible network/firewall issue")
        // Force state update to trigger cleanup in components
        setConnectionState("failed")
      }
      if (peerConnection.iceConnectionState === "disconnected") {
        console.warn("[v0] ICE Connection DISCONNECTED")
        // Optional: waiting for reconnection? or just fail? 
        // For now, let's keep it robust and fail if it stays disconnected
      }
    }

    peerConnectionRef.current = peerConnection
    return peerConnection
  }, [contactName, sendSignal])

  useEffect(() => {
    console.log(`🔌 [WebRTC-DEBUG] useEffect triggered: initiateOffer=${initiateOffer}, contactName=${contactName}`)

    const setupCall = async () => {
      try {
        // Only get media if not already present
        if (!localStreamRef.current) {
          // console.log("[v0] Getting user media...")
          const stream = await navigator.mediaDevices.getUserMedia({
            video: videoEnabled,
            audio: true,
          })
          // console.log("[v0] Got local stream", { videoEnabled })
          setLocalStream(stream)
          localStreamRef.current = stream
        }

        // Initialize peer connection if not exists
        if (!peerConnectionRef.current) {
          // console.log("[v0] Creating peer connection...")
          const peerConnection = initializePeerConnection()
          localStreamRef.current!.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStreamRef.current!)
          })
          peerConnectionRef.current = peerConnection
          // console.log("[v0] Peer connection created and tracks added")

          // Process any signals that arrived while we were setting up
          await processPendingSignals()
        }

        // Create and send offer ONLY if initiateOffer is true
        // console.log(`🔌 [WebRTC-DEBUG] Checking if should create offer: initiateOffer=${initiateOffer}`)
        if (initiateOffer) {
          // console.log("🔌 [WebRTC-DEBUG] initiateOffer=true, checking signaling state...")
          // console.log("🔌 [WebRTC-DEBUG] signalingState:", peerConnectionRef.current?.signalingState)

          if (peerConnectionRef.current && peerConnectionRef.current.signalingState === 'stable') {
            // console.log("🔌 [WebRTC-DEBUG] Creating WebRTC offer NOW!")
            const offer = await peerConnectionRef.current.createOffer()
            await peerConnectionRef.current.setLocalDescription(offer)
            // console.log("🔌 [WebRTC-DEBUG] Sending offer to:", contactName)
            sendSignal({ type: "offer", data: offer, to: contactName })
            // console.log("🔌 [WebRTC-DEBUG] Offer sent successfully!")
          } else {
            console.warn("🔌 [WebRTC-DEBUG] Cannot create offer - signalingState is not stable!")
          }
        } else {
          // console.log("🔌 [WebRTC-DEBUG] initiateOffer=false, waiting for offer from peer...")
        }
      } catch (error) {
        console.error("[v0] Error setting up call:", error)
      }
    }

    setupCall()
  }, [contactName, initializePeerConnection, sendSignal, initiateOffer, videoEnabled])

  // Separate useEffect for cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [])

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
      }
    }
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
      }
    }
  }, [])

  const endCall = useCallback(() => {
    console.log("[v0] Ending call - stopping all media tracks")

    // Stop all tracks in localStream state
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        console.log(`[v0] Stopping track: ${track.kind}`)
        track.stop()
      })
    }

    // Also stop tracks from ref (backup)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log(`[v0] Stopping ref track: ${track.kind}`)
        track.stop()
      })
      localStreamRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clear queue
    iceCandidatesQueue.current = []

    setLocalStream(null)
    setRemoteStream(null)
    setIsConnected(false)
    setConnectionState("closed")

    console.log("[v0] Call ended - all tracks stopped")
  }, [localStream])

  return {
    localStream,
    remoteStream,
    isConnected,
    connectionState, // Expose this!
    toggleAudio,
    toggleVideo,
    endCall,
  }
}

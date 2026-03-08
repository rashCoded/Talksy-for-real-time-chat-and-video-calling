"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"
import { WS_URL } from "@/lib/api"

interface WebSocketMessage {
  type: "message" | "typing" | "offer" | "answer" | "ice-candidate" | "status" | "readReceipt" | "presence" | "REACTION" | "CALL_INVITATION" | "CALL_END"
  text?: string
  content?: string
  to?: string
  from?: string
  data?: any
  messageId?: number
  status?: string
  isTyping?: boolean
  isOnline?: boolean
  lastSeen?: string
  fileUrl?: string
  fileName?: string
  fileType?: string
  createdAt?: string
  emoji?: string
  callType?: string
}

interface UseWebSocketProps {
  onMessage?: (message: WebSocketMessage) => void
  onTyping?: (data: { from: string; isTyping: boolean }) => void
  onReaction?: (data: { from: string; messageId: number; emoji: string }) => void
  onCallInvitation?: (data: { from: string; callType: string }) => void
  onCallAccepted?: (data: { from: string }) => void
  onCallRejected?: (data: { from: string }) => void
  onCallEnd?: (data: { from: string }) => void
  onSignal?: (signal: any) => void
  onStatusUpdate?: (data: { messageId: number; status: string }) => void
  onReadReceipt?: (data: { messageId: number; status: string; readAt: string }) => void
  onPresenceUpdate?: (data: { username: string; isOnline: boolean; lastSeen: string }) => void
}

const MOCK_MODE = false // Real WebSocket connection for live messaging

// ========== SINGLETON STOMP CLIENT ==========
// This ensures only ONE connection exists across all useWebSocket instances
let globalStompClient: Client | null = null
let connectionCount = 0 // Track how many components are using the connection
let isConnecting = false

// Global callback registries - all hook instances register their callbacks here
// When a message arrives, ALL registered callbacks are invoked
const signalCallbacks: Set<(signal: any) => void> = new Set()
const callInvitationCallbacks: Set<(data: any) => void> = new Set()
const callAcceptedCallbacks: Set<(data: any) => void> = new Set()
const callRejectedCallbacks: Set<(data: any) => void> = new Set()
const callEndCallbacks: Set<(data: any) => void> = new Set()
const messageCallbacks: Set<(msg: any) => void> = new Set()
const typingCallbacks: Set<(data: any) => void> = new Set()
const presenceCallbacks: Set<(data: any) => void> = new Set()

export function useWebSocket({
  onMessage,
  onTyping,
  onReaction,
  onCallInvitation,
  onCallAccepted,
  onCallRejected,
  onCallEnd,
  onSignal,
  onStatusUpdate,
  onReadReceipt,
  onPresenceUpdate
}: UseWebSocketProps) {
  const [isConnected, setIsConnected] = useState(MOCK_MODE)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use refs for callbacks so they can be updated dynamically
  const onMessageRef = useRef(onMessage)
  const onTypingRef = useRef(onTyping)
  const onReactionRef = useRef(onReaction)
  const onCallInvitationRef = useRef(onCallInvitation)
  const onCallAcceptedRef = useRef(onCallAccepted)
  const onCallRejectedRef = useRef(onCallRejected)
  const onCallEndRef = useRef(onCallEnd)
  const onSignalRef = useRef(onSignal)
  const onStatusUpdateRef = useRef(onStatusUpdate)
  const onReadReceiptRef = useRef(onReadReceipt)
  const onPresenceUpdateRef = useRef(onPresenceUpdate)

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage
    onTypingRef.current = onTyping
    onReactionRef.current = onReaction
    onCallInvitationRef.current = onCallInvitation
    onCallAcceptedRef.current = onCallAccepted
    onCallRejectedRef.current = onCallRejected
    onCallEndRef.current = onCallEnd
    onSignalRef.current = onSignal
    onStatusUpdateRef.current = onStatusUpdate
    onReadReceiptRef.current = onReadReceipt
    onPresenceUpdateRef.current = onPresenceUpdate
  }, [onMessage, onTyping, onReaction, onCallInvitation, onCallAccepted, onCallRejected, onCallEnd, onSignal, onStatusUpdate, onReadReceipt, onPresenceUpdate])

  // Register callbacks to global registries so ALL instances receive events
  // Use stable wrapper functions that read from refs to avoid constant re-registration
  useEffect(() => {
    const signalWrapper = (data: any) => {
      if (onSignalRef.current) onSignalRef.current(data)
    }
    const callInvitationWrapper = (data: any) => {
      if (onCallInvitationRef.current) onCallInvitationRef.current(data)
    }
    const callAcceptedWrapper = (data: any) => {
      if (onCallAcceptedRef.current) onCallAcceptedRef.current(data)
    }
    const callRejectedWrapper = (data: any) => {
      if (onCallRejectedRef.current) onCallRejectedRef.current(data)
    }
    const callEndWrapper = (data: any) => {
      if (onCallEndRef.current) onCallEndRef.current(data)
    }
    const messageWrapper = (data: any) => {
      if (onMessageRef.current) onMessageRef.current(data)
    }
    const typingWrapper = (data: any) => {
      if (onTypingRef.current) onTypingRef.current(data)
    }
    const presenceWrapper = (data: any) => {
      if (onPresenceUpdateRef.current) onPresenceUpdateRef.current(data)
    }

    // Register wrappers
    // console.log("[v0] Registering callback wrappers to global registry")
    signalCallbacks.add(signalWrapper)
    callInvitationCallbacks.add(callInvitationWrapper)
    callAcceptedCallbacks.add(callAcceptedWrapper)
    callRejectedCallbacks.add(callRejectedWrapper)
    callEndCallbacks.add(callEndWrapper)
    messageCallbacks.add(messageWrapper)
    typingCallbacks.add(typingWrapper)
    presenceCallbacks.add(presenceWrapper)

    return () => {
      // Unregister on unmount
      // console.log("[v0] Unregistering callback wrappers from global registry")
      signalCallbacks.delete(signalWrapper)
      callInvitationCallbacks.delete(callInvitationWrapper)
      callAcceptedCallbacks.delete(callAcceptedWrapper)
      callRejectedCallbacks.delete(callRejectedWrapper)
      callEndCallbacks.delete(callEndWrapper)
      messageCallbacks.delete(messageWrapper)
      typingCallbacks.delete(typingWrapper)
      presenceCallbacks.delete(presenceWrapper)
    }
  }, []) // Empty deps - register once, use refs for dynamic callbacks

  const connect = useCallback(() => {
    if (MOCK_MODE) {
      console.log("[v0] Running in mock mode - no real WebSocket connection")
      setIsConnected(true)
      return
    }

    // Don't create new connection if already connected or connecting
    if (globalStompClient?.connected) {
      // console.log("[v0] STOMP already connected, reusing existing connection")
      setIsConnected(true)
      return
    }

    if (isConnecting) {
      // console.log("[v0] STOMP connection already in progress, waiting...")
      return
    }

    try {
      isConnecting = true
      // console.log("[v0] Creating new STOMP connection...")

      const token = localStorage.getItem("token")

      // Create STOMP client with SockJS
      const client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        debug: (str) => {
          // console.log("[v0] STOMP Debug:", str)  // Disabled - too verbose
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      })

      client.onConnect = (frame) => {
        // console.log("[v0] STOMP connected:", frame)
        isConnecting = false
        setIsConnected(true)

        // Get JWT token for authenticated subscriptions
        const token = localStorage.getItem("token")
        if (!token) {
          console.error("[v0] No auth token found")
          return
        }

        // Subscribe to user-specific queues with proper error handling
        try {
          client.subscribe("/user/queue/messages", (message) => {
            try {
              const data = JSON.parse(message.body)
              // console.log("[v0] 🎉 Received private message:", data)
              if (onMessageRef.current) onMessageRef.current(data)
            } catch (parseError) {
              console.error("[v0] Failed to parse message:", parseError, message.body)
            }
          })

          // console.log("[v0] ✅ Successfully subscribed to /user/queue/messages")
        } catch (subscribeError) {
          console.error("[v0] Failed to subscribe to messages:", subscribeError)
        }

        client.subscribe("/user/queue/typing", (message) => {
          const data = JSON.parse(message.body)
          // console.log("[v0] Received typing indicator:", data)
          if (onTypingRef.current) onTypingRef.current({ from: data.from, isTyping: data.isTyping })
        })

        client.subscribe("/user/queue/status", (message) => {
          const data = JSON.parse(message.body)
          // console.log("[v0] Received status update:", data)
          if (onStatusUpdateRef.current) onStatusUpdateRef.current(data)
        })

        client.subscribe("/user/queue/readReceipt", (message) => {
          const data = JSON.parse(message.body)
          // console.log("[v0] Received read receipt:", data)
          if (onReadReceiptRef.current) onReadReceiptRef.current(data)
        })

        client.subscribe("/user/queue/reactions", (message) => {
          const data = JSON.parse(message.body)
          // console.log("[v0] Received reaction:", data)
          if (onReactionRef.current) onReactionRef.current({ from: data.from, messageId: data.messageId, emoji: data.emoji })
        })

        client.subscribe("/user/queue/calls", (message) => {
          const data = JSON.parse(message.body)
          // console.log("[v0] Received call event:", data)
          // Dispatch to ALL registered callbacks
          if (data.type === 'CALL_INVITATION') {
            callInvitationCallbacks.forEach(cb => cb({ from: data.from, callType: data.callType }))
          } else if (data.type === 'CALL_ACCEPTED') {
            callAcceptedCallbacks.forEach(cb => cb({ from: data.from }))
          } else if (data.type === 'CALL_REJECTED') {
            callRejectedCallbacks.forEach(cb => cb({ from: data.from }))
          } else if (data.type === 'CALL_END') {
            callEndCallbacks.forEach(cb => cb({ from: data.from }))
          }
        })

        client.subscribe("/user/queue/webrtc", (signal) => {
          const data = JSON.parse(signal.body)
          // console.log("[v0] Received WebRTC signal:", data.type)
          // Dispatch to ALL registered signal handlers
          signalCallbacks.forEach(cb => cb(data))
        })

        // Subscribe to presence updates
        client.subscribe("/topic/presence", (message) => {
          const data = JSON.parse(message.body)
          // console.log("[v0] Received presence update:", data)
          // Dispatch to ALL registered callbacks
          presenceCallbacks.forEach(cb => cb(data))
        })

        // Notify server that user is online
        client.publish({
          destination: "/app/chat.addUser",
          body: JSON.stringify({}),
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      }

      client.onStompError = (frame) => {
        console.error("[v0] STOMP error:", frame.headers['message'], frame.body)
        isConnecting = false
        setIsConnected(false)
      }

      client.onWebSocketClose = (event) => {
        console.log("[v0] WebSocket closed:", event)
        isConnecting = false
        setIsConnected(false)
      }

      client.onDisconnect = (frame) => {
        console.log("[v0] STOMP disconnected:", frame)
        isConnecting = false
        setIsConnected(false)
      }

      // Store reference before activating
      globalStompClient = client

      // Activate the client
      client.activate()
    } catch (error) {
      console.error("[v0] Failed to connect STOMP:", error)
      isConnecting = false
      setIsConnected(false)
    }
  }, [])

  useEffect(() => {
    // Increment connection count and connect
    connectionCount++
    // console.log(`[v0] WebSocket hook mounted, connection count: ${connectionCount}`)

    connect()

    return () => {
      // Decrement connection count
      connectionCount--
      // console.log(`[v0] WebSocket hook unmounting, connection count: ${connectionCount}`)

      // Clean up timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      // Only deactivate if this was the LAST hook using the connection
      if (connectionCount === 0 && globalStompClient) {
        console.log("[v0] Last hook unmounted, deactivating STOMP client...")
        globalStompClient.deactivate()
        globalStompClient = null
      }
    }
  }, [])

  const sendMessage = useCallback((message: Omit<WebSocketMessage, "type">) => {
    if (MOCK_MODE) {
      console.log("[v0] Mock mode - sending message:", message)
      // Simulate message reception for testing
      setTimeout(() => {
        if (onMessage) {
          onMessage({
            type: "message",
            text: `Mock echo: ${message.text}`,
            from: message.to,
            to: "current_user",
            messageId: Date.now()
          })
        }
      }, 1000)
      return
    }

    if (globalStompClient && globalStompClient.connected) {
      console.log("[v0] Sending message:", message)
      const token = localStorage.getItem("token")
      globalStompClient.publish({
        destination: "/app/chat.sendMessage",
        body: JSON.stringify({
          text: message.text,
          to: message.to,
          type: message.data?.type || "TEXT",
          fileUrl: message.data?.fileUrl,
          fileName: message.data?.fileName,
          fileType: message.data?.fileType
        }),
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } else {
      console.error("[v0] STOMP client is not connected")
    }
  }, [])

  const sendTypingIndicator = useCallback((to: string, isTyping: boolean) => {
    if (MOCK_MODE) return

    if (globalStompClient && globalStompClient.connected) {
      const token = localStorage.getItem("token")
      globalStompClient.publish({
        destination: "/app/chat.typing",
        body: JSON.stringify({ to, isTyping }),
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    }
  }, [])

  const markMessageAsRead = useCallback((messageId: number) => {
    if (MOCK_MODE) return

    if (globalStompClient && globalStompClient.connected) {
      const token = localStorage.getItem("token")
      globalStompClient.publish({
        destination: "/app/chat.markAsRead",
        body: JSON.stringify({ messageId }),
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    }
  }, [])

  const sendVoiceMessage = useCallback((to: string, audioUrl: string, duration: number) => {
    if (MOCK_MODE) return

    if (globalStompClient && globalStompClient.connected) {
      const token = localStorage.getItem("token")
      globalStompClient.publish({
        destination: "/app/chat.voiceMessage",
        body: JSON.stringify({ to, audioUrl, duration }),
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    }
  }, [])

  const sendSignal = useCallback((signal: any) => {
    if (MOCK_MODE) {
      console.log("[v0] Mock mode - signal would be sent:", signal)
      return
    }

    if (globalStompClient && globalStompClient.connected) {
      globalStompClient.publish({
        destination: "/app/webrtc.signal",
        body: JSON.stringify(signal)
      })
    }
  }, [])

  const sendCallMessage = useCallback((message: { type: string, to: string, from: string, callType?: string }) => {
    if (MOCK_MODE) {
      console.log("[v0] Mock mode - call message would be sent:", message)
      return
    }

    if (globalStompClient && globalStompClient.connected) {
      const token = localStorage.getItem("token")

      // Route to correct endpoint based on message type
      let destination = "/app/call.invite"
      if (message.type === 'CALL_END') {
        destination = "/app/call.end"
      } else if (message.type === 'CALL_ACCEPTED') {
        destination = "/app/call.accept"
      } else if (message.type === 'CALL_REJECTED') {
        destination = "/app/call.reject"
      } else if (message.type === 'CALL_INVITATION') {
        destination = "/app/call.invite"
      }

      // console.log(`📞 [WS-DEBUG] Sending ${message.type} to ${destination}`)
      // console.log(`📞 [WS-DEBUG] Payload:`, JSON.stringify(message))

      globalStompClient.publish({
        destination,
        body: JSON.stringify(message),
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      // console.log(`📞 [WS-DEBUG] Message published successfully!`)
    } else {
      console.error("❌ [WS-DEBUG] Cannot send - STOMP not connected!", globalStompClient?.connected)
    }
  }, [])

  return {
    isConnected,
    sendMessage,
    sendSignal,
    sendTypingIndicator,
    markMessageAsRead,
    sendVoiceMessage,
    sendCallMessage,
    stompClient: globalStompClient,
  }
}

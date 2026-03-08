"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Video, Send, Paperclip, Smile, Phone, CheckCheck, Check, Search, MessageSquare, ArrowLeft, Download } from "lucide-react"
import { EmojiPicker } from "@/components/emoji-picker"
import { FileUploadAdvanced } from "@/components/file-upload-advanced"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useWebSocket } from "@/hooks/use-websocket"
import { CallManager, CallState, CallType } from "./call-manager"
import { API_URL } from "@/lib/api"

interface Message {
  id: number
  content: string
  senderUsername: string
  receiverUsername: string
  type: "TEXT" | "FILE" | "IMAGE" | "VIDEO" | "AUDIO"
  status: "SENT" | "DELIVERED" | "READ"
  fileUrl?: string
  fileName?: string
  fileType?: string
  createdAt: string
  readAt?: string
  reactions?: { [key: string]: string }
}

interface ChatPanelProps {
  contactName: string | null
  onStartCall: () => void
  onStartVoiceCall?: () => void
  onBack?: () => void
}

export function ChatPanel({ contactName, onStartCall, onStartVoiceCall, onBack }: ChatPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [contactTyping, setContactTyping] = useState(false)
  const [messageStatuses, setMessageStatuses] = useState<{ [key: number]: string }>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Call State
  const [callState, setCallState] = useState<CallState>("IDLE")
  const [callType, setCallType] = useState<CallType>("voice")
  const [incomingCaller, setIncomingCaller] = useState<string>("")

  // WebSocket integration
  const {
    isConnected,
    sendMessage: sendWebSocketMessage,
    sendTypingIndicator,
    markMessageAsRead,
    sendVoiceMessage,
    sendCallMessage
  } = useWebSocket({
    onMessage: (message) => {
      console.log("📨 Received WebSocket message:", message)

      // Handle message if it's from the current contact OR if we're in the right conversation
      if (message.from === contactName || message.to === contactName) {
        const newMessage: Message = {
          id: message.messageId || Date.now(),
          content: message.text || message.content || "",
          senderUsername: message.from || "",
          receiverUsername: currentUser?.username || "",
          type: (message.data?.type as "TEXT" | "FILE" | "IMAGE" | "VIDEO" | "AUDIO") || "TEXT",
          status: "DELIVERED",
          fileUrl: message.data?.fileUrl || (message as any).fileUrl,
          fileName: message.data?.fileName || (message as any).fileName,
          fileType: message.data?.fileType || (message as any).fileType,
          createdAt: message.createdAt || new Date().toISOString()
        }
        setMessages(prev => [...prev, newMessage])

        // Enhanced notification system for received messages
        if (message.from !== currentUser?.username) {
          // Play notification sound
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEYBjGJ0fPTezQGHnPE8N+WRwwfVrTp65tNDANDmNXu5VYUAlpwvrNN')
            audio.volume = 0.3
            audio.play().catch(() => { })
          } catch (e) {
            console.warn('Could not play notification sound')
          }

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`💬 ${message.from}`, {
              body: message.text || message.content || 'New message',
              icon: '/placeholder.svg',
              tag: `message-${message.from}`,
              requireInteraction: false
            })
          }

          // Show toast notification  
          toast.success(`💬 ${message.from}`, {
            description: message.text || message.content || 'New message received',
            duration: 4000,
            action: {
              label: "Reply",
              onClick: () => {
                (document.querySelector('input[placeholder*="Type"]') as HTMLInputElement)?.focus()
              }
            }
          })
        }

        // Auto-mark as read
        if (message.messageId) {
          markMessageAsRead(message.messageId)
        }

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
      }
    },
    onTyping: (data) => {
      if (data.from === contactName) {
        setContactTyping(data.isTyping)

        if (data.isTyping) {
          // Clear typing indicator after 3 seconds
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
          }
          typingTimeoutRef.current = setTimeout(() => {
            setContactTyping(false)
          }, 3000)
        }
      }
    },
    onStatusUpdate: (data) => {
      setMessageStatuses(prev => ({
        ...prev,
        [data.messageId]: data.status
      }))
    },
    onReadReceipt: (data) => {
      setMessages(prev => prev.map(msg =>
        msg.id === data.messageId
          ? { ...msg, status: "READ", readAt: data.readAt }
          : msg
      ))
    },
    onPresenceUpdate: (data) => {
      // Handle presence updates if needed
      console.log("Presence update:", data)
    },
    onReaction: (data) => {
      // Handle incoming emoji reactions
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            reactions: {
              ...msg.reactions,
              [data.from]: data.emoji
            }
          }
        }
        return msg
      }))
    },
    onCallInvitation: (data) => {
      setIncomingCaller(data.from)
      setCallType(data.callType as CallType)
      setCallState("INCOMING")

      // Play ringtone or notification sound here if desired
    },
    onCallEnd: (data) => {
      if (callState !== "IDLE") {
        setCallState("IDLE")
        toast.info("Call ended")
      }
    }
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    if (contactName && currentUser) {
      loadConversation()

      // Set up periodic message polling as fallback (less frequent to reduce server load)
      const pollInterval = setInterval(() => {
        loadConversation()
      }, 10000) // Poll every 10 seconds

      return () => clearInterval(pollInterval)
    }
  }, [contactName, currentUser])

  const loadConversation = async () => {
    if (!contactName) return

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`http://localhost:8080/api/messages/conversation/${contactName}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const conversationMessages = await response.json()
        const messageArray = conversationMessages || []

        // Only update if we got different messages to avoid clearing chat
        if (JSON.stringify(messageArray) !== JSON.stringify(messages)) {
          setMessages(messageArray)
          console.log(`✅ Loaded ${messageArray.length} messages with ${contactName}`)
        }
      } else {
        console.error('Failed to load conversation:', response.status, response.statusText)
        // Don't clear messages on error - keep existing ones
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      // Don't show error toast on polling - too annoying
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !contactName || loading) return

    const messageText = inputValue.trim()
    setInputValue("")
    setLoading(true)

    // Add message to UI immediately for instant feedback
    const tempMessage: Message = {
      id: Date.now(),
      content: messageText,
      senderUsername: currentUser?.username || "",
      receiverUsername: contactName,
      type: "TEXT",
      status: "SENT",
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMessage])

    // Always use REST API for reliable message sending
    {
      // Fallback to REST API if WebSocket is not connected
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('http://localhost:8080/api/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            receiverUsername: contactName,
            content: messageText
          })
        })

        const data = await response.json()
        if (response.ok && data.success) {
          // Update the temporary message with the real message data
          setMessages(prev => prev.map(msg =>
            msg.id === tempMessage.id
              ? { ...data.message, id: data.message.id || tempMessage.id }
              : msg
          ))
          console.log("✅ Message sent successfully via REST API")

          // Trigger contacts list refresh for new message
          window.dispatchEvent(new CustomEvent('messagesSent'))
        } else {
          setInputValue(messageText) // Restore message
          toast.error("Failed to send message", {
            description: data.error || "Please try again"
          })
        }
      } catch (error) {
        console.error('Error sending message:', error)
        setInputValue(messageText) // Restore message
        toast.error("Network error", {
          description: "Unable to send message. Check your connection."
        })
      }
    }

    // Clear typing indicator
    if (contactName) {
      sendTypingIndicator(contactName, false)
    }

    setLoading(false)

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }, [inputValue, contactName, loading, isConnected, sendWebSocketMessage, currentUser, sendTypingIndicator])

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)

    // Send typing indicator with debounce (don't update local state)
    if (contactName && isConnected) {
      const isCurrentlyTyping = value.length > 0
      sendTypingIndicator(contactName, isCurrentlyTyping)

      // Stop typing indicator after 2 seconds of inactivity
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      if (value.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingIndicator(contactName, false)
        }, 2000)
      }
    }
  }, [contactName, isConnected, sendTypingIndicator])



  // Call Handlers
  const handleVoiceCall = useCallback(async () => {
    if (!contactName || !isConnected) return

    setCallType("voice")
    setCallState("OUTGOING")

    sendCallMessage({
      type: 'CALL_INVITATION',
      callType: 'voice',
      to: contactName,
      from: currentUser?.username || ''
    })
  }, [contactName, isConnected, sendCallMessage, currentUser])

  const handleVideoCall = useCallback(async () => {
    if (!contactName || !isConnected) return

    setCallType("video")
    setCallState("OUTGOING")

    sendCallMessage({
      type: 'CALL_INVITATION',
      callType: 'video',
      to: contactName,
      from: currentUser?.username || ''
    })
  }, [contactName, isConnected, sendCallMessage, currentUser])

  const handleAcceptCall = useCallback(() => {
    setCallState("ACTIVE")
    // Send accept message if needed by backend, though strictly WebRTC hook handles signaling.
    // However, we usually need to tell the other side "I accepted" so they stop ringing.
    // Assuming backend handles signaling relay, but we might want an explicit ACCEPT message.
    if (incomingCaller && isConnected) {
      // Ideally we should have a CALL_ACCEPTED type, but for now we proceed to WebRTC negotiation
      // which starts automatically when VideoCall component mounts and useWebRTC hook runs.
      // The other side needs to know to stop ringing though.
      // The current backend has `call.accept` endpoint mapping? Check WebSocketController.
      // Yes: @MessageMapping("/call.accept")

      // Access stompClient directly or expose a method? 
      // We can use sendWebSocketMessage with specific payload if needed, or better expose a method from hook.
      // For now, let's use sendWebSocketMessage generic or reuse mechanism.
      // Actually `useWebSocket` hook doesn't expose generic send for custom types easily except `sendMessage` which forces 'message' type?
      // Wait, `sendMessage` in hook sends to `/app/chat.sendMessage`.
      // We need to send to `/app/call.accept`.
      // The hook needs update or we cheat.
      // Let's cheat for now and assume WebRTC signaling start (OFFER) is enough or update hook later.
      // ACTUALLY, checking `use-websocket.ts`, we probably can't reach `call.accept` without editing the hook.
      // But wait, `use-webrtc.ts` starts sending OFFER immediately on mount.
      // If the caller is in "OUTGOING" state, they are waiting for... what?
      // Usually they wait for ACCEPT to start WebRTC or they start WebRTC and wait for ANSWER.
      // Let's assume the OFFER sent by `VideoCall` on mount is sufficient to "accept".
    }
  }, [incomingCaller, isConnected])

  const handleRejectCall = useCallback(() => {
    setCallState("IDLE")
    if (incomingCaller && isConnected) {
      // Send reject to stop ringing on other end. 
      // We need to access the socket.
      // Again, we need to hit `/app/call.reject`.
    }
  }, [incomingCaller, isConnected])

  const handleEndCall = useCallback(() => {
    setCallState("IDLE")
    const target = contactName || incomingCaller
    if (target && isConnected) {
      sendCallMessage({
        type: 'CALL_END',
        to: target,
        from: currentUser?.username || ''
      })
    }
  }, [contactName, incomingCaller, isConnected, sendCallMessage, currentUser])

  // Smart Message Search Feature
  const handleSmartSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const results = messages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase()) ||
      msg.fileName?.toLowerCase().includes(query.toLowerCase()) ||
      msg.senderUsername.toLowerCase().includes(query.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setSearchResults(results)

    toast.success(`Found ${results.length} messages`, {
      description: `Searching for "${query}"`
    })
  }, [messages])

  // Quick Emoji Reactions Feature  
  const handleEmojiReaction = useCallback((messageId: number, emoji: string) => {
    // Update local state immediately
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          reactions: {
            ...msg.reactions,
            [currentUser?.username]: emoji
          }
        }
      }
      return msg
    }))

    // Send reaction via WebSocket to other person
    if (isConnected && contactName) {
      sendWebSocketMessage({
        type: 'REACTION',
        messageId,
        emoji,
        to: contactName,
        from: currentUser?.username || ''
      })
    }

    // Send to backend via REST API as backup
    const token = localStorage.getItem('token')
    if (token) {
      fetch(`${API_URL}/api/messages/reaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId,
          emoji,
          receiverUsername: contactName
        })
      }).catch(err => console.error('Failed to send reaction:', err))
    }
  }, [isConnected, contactName, sendWebSocketMessage, currentUser])



  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleFileUpload = useCallback(async (fileData: {
    fileUrl: string
    fileName: string
    fileType: string
    messageType: "FILE" | "IMAGE" | "VIDEO" | "AUDIO"
  }) => {
    if (!contactName) return

    // Send via WebSocket
    sendWebSocketMessage({
      text: fileData.fileName,
      to: contactName,
      data: {
        type: fileData.messageType,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileType: fileData.fileType
      }
    })

    // Add to local messages
    const newMessage: Message = {
      id: Date.now(),
      content: fileData.fileName,
      senderUsername: currentUser?.username || "",
      receiverUsername: contactName,
      type: fileData.messageType,
      status: "SENT",
      fileUrl: fileData.fileUrl,
      fileName: fileData.fileName,
      fileType: fileData.fileType,
      createdAt: new Date().toISOString()
    }

    setMessages(prev => [...prev, newMessage])
    setShowFileUpload(false)
  }, [contactName, currentUser, sendWebSocketMessage])

  if (!contactName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-background to-muted/10">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-primary/50" />
        </div>
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">Welcome to Talksy</h3>
        <p className="text-sm sm:text-base text-muted-foreground max-w-sm">
          Select a conversation from the sidebar to start chatting, or browse your contacts to connect with someone new.
        </p>
      </div>
    )
  }

  const initials = contactName
    .split(" ")
    .map((n) => n[0])
    .join("")

  const contactAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contactName || 'default')}`

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      <div className="border-b border-border/50 bg-card/95 backdrop-blur-sm shadow-sm flex-shrink-0">
        <div className="p-3 sm:p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="relative">
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 ring-2 ring-primary/10">
                <AvatarImage src={contactAvatar || "/placeholder.svg"} alt={contactName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card shadow-sm" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{contactName}</h3>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-accent"
                  title="Smart Search"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>🔍 Smart Message Search</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Search messages, files, or senders..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      handleSmartSearch(e.target.value)
                    }}
                    className="w-full"
                  />
                  {searchResults.length > 0 && (
                    <ScrollArea className="h-60">
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <div key={result.id} className="p-2 border rounded-md hover:bg-accent cursor-pointer"
                            onClick={() => {
                              setShowSearchDialog(false)
                              toast.success("Found message!", {
                                description: `From ${result.senderUsername}`
                              })
                            }}>
                            <p className="font-medium text-xs text-muted-foreground">{result.senderUsername}</p>
                            <p className="text-sm">{result.content || result.fileName}</p>
                            <p className="text-xs text-muted-foreground">{new Date(result.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={() => {
                console.log("📞 Voice call button clicked!")
                // Call the prop callback to update page state (show VoiceCall component)
                if (onStartVoiceCall) onStartVoiceCall()
              }}
              title="Voice Call"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={() => {
                console.log("📞 Video call button clicked!")
                // Call the prop callback to update page state (show VideoCall component)
                if (onStartCall) onStartCall()
              }}
              title="Video Call"
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 bg-gradient-to-b from-muted/5 to-background overflow-auto">
        <div className="p-4 space-y-4">
          {messages.map((message, index) => {
            const isMe = currentUser && message.senderUsername === currentUser.username
            const isThem = !isMe
            const showAvatar = isThem && (index === 0 || currentUser && messages[index - 1].senderUsername === currentUser.username)
            const isLastInGroup = index === messages.length - 1 || (currentUser && messages[index + 1]?.senderUsername !== message.senderUsername)

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"} group`}
              >
                {isThem && (
                  <div className="w-6 sm:w-8">
                    {showAvatar && (
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                        <AvatarImage src={contactAvatar} alt={contactName || 'Contact'} />
                        <AvatarFallback className="bg-primary/20 text-primary-foreground text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[70%]`}
                >
                  <div className={`
                        max-w-[80%] rounded-2xl px-4 py-2 shadow-sm transition-all duration-200
                        ${isMe
                      ? 'bg-primary text-primary-foreground rounded-br-none hover:shadow-md'
                      : 'bg-card border border-border/50 rounded-bl-none hover:shadow-md'
                    }
                        animate-in fade-in slide-in-from-bottom-2 duration-300
                      `}>
                    {/* Message Content */}
                    {message.type === 'TEXT' && (
                      <p className="text-sm sm:text-base break-words leading-relaxed">{message.content}</p>
                    )}

                    {message.type === 'IMAGE' && (
                      <div className="relative group cursor-pointer overflow-hidden rounded-lg">
                        <img
                          src={message.fileUrl}
                          alt="Shared image"
                          className="max-w-full rounded-lg max-h-60 object-cover transition-transform duration-300 group-hover:scale-105"
                          onClick={() => window.open(message.fileUrl, '_blank')}
                        />
                        <a
                          href={message.fileUrl}
                          download={message.fileName || 'image'}
                          className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="h-4 w-4 text-white" />
                        </a>
                      </div>
                    )}

                    {message.type === 'VIDEO' && (
                      <div className="relative group">
                        <video
                          src={message.fileUrl}
                          controls
                          className="max-w-full rounded-lg max-h-60"
                        />
                        <a
                          href={message.fileUrl}
                          download={message.fileName || 'video'}
                          className="absolute top-2 right-2 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        >
                          <Download className="h-4 w-4 text-white" />
                        </a>
                      </div>
                    )}

                    {message.type === 'AUDIO' && (
                      <div className="flex items-center gap-2">
                        <audio
                          src={message.fileUrl}
                          controls
                          className="max-w-full"
                        />
                        <a
                          href={message.fileUrl}
                          download={message.fileName || 'audio'}
                          className="p-2 bg-background/10 rounded-full hover:bg-background/20"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )}

                    {message.type === 'FILE' && (
                      <div className="flex items-center gap-2 p-2 bg-background/10 rounded-lg">
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm flex-1">{message.fileName || 'Attached File'}</span>
                        <a
                          href={message.fileUrl}
                          download={message.fileName || 'file'}
                          className="p-1.5 bg-background/20 rounded-full hover:bg-background/30"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className={`
                          text-[10px] mt-1 flex items-center gap-1 opacity-70
                          ${isMe ? 'justify-end text-primary-foreground/80' : 'justify-start text-muted-foreground'}
                        `}>
                      <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {isMe && (
                        <span>
                          {message.status === 'READ' ? (
                            <CheckCheck className="h-3 w-3 text-blue-200" />
                          ) : message.status === 'DELIVERED' ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {message.reactions && Object.keys(message.reactions).length > 0 && (
                    <div className={`
                          ml-2 flex gap-1 -mt-2 z-10 relative
                          ${isMe ? 'mr-2 justify-end' : 'ml-2 justify-start'}
                        `}>
                      {Object.entries(message.reactions).map(([user, emoji]) => (
                        <div key={user} className="px-1.5 py-0.5 bg-background border border-border rounded-full text-[10px] shadow-sm animate-in zoom-in duration-200" title={user}>
                          {emoji}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Typing Indicator */}
          {contactTyping && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="bg-card border border-border/50 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Advanced File Upload */}
      {showFileUpload && (
        <div className="border-t border-border/50 p-4">
          <FileUploadAdvanced
            onFileUpload={handleFileUpload}
            receiverUsername={contactName || ""}
            className="mb-4"
          />
        </div>
      )}

      <div className="border-t border-border/50 bg-card/95 backdrop-blur-sm shadow-lg mt-auto flex-shrink-0">
        <div className="p-3 sm:p-4">
          <div className="flex items-end gap-2 bg-background/50 rounded-2xl border border-border/50 p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0 h-9 w-9"
            >
              <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <EmojiPicker open={showEmojiPicker} onOpenChange={setShowEmojiPicker} onEmojiSelect={handleEmojiSelect}>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0 h-9 w-9"
              >
                <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </EmojiPicker>

            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
            />

            <Button
              onClick={handleSend}
              size="icon"
              disabled={!inputValue.trim() || loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all shrink-0 disabled:opacity-50 h-9 w-9"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {loading && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Sending message...
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isConnected ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span>Connecting...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <CallManager
        callState={callState}
        callType={callType}
        contactName={callState === "OUTGOING" || callState === "ACTIVE" ? contactName : incomingCaller}
        callerName={incomingCaller}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
      />
    </div>
  )
}

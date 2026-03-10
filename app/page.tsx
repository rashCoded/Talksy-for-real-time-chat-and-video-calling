"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChatPanel } from "@/components/chat-panel"
import { VideoCall } from "@/components/video-call"
import { VoiceCall } from "@/components/voice-call"
import { ContactProfile } from "@/components/contact-profile"
import { ThemeToggle } from "@/components/theme-toggle"
import { AvatarSelectionModal } from "@/components/avatar-selection-modal"
import { NotificationSystem } from "@/components/notification-system"
import { IncomingCall } from "@/components/incoming-call"
import { CallLog } from "@/components/call-log"
import { useWebSocket } from "@/hooks/use-websocket"
import { API_URL } from "@/lib/api"
import { Search, Plus, Menu, UserPlus, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

interface Contact {
  username: string
  email: string
  avatarUrl?: string
  online: boolean
  lastMessage?: string
  lastMessageTime?: string
}

interface SearchUser {
  id: number
  username: string
  email: string
  avatarUrl?: string
  online: boolean
}

export default function Home() {
  const router = useRouter()
  const [activeContact, setActiveContact] = useState<string | null>(null)
  const [isInCall, setIsInCall] = useState(false)
  const [isInVoiceCall, setIsInVoiceCall] = useState(false)
  const [selectedContactProfile, setSelectedContactProfile] = useState<string | null>(null)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Chat list
  const [conversations, setConversations] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Search users dialog
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Incoming call state (global)
  const [incomingCaller, setIncomingCaller] = useState<string | null>(null)
  const [incomingCallType, setIncomingCallType] = useState<"voice" | "video">("voice")
  const [isIncomingCall, setIsIncomingCall] = useState(false)
  const [isCallAccepted, setIsCallAccepted] = useState(false)

  const getUserData = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || '{}')
    } catch {
      return {}
    }
  }

  // Global WebSocket for incoming calls
  const { sendCallMessage, isConnected } = useWebSocket({
    onCallInvitation: (data) => {
      console.log("📞 INCOMING CALL from:", data.from, "type:", data.callType)
      toast.info(`📞 Incoming ${data.callType} call from ${data.from}!`)
      setIncomingCaller(data.from)
      setIncomingCallType(data.callType as "voice" | "video")
    },
    onCallAccepted: (data) => {
      console.log("✅ Call accepted by:", data.from)
      // Only meaningful if we are the caller (isInCall or isInVoiceCall is true but !isIncomingCall)
      setIsCallAccepted(true)
      toast.success("Call connected!")
    },
    onCallRejected: (data) => {
      console.log("❌ Call rejected by:", data.from)
      toast.info("Call declined")
      setIsInCall(false)
      setIsInVoiceCall(false)
      setIsCallAccepted(false)
    },
    onCallEnd: (data) => {
      console.log("📴 Call ended by:", data.from)
      setIncomingCaller(null)
      setIsInCall(false)
      setIsInVoiceCall(false)
      setIsIncomingCall(false)
      setIsCallAccepted(false)
      toast.info("Call ended")
    }
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations()
    }
  }, [isAuthenticated])

  const loadConversations = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch('http://localhost:8080/api/users/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const friends = await response.json()

        const contactsWithMessages = await Promise.all(
          friends.map(async (friend: any) => {
            try {
              const messagesResponse = await fetch(`http://localhost:8080/api/messages/conversation/${friend.username}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })

              let lastMessage = null
              let lastMessageTime = null

              if (messagesResponse.ok) {
                const messages = await messagesResponse.json()
                if (messages.length > 0) {
                  const lastMsg = messages[messages.length - 1]
                  lastMessage = lastMsg.content
                  lastMessageTime = lastMsg.createdAt
                }
              }

              return {
                username: friend.username,
                email: friend.email,
                avatarUrl: friend.avatarUrl,
                online: friend.online || false,
                lastMessage,
                lastMessageTime
              }
            } catch {
              return {
                username: friend.username,
                email: friend.email,
                avatarUrl: friend.avatarUrl,
                online: friend.online || false,
                lastMessage: null,
                lastMessageTime: null
              }
            }
          })
        )

        // Sort by last message time
        const sorted = contactsWithMessages.sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
          return timeB - timeA
        })

        setConversations(sorted)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const token = localStorage.getItem('token')
    if (!token) return

    setSearchLoading(true)
    try {
      const response = await fetch(`http://localhost:8080/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        setSearchResults(await response.json())
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const sendFriendRequest = async (user: SearchUser) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/api/friends/send-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ receiverEmail: user.email })
      })

      const data = await response.json()
      if (response.ok) {
        toast.success('Friend request sent!')
        setSearchResults(prev => prev.filter(u => u.id !== user.id))
      } else {
        toast.error(data.message || 'Failed to send request')
      }
    } catch (error) {
      toast.error('Network error')
    }
  }

  const handleSelectContact = (name: string) => {
    setActiveContact(name)
    setSidebarOpen(false)
    setSelectedContactProfile(null)
    setIsInCall(false)
    setIsInVoiceCall(false)
    setShowSearchDialog(false)
    setIsIncomingCall(false)
  }

  const handleAvatarComplete = (avatarUrl: string) => {
    setShowAvatarModal(false)
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      user.avatarUrl = avatarUrl
      localStorage.setItem("user", JSON.stringify(user))
    }
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter(c =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // CALL INITIATION - Send invitation to backend!
  const handleStartVideoCall = () => {
    if (!activeContact) {
      console.error("❌ Cannot start call - no active contact!")
      return
    }
    if (!isConnected) {
      toast.error("Not connected to server. Please wait...")
      return
    }
    const username = getUserData().username
    // console.log("📞 [DEBUG] Starting VIDEO call:", { from: username, to: activeContact })
    setIsInCall(true)
    setIsInVoiceCall(false)
    setIsIncomingCall(false)
    setIsCallAccepted(false)
    sendCallMessage({
      type: 'CALL_INVITATION',
      callType: 'video',
      to: activeContact,
      from: username
    })
    // console.log("📞 [DEBUG] CALL_INVITATION sent!")
  }

  const handleStartVoiceCall = () => {
    if (!activeContact) {
      console.error("❌ Cannot start call - no active contact!")
      return
    }
    if (!isConnected) {
      toast.error("Not connected to server. Please wait...")
      return
    }
    const username = getUserData().username
    // console.log("📞 [DEBUG] Starting VOICE call:", { from: username, to: activeContact })
    setIsInVoiceCall(true)
    setIsInCall(false)
    setIsIncomingCall(false)
    setIsCallAccepted(false)
    sendCallMessage({
      type: 'CALL_INVITATION',
      callType: 'voice',
      to: activeContact,
      from: username
    })
    // console.log("📞 [DEBUG] CALL_INVITATION sent!")
  }

  const handleLocalEndCall = () => {
    if (activeContact) {
      console.log("🛑 Ending call locally, sending signal to:", activeContact)
      sendCallMessage({ type: "CALL_END", to: activeContact, from: getUserData().username })
    }
    setIsInCall(false)
    setIsInVoiceCall(false)
    setIsIncomingCall(false)
    setIsCallAccepted(false)
  }

  //

  if (!isAuthenticated) {
    return null
  }

  const SidebarContent = () => (
    // ... (sidebar content remains same, not touching it to avoid breaking)
    <div className="h-full flex flex-col bg-card/95 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-card to-card/80 flex-shrink-0">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Talksy</h2>
        {/* ... rest of header ... */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedContactProfile("Your Profile")}
            className="h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-primary/20 transition-all"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={getUserData().avatarUrl || "/placeholder.svg"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getUserData().username?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </Button>
          <CallLog />
          <ThemeToggle />
        </div>
      </div>

      {/* ... rest of sidebar ... */}
      {/* Search Bar */}
      <div className="p-3 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 bg-background/50 border-border/50 rounded-xl"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            // ... empty state ...
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No conversations yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start chatting with friends on Talksy
              </p>
              <Button onClick={() => setShowSearchDialog(true)} className="gap-2">
                <Search className="h-4 w-4" />
                Find users
              </Button>
            </div>
          ) : (
            filteredConversations.map((contact) => (
              <button
                key={contact.username}
                onClick={() => handleSelectContact(contact.username)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-all rounded-xl mb-1 text-left ${activeContact === contact.username ? "bg-primary/10" : ""
                  }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.username}`} />
                    <AvatarFallback>{contact.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-foreground truncate">{contact.username}</span>
                    {contact.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.lastMessage || "No messages yet"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Floating Action Button */}
      <div className="absolute bottom-4 right-4">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setShowSearchDialog(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 border-r border-border/50 shadow-xl relative">
          <SidebarContent />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="lg:hidden border-b border-border/50 bg-card/95 backdrop-blur-sm p-3 flex items-center justify-between gap-3 flex-shrink-0">
            {/* ... mobile header ... */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-bold text-foreground">Talksy</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedContactProfile("Your Profile")}
              className="h-10 w-10 rounded-full p-0"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={getUserData().avatarUrl || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getUserData().username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {selectedContactProfile ? (
              <ContactProfile
                contactName={selectedContactProfile}
                onClose={() => setSelectedContactProfile(null)}
                onStartChat={() => {
                  handleSelectContact(selectedContactProfile)
                  setSelectedContactProfile(null)
                }}
              />
            ) : isInVoiceCall ? (
              <VoiceCall
                contactName={activeContact || "Unknown"}
                isIncoming={isIncomingCall}
                isAccepted={isCallAccepted}
                onEndCall={handleLocalEndCall}
              />
            ) : isInCall ? (
              <VideoCall
                contactName={activeContact || "Unknown"}
                isIncoming={isIncomingCall}
                isAccepted={isCallAccepted}
                onEndCall={handleLocalEndCall}
              />
            ) : (
              <ChatPanel
                contactName={activeContact}
                onStartCall={handleStartVideoCall}
                onStartVoiceCall={handleStartVoiceCall}
                onBack={() => setActiveContact(null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ... Dialogs ... */}


      {/* Search Users Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Find Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value)
                  searchUsers(e.target.value)
                }}
                placeholder="Search by username or email..."
                className="pl-9"
                autoFocus
              />
            </div>
            <ScrollArea className="max-h-80">
              {searchLoading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">Searching...</div>
              ) : searchResults.length === 0 && userSearchQuery ? (
                <div className="text-center py-4 text-sm text-muted-foreground">No users found</div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => sendFriendRequest(user)}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AvatarSelectionModal
        open={showAvatarModal}
        onOpenChange={setShowAvatarModal}
        onComplete={handleAvatarComplete}
      />

      <NotificationSystem
        onNewMessage={(message) => {
          handleSelectContact(message.from)
        }}
      />

      {/* Global Incoming Call Overlay */}
      {incomingCaller && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm">
          <IncomingCall
            callerName={incomingCaller}
            callType={incomingCallType}
            onAccept={() => {
              const username = getUserData().username
              console.log("✅ [DEBUG] Accepting call from:", incomingCaller, "as:", username)
              setActiveContact(incomingCaller)

              console.log("✅ [DEBUG] Sending CALL_ACCEPTED to:", incomingCaller)
              sendCallMessage({ type: "CALL_ACCEPTED", to: incomingCaller, from: username })

              if (incomingCallType === "video") {
                console.log("✅ [DEBUG] Setting isInCall=true (video)")
                setIsInCall(true)
              } else {
                console.log("✅ [DEBUG] Setting isInVoiceCall=true (voice)")
                setIsInVoiceCall(true)
              }
              setIsIncomingCall(true)
              setIsCallAccepted(true)
              setIncomingCaller(null)
              console.log("✅ [DEBUG] Call accepted, UI updated")
            }}
            onDecline={() => {
              sendCallMessage({ type: "CALL_REJECTED", to: incomingCaller, from: getUserData().username })
              setIncomingCaller(null)
              toast.info("Call declined")
            }}
          />
        </div>
      )}
    </>
  )
}

"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from "react"

interface Contact {
  username: string
  email: string
  avatarUrl?: string
  online: boolean
  lastMessage?: string
  lastMessageTime?: string
  lastMessageSender?: string
}

interface ContactsListProps {
  activeContact: string | null
  onSelectContact: (name: string) => void
}

export function ContactsList({ activeContact, onSelectContact }: ContactsListProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to get current user data
  const getUserData = () => {
    try {
      const userData = localStorage.getItem("user")
      return userData ? JSON.parse(userData) : {}
    } catch {
      return {}
    }
  }

  useEffect(() => {
    loadContacts()

    // Auto-refresh contacts every 30 seconds
    const refreshInterval = setInterval(() => {
      loadContacts()
    }, 30000)

    // Listen for message sent events to immediately refresh
    const handleMessagesSent = () => {
      loadContacts()
    }

    window.addEventListener('messagesSent', handleMessagesSent)

    return () => {
      clearInterval(refreshInterval)
      window.removeEventListener('messagesSent', handleMessagesSent)
    }
  }, [])

  const loadContacts = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    try {
      // First try to load accepted friends from the working endpoint
      const friendsResponse = await fetch('http://localhost:8080/api/users/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (friendsResponse.ok) {
        const friends = await friendsResponse.json()
        console.log('📱 Loaded friends:', friends.length)

        // Convert friends to contact format and get last messages for each
        const contactsWithMessages = await Promise.all(
          friends.map(async (friend: any) => {
            try {
              // Get conversation with this friend to find last message
              const messagesResponse = await fetch(`http://localhost:8080/api/messages/conversation/${friend.username}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })

              let lastMessage = null
              let lastMessageTime = null
              let lastMessageSender = null

              if (messagesResponse.ok) {
                const messages = await messagesResponse.json()
                if (messages.length > 0) {
                  const lastMsg = messages[messages.length - 1]
                  lastMessage = lastMsg.content
                  lastMessageTime = lastMsg.createdAt
                  lastMessageSender = lastMsg.senderUsername
                }
              }

              return {
                username: friend.username,
                email: friend.email,
                avatarUrl: friend.avatarUrl,
                online: friend.online || false,
                lastMessage,
                lastMessageTime,
                lastMessageSender
              }
            } catch (error) {
              console.warn(`Failed to load messages for ${friend.username}:`, error)
              return {
                username: friend.username,
                email: friend.email,
                avatarUrl: friend.avatarUrl,
                online: friend.online || false,
                lastMessage: null,
                lastMessageTime: null,
                lastMessageSender: null
              }
            }
          })
        )

        // Sort by last message time (most recent first)
        const sortedContacts = contactsWithMessages
          .filter(contact => contact.lastMessage) // Only show contacts with messages
          .sort((a, b) => {
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
            return timeB - timeA
          })

        setContacts(sortedContacts)
        setError(null)
        console.log('✅ Contacts loaded successfully:', sortedContacts.length)
      } else {
        console.error('Failed to load friends:', friendsResponse.status, friendsResponse.statusText)
        const errorText = await friendsResponse.text()
        console.error('Error details:', errorText)
        setError(`Failed to load contacts: ${friendsResponse.status}`)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ScrollArea className="flex-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full p-3 flex items-start gap-3 mb-1">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden items-center justify-center p-4">
        <p className="text-destructive text-sm">{error}</p>
        <p className="text-muted-foreground text-xs mt-2">Please check if you're logged in</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="p-2">
          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No conversations yet</p>
              <p className="text-muted-foreground text-xs mt-1">Start a chat with someone from your contacts</p>
            </div>
          ) : (
            contacts.map((contact: Contact) => (
              <button
                key={contact.username}
                onClick={() => onSelectContact(contact.username)}
                className={cn(
                  "w-full p-3 flex items-start gap-3 hover:bg-accent/50 transition-all rounded-xl mb-1 text-left group relative overflow-hidden",
                  activeContact === contact.username && "bg-primary/10 hover:bg-primary/15 shadow-sm",
                )}
              >
                {activeContact === contact.username && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
                )}

                <div className="relative z-10">
                  <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage
                      src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contact.username)}`}
                      alt={contact.username}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary-foreground font-semibold text-sm">
                      {contact.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card shadow-sm" />
                  )}
                </div>

                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {contact.username}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {contact.lastMessageTime ? new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate leading-relaxed">
                      {contact.lastMessage || 'No messages yet'}
                    </p>
                    {/* Show unread badge only if there are unread messages */}
                    {contact.lastMessage && contact.lastMessageSender !== getUserData()?.username && (
                      <Badge variant="destructive" className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs p-0 font-bold">
                        1
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

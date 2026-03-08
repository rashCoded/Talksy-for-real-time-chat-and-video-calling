"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, MessageSquare, UserPlus } from "lucide-react"
import { toast } from "sonner"

interface Contact {
  id: number
  username: string
  email: string
  avatarUrl?: string
  online: boolean
}



interface ContactsTabProps {
  onSelectContact: (name: string) => void
  onViewProfile: (name: string) => void
  onStartChat: (name: string) => void
}

export function ContactsTab({ onSelectContact, onViewProfile, onStartChat }: ContactsTabProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFriends()
  }, [])

  const loadFriends = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      // Use the proper contacts endpoint that returns accepted friends
      const response = await fetch('http://localhost:8080/api/users/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const contactsData = await response.json()
        console.log('Loaded contacts:', contactsData) // Debug log

        const formattedContacts: Contact[] = contactsData.map((contact: any) => ({
          id: contact.id,
          username: contact.username,
          email: contact.email,
          avatarUrl: contact.avatarUrl,
          online: contact.online
        }))

        setContacts(formattedContacts)
      } else {
        console.error('Failed to load contacts:', response.status, response.statusText)
        toast.error('Failed to load contacts')
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
      toast.error('Network error while loading contacts')
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-border/50 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or email..."
            className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/20 rounded-xl"
          />
        </div>
      </div>

      <ScrollArea className="flex-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground text-sm mt-2">Loading friends...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No friends found</p>
              <p className="text-sm text-muted-foreground mt-1">Add friends from the Friends tab to start chatting</p>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 rounded-xl transition-all group mb-1 cursor-pointer"
                onClick={() => onViewProfile(contact.username)}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={contact.avatarUrl} alt={contact.username} />
                    <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground font-semibold">
                      {contact.username
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  {contact.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card shadow-sm" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {contact.username}
                    </p>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Friend
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartChat(contact.username)
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

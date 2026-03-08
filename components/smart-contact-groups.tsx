"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Tag, UserCheck, Clock, MessageSquare, Star, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"

interface Contact {
  id: number
  username: string
  email: string
  avatarUrl?: string
  online: boolean
  lastSeen?: string
  group?: string
  isFavorite?: boolean
  messageCount?: number
  lastMessage?: string
}

interface ContactGroup {
  name: string
  color: string
  count: number
  contacts: Contact[]
}

interface SmartContactGroupsProps {
  contacts: Contact[]
  onContactClick: (username: string) => void
  onStartChat: (username: string) => void
}

export function SmartContactGroups({ contacts, onContactClick, onStartChat }: SmartContactGroupsProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [selectedGroup, setSelectedGroup] = useState<string>("all")
  const [newGroupName, setNewGroupName] = useState("")
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [contactGroups, setContactGroups] = useState<{ [contactId: number]: string }>({})

  useEffect(() => {
    organizeContacts()
  }, [contacts])

  const organizeContacts = () => {
    // Smart auto-grouping based on activity and patterns
    const activeContacts = contacts.filter(c => c.online)
    const recentContacts = contacts.filter(c => c.messageCount && c.messageCount > 0)
    const frequentContacts = contacts.filter(c => c.messageCount && c.messageCount >= 10)
    const favoriteContacts = contacts.filter(c => favorites.has(c.id))

    const autoGroups: ContactGroup[] = [
      {
        name: "all",
        color: "blue",
        count: contacts.length,
        contacts: contacts
      },
      {
        name: "online",
        color: "green", 
        count: activeContacts.length,
        contacts: activeContacts
      },
      {
        name: "recent",
        color: "orange",
        count: recentContacts.length,
        contacts: recentContacts
      },
      {
        name: "frequent",
        color: "purple",
        count: frequentContacts.length,
        contacts: frequentContacts
      }
    ]

    if (favoriteContacts.length > 0) {
      autoGroups.push({
        name: "favorites",
        color: "yellow",
        count: favoriteContacts.length,
        contacts: favoriteContacts
      })
    }

    setGroups(autoGroups)
  }

  const toggleFavorite = (contactId: number) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(contactId)) {
      newFavorites.delete(contactId)
      toast.success("Removed from favorites")
    } else {
      newFavorites.add(contactId)
      toast.success("Added to favorites")
    }
    setFavorites(newFavorites)
    
    // Save to localStorage
    localStorage.setItem("talksy_favorites", JSON.stringify([...newFavorites]))
  }

  const createCustomGroup = () => {
    if (!newGroupName.trim()) return

    const newGroup: ContactGroup = {
      name: newGroupName.toLowerCase(),
      color: "indigo",
      count: 0,
      contacts: []
    }

    setGroups(prev => [...prev, newGroup])
    setNewGroupName("")
    setShowCreateGroup(false)
    toast.success(`Created group "${newGroupName}"`)
  }

  const assignContactToGroup = (contactId: number, groupName: string) => {
    setContactGroups(prev => ({ ...prev, [contactId]: groupName }))
    toast.success("Contact moved to group")
  }

  const getGroupIcon = (groupName: string) => {
    switch (groupName) {
      case "online": return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case "recent": return <Clock className="w-3 h-3" />
      case "frequent": return <MessageSquare className="w-3 h-3" />
      case "favorites": return <Star className="w-3 h-3 text-yellow-500" />
      default: return <Users className="w-3 h-3" />
    }
  }

  const getGroupColor = (groupName: string) => {
    const group = groups.find(g => g.name === groupName)
    return group?.color || "blue"
  }

  const currentGroup = groups.find(g => g.name === selectedGroup)
  const displayContacts = currentGroup?.contacts || []

  return (
    <div className="flex flex-col h-full">
      {/* Group Tabs */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-muted-foreground">CONTACT GROUPS</h3>
          <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 px-2">
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Contact Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createCustomGroup()}
                />
                <Button onClick={createCustomGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-1">
          {groups.map((group) => (
            <Button
              key={group.name}
              size="sm"
              variant={selectedGroup === group.name ? "default" : "outline"}
              className={`h-7 text-xs capitalize ${
                selectedGroup === group.name 
                  ? `bg-${group.color}-500 hover:bg-${group.color}-600` 
                  : "hover:bg-accent"
              }`}
              onClick={() => setSelectedGroup(group.name)}
            >
              <div className="flex items-center gap-1">
                {getGroupIcon(group.name)}
                <span>{group.name}</span>
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {group.count}
                </Badge>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {displayContacts.map((contact) => (
            <div
              key={contact.id}
              className="group flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg transition-all cursor-pointer"
              onClick={() => onContactClick(contact.username)}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contact.avatarUrl} alt={contact.username} />
                  <AvatarFallback>
                    {contact.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {contact.online && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
                {favorites.has(contact.id) && (
                  <Star className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500 fill-current" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{contact.username}</h4>
                  {contact.messageCount && contact.messageCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {contact.messageCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {contact.lastMessage || contact.email}
                </p>
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(contact.id)
                  }}
                >
                  <Star 
                    className={`w-3 h-3 ${
                      favorites.has(contact.id) 
                        ? "text-yellow-500 fill-current" 
                        : "text-muted-foreground"
                    }`} 
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartChat(contact.username)
                  }}
                >
                  <MessageSquare className="w-3 h-3" />
                </Button>
                <Select
                  onValueChange={(groupName) => assignContactToGroup(contact.id, groupName)}
                >
                  <SelectTrigger className="h-7 w-7 p-0">
                    <Tag className="w-3 h-3" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.filter(g => g.name !== "all").map(group => (
                      <SelectItem key={group.name} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          {displayContacts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No contacts in this group</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Group Stats */}
      {selectedGroup !== "all" && (
        <div className="p-3 border-t border-border/50 bg-muted/20">
          <div className="text-xs text-muted-foreground text-center">
            {currentGroup?.count} contact{currentGroup?.count !== 1 ? 's' : ''} in {currentGroup?.name}
          </div>
        </div>
      )}
    </div>
  )
}
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, Filter, Calendar, FileText, Image, Mic, Video, X } from "lucide-react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { ScrollArea } from "./ui/scroll-area"
import { Card } from "./ui/card"

interface Message {
  id: number
  content: string
  senderUsername: string
  receiverUsername: string
  type: "TEXT" | "FILE" | "IMAGE" | "VIDEO" | "AUDIO"
  status: "SENT" | "DELIVERED" | "READ"
  createdAt: string
  readAt?: string
  fileUrl?: string
  fileName?: string
  fileType?: string
}

interface MessageSearchProps {
  currentUsername: string
  onMessageClick?: (message: Message) => void
  className?: string
}

interface SearchFilters {
  query: string
  username?: string
  messageType?: string
  dateFrom?: string
  dateTo?: string
}

export function MessageSearch({ currentUsername, onMessageClick, className }: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({ query: "" })
  const [contacts, setContacts] = useState<string[]>([])
  const [statistics, setStatistics] = useState({
    totalSent: 0,
    totalReceived: 0,
    totalUnread: 0,
    totalFiles: 0,
    totalImages: 0,
    totalVoices: 0
  })

  const messageTypeIcons = {
    TEXT: <FileText className="w-4 h-4" />,
    FILE: <FileText className="w-4 h-4" />,
    IMAGE: <Image className="w-4 h-4" />,
    VIDEO: <Video className="w-4 h-4" />,
    AUDIO: <Mic className="w-4 h-4" />
  }

  const searchMessages = useCallback(async (searchFilters: SearchFilters) => {
    if (!searchFilters.query.trim()) {
      setMessages([])
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const params = new URLSearchParams({
        query: searchFilters.query,
        ...(searchFilters.username && { username: searchFilters.username }),
        ...(searchFilters.messageType && { messageType: searchFilters.messageType }),
        ...(searchFilters.dateFrom && { dateFrom: searchFilters.dateFrom }),
        ...(searchFilters.dateTo && { dateTo: searchFilters.dateTo })
      })

      const response = await fetch(`http://localhost:8080/api/messages/search?${params}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStatistics = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch("http://localhost:8080/api/messages/statistics", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStatistics(data)
      }
    } catch (error) {
      console.error("Failed to load statistics:", error)
    }
  }, [])

  const loadContacts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch("http://localhost:8080/api/messages/contacts", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setContacts(data.map((contact: any) => contact.username))
      }
    } catch (error) {
      console.error("Failed to load contacts:", error)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadStatistics()
      loadContacts()
    }
  }, [isOpen, loadStatistics, loadContacts])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchMessages(filters)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [filters, searchMessages])

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ query: filters.query })
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query})`, "gi")
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
    }
  }

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => 
      key !== "query" && value && value !== ""
    ).length
  }, [filters])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`relative ${className}`}>
          <Search className="w-4 h-4 mr-2" />
          Search Messages
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={filters.query}
                onChange={(e) => handleFilterChange("query", e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.username || ""}
                onValueChange={(value) => handleFilterChange("username", value)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Contacts</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact} value={contact}>
                      {contact}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.messageType || ""}
                onValueChange={(value) => handleFilterChange("messageType", value)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="IMAGE">Images</SelectItem>
                  <SelectItem value="FILE">Files</SelectItem>
                  <SelectItem value="AUDIO">Voice</SelectItem>
                  <SelectItem value="VIDEO">Videos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Statistics */}
          <Card className="p-3">
            <div className="text-xs font-medium mb-2">Message Statistics</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-blue-600">{statistics.totalSent}</div>
                <div className="text-gray-500">Sent</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">{statistics.totalReceived}</div>
                <div className="text-gray-500">Received</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-600">{statistics.totalUnread}</div>
                <div className="text-gray-500">Unread</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div className="text-center">
                <div className="font-semibold text-purple-600">{statistics.totalImages}</div>
                <div className="text-gray-500">Images</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-indigo-600">{statistics.totalFiles}</div>
                <div className="text-gray-500">Files</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-pink-600">{statistics.totalVoices}</div>
                <div className="text-gray-500">Voice</div>
              </div>
            </div>
          </Card>

          {/* Results */}
          {filters.query && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Results {loading && "(searching...)"}
                </span>
                <span className="text-xs text-gray-500">
                  {messages.length} found
                </span>
              </div>

              <ScrollArea className="h-64">
                {loading ? (
                  <div className="flex items-center justify-center h-20">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 text-sm">
                    No messages found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => {
                          onMessageClick?.(message)
                          setIsOpen(false)
                        }}
                      >
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0 mt-0.5">
                            {messageTypeIcons[message.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium">
                                {message.senderUsername === currentUsername ? "You" : message.senderUsername}
                              </span>
                              <span className="text-xs text-gray-500">
                                →
                              </span>
                              <span className="text-xs text-gray-500">
                                {message.receiverUsername === currentUsername ? "You" : message.receiverUsername}
                              </span>
                              <span className="text-xs text-gray-400 ml-auto">
                                {formatDate(message.createdAt)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                              {message.type === "TEXT" ? (
                                highlightText(message.content, filters.query)
                              ) : (
                                <span className="italic">
                                  {message.fileName || `${message.type.toLowerCase()} file`}
                                </span>
                              )}
                            </div>
                            {message.status === "READ" && (
                              <div className="text-xs text-blue-500 mt-1">
                                Read {message.readAt ? formatDate(message.readAt) : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
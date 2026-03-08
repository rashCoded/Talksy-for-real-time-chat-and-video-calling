"use client"

import { useState, useEffect } from "react"

interface User {
  id: number
  username: string
  email: string
  avatarUrl?: string
  online: boolean
  lastSeen: string | null
}

interface Contact {
  id: string
  name: string
  lastMessage: string
  timestamp: string
  unread: number
  online: boolean
  avatarUrl?: string
  email: string
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('No authentication token found')
        return
      }

      const response = await fetch('http://localhost:8080/api/users/contacts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`)
      }

      const users: User[] = await response.json()
      
      // Transform users to contacts format
      const transformedContacts: Contact[] = users.map(user => ({
        id: user.id.toString(),
        name: user.username,
        email: user.email,
        lastMessage: user.online ? "Online" : "Offline",
        timestamp: user.online ? "now" : formatLastSeen(user.lastSeen),
        unread: 0, // We'll implement message counts later
        online: user.online,
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
      }))

      setContacts(transformedContacts)
      setError(null)
    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }

  const formatLastSeen = (lastSeen: string | null): string => {
    if (!lastSeen) return "Never"
    
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffInMs = now.getTime() - lastSeenDate.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${diffInDays}d ago`
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  return {
    contacts,
    loading,
    error,
    refetch: fetchContacts
  }
}
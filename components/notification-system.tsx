"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

interface NotificationSystemProps {
  onNewMessage?: (message: any) => void
}

export function NotificationSystem({ onNewMessage }: NotificationSystemProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Create notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRmQBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=')
    audioRef.current.volume = 0.5
  }, [])

  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(console.warn)
      }
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }

  const showMessageNotification = (message: any) => {
    // Play sound
    playNotificationSound()

    // Show toast
    toast.success(`New message from ${message.from}`, {
      description: message.text || message.content || 'New message received',
      duration: 4000,
      action: {
        label: "Reply",
        onClick: () => {
          if (onNewMessage) onNewMessage(message)
        }
      }
    })

    // Browser notification (if permission granted)
    if (Notification.permission === 'granted') {
      new Notification(`Message from ${message.from}`, {
        body: message.text || message.content || 'New message received',
        icon: '/placeholder.svg',
        tag: `msg-${message.from}`,
        requireInteraction: false
      })
    }
  }

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Expose notification function globally for easy access
  useEffect(() => {
    (window as any).showMessageNotification = showMessageNotification
  }, [])

  return null // This is just a utility component
}
"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from "lucide-react"

interface Call {
  id: string
  name: string
  type: "incoming" | "outgoing" | "missed"
  callType: "voice" | "video"
  timestamp: string
  duration?: string
}

const mockCalls: Call[] = [
  {
    id: "1",
    name: "Alice Johnson",
    type: "incoming",
    callType: "video",
    timestamp: "Today, 2:30 PM",
    duration: "15:23",
  },
  {
    id: "2",
    name: "Bob Smith",
    type: "outgoing",
    callType: "voice",
    timestamp: "Today, 11:45 AM",
    duration: "8:12",
  },
  {
    id: "3",
    name: "Carol White",
    type: "missed",
    callType: "video",
    timestamp: "Yesterday, 9:20 PM",
  },
  {
    id: "4",
    name: "David Brown",
    type: "outgoing",
    callType: "video",
    timestamp: "Yesterday, 4:15 PM",
    duration: "22:45",
  },
  {
    id: "5",
    name: "Alice Johnson",
    type: "incoming",
    callType: "voice",
    timestamp: "2 days ago",
    duration: "5:30",
  },
]

interface CallsTabProps {
  onSelectContact: (name: string) => void
}

export function CallsTab({ onSelectContact }: CallsTabProps) {
  const getCallIcon = (type: Call["type"]) => {
    switch (type) {
      case "incoming":
        return <PhoneIncoming className="h-4 w-4 text-green-500" />
      case "outgoing":
        return <PhoneOutgoing className="h-4 w-4 text-blue-500" />
      case "missed":
        return <PhoneMissed className="h-4 w-4 text-destructive" />
    }
  }

  const getCallTypeBadge = (type: Call["type"]) => {
    switch (type) {
      case "incoming":
        return "bg-green-500/10 text-green-600 dark:text-green-400"
      case "outgoing":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      case "missed":
        return "bg-destructive/10 text-destructive"
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ScrollArea className="flex-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="p-2">
          {mockCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-xl transition-all group mb-1"
          >
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground font-semibold">
                  {call.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md ${getCallTypeBadge(call.type)}`}
              >
                {call.callType === "video" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getCallIcon(call.type)}
                <span className="font-semibold text-foreground truncate">{call.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{call.timestamp}</span>
                {call.duration && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="font-medium">{call.duration}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => onSelectContact(call.name)}
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => onSelectContact(call.name)}
              >
                <Video className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        </div>
      </ScrollArea>
    </div>
  )
}

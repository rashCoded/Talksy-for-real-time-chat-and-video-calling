"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from "lucide-react"

interface CallLogEntry {
    id: number
    callerUsername: string
    receiverUsername: string
    type: "VOICE" | "VIDEO"
    status: "INITIATED" | "RINGING" | "ACCEPTED" | "REJECTED" | "ENDED" | "MISSED"
    startedAt: string
    endedAt?: string
    durationSeconds?: number
    isOutgoing: boolean
    contactUsername: string
}

interface CallLogProps {
    trigger?: React.ReactNode
}

export function CallLog({ trigger }: CallLogProps) {
    const [calls, setCalls] = useState<CallLogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)

    const fetchCallLogs = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem("token")
            const response = await fetch("http://localhost:8080/api/calls", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setCalls(data)
            }
        } catch (error) {
            console.error("Failed to fetch call logs:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchCallLogs()
        }
    }, [open])

    const formatDuration = (seconds?: number) => {
        if (!seconds) return "0:00"
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        } else if (diffDays === 1) {
            return "Yesterday"
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: "short" })
        } else {
            return date.toLocaleDateString([], { month: "short", day: "numeric" })
        }
    }

    const getCallIcon = (call: CallLogEntry) => {
        if (call.status === "MISSED" || call.status === "REJECTED") {
            return <PhoneMissed className="h-4 w-4 text-red-500" />
        }
        if (call.isOutgoing) {
            return <PhoneOutgoing className="h-4 w-4 text-green-500" />
        }
        return <PhoneIncoming className="h-4 w-4 text-blue-500" />
    }

    const getStatusText = (call: CallLogEntry) => {
        switch (call.status) {
            case "MISSED":
                return "Missed"
            case "REJECTED":
                return "Declined"
            case "ENDED":
                return call.durationSeconds ? formatDuration(call.durationSeconds) : "Ended"
            case "INITIATED":
                return "No answer"
            default:
                return call.status
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="relative">
                        <Clock className="h-5 w-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Call History
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[400px] pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : calls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                            <Phone className="h-12 w-12 mb-2 opacity-50" />
                            <p>No call history</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {calls.map((call) => (
                                <div
                                    key={call.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(call.contactUsername)}`}
                                        />
                                        <AvatarFallback>{call.contactUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">{call.contactUsername}</span>
                                            {call.type === "VIDEO" ? (
                                                <Video className="h-3.5 w-3.5 text-muted-foreground" />
                                            ) : (
                                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            {getCallIcon(call)}
                                            <span>{getStatusText(call)}</span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        {formatTime(call.startedAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}

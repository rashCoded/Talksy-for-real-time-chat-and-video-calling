"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { X, MessageSquare, Phone, Video, Mail, MapPin, Briefcase, Calendar, Star } from "lucide-react"
import { UserProfile } from "./user-profile"

interface ContactProfileProps {
  contactName: string
  onClose: () => void
  onStartChat: () => void
}

export function ContactProfile({ contactName, onClose, onStartChat }: ContactProfileProps) {
  // If it's the user's own profile, show UserProfile component
  if (contactName === "Your Profile") {
    return (
      <div className="flex flex-col h-full bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
          <h2 className="text-lg font-semibold">Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <UserProfile />
      </div>
    )
  }

  const initials = contactName
    .split(" ")
    .map((n) => n[0])
    .join("")

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-muted/10">
      <div className="border-b border-border/50 bg-gradient-to-r from-card to-card/80 backdrop-blur-sm shadow-sm">
        <div className="p-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Contact Info</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-accent/50">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className="relative">
              <Avatar className="h-32 w-32 ring-4 ring-primary/10 shadow-xl">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-4xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-background shadow-lg" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-foreground mb-1">{contactName}</h3>
              <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-600 dark:text-green-400 border-0">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Active now
              </Badge>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={onStartChat}
              className="flex-1 max-w-[140px] gap-2 shadow-md hover:shadow-lg transition-all bg-primary hover:bg-primary/90"
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
            <Button
              variant="outline"
              className="flex-1 max-w-[140px] gap-2 bg-background/50 hover:bg-accent/50 border-border/50 transition-all"
            >
              <Phone className="h-4 w-4" />
              Call
            </Button>
            <Button
              variant="outline"
              className="flex-1 max-w-[140px] gap-2 bg-background/50 hover:bg-accent/50 border-border/50 transition-all"
            >
              <Video className="h-4 w-4" />
              Video
            </Button>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Contact Information
            </h4>

            <div className="space-y-4 bg-card/50 rounded-xl p-4 border border-border/50">
              <div className="flex items-start gap-3 group hover:bg-accent/30 p-2 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm text-foreground font-medium">
                    {contactName.toLowerCase().replace(" ", ".")}@example.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 group hover:bg-accent/30 p-2 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                  <p className="text-sm text-foreground font-medium">+1 (234) 567-8900</p>
                </div>
              </div>

              <div className="flex items-start gap-3 group hover:bg-accent/30 p-2 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Location</p>
                  <p className="text-sm text-foreground font-medium">San Francisco, CA</p>
                </div>
              </div>

              <div className="flex items-start gap-3 group hover:bg-accent/30 p-2 rounded-lg transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Work</p>
                  <p className="text-sm text-foreground font-medium">Software Engineer at Tech Corp</p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              About
            </h4>
            <div className="bg-card/50 rounded-xl p-4 border border-border/50">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Passionate about technology and innovation. Love connecting with people and building amazing products
                that make a difference.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

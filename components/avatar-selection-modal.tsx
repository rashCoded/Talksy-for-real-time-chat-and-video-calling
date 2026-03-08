"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check } from "lucide-react"
import { toast } from "sonner"

const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasmine",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
]

interface AvatarSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (avatarUrl: string) => void
}

export function AvatarSelectionModal({ open, onOpenChange, onComplete }: AvatarSelectionModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0])

  const handleSave = () => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      user.avatarUrl = selectedAvatar
      user.needsAvatar = false
      localStorage.setItem("user", JSON.stringify(user))
    }

    toast.success("Avatar updated!", {
      description: "Your profile looks great!",
    })

    onComplete(selectedAvatar)
    onOpenChange(false)
  }

  const handleSkip = () => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      user.needsAvatar = false
      localStorage.setItem("user", JSON.stringify(user))
    }

    onComplete("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Avatar</DialogTitle>
          <DialogDescription>
            Select an avatar to personalize your profile. You can skip this step and add one later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 py-4">
          {AVATAR_OPTIONS.map((avatar, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedAvatar(avatar)}
              className="relative group focus:outline-none"
            >
              <Avatar
                className={`h-14 w-14 sm:h-16 sm:w-16 cursor-pointer transition-all ${
                  selectedAvatar === avatar
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                    : "hover:scale-105 opacity-70 hover:opacity-100"
                }`}
              >
                <AvatarImage src={avatar || "/placeholder.svg"} />
                <AvatarFallback>A{index + 1}</AvatarFallback>
              </Avatar>
              {selectedAvatar === avatar && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} className="w-full sm:w-auto bg-transparent">
            Skip for now
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            Save Avatar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

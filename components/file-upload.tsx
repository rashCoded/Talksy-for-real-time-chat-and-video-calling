"use client"

import type React from "react"

import { useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, ImageIcon, Video, Music, Upload } from "lucide-react"

interface FileUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileSelect: (file: File) => void
  children: React.ReactNode
}

export function FileUpload({ open, onOpenChange, onFileSelect, children }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleQuickSelect = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share a file</DialogTitle>
          <DialogDescription>Choose a file type to share with your contact</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 bg-transparent"
            onClick={() => handleQuickSelect("image/*")}
          >
            <ImageIcon className="h-8 w-8" />
            <span>Photos</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 bg-transparent"
            onClick={() => handleQuickSelect("video/*")}
          >
            <Video className="h-8 w-8" />
            <span>Videos</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 bg-transparent"
            onClick={() => handleQuickSelect("audio/*")}
          >
            <Music className="h-8 w-8" />
            <span>Audio</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 bg-transparent"
            onClick={() => handleQuickSelect(".pdf,.doc,.docx,.txt")}
          >
            <FileText className="h-8 w-8" />
            <span>Documents</span>
          </Button>
        </div>
        <Button variant="secondary" className="w-full gap-2" onClick={() => handleQuickSelect("*")}>
          <Upload className="h-4 w-4" />
          Browse all files
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </DialogContent>
    </Dialog>
  )
}

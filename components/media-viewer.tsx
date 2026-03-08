"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Eye, FileText, Image, Video, Volume2, File } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

interface MediaViewerProps {
  fileUrl: string
  fileName: string
  fileType: string
  messageType: "FILE" | "IMAGE" | "VIDEO" | "AUDIO"
}

export function MediaViewer({ fileUrl, fileName, fileType, messageType }: MediaViewerProps) {
  const [showPreview, setShowPreview] = useState(false)

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success("Download started", {
        description: `Downloading ${fileName}`
      })
    } catch (error) {
      toast.error("Download failed", {
        description: "Unable to download the file"
      })
    }
  }

  const handleView = () => {
    setShowPreview(true)
  }

  const getIcon = () => {
    switch (messageType) {
      case "IMAGE":
        return <Image className="h-4 w-4" />
      case "VIDEO":
        return <Video className="h-4 w-4" />
      case "AUDIO":
        return <Volume2 className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const canPreview = messageType === "IMAGE" || messageType === "VIDEO" || messageType === "AUDIO"

  return (
    <div className="flex flex-col gap-2 p-3 bg-muted/20 rounded-lg border border-border/30 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium text-foreground truncate flex-1">{fileName}</span>
      </div>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownload}
          className="flex-1 h-8 text-xs hover:bg-accent"
        >
          <Download className="h-3 w-3 mr-1" />
          Download
        </Button>
        
        {canPreview && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleView}
            className="flex-1 h-8 text-xs hover:bg-accent"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        )}
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-foreground">{fileName}</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center items-center min-h-[300px] bg-muted/10 rounded-lg">
            {messageType === "IMAGE" && (
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={() => toast.error("Failed to load image")}
              />
            )}
            
            {messageType === "VIDEO" && (
              <video
                src={fileUrl}
                controls
                className="max-w-full max-h-full rounded-lg"
                onError={() => toast.error("Failed to load video")}
              >
                Your browser does not support the video tag.
              </video>
            )}
            
            {messageType === "AUDIO" && (
              <div className="flex flex-col items-center gap-4 p-8">
                <Volume2 className="h-16 w-16 text-muted-foreground" />
                <audio
                  src={fileUrl}
                  controls
                  className="w-full max-w-md"
                  onError={() => toast.error("Failed to load audio")}
                >
                  Your browser does not support the audio tag.
                </audio>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
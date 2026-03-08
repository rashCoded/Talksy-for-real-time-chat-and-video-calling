"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, File, Image, Music, Video, Mic, MicOff, Play, Pause, Square } from "lucide-react"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"
import { toast } from "sonner"

interface FileUploadAdvancedProps {
  onFileUpload: (fileData: {
    fileUrl: string
    fileName: string
    fileType: string
    messageType: "FILE" | "IMAGE" | "VIDEO" | "AUDIO"
  }) => void
  receiverUsername: string
  className?: string
}

interface UploadedFile {
  id: string
  file: File
  preview?: string
  progress: number
  status: "uploading" | "completed" | "error"
}

export function FileUploadAdvanced({ onFileUpload, receiverUsername, className }: FileUploadAdvancedProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4" />
    if (type.startsWith("video/")) return <Video className="w-4 h-4" />
    if (type.startsWith("audio/")) return <Music className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const getMessageType = (fileType: string): "FILE" | "IMAGE" | "VIDEO" | "AUDIO" => {
    if (fileType.startsWith("image/")) return "IMAGE"
    if (fileType.startsWith("video/")) return "VIDEO"
    if (fileType.startsWith("audio/")) return "AUDIO"
    return "FILE"
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("receiverUsername", receiverUsername)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token")
      }

      const response = await fetch("http://localhost:8080/api/files/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const result = await response.json()
      return result
    } catch (error) {
      throw error
    }
  }

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map(file => {
      const id = Math.random().toString(36).substr(2, 9)
      const uploadFile: UploadedFile = {
        id,
        file,
        progress: 0,
        status: "uploading"
      }

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFiles(prev => prev.map(f => 
            f.id === id ? { ...f, preview: e.target?.result as string } : f
          ))
        }
        reader.readAsDataURL(file)
      }

      return uploadFile
    })

    setFiles(prev => [...prev, ...newFiles])

    // Start upload for each file
    newFiles.forEach(async (fileData) => {
      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => 
            f.id === fileData.id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          ))
        }, 200)

        const result = await uploadFile(fileData.file)
        
        clearInterval(progressInterval)
        
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, progress: 100, status: "completed" }
            : f
        ))

        // Notify parent component
        onFileUpload({
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileType: result.fileType,
          messageType: result.messageType
        })

        toast.success(`${fileData.file.name} uploaded successfully`)

      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: "error" }
            : f
        ))
        toast.error(`Failed to upload ${fileData.file.name}`)
      }
    })
  }, [onFileUpload, receiverUsername])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      toast.error("Failed to start recording. Please check microphone permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const sendVoiceMessage = async () => {
    if (!audioUrl) return

    try {
      // Convert blob URL to actual blob
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      const file = new File([blob], `voice-message-${Date.now()}.webm`, { type: "audio/webm" })
      
      handleFiles([file])
      
      // Clear recording
      setAudioUrl(null)
      setRecordingTime(0)
      setIsPlaying(false)
      
    } catch (error) {
      toast.error("Failed to send voice message")
    }
  }

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950" 
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Supports images, videos, audio, and documents
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
      />

      {/* Voice Recording */}
      <div className="flex items-center space-x-2 p-3 border rounded-lg">
        {!isRecording && !audioUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={startRecording}
            className="flex items-center space-x-2"
          >
            <Mic className="w-4 h-4" />
            <span>Record Voice</span>
          </Button>
        )}

        {isRecording && (
          <div className="flex items-center space-x-2 w-full">
            <Button
              size="sm"
              variant="destructive"
              onClick={stopRecording}
              className="flex items-center space-x-2"
            >
              <MicOff className="w-4 h-4" />
              <span>Stop</span>
            </Button>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
              </div>
            </div>
          </div>
        )}

        {audioUrl && (
          <div className="flex items-center space-x-2 w-full">
            <Button
              size="sm"
              variant="outline"
              onClick={isPlaying ? pauseAudio : playAudio}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <span className="text-sm font-mono flex-1">{formatTime(recordingTime)}</span>
            <Button size="sm" onClick={sendVoiceMessage} className="bg-blue-500 hover:bg-blue-600">
              Send
            </Button>
            <Button size="sm" variant="outline" onClick={discardRecording}>
              <X className="w-4 h-4" />
            </Button>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center space-x-3 p-3 border rounded-lg">
              {file.preview ? (
                <img src={file.preview} alt={file.file.name} className="w-10 h-10 object-cover rounded" />
              ) : (
                getFileIcon(file.file.type)
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {file.status === "uploading" && (
                  <Progress value={file.progress} className="w-full mt-1" />
                )}
                
                {file.status === "error" && (
                  <p className="text-xs text-red-500 mt-1">Upload failed</p>
                )}
                
                {file.status === "completed" && (
                  <p className="text-xs text-green-500 mt-1">Uploaded successfully</p>
                )}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeFile(file.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
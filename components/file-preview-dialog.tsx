"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, MessageCircle, CheckCircle, XCircle, Clock, Send, FileText, AlertCircle } from "lucide-react"
import { safeFormatDistanceToNow } from "@/lib/date-utils"

interface FileItem {
  id: number
  filename: string
  original_name: string
  file_type: string
  file_size: number
  category: string
  status: string
  shared_with: string
  uploaded_by: string
  upload_date: string
  comments_count: number
}

interface Comment {
  id: number
  content: string
  author: string
  created_at: string
}

interface FilePreviewDialogProps {
  file: FileItem
  user: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: () => void
}

export function FilePreviewDialog({ file, user, open, onOpenChange, onStatusChange }: FilePreviewDialogProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [newStatus, setNewStatus] = useState(file.status)
  const [loading, setLoading] = useState(false)
  const [downloadError, setDownloadError] = useState("")

  useEffect(() => {
    if (open) {
      fetchComments()
      setNewStatus(file.status)
      setDownloadError("")
    }
  }, [open, file.id])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/files/${file.id}/comments`)
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/files/${file.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      })

      if (response.ok) {
        setNewComment("")
        fetchComments()
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (newStatus === file.status) return

    setLoading(true)
    try {
      const response = await fetch(`/api/files/${file.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        onStatusChange()
      }
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    setDownloadError("")

    try {
      const response = await fetch(`/api/files/${file.id}/download`)

      if (!response.ok) {
        const errorText = await response.text()
        setDownloadError(errorText || "Download failed")
        return
      }

      // Check if response is actually a file (not JSON error)
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json()
        setDownloadError(errorData.error || "Download failed")
        return
      }

      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.original_name
      a.style.display = "none"

      // Trigger download
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading file:", error)
      setDownloadError("Network error occurred while downloading")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const canChangeStatus = user.role === "collector" || user.role === "developer"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {file.original_name}
          </DialogTitle>
          <DialogDescription>File details, preview, and comments</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-3">
          {/* File Preview */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-muted rounded-lg p-4 min-h-[300px] flex items-center justify-center">
              {file.file_type.includes("image") ? (
                <img
                  src={`/api/files/${file.id}/preview`}
                  alt={file.original_name}
                  className="max-w-full max-h-[400px] object-contain rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    target.nextElementSibling?.classList.remove("hidden")
                  }}
                />
              ) : file.file_type.includes("pdf") ? (
                <div className="text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground">PDF Preview</p>
                  <p className="text-sm text-muted-foreground">Click download to view full document</p>
                </div>
              ) : (
                <div className="text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground">File Preview</p>
                  <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                </div>
              )}

              {/* Fallback for broken images */}
              <div className="text-center hidden">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground">Image Preview</p>
                <p className="text-sm text-muted-foreground">Unable to load image preview</p>
              </div>
            </div>

            {downloadError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{downloadError}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleDownload} className="w-full" disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>

          {/* File Details & Comments */}
          <div className="space-y-6">
            {/* File Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">
                  {file.category}
                </Badge>
                <Badge className={getStatusColor(file.status)}>
                  {getStatusIcon(file.status)}
                  <span className="ml-1 capitalize">{file.status}</span>
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Uploaded by {file.uploaded_by}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{safeFormatDistanceToNow(file.upload_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{formatFileSize(file.file_size)}</span>
                </div>
              </div>

              {/* Status Change (Boss/Admin only) */}
              {canChangeStatus && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Update Status</label>
                  <div className="flex gap-2">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    {newStatus !== file.status && (
                      <Button size="sm" onClick={handleStatusChange} disabled={loading}>
                        Update
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium">Comments ({comments.length})</span>
              </div>

              {/* Add Comment */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  className="w-full"
                >
                  <Send className="h-3 w-3 mr-2" />
                  Add Comment
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {comment.author.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {safeFormatDistanceToNow(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

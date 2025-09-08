"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Bell, MessageSquare, FileText, CheckCircle, X, Trash2 } from "lucide-react"
import { safeFormatDistanceToNow } from "@/lib/date-utils"

interface Notification {
  id: number
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  related_id?: number
}

interface NotificationSystemProps {
  userId: number
  onNavigate?: (tab: string, data?: any) => void
}

export function NotificationSystem({ userId, onNavigate }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PUT",
      })
      fetchNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PUT",
      })
      fetchNotifications()
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (notificationId: number, event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const clearAllNotifications = async (event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
      })
      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error("Error clearing all notifications:", error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navigate based on notification type
    if (onNavigate) {
      switch (notification.type) {
        case "file_status":
        case "file_comment":
        case "file_upload":
          // Navigate to files tab and open the specific file
          onNavigate("files", { fileId: notification.related_id })
          break
        case "private_message":
          // Navigate to messages tab and open conversation with sender
          onNavigate("messages", { userId: notification.related_id })
          break
        case "chat_message":
          // Navigate to chat tab
          onNavigate("chat")
          break
        default:
          // For other types, just navigate to files
          onNavigate("files")
          break
      }
    }

    setOpen(false)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "private_message":
        return <MessageSquare className="h-4 w-4 text-blue-600" />
      case "chat_message":
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case "file_status":
        return <FileText className="h-4 w-4 text-orange-600" />
      case "file_comment":
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-500">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex flex-col gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs px-2 py-1 h-6 w-full justify-start"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllNotifications}
                    className="text-destructive hover:text-destructive text-xs px-2 py-1 h-6 w-full justify-start"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group relative p-4 pr-12 border-b hover:bg-accent cursor-pointer transition-colors ${
                      !notification.is_read ? "bg-accent/50" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate" title={notification.title}>
                            {notification.title}
                          </p>
                          {!notification.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={notification.message}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {safeFormatDistanceToNow(notification.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Individual delete button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => deleteNotification(notification.id, e)}
                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive z-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

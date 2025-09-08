"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Send, Users, AlertCircle, Globe, Shield } from "lucide-react"
import { safeFormatDistanceToNow } from "@/lib/date-utils"

interface User {
  id: number
  username: string
  role: string
}

interface Message {
  id: number
  content: string
  author: string
  author_role: string
  visibility: string
  created_at: string
}

interface ChatRoomProps {
  user: User
  currentView?: string
}

export function ChatRoom({ user, currentView = "user1" }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [messageVisibility, setMessageVisibility] = useState("group")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Reset messages when currentView changes
  useEffect(() => {
    setMessages([])
    setLoading(true)
    setError("")
    fetchMessages()

    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [currentView, user.role])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const viewParam = user.role === "developer" || user.role === "collector" ? `?view=${currentView}` : ""
      const response = await fetch(`/api/chat/messages${viewParam}`)

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`)
        setError("Failed to load messages")
        return
      }

      const data = await response.json()
      setMessages(data.messages || [])
      setError("")
    } catch (error) {
      console.error("Error fetching messages:", error)
      setError("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setSending(true)
    setError("")

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          visibility: messageVisibility,
          target_role: user.role === "developer" || user.role === "collector" ? currentView : user.role,
        }),
      })

      if (response.ok) {
        // Success - clear message and refresh
        setNewMessage("")
        setError("")
        // Immediately fetch new messages
        await fetchMessages()
      } else {
        // Handle error response
        let errorMessage = "Failed to send message"

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || `Server error: ${response.status}`
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }

        console.error("Send message error:", errorMessage)
        setError(errorMessage)
      }
    } catch (networkError) {
      console.error("Network error sending message:", networkError)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "developer":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "collector":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
      case "user1":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "user2":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    return visibility === "everyone" ? (
      <Globe className="h-3 w-3 text-green-600" />
    ) : (
      <Shield className="h-3 w-3 text-blue-600" />
    )
  }

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase()
  }

  const getVisibilityOptions = () => {
    const currentGroup = user.role === "developer" || user.role === "collector" ? currentView : user.role
    return [
      {
        value: "group",
        label: `${currentGroup.toUpperCase()} Group Only`,
        description: `Only visible to ${currentGroup} users`,
      },
      {
        value: "everyone",
        label: "Everyone",
        description: "Visible to all users in the system",
      },
    ]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      <Card className="h-[calc(100vh-200px)] md:h-[calc(100vh-180px)] sm:h-[400px] flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Office Chat
                {(user.role === "developer" || user.role === "collector") && (
                  <Badge variant="outline" className="ml-2">
                    {currentView.toUpperCase()} View
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Team communication and quick updates</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Online</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {error && (
            <div className="p-4 pb-0">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                <p className="text-muted-foreground">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.author === user.username ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">{getUserInitials(message.author)}</AvatarFallback>
                  </Avatar>

                  <div className={`flex-1 ${message.author === user.username ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.author !== user.username && (
                        <>
                          <span className="text-sm font-medium">{message.author}</span>
                          <Badge variant="outline" className={`text-xs ${getRoleColor(message.author_role)}`}>
                            {message.author_role}
                          </Badge>
                        </>
                      )}
                      {message.visibility && getVisibilityIcon(message.visibility)}
                      <span className="text-xs text-muted-foreground">
                        {safeFormatDistanceToNow(message.created_at)}
                      </span>
                    </div>

                    <div
                      className={`inline-block rounded-lg px-3 py-2 text-sm break-words max-w-[85%] ${
                        message.author === user.username ? "bg-foreground text-background" : "bg-muted text-foreground"
                      }`}
                      style={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        hyphens: "auto",
                        minWidth: "fit-content",
                      }}
                    >
                      {message.content}
                    </div>

                    {message.visibility === "everyone" && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>Visible to everyone</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-4 space-y-3 flex-shrink-0">
            {/* Visibility Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Send to:</span>
              <Select value={messageVisibility} onValueChange={setMessageVisibility}>
                <SelectTrigger className="w-auto min-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getVisibilityOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.value === "everyone" ? (
                          <Globe className="h-4 w-4 text-green-600" />
                        ) : (
                          <Shield className="h-4 w-4 text-blue-600" />
                        )}
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Press Enter to send)"
                disabled={sending}
                className="flex-1"
                maxLength={1000}
              />
              <Button type="submit" disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>{newMessage.length}/1000 characters</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

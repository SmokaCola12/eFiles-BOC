"use client"

import type React from "react"

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageSquare, Send, ArrowLeft, Users, AlertCircle, Megaphone } from "lucide-react"
import { safeFormatDistanceToNow } from "@/lib/date-utils"

interface User {
  id: number
  username: string
  role: string
}

interface Message {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  created_at: string
  sender_username: string
  sender_role: string
}

interface PrivateMessagesProps {
  user: User
}

interface UnreadCount {
  [userId: number]: number
}

export const PrivateMessages = forwardRef<any, PrivateMessagesProps>(({ user }, ref) => {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [sendingToAll, setSendingToAll] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({})

  useImperativeHandle(ref, () => ({
    selectUser: (userId: number) => {
      const user = users.find((u) => u.id === userId)
      if (user) {
        handleUserSelect(user)
      }
    },
  }))

  const fetchUnreadCounts = async () => {
    try {
      const response = await fetch("/api/private-messages/unread-counts")
      const data = await response.json()
      setUnreadCounts(data.unreadCounts || {})
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchUnreadCounts()
    const interval = setInterval(() => {
      if (selectedUser) {
        fetchMessages(selectedUser.id)
      }
      fetchUnreadCounts()
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedUser])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/private-messages/users")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (userId: number) => {
    try {
      const response = await fetch(`/api/private-messages/${userId}`)
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const markMessagesAsRead = async (userId: number) => {
    try {
      await fetch(`/api/private-messages/${userId}/mark-read`, {
        method: "PUT",
      })
      fetchUnreadCounts()
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const handleUserSelect = (selectedUser: User) => {
    setSelectedUser(selectedUser)
    setError("")
    fetchMessages(selectedUser.id)
    markMessagesAsRead(selectedUser.id)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !selectedUser) return

    setSending(true)
    setError("")

    try {
      const response = await fetch("/api/private-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: selectedUser.id,
          content: newMessage.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to send message")
      }

      setNewMessage("")
      fetchMessages(selectedUser.id)
    } catch (error) {
      console.error("Error sending message:", error)
      setError(error instanceof Error ? error.message : "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const handleSendToAll = async () => {
    if (!newMessage.trim()) return

    setSendingToAll(true)
    setError("")

    try {
      const response = await fetch("/api/private-messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to send broadcast message")
      }

      setNewMessage("")
      // Refresh messages if we have a selected user
      if (selectedUser) {
        fetchMessages(selectedUser.id)
      }
    } catch (error) {
      console.error("Error sending broadcast message:", error)
      setError(error instanceof Error ? error.message : "Failed to send broadcast message")
    } finally {
      setSendingToAll(false)
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

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)] md:h-[calc(100vh-180px)] sm:h-[400px]">
        {/* Users List */}
        <div className="w-full md:w-1/3">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Contacts
              </CardTitle>
              <CardDescription>Select a user to start messaging</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
              <div className="space-y-1">
                {users.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleUserSelect(contact)}
                    className={`w-full p-3 text-left hover:bg-accent transition-colors relative ${
                      selectedUser?.id === contact.id ? "bg-accent border-r-2 border-foreground" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getUserInitials(contact.username)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.username}</p>
                        <Badge variant="outline" className={`text-xs ${getRoleColor(contact.role)}`}>
                          {contact.role}
                        </Badge>
                      </div>
                      {unreadCounts[contact.id] > 0 && (
                        <Badge className="bg-red-500 hover:bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                          {unreadCounts[contact.id] > 9 ? "9+" : unreadCounts[contact.id]}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="w-full md:w-2/3">
          <Card className="h-full flex flex-col">
            {selectedUser ? (
              <>
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="md:hidden">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{getUserInitials(selectedUser.username)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedUser.username}</CardTitle>
                      <Badge variant="outline" className={`text-xs ${getRoleColor(selectedUser.role)}`}>
                        {selectedUser.role}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <Separator className="flex-shrink-0" />

                <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                  {error && (
                    <div className="p-4 pb-0 flex-shrink-0">
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
                          className={`flex gap-3 ${message.sender_id === user.id ? "flex-row-reverse" : ""}`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(message.sender_username)}
                            </AvatarFallback>
                          </Avatar>

                          <div className={`flex-1 ${message.sender_id === user.id ? "text-right" : ""}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {message.sender_id !== user.id && (
                                <>
                                  <span className="text-sm font-medium">{message.sender_username}</span>
                                  <Badge variant="outline" className={`text-xs ${getRoleColor(message.sender_role)}`}>
                                    {message.sender_role}
                                  </Badge>
                                </>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {safeFormatDistanceToNow(message.created_at)}
                              </span>
                            </div>

                            <div
                              className={`inline-block rounded-lg px-3 py-2 text-sm break-words max-w-[85%] ${
                                message.sender_id === user.id
                                  ? "bg-foreground text-background"
                                  : "bg-muted text-foreground"
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
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t p-4 space-y-2 flex-shrink-0">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedUser.username}...`}
                        disabled={sending || sendingToAll}
                        className="flex-1"
                        maxLength={1000}
                      />
                      <Button type="submit" disabled={sending || sendingToAll || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>

                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSendToAll}
                        disabled={sending || sendingToAll || !newMessage.trim()}
                        className="flex items-center gap-2 bg-transparent"
                      >
                        <Megaphone className="h-3 w-3" />
                        {sendingToAll ? "Sending to All..." : "Send to All"}
                      </Button>

                      <p className="text-xs text-muted-foreground">{newMessage.length}/1000 characters</p>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a contact</h3>
                  <p className="text-muted-foreground">Choose someone to start a private conversation</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
})

PrivateMessages.displayName = "PrivateMessages"

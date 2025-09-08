"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileText, MessageSquare, Users, Settings, LogOut, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { ViewSwitcher } from "@/components/view-switcher"
import { FileManager } from "@/components/file-manager"
import { ChatRoom } from "@/components/chat-room"
import { UserManagement } from "@/components/user-management"
import { ProfileSettings } from "@/components/profile-settings"
import { PrivateMessages } from "@/components/private-messages"
import { NotificationSystem } from "@/components/notification-system"
import { ThemeToggle } from "@/components/theme-toggle"
import { VaultManager } from "@/components/vault-manager"

interface User {
  id: number
  username: string
  role: string
  profile_picture?: string
}

interface TabletDashboardProps {
  user: User
}

export function TabletDashboard({ user }: TabletDashboardProps) {
  const [activeTab, setActiveTab] = useState("files")
  const [currentView, setCurrentView] = useState("user1")
  const router = useRouter()
  const fileManagerRef = useRef<any>(null)
  const privateMessagesRef = useRef<any>(null)

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
      // Force logout even if API call fails
      router.push("/login")
      router.refresh()
    }
  }

  const handleNotificationNavigation = (tab: string, data?: any) => {
    setActiveTab(tab)

    if (data) {
      setTimeout(() => {
        if (tab === "files" && data.fileId && fileManagerRef.current) {
          fileManagerRef.current.openFile(data.fileId)
        } else if (tab === "messages" && data.userId && privateMessagesRef.current) {
          privateMessagesRef.current.selectUser(data.userId)
        }
      }, 100)
    }
  }

  const getUserInitials = (username: string) => {
    if (!username || typeof username !== "string") return "??"
    return username.slice(0, 2).toUpperCase()
  }

  const menuItems = [
    { id: "files", label: "Files", icon: FileText },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "messages", label: "Messages", icon: MessageSquare },
    ...(user.role === "collector" ? [{ id: "vault", label: "Vault", icon: Shield }] : []),
    ...(user.role === "developer" ? [{ id: "users", label: "Users", icon: Users }] : []),
    { id: "profile", label: "Profile", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="h-8 w-8 dark:invert" />
            <div>
              <h1 className="font-semibold">Bureau of Customs – PEZA</h1>
              <p className="text-sm text-muted-foreground">eFiles System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                className="w-full justify-start h-12"
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </Button>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.profile_picture || "/placeholder.svg"} />
              <AvatarFallback>{getUserInitials(user.username)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{user.username || "Unknown"}</p>
              <p className="text-sm text-muted-foreground capitalize">{user.role || "user"}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h2 className="text-xl font-semibold">
                {menuItems.find((item) => item.id === activeTab)?.label || "Dashboard"}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <NotificationSystem userId={user.id} onNavigate={handleNotificationNavigation} />
            </div>
          </div>
        </header>

        {/* View Switcher */}
        {(activeTab === "files" || activeTab === "chat") && (
          <div className="p-6 border-b bg-muted/30">
            <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} userRole={user.role} />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {activeTab === "files" && <FileManager ref={fileManagerRef} user={user} currentView={currentView} />}
            {activeTab === "chat" && <ChatRoom user={user} currentView={currentView} />}
            {activeTab === "messages" && <PrivateMessages ref={privateMessagesRef} user={user} />}
            {activeTab === "users" && user.role === "developer" && <UserManagement />}
            {activeTab === "profile" && <ProfileSettings user={user} />}
            {activeTab === "vault" && user.role === "collector" && <VaultManager user={user} />}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t p-4 text-center">
          <div className="text-sm text-muted-foreground">
            Powered by: <span className="font-bold text-black dark:text-white">CODE</span>
            <span className="font-bold text-cyan-500">X</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

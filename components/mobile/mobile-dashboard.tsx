"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { FileText, MessageSquare, Users, Settings, LogOut, Menu, Shield } from "lucide-react"
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

interface MobileDashboardProps {
  user: User
}

export function MobileDashboard({ user }: MobileDashboardProps) {
  const [activeTab, setActiveTab] = useState("files")
  const [currentView, setCurrentView] = useState("user1")
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    setSidebarOpen(false)

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSidebarOpen(false)
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Sidebar Header */}
                  <div className="p-6 border-b">
                    <div className="flex items-center gap-3">
                      <img src="/logo.svg" alt="Logo" className="h-8 w-8 dark:invert" />
                      <div>
                        <h2 className="font-semibold text-sm">Bureau of Customs – PEZA</h2>
                        <p className="text-xs text-muted-foreground">eFiles System</p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex-1 p-4">
                    <nav className="space-y-2">
                      {menuItems.map((item) => (
                        <Button
                          key={item.id}
                          variant={activeTab === item.id ? "default" : "ghost"}
                          className="w-full justify-start h-12"
                          onClick={() => handleTabChange(item.id)}
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </Button>
                      ))}
                    </nav>
                  </div>

                  {/* User Info */}
                  <div className="p-4 border-t">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profile_picture || "/placeholder.svg"} />
                        <AvatarFallback>{getUserInitials(user.username)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.username || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role || "user"}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Logo" className="h-6 w-6 dark:invert" />
              <h1 className="font-semibold text-sm truncate">eFiles</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationSystem userId={user.id} onNavigate={handleNotificationNavigation} />
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profile_picture || "/placeholder.svg"} />
              <AvatarFallback className="text-xs">{getUserInitials(user.username)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* View Switcher for Files and Chat */}
      {(activeTab === "files" || activeTab === "chat") && (
        <div className="p-4 border-b bg-muted/30">
          <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} userRole={user.role} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 pb-safe">
          {activeTab === "files" && <FileManager ref={fileManagerRef} user={user} currentView={currentView} />}
          {activeTab === "chat" && <ChatRoom user={user} currentView={currentView} />}
          {activeTab === "messages" && <PrivateMessages ref={privateMessagesRef} user={user} />}
          {activeTab === "users" && user.role === "developer" && <UserManagement />}
          {activeTab === "profile" && <ProfileSettings user={user} />}
          {activeTab === "vault" && user.role === "collector" && <VaultManager user={user} />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 border-t bg-background/95 backdrop-blur pb-safe">
        <div className="flex items-center justify-around py-2">
          {menuItems.slice(0, 4).map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1 h-12 px-3 ${
                activeTab === item.id ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => handleTabChange(item.id)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 h-12 px-3 ${
              activeTab === "profile" ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={() => handleTabChange("profile")}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </nav>
    </div>
  )
}

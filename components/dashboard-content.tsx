"use client"

import { useDeviceType } from "@/hooks/use-device-type"
import { MobileDashboard } from "@/components/mobile/mobile-dashboard"
import { TabletDashboard } from "@/components/tablet/tablet-dashboard"
import { useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileManager } from "@/components/file-manager"
import { ChatRoom } from "@/components/chat-room"
import { UserManagement } from "@/components/user-management"
import { ProfileSettings } from "@/components/profile-settings"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FileText, MessageSquare, Users, Settings, LogOut, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { ViewSwitcher } from "@/components/view-switcher"
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

interface DashboardContentProps {
  user: User
}

// Desktop Dashboard Component (unchanged)
function DesktopDashboard({ user }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState("files")
  const router = useRouter()
  const [currentView, setCurrentView] = useState("user1")
  const fileManagerRef = useRef<any>(null)
  const privateMessagesRef = useRef<any>(null)

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const handleNotificationNavigation = (tab: string, data?: any) => {
    setActiveTab(tab)

    // Handle specific navigation with data
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
    return username.slice(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center px-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Bureau of Customs - PEZA Logo" className="h-8 w-8 dark:invert" />
            <div>
              <h1 className="text-lg font-semibold">Bureau of Customs – PEZA: eFiles System</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <ThemeToggle />

            <NotificationSystem userId={user.id} onNavigate={handleNotificationNavigation} />

            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profile_picture || "/placeholder.svg"} />
                <AvatarFallback>{getUserInitials(user.username)}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container p-4 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-6 mb-6">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            {user.role === "collector" && (
              <TabsTrigger value="vault" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Vault</span>
              </TabsTrigger>
            )}
            {user.role === "developer" && (
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="mt-6">
            <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} userRole={user.role} />
            <FileManager ref={fileManagerRef} user={user} currentView={currentView} />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} userRole={user.role} />
            <ChatRoom user={user} currentView={currentView} />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <PrivateMessages ref={privateMessagesRef} user={user} />
          </TabsContent>

          {user.role === "collector" && (
            <TabsContent value="vault" className="mt-6">
              <VaultManager user={user} />
            </TabsContent>
          )}

          {user.role === "developer" && (
            <TabsContent value="users" className="mt-6">
              <UserManagement />
            </TabsContent>
          )}

          <TabsContent value="profile" className="mt-6">
            <ProfileSettings user={user} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="flex justify-center py-4">
        <div className="text-sm text-muted-foreground">
          Powered by: <span className="font-bold text-black dark:text-white">CODE</span>
          <span className="font-bold text-cyan-500">X</span>
        </div>
      </div>
    </div>
  )
}

export function DashboardContent({ user }: DashboardContentProps) {
  const deviceType = useDeviceType()

  // Render appropriate dashboard based on device type
  switch (deviceType) {
    case "mobile":
      return <MobileDashboard user={user} />
    case "tablet":
      return <TabletDashboard user={user} />
    case "desktop":
    default:
      return <DesktopDashboard user={user} />
  }
}

"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileUploadDialog } from "@/components/file-upload-dialog"
import { FilePreviewDialog } from "@/components/file-preview-dialog"
import {
  Upload,
  FileText,
  Eye,
  Trash2,
  MessageCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  FolderPlus,
  Folder,
  ChevronRight,
  Home,
  AlertCircle,
  ArrowLeft,
} from "lucide-react"
import { safeFormatDistanceToNow } from "@/lib/date-utils"

interface User {
  id: number
  username: string
  role: string
}

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
  uploaded_by_role?: string
  folder_path?: string
}

interface CustomTab {
  id: number
  role_group: string
  tab_name: string
  tab_key: string
  display_order: number
}

interface FileManagerProps {
  user: User
  currentView?: string
}

export const FileManager = forwardRef<any, FileManagerProps>(({ user, currentView = "user1" }, ref) => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([])
  const [currentFolderPath, setCurrentFolderPath] = useState("")

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [uploaderFilter, setUploaderFilter] = useState("all")
  const [dateRangeFilter, setDateRangeFilter] = useState("all")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Folder Creation States
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [folderError, setFolderError] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Folder Deletion States
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<any>(null)
  const [deletingFolder, setDeletingFolder] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useImperativeHandle(ref, () => ({
    openFile: (fileId: number) => {
      const file = files.find((f) => f.id === fileId)
      if (file) {
        setPreviewFile(file)
      }
    },
  }))

  // Reset state when currentView changes
  useEffect(() => {
    setCustomTabs([])
    setActiveCategory("all")
    setFiles([])
    setFolders([])
    setCurrentFolderPath("")
    setSearchQuery("")
    setStatusFilter("all")
    setTypeFilter("all")
    setUploaderFilter("all")
    setDateRangeFilter("all")
    setLoading(true)

    fetchFiles()
    fetchFolders()
    fetchCustomTabs()
  }, [currentView, user.role])

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files")
      const data = await response.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Error fetching files:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFolders = async () => {
    try {
      const roleGroup = user.role === "developer" || user.role === "collector" ? currentView : user.role
      const response = await fetch(`/api/folders/${roleGroup}`)
      const data = await response.json()
      setFolders(data.folders || [])
    } catch (error) {
      console.error("Error fetching folders:", error)
    }
  }

  const fetchCustomTabs = async () => {
    try {
      const roleGroup = user.role === "developer" || user.role === "collector" ? currentView : user.role
      const response = await fetch(`/api/custom-tabs/${roleGroup}`)
      const data = await response.json()

      const uniqueTabs = data.tabs
        ? data.tabs.filter(
            (tab: CustomTab, index: number, self: CustomTab[]) =>
              index === self.findIndex((t) => t.tab_key === tab.tab_key),
          )
        : []

      const sortedTabs = uniqueTabs.sort((a: CustomTab, b: CustomTab) => a.display_order - b.display_order)
      setCustomTabs(sortedTabs)
    } catch (error) {
      console.error("Error fetching custom tabs:", error)
      setCustomTabs([])
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderError("Folder name is required")
      return
    }

    if (activeCategory === "all") {
      setFolderError("Please select a specific category to create folders")
      return
    }

    // Additional permission check
    if (user.role === "collector") {
      setFolderError("Collectors cannot create folders")
      return
    }

    setCreatingFolder(true)
    setFolderError("")

    try {
      const roleGroup = user.role === "developer" || user.role === "collector" ? currentView : user.role
      const folderPath = currentFolderPath ? `${currentFolderPath}/${newFolderName.trim()}` : newFolderName.trim()

      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          path: folderPath,
          category: activeCategory,
          role_group: roleGroup,
          parent_path: currentFolderPath || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewFolderName("")
        setCreateFolderOpen(false)
        fetchFolders()
      } else {
        setFolderError(data.error || "Failed to create folder")
      }
    } catch (error) {
      console.error("Error creating folder:", error)
      setFolderError("Failed to create folder")
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return

    setDeletingFolder(true)
    setDeleteError("")

    try {
      const response = await fetch(`/api/folders/delete/${folderToDelete.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        // If we're currently in the deleted folder or its subfolder, navigate up
        if (currentFolderPath.startsWith(folderToDelete.path)) {
          const parentPath = folderToDelete.parent_path || ""
          setCurrentFolderPath(parentPath)
        }

        setDeleteFolderOpen(false)
        setFolderToDelete(null)
        fetchFolders()
        fetchFiles() // Refresh files as they may have been deleted too
      } else {
        setDeleteError(data.error || "Failed to delete folder")
      }
    } catch (error) {
      console.error("Error deleting folder:", error)
      setDeleteError("Failed to delete folder")
    } finally {
      setDeletingFolder(false)
    }
  }

  const handleFileUploaded = () => {
    fetchFiles()
    setUploadDialogOpen(false)
  }

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchFiles()
      }
    } catch (error) {
      console.error("Error deleting file:", error)
    }
  }

  const navigateToFolder = (folderPath: string) => {
    console.log("Navigating to folder:", folderPath)
    setCurrentFolderPath(folderPath)
  }

  const navigateUp = () => {
    console.log("Navigating up from:", currentFolderPath)
    if (currentFolderPath) {
      const pathParts = currentFolderPath.split("/")
      pathParts.pop()
      const newPath = pathParts.join("/")
      console.log("New path:", newPath)
      setCurrentFolderPath(newPath)
    }
  }

  const navigateToCategory = () => {
    console.log("navigateToCategory called - clearing folder path")
    setCurrentFolderPath("")
  }

  const handleCategoryChange = (value: string) => {
    console.log("handleCategoryChange called with value:", value)

    // First set the category
    setActiveCategory(value)

    // Then immediately clear the folder path - no delays or conditions
    setCurrentFolderPath("")

    console.log("Category changed to:", value, "and folder path cleared")
  }

  const getBreadcrumbs = () => {
    if (!currentFolderPath) return []
    return currentFolderPath.split("/").map((part, index, array) => ({
      name: part,
      path: array.slice(0, index + 1).join("/"),
    }))
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

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄"
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📊"
    if (fileType.includes("word") || fileType.includes("document")) return "📝"
    if (fileType.includes("image")) return "🖼️"
    return "📁"
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const applyFilters = (items: FileItem[]) => {
    return items.filter((file) => {
      // Category filter
      if (activeCategory !== "all" && file.category !== activeCategory) return false

      // Folder filter
      const fileFolderPath = file.folder_path || ""
      if (fileFolderPath !== currentFolderPath) return false

      // Search query
      if (
        searchQuery &&
        !file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !file.uploaded_by.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false

      // Status filter
      if (statusFilter !== "all" && file.status !== statusFilter) return false

      // Type filter
      if (typeFilter !== "all") {
        const fileTypeCategory = getFileTypeCategory(file.file_type)
        if (fileTypeCategory !== typeFilter) return false
      }

      // Uploader filter
      if (uploaderFilter !== "all" && file.uploaded_by_role !== uploaderFilter) return false

      // Date range filter
      if (dateRangeFilter !== "all") {
        const fileDate = new Date(file.upload_date)
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24))

        switch (dateRangeFilter) {
          case "today":
            if (daysDiff > 0) return false
            break
          case "week":
            if (daysDiff > 7) return false
            break
          case "month":
            if (daysDiff > 30) return false
            break
        }
      }

      return true
    })
  }

  const getFileTypeCategory = (fileType: string) => {
    if (fileType.includes("pdf")) return "pdf"
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "excel"
    if (fileType.includes("word") || fileType.includes("document")) return "word"
    if (fileType.includes("image")) return "image"
    return "other"
  }

  const canViewFile = (file: FileItem) => {
    if (user.role === "developer" || user.role === "collector") {
      const targetRole = currentView
      return file.uploaded_by_role === targetRole || file.shared_with === "all" || file.shared_with === targetRole
    }

    if (user.role === "user1" || user.role === "user2") {
      return file.uploaded_by_role === user.role || file.shared_with === user.role || file.shared_with === "all"
    }

    return false
  }

  const getCurrentFolders = () => {
    return folders.filter(
      (folder) => folder.category === activeCategory && (folder.parent_path || "") === currentFolderPath,
    )
  }

  const visibleFiles = applyFilters(files.filter(canViewFile))
  const currentFolders = getCurrentFolders()

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setTypeFilter("all")
    setUploaderFilter("all")
    setDateRangeFilter("all")
  }

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    uploaderFilter !== "all" ||
    dateRangeFilter !== "all"

  // Update URL when navigation changes
  useEffect(() => {
    if (typeof window !== "undefined" && activeCategory !== "all") {
      const url = new URL(window.location.href)
      url.searchParams.set("category", activeCategory)

      if (currentFolderPath) {
        url.searchParams.set("folderPath", encodeURIComponent(currentFolderPath))
      } else {
        url.searchParams.delete("folderPath")
      }

      // Update URL without triggering a page reload
      window.history.replaceState({}, "", url.toString())
    }
  }, [activeCategory, currentFolderPath])

  // Add this useEffect after the other useEffects
  useEffect(() => {
    console.log("currentFolderPath changed to:", currentFolderPath)
  }, [currentFolderPath])

  useEffect(() => {
    console.log("activeCategory changed to:", activeCategory)
  }, [activeCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading files...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">File Manager</h2>
          <p className="text-muted-foreground">Manage your daily and monthly reports</p>
        </div>

        <div className="flex items-center gap-2">
          {(user.role === "developer" || user.role === "user1" || user.role === "user2") && (
            <Button onClick={() => setUploadDialogOpen(true)} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files by name or uploader..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    Active
                  </Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} size="sm">
                  Clear
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">File Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="word">Word</SelectItem>
                      <SelectItem value="image">Images</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Uploader Role</Label>
                  <Select value={uploaderFilter} onValueChange={setUploaderFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="collector">Collector</SelectItem>
                      <SelectItem value="user1">User1</SelectItem>
                      <SelectItem value="user2">User2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Date Range</Label>
                  <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
        <TabsList className="w-full justify-start">
          {customTabs.map((tab) => (
            <TabsTrigger key={`${tab.role_group}-${tab.tab_key}`} value={tab.tab_key}>
              {tab.tab_name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {/* Enhanced Breadcrumb Navigation */}
          {(currentFolderPath || activeCategory !== "all") && (
            <Card className="mb-4">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log("Home button clicked - clearing folder path")
                        setCurrentFolderPath("")
                      }}
                      className="h-6 px-2"
                    >
                      <Home className="h-3 w-3 mr-1" />
                      {customTabs.find((tab) => tab.tab_key === activeCategory)?.tab_name || activeCategory}
                    </Button>

                    {getBreadcrumbs().map((crumb, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigateToFolder(crumb.path)}
                          className="h-6 px-2"
                        >
                          {crumb.name}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Enhanced Back Navigation */}
                  {currentFolderPath && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={navigateUp} className="h-7 px-3 bg-transparent">
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Up
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          console.log("Category View button clicked - clearing folder path")
                          setCurrentFolderPath("")
                        }}
                        className="h-7 px-3 text-muted-foreground hover:text-foreground"
                      >
                        <Home className="h-3 w-3 mr-1" />
                        Category View
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Folder Creation Button */}
          {activeCategory !== "all" &&
            (user.role === "developer" || user.role === "user1" || user.role === "user2") && (
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                        <FolderPlus className="h-4 w-4" />
                        New Folder
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>
                          Create a new folder in {customTabs.find((tab) => tab.tab_key === activeCategory)?.tab_name}
                          {currentFolderPath && ` / ${currentFolderPath}`}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="folderName">Folder Name</Label>
                          <Input
                            id="folderName"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Enter folder name"
                            onKeyPress={(e) => e.key === "Enter" && handleCreateFolder()}
                          />
                        </div>
                        {folderError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{folderError}</AlertDescription>
                          </Alert>
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCreateFolder}
                            disabled={creatingFolder || !newFolderName.trim()}
                            className="flex-1"
                          >
                            {creatingFolder ? "Creating..." : "Create Folder"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setCreateFolderOpen(false)
                              setNewFolderName("")
                              setFolderError("")
                            }}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="text-sm text-muted-foreground">
                  {currentFolders.length} folders, {visibleFiles.length} files
                  {hasActiveFilters && " (filtered)"}
                </div>
              </div>
            )}

          {/* Folders Display */}
          {currentFolders.length > 0 && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
              {currentFolders.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow group relative">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                        onClick={() => navigateToFolder(folder.path)}
                      >
                        <Folder className="h-8 w-8 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" title={folder.name}>
                            {folder.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Created {safeFormatDistanceToNow(folder.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Delete button - only show for folder creators, developers, or collectors */}
                      {(user.role === "developer" ||
                        user.role === "collector" ||
                        folder.created_by === user.username) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFolderToDelete(folder)
                            setDeleteFolderOpen(true)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive h-8 w-8 p-0 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Files Display - Improved for iPad layout */}
          {visibleFiles.length === 0 && currentFolders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {hasActiveFilters ? "No files match your filters" : "No files found"}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {hasActiveFilters
                    ? "Try adjusting your search criteria or filters"
                    : activeCategory === "all"
                      ? "No files have been uploaded yet."
                      : `No ${activeCategory} files have been uploaded yet.`}
                </p>
                {hasActiveFilters ? (
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                ) : (
                  (user.role === "developer" || user.role === "user1" || user.role === "user2") && (
                    <Button onClick={() => setUploadDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload First File
                    </Button>
                  )
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-2xl flex-shrink-0">{getFileIcon(file.file_type)}</span>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm font-medium truncate" title={file.original_name}>
                            {file.original_name}
                          </CardTitle>
                          <CardDescription className="text-xs truncate">
                            {formatFileSize(file.file_size)} • {file.file_type}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {file.category}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 flex-1 flex flex-col">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                        <span className="truncate" title={`By ${file.uploaded_by}`}>
                          By {file.uploaded_by}
                        </span>
                        <span className="flex-shrink-0">{safeFormatDistanceToNow(file.upload_date)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Badge className={`${getStatusColor(file.status)} flex-shrink-0`}>
                          {file.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {file.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          <span className="truncate">{file.status.charAt(0).toUpperCase() + file.status.slice(1)}</span>
                        </Badge>

                        {file.comments_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <MessageCircle className="h-3 w-3" />
                            {file.comments_count}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-transparent min-w-0"
                          onClick={() => setPreviewFile(file)}
                        >
                          <Eye className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">View</span>
                        </Button>

                        {(user.role === "developer" || file.uploaded_by === user.username) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFile(file.id)}
                            className="text-destructive hover:text-destructive flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Folder Deletion Dialog */}
      <Dialog open={deleteFolderOpen} onOpenChange={setDeleteFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Folder
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the folder and all its contents.
            </DialogDescription>
          </DialogHeader>

          {folderToDelete && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Are you sure you want to delete "{folderToDelete.name}"?</strong>
                  <br />
                  All files and subfolders inside will be permanently removed from the system.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Folder Details:</p>
                <p className="text-sm text-muted-foreground">Name: {folderToDelete.name}</p>
                <p className="text-sm text-muted-foreground">Path: {folderToDelete.path}</p>
                <p className="text-sm text-muted-foreground">Category: {folderToDelete.category}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {safeFormatDistanceToNow(folderToDelete.created_at)}
                </p>
              </div>

              {deleteError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteFolderOpen(false)
                    setFolderToDelete(null)
                    setDeleteError("")
                  }}
                  disabled={deletingFolder}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteFolder} disabled={deletingFolder} className="flex-1">
                  {deletingFolder ? "Deleting..." : "Delete Folder"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Smart Upload Dialog */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onFileUploaded={handleFileUploaded}
        user={user}
        currentView={currentView}
        currentFolderPath={currentFolderPath}
        currentCategory={activeCategory}
        customTabs={customTabs}
        key={`upload-${currentView}-${user.role}-${currentFolderPath}-${activeCategory}`}
      />

      {previewFile && (
        <FilePreviewDialog
          file={previewFile}
          user={user}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          onStatusChange={fetchFiles}
        />
      )}
    </div>
  )
})

FileManager.displayName = "FileManager"

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, AlertCircle, Plus, Folder, Lock } from "lucide-react"

interface User {
  id: number
  username: string
  role: string
}

interface CustomTab {
  id: number
  role_group: string
  tab_name: string
  tab_key: string
  display_order: number
}

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileUploaded: () => void
  user: User
  currentView?: string
  currentFolderPath?: string
  currentCategory?: string
  customTabs?: CustomTab[]
}

export function FileUploadDialog({
  open,
  onOpenChange,
  onFileUploaded,
  user,
  currentView = "user1",
  currentFolderPath = "",
  currentCategory = "",
  customTabs = [],
}: FileUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>("")
  const [sharedWith, setSharedWith] = useState<string>("group")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [localCustomTabs, setLocalCustomTabs] = useState<CustomTab[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  // Smart context detection
  const isInFolder = Boolean(currentFolderPath)
  const hasContextCategory = Boolean(currentCategory && currentCategory !== "all")
  const shouldLockCategory = isInFolder && hasContextCategory

  // Reset state when dialog opens or context changes
  useEffect(() => {
    if (open) {
      setLocalCustomTabs(customTabs.length > 0 ? customTabs : [])
      setError("")
      setShowAddCategory(false)
      setNewCategoryName("")

      // Smart category pre-fill
      if (hasContextCategory) {
        setCategory(currentCategory)
      } else {
        setCategory("")
      }

      // If no custom tabs provided, fetch them
      if (customTabs.length === 0) {
        fetchCustomTabs()
      }
    }
  }, [open, currentView, user.role, currentCategory, currentFolderPath, customTabs])

  const fetchCustomTabs = async () => {
    try {
      const roleGroup = user.role === "developer" || user.role === "collector" ? currentView : user.role
      const response = await fetch(`/api/custom-tabs/${roleGroup}`)
      const data = await response.json()

      if (data.tabs) {
        const uniqueTabs = data.tabs.filter(
          (tab: CustomTab, index: number, self: CustomTab[]) =>
            index === self.findIndex((t) => t.tab_key === tab.tab_key),
        )

        const uploadCategories = uniqueTabs
          .filter((tab: CustomTab) => tab.tab_key !== "all")
          .sort((a: CustomTab, b: CustomTab) => a.display_order - b.display_order)

        setLocalCustomTabs(uploadCategories)
      } else {
        setLocalCustomTabs([])
      }
    } catch (error) {
      console.error("Error fetching custom tabs:", error)
      setLocalCustomTabs([])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("File size must be less than 50MB")
        return
      }

      const allowedTypes = [
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/gif",
      ]

      if (!allowedTypes.includes(selectedFile.type)) {
        setError("File type not supported. Please upload PDF, Excel, Word, or image files.")
        return
      }

      setFile(selectedFile)
      setError("")
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const roleGroup = user.role === "developer" || user.role === "collector" ? currentView : user.role
      const newTabKey = newCategoryName.toLowerCase().replace(/\s+/g, "-")

      if (localCustomTabs.some((tab) => tab.tab_key === newTabKey)) {
        setError("Category already exists")
        return
      }

      const response = await fetch(`/api/custom-tabs/${roleGroup}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab_name: newCategoryName.trim(),
          tab_key: newTabKey,
        }),
      })

      if (response.ok) {
        setNewCategoryName("")
        setShowAddCategory(false)
        await fetchCustomTabs()
        setCategory(newTabKey)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to add category")
      }
    } catch (error) {
      console.error("Error adding category:", error)
      setError("Failed to add category")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !category) {
      setError("Please select a file and category")
      return
    }

    setUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)
      formData.append("shared_with", sharedWith)
      formData.append("folder_path", currentFolderPath)

      if (user.role === "developer" || user.role === "collector") {
        formData.append("target_role", currentView)
      }

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        onFileUploaded()
        resetForm()
      } else {
        setError(data.error || "Upload failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    if (!hasContextCategory) {
      setCategory("")
    }
    setSharedWith("group")
    setError("")
    setShowAddCategory(false)
    setNewCategoryName("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!uploading) {
      onOpenChange(newOpen)
      if (!newOpen) {
        resetForm()
      }
    }
  }

  const getCurrentCategoryName = () => {
    const currentTab = localCustomTabs.find((tab) => tab.tab_key === currentCategory)
    return currentTab?.tab_name || currentCategory
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload File
            {isInFolder && (
              <Badge variant="secondary" className="ml-2">
                Smart Upload
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Upload a file for review and approval
            {isInFolder && (
              <div className="flex items-center gap-1 mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                <Folder className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <div className="font-medium text-blue-800 dark:text-blue-200">
                    Uploading to: {getCurrentCategoryName()}
                  </div>
                  <div className="text-blue-600 dark:text-blue-300">Folder: {currentFolderPath}</div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.gif"
              required
            />
            <p className="text-xs text-gray-500">Supported: PDF, Excel, Word, Images (max 50MB)</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category" className="flex items-center gap-2">
                Category
                {shouldLockCategory && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              {!shouldLockCategory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Category
                </Button>
              )}
            </div>

            {shouldLockCategory ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{getCurrentCategoryName()}</div>
                  <div className="text-xs text-muted-foreground">Category locked based on current folder location</div>
                </div>
              </div>
            ) : (
              <>
                {showAddCategory && (
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1"
                      onKeyPress={(e) => e.key === "Enter" && e.preventDefault()}
                    />
                    <Button type="button" size="sm" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                      Add
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddCategory(false)}>
                      Cancel
                    </Button>
                  </div>
                )}

                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {localCustomTabs.map((tab) => (
                      <SelectItem key={`${tab.role_group}-${tab.tab_key}`} value={tab.tab_key}>
                        {tab.tab_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {isInFolder && (
            <div className="space-y-2">
              <Label>Upload Location</Label>
              <div className="p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2 text-sm">
                  <Folder className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">{getCurrentCategoryName()}</div>
                    <div className="text-muted-foreground">{currentFolderPath}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>File Visibility</Label>
            <RadioGroup value={sharedWith} onValueChange={setSharedWith}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" />
                <Label htmlFor="group" className="text-sm">
                  Share with my group (
                  {user.role === "developer" || user.role === "collector" ? currentView : user.role})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="text-sm">
                  Share with everyone
                </Label>
              </div>
            </RadioGroup>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !file} className="flex-1">
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const folderId = Number.parseInt(id)

    if (isNaN(folderId)) {
      return NextResponse.json({ error: "Invalid vault folder ID" }, { status: 400 })
    }

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "collector") {
      return NextResponse.json({ error: "Access denied - Collectors only" }, { status: 403 })
    }

    const db = getDb()

    // Get folder details first
    const folder = db
      .prepare("SELECT * FROM vault_folders WHERE id = ? AND collector_id = ?")
      .get(folderId, user.id) as any

    if (!folder) {
      return NextResponse.json({ error: "Vault folder not found" }, { status: 404 })
    }

    // Delete all files in this folder and subfolders
    db.prepare(`
      DELETE FROM vault_files 
      WHERE collector_id = ? AND (folder_path = ? OR folder_path LIKE ?)
    `).run(user.id, folder.path, `${folder.path}/%`)

    // Delete all subfolders
    db.prepare(`
      DELETE FROM vault_folders 
      WHERE collector_id = ? AND (path = ? OR path LIKE ?)
    `).run(user.id, folder.path, `${folder.path}/%`)

    return NextResponse.json({
      success: true,
      message: "Vault folder and all contents deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting vault folder:", error)
    return NextResponse.json({ error: "Failed to delete vault folder: " + error.message }, { status: 500 })
  }
}

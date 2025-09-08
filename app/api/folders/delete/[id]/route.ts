import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const folderId = Number.parseInt(id)

    if (isNaN(folderId)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 })
    }

    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()

    // Get folder details first
    const folder = db.prepare("SELECT * FROM folders WHERE id = ?").get(folderId) as any

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // Check permissions - only folder creator, developers, or collectors can delete
    if (user.role !== "developer" && user.role !== "collector" && folder.created_by !== user.username) {
      return NextResponse.json(
        { error: "Permission denied - You can only delete folders you created" },
        { status: 403 },
      )
    }

    // Delete all files in this folder and subfolders
    db.prepare(`
      DELETE FROM files 
      WHERE folder_path = ? OR folder_path LIKE ?
    `).run(folder.path, `${folder.path}/%`)

    // Delete all subfolders
    db.prepare(`
      DELETE FROM folders 
      WHERE path = ? OR path LIKE ?
    `).run(folder.path, `${folder.path}/%`)

    return NextResponse.json({
      success: true,
      message: "Folder and all contents deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting folder:", error)
    return NextResponse.json({ error: "Failed to delete folder: " + error.message }, { status: 500 })
  }
}

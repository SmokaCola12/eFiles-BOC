import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import { unlink } from "fs/promises"
import { join } from "path"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    const file = db.prepare("SELECT * FROM files WHERE id = ?").get(id) as any

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check permissions
    if (user.role !== "admin" && file.uploaded_by !== user.username) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    // Delete file from disk
    try {
      const filepath = join(process.cwd(), "uploads", file.filename)
      await unlink(filepath)
    } catch (error) {
      console.error("Error deleting file from disk:", error)
    }

    // Delete from database
    db.prepare("DELETE FROM files WHERE id = ?").run(id)
    db.prepare("DELETE FROM comments WHERE file_id = ?").run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { status } = await request.json()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "collector" && user.role !== "developer") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const db = getDb()

    // Get file info and uploader
    const file = db.prepare("SELECT * FROM files WHERE id = ?").get(id) as any
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Update status
    db.prepare("UPDATE files SET status = ? WHERE id = ?").run(status, id)

    // Create notification for file uploader
    const uploader = db.prepare("SELECT id FROM users WHERE username = ?").get(file.uploaded_by) as any
    if (uploader) {
      db.prepare(`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        uploader.id,
        "file_status",
        `File ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `Your file "${file.original_name}" has been ${status}`,
        id,
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Status update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

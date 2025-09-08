import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    const comments = db
      .prepare(`
      SELECT * FROM comments 
      WHERE file_id = ? 
      ORDER BY created_at ASC
    `)
      .all(id)

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { content } = await request.json()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
    }

    const db = getDb()

    // Get file info
    const file = db.prepare("SELECT * FROM files WHERE id = ?").get(id) as any
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Add comment
    db.prepare(`
      INSERT INTO comments (file_id, content, author)
      VALUES (?, ?, ?)
    `).run(id, content.trim(), user.username)

    // Create notification for file uploader (if not the commenter)
    if (file.uploaded_by !== user.username) {
      const uploader = db.prepare("SELECT id FROM users WHERE username = ?").get(file.uploaded_by) as any
      if (uploader) {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title,  message, related_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(uploader.id, "file_comment", "New Comment", `${user.username} commented on "${file.original_name}"`, id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding comment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

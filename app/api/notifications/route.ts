import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    const notifications = db
      .prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 50
      `)
      .all(user.id)

    const unreadCount = db
      .prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE")
      .get(user.id) as { count: number }

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount.count,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, type, title, message, related_id } = await request.json()

    const db = getDb()
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, type, title, message, related_id || null)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()

    // Delete all notifications for the current user
    db.prepare(`
      DELETE FROM notifications 
      WHERE user_id = ?
    `).run(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing all notifications:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

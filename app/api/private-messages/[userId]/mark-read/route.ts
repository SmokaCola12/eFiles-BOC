import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()

    // Get all messages from this user to current user
    const messages = db
      .prepare(`
        SELECT id FROM private_messages 
        WHERE sender_id = ? AND receiver_id = ?
      `)
      .all(userId, user.id) as any[]

    // Mark all as read
    messages.forEach((message) => {
      // Check if read status exists
      const existing = db
        .prepare("SELECT id FROM message_read_status WHERE user_id = ? AND message_id = ?")
        .get(user.id, message.id)

      if (existing) {
        db.prepare(`
          UPDATE message_read_status 
          SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
          WHERE user_id = ? AND message_id = ?
        `).run(user.id, message.id)
      } else {
        db.prepare(`
          INSERT INTO message_read_status (user_id, message_id, is_read, read_at)
          VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
        `).run(user.id, message.id)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

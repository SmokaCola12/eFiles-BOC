import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    if (content.trim().length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 })
    }

    const db = getDb()

    // Get all users except the sender
    const allUsers = db
      .prepare(`
      SELECT id FROM users 
      WHERE id != ?
    `)
      .all(user.id) as any[]

    if (allUsers.length === 0) {
      return NextResponse.json({ error: "No users to send message to" }, { status: 400 })
    }

    // Send message to all users
    const insertMessage = db.prepare(`
      INSERT INTO private_messages (sender_id, receiver_id, content)
      VALUES (?, ?, ?)
    `)

    const insertNotification = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, ?, ?, ?, ?)
    `)

    allUsers.forEach((targetUser: any) => {
      const result = insertMessage.run(user.id, targetUser.id, content.trim())

      // Create notification for each recipient
      insertNotification.run(
        targetUser.id,
        "private_message",
        "Broadcast Message",
        `${user.username} sent a message to everyone`,
        result.lastInsertRowid,
      )
    })

    return NextResponse.json({
      success: true,
      message: `Message sent to ${allUsers.length} users`,
    })
  } catch (error) {
    console.error("Error sending broadcast message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

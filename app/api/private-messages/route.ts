import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { receiver_id, content } = await request.json()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    const db = getDb()
    const result = db
      .prepare(`
      INSERT INTO private_messages (sender_id, receiver_id, content)
      VALUES (?, ?, ?)
    `)
      .run(user.id, receiver_id, content.trim())

    // Create notification for receiver
    db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      receiver_id,
      "private_message",
      "New Private Message",
      `${user.username} sent you a message`,
      result.lastInsertRowid,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending private message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

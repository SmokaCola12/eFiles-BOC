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
    const unreadMessages = db
      .prepare(`
        SELECT sender_id, COUNT(*) as count
        FROM private_messages pm
        LEFT JOIN message_read_status mrs ON pm.id = mrs.message_id AND mrs.user_id = ?
        WHERE pm.receiver_id = ? AND (mrs.is_read IS NULL OR mrs.is_read = FALSE)
        GROUP BY sender_id
      `)
      .all(user.id, user.id) as any[]

    const unreadCounts: { [key: number]: number } = {}
    unreadMessages.forEach((msg) => {
      unreadCounts[msg.sender_id] = msg.count
    })

    return NextResponse.json({ unreadCounts })
  } catch (error) {
    console.error("Error fetching unread counts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

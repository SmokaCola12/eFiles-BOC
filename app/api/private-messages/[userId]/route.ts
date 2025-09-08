import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    const messages = db
      .prepare(`
        SELECT pm.*, 
               sender.username as sender_username,
               sender.role as sender_role
        FROM private_messages pm
        JOIN users sender ON pm.sender_id = sender.id
        WHERE (pm.sender_id = ? AND pm.receiver_id = ?) 
           OR (pm.sender_id = ? AND pm.receiver_id = ?)
        ORDER BY pm.created_at ASC
      `)
      .all(user.id, userId, userId, user.id)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching private messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

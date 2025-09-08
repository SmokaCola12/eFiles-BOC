import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    db.prepare(`
      UPDATE notifications 
      SET is_read = TRUE 
      WHERE id = ? AND user_id = ?
    `).run(id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

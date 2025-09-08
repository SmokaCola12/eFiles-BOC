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
    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view")

    let messages = []

    try {
      if ((user.role === "developer" || user.role === "collector") && view) {
        // Filter messages by role group for developer/collector view switching
        messages = db
          .prepare(`
          SELECT cm.*, COALESCE(cm.author_role, u.role) as author_role
          FROM chat_messages cm
          LEFT JOIN users u ON cm.author = u.username
          WHERE COALESCE(cm.author_role, u.role) = ?
          ORDER BY cm.created_at ASC 
          LIMIT 100
        `)
          .all(view)
      } else if (user.role === "user1" || user.role === "user2") {
        // Users only see messages from their own role group
        messages = db
          .prepare(`
          SELECT cm.*, COALESCE(cm.author_role, u.role) as author_role
          FROM chat_messages cm
          LEFT JOIN users u ON cm.author = u.username
          WHERE COALESCE(cm.author_role, u.role) = ?
          ORDER BY cm.created_at ASC 
          LIMIT 100
        `)
          .all(user.role)
      } else {
        // Default: show all messages
        messages = db
          .prepare(`
          SELECT cm.*, COALESCE(cm.author_role, u.role) as author_role
          FROM chat_messages cm
          LEFT JOIN users u ON cm.author = u.username
          ORDER BY cm.created_at ASC 
          LIMIT 100
        `)
          .all()
      }
    } catch (dbError) {
      console.error("Database query error:", dbError)
      messages = []
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ error: "Invalid JSON in request" }, { status: 400 })
    }

    const { content, visibility = "group", target_role } = body

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 })
    }

    if (content.trim().length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 })
    }

    const db = getDb()

    // Determine the effective role for the message
    let effectiveRole = user.role
    if ((user.role === "developer" || user.role === "collector") && target_role) {
      effectiveRole = target_role
    }

    try {
      // Insert the message with error handling
      db.prepare(`
        INSERT INTO chat_messages (content, author, author_role, visibility)
        VALUES (?, ?, ?, ?)
      `).run(content.trim(), user.username, effectiveRole, visibility)

      return NextResponse.json({ success: true })
    } catch (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Database error occurred" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in chat POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

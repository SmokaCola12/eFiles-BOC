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

    if (user.role !== "collector") {
      return NextResponse.json({ error: "Access denied - Collectors only" }, { status: 403 })
    }

    const db = getDb()

    // Verify the file belongs to this collector
    const fileExists = db.prepare("SELECT id FROM vault_files WHERE id = ? AND collector_id = ?").get(id, user.id)
    if (!fileExists) {
      return NextResponse.json({ error: "Vault file not found" }, { status: 404 })
    }

    const comments = db.prepare("SELECT * FROM vault_comments WHERE vault_file_id = ? ORDER BY created_at ASC").all(id)

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Error fetching vault comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "collector") {
      return NextResponse.json({ error: "Access denied - Collectors only" }, { status: 403 })
    }

    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 })
    }

    const db = getDb()

    // Verify the file belongs to this collector
    const fileExists = db.prepare("SELECT id FROM vault_files WHERE id = ? AND collector_id = ?").get(id, user.id)
    if (!fileExists) {
      return NextResponse.json({ error: "Vault file not found" }, { status: 404 })
    }

    const stmt = db.prepare("INSERT INTO vault_comments (vault_file_id, content, author) VALUES (?, ?, ?)")
    const info = stmt.run(id, content, user.username)

    return NextResponse.json({ id: info.lastInsertRowid, message: "Vault comment added successfully" })
  } catch (error) {
    console.error("Error adding vault comment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

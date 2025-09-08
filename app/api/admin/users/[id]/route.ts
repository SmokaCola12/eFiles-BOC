import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { username, password, role } = await request.json()
    const user = await getUser()

    if (!user || user.role !== "developer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!username || !role) {
      return NextResponse.json({ error: "Username and role are required" }, { status: 400 })
    }

    if (!["user1", "user2", "collector", "developer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const db = getDb()

    // Check if username already exists (excluding current user)
    const existingUser = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username, id)
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10)
      db.prepare(`
        UPDATE users 
        SET username = ?, password = ?, role = ?
        WHERE id = ?
      `).run(username, hashedPassword, role, id)
    } else {
      db.prepare(`
        UPDATE users 
        SET username = ?, role = ?
        WHERE id = ?
      `).run(username, role, id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUser()

    if (!user || user.role !== "developer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Don't allow deleting yourself
    if (user.id.toString() === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    const db = getDb()
    db.prepare("DELETE FROM users WHERE id = ?").run(id)
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

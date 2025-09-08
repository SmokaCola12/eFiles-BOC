import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user || user.role !== "developer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    const users = db
      .prepare(`
      SELECT id, username, role, created_at, profile_picture
      FROM users 
      ORDER BY created_at DESC
    `)
      .all()

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, role } = await request.json()
    const user = await getUser()

    if (!user || user.role !== "developer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!username || !password || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (!["user1", "user2", "collector", "developer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const db = getDb()

    // Check if username already exists
    const existingUser = db.prepare("SELECT id FROM users WHERE username = ?").get(username)
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    const hashedPassword = bcrypt.hashSync(password, 10)

    db.prepare(`
      INSERT INTO users (username, password, role)
      VALUES (?, ?, ?)
    `).run(username, hashedPassword, role)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

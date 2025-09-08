import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import bcrypt from "bcryptjs"
import { randomUUID } from "crypto"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const db = getDb()
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Create session
    const sessionId = randomUUID()
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

    db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(sessionId, user.id, expiresAt)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

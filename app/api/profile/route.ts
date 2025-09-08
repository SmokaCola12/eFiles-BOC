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
    const profile = db.prepare("SELECT full_name, email FROM user_profiles WHERE user_id = ?").get(user.id) as any

    return NextResponse.json({ profile: profile || { full_name: "", email: "" } })
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { full_name, email } = await request.json()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()

    // Check if profile exists
    const existingProfile = db.prepare("SELECT id FROM user_profiles WHERE user_id = ?").get(user.id)

    if (existingProfile) {
      db.prepare(`
        UPDATE user_profiles 
        SET full_name = ?, email = ?
        WHERE user_id = ?
      `).run(full_name, email, user.id)
    } else {
      db.prepare(`
        INSERT INTO user_profiles (user_id, full_name, email)
        VALUES (?, ?, ?)
      `).run(user.id, full_name, email)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

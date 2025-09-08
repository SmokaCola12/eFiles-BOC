import { type NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only developers and admins can view all collectors
    if (!["developer", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const db = getDb()
    const collectors = db.prepare("SELECT id, username FROM users WHERE role = 'collector' ORDER BY username").all()

    return NextResponse.json({ collectors })
  } catch (error) {
    console.error("Error fetching collectors:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

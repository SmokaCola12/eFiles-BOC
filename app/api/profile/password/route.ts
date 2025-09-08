import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords are required" }, { status: 400 })
    }

    const db = getDb()
    const userWithPassword = db.prepare("SELECT password FROM users WHERE id = ?").get(user.id) as any

    if (!bcrypt.compareSync(currentPassword, userWithPassword.password)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10)
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedNewPassword, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating password:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

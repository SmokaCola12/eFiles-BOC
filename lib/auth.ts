import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getDb } from "./db"

export async function getUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session")?.value

  if (!sessionId) {
    return null
  }

  const db = getDb()
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as any

  if (!session || session.expires_at < Date.now()) {
    return null
  }

  const user = db
    .prepare("SELECT id, username, role, profile_picture FROM users WHERE id = ?")
    .get(session.user_id) as any
  return user
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== "admin") {
    redirect("/dashboard")
  }
  return user
}

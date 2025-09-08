import { type NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"

// Hardcoded vault passwords per role
const VAULT_PASSWORDS = {
  collector: "vault123",
  developer: "devvault456",
  admin: "adminvault789",
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only collectors, developers, and admins can access vault
    if (!["collector", "developer", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { password, role } = await request.json()

    // Verify password matches the user's role
    const expectedPassword = VAULT_PASSWORDS[user.role as keyof typeof VAULT_PASSWORDS]

    if (password !== expectedPassword) {
      return NextResponse.json({ error: "Invalid vault password" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Vault access granted",
      role: user.role,
    })
  } catch (error) {
    console.error("Vault access error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import { writeFile } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("profilePicture") as File

    if (!file) {
      return NextResponse.json({ error: "Profile picture is required" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop()
    const filename = `profile_${user.id}_${randomUUID()}.${fileExtension}`
    const filepath = join(process.cwd(), "uploads", filename)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Update user profile picture in database
    const db = getDb()
    db.prepare("UPDATE users SET profile_picture = ? WHERE id = ?").run(`/api/files/profile/${filename}`, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating profile picture:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import { writeFile } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["user1", "user2", "developer", "collector"].includes(user.role)) {
      return NextResponse.json({ error: "Permission denied - Invalid role" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const category = formData.get("category") as string
    const sharedWith = formData.get("shared_with") as string
    const targetRole = formData.get("target_role") as string
    const folderPath = (formData.get("folder_path") as string) || ""

    if (!file || !category) {
      return NextResponse.json({ error: "File and category are required" }, { status: 400 })
    }

    let effectiveRole = user.role
    if ((user.role === "developer" || user.role === "collector") && targetRole) {
      effectiveRole = targetRole
    }

    const db = getDb()
    const validCategory = db
      .prepare("SELECT id FROM custom_tabs WHERE role_group = ? AND tab_key = ?")
      .get(effectiveRole, category)

    if (!validCategory) {
      return NextResponse.json({ error: "Invalid category for this role group" }, { status: 400 })
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop()
    const filename = `${randomUUID()}.${fileExtension}`
    const filepath = join(process.cwd(), "uploads", filename)

    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)
    } catch (fileError) {
      console.error("File write error:", fileError)
      return NextResponse.json({ error: "Failed to save file to disk" }, { status: 500 })
    }

    // Save file info to database with folder path
    const result = db
      .prepare(`
      INSERT INTO files (filename, original_name, file_type, file_size, category, shared_with, uploaded_by, folder_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .run(
        filename,
        file.name,
        file.type,
        file.size,
        category,
        sharedWith === "group" ? effectiveRole : "all",
        user.username,
        folderPath,
      )

    // Create notification for collectors/developers
    const collectors = db.prepare("SELECT id FROM users WHERE role IN ('collector', 'developer')").all() as any[]
    collectors.forEach((collector: any) => {
      if (collector.id !== user.id) {
        db.prepare(`
          INSERT INTO notifications (user_id, type, title, message, related_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          collector.id,
          "file_upload",
          "New File Uploaded",
          `${user.username} uploaded ${file.name}${folderPath ? ` in ${folderPath}` : ""}`,
          result.lastInsertRowid,
        )
      }
    })

    return NextResponse.json({
      success: true,
      fileId: result.lastInsertRowid,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

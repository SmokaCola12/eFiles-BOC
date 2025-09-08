import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permissions - only developers, user1, and user2 can create folders
    if (!["developer", "user1", "user2"].includes(user.role)) {
      return NextResponse.json(
        { error: "Permission denied - Only developers and users can create folders" },
        { status: 403 },
      )
    }

    const { name, path, category, role_group, parent_path } = await request.json()

    if (!name || !path || !category || !role_group) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = getDb()

    // Check if folder already exists
    const existingFolder = db
      .prepare("SELECT id FROM folders WHERE path = ? AND category = ? AND role_group = ?")
      .get(path, category, role_group)

    if (existingFolder) {
      return NextResponse.json({ error: "Folder already exists" }, { status: 400 })
    }

    // Create folder
    const result = db
      .prepare(`
        INSERT INTO folders (name, path, category, role_group, parent_path, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(name, path, category, role_group, parent_path || null, user.username)

    return NextResponse.json({
      success: true,
      folder: {
        id: result.lastInsertRowid,
        name,
        path,
        category,
        role_group,
        parent_path,
        created_by: user.username,
      },
    })
  } catch (error) {
    console.error("Error creating folder:", error)
    return NextResponse.json({ error: "Failed to create folder: " + error.message }, { status: 500 })
  }
}

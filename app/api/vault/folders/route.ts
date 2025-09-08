import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "collector") {
      return NextResponse.json({ error: "Access denied - Collectors only" }, { status: 403 })
    }

    const db = getDb()
    const folders = db
      .prepare(`
        SELECT id, name, path, category, collector_id, parent_path, created_at, created_by
        FROM vault_folders 
        WHERE collector_id = ?
        ORDER BY category, path
      `)
      .all(user.id)

    return NextResponse.json({ folders })
  } catch (error) {
    console.error("Error fetching vault folders:", error)
    return NextResponse.json({ error: "Failed to fetch vault folders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "collector") {
      return NextResponse.json({ error: "Access denied - Collectors only" }, { status: 403 })
    }

    const { name, path, category, parent_path } = await request.json()

    if (!name || !path || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = getDb()

    // Check if folder already exists for this collector
    const existingFolder = db
      .prepare("SELECT id FROM vault_folders WHERE path = ? AND category = ? AND collector_id = ?")
      .get(path, category, user.id)

    if (existingFolder) {
      return NextResponse.json({ error: "Vault folder already exists" }, { status: 400 })
    }

    // Create folder
    const result = db
      .prepare(`
        INSERT INTO vault_folders (name, path, category, collector_id, parent_path, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(name, path, category, user.id, parent_path || null, user.username)

    return NextResponse.json({
      success: true,
      folder: {
        id: result.lastInsertRowid,
        name,
        path,
        category,
        collector_id: user.id,
        parent_path,
        created_by: user.username,
      },
    })
  } catch (error) {
    console.error("Error creating vault folder:", error)
    return NextResponse.json({ error: "Failed to create vault folder: " + error.message }, { status: 500 })
  }
}

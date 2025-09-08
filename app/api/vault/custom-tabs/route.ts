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
    const tabs = db
      .prepare("SELECT tab_name, tab_key FROM vault_custom_tabs WHERE collector_id = ? ORDER BY display_order ASC")
      .all(user.id)

    return NextResponse.json({ tabs })
  } catch (error) {
    console.error("Error fetching vault custom tabs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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

    const { tab_name, tab_key } = await request.json()

    if (!tab_name || !tab_key) {
      return NextResponse.json({ error: "Tab name and key are required" }, { status: 400 })
    }

    const db = getDb()

    // Check if tab already exists for this collector
    const existingTab = db
      .prepare("SELECT id FROM vault_custom_tabs WHERE collector_id = ? AND tab_key = ?")
      .get(user.id, tab_key)

    if (existingTab) {
      return NextResponse.json({ error: "Vault category already exists" }, { status: 400 })
    }

    // Get max display order
    const maxOrder = db
      .prepare("SELECT MAX(display_order) as max_order FROM vault_custom_tabs WHERE collector_id = ?")
      .get(user.id) as any
    const displayOrder = (maxOrder?.max_order || 0) + 1

    // Insert new tab
    db.prepare(`
      INSERT INTO vault_custom_tabs (collector_id, tab_name, tab_key, display_order)
      VALUES (?, ?, ?, ?)
    `).run(user.id, tab_name, tab_key, displayOrder)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating vault custom tab:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: Promise<{ roleGroup: string }> }) {
  try {
    const { roleGroup } = await params
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()

    // Use DISTINCT to prevent duplicates and ensure proper ordering
    const tabs = db
      .prepare(`
        SELECT DISTINCT id, role_group, tab_name, tab_key, display_order
        FROM custom_tabs 
        WHERE role_group = ? 
        ORDER BY display_order ASC, tab_key ASC
      `)
      .all(roleGroup)

    return NextResponse.json({ tabs })
  } catch (error) {
    console.error("Error fetching custom tabs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ roleGroup: string }> }) {
  try {
    const { roleGroup } = await params
    const { tab_name, tab_key } = await request.json()
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Allow users to add categories to their own group, and developers/collectors to add to any group
    const canAddCategory = user.role === "developer" || user.role === "collector" || user.role === roleGroup

    if (!canAddCategory) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    if (!tab_name || !tab_key) {
      return NextResponse.json({ error: "Tab name and key are required" }, { status: 400 })
    }

    const db = getDb()

    // Check if tab already exists for this role group (prevent duplicates)
    const existingTab = db
      .prepare("SELECT id FROM custom_tabs WHERE role_group = ? AND tab_key = ?")
      .get(roleGroup, tab_key)

    if (existingTab) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    // Get max display order
    const maxOrder = db
      .prepare("SELECT MAX(display_order) as max_order FROM custom_tabs WHERE role_group = ?")
      .get(roleGroup) as any
    const displayOrder = (maxOrder?.max_order || 0) + 1

    // Insert new tab
    db.prepare(`
      INSERT INTO custom_tabs (role_group, tab_name, tab_key, display_order)
      VALUES (?, ?, ?, ?)
    `).run(roleGroup, tab_name, tab_key, displayOrder)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating custom tab:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

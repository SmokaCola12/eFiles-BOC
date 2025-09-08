import { type NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { collectorId: string } }) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const collectorId = Number.parseInt(params.collectorId)

    // Check access permissions
    if (user.role === "collector" && user.id !== collectorId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (!["collector", "developer", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const db = getDb()
    const tabs = db.prepare("SELECT * FROM vault_custom_tabs WHERE collector_id = ? ORDER BY name").all(collectorId)

    return NextResponse.json({ tabs })
  } catch (error) {
    console.error("Error fetching vault custom tabs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { collectorId: string } }) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const collectorId = Number.parseInt(params.collectorId)

    // Check access permissions
    if (user.role === "collector" && user.id !== collectorId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (!["collector", "developer", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { name } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const db = getDb()

    // Check if category already exists for this collector
    const existing = db
      .prepare("SELECT id FROM vault_custom_tabs WHERE collector_id = ? AND name = ?")
      .get(collectorId, name.trim())

    if (existing) {
      return NextResponse.json({ error: "Category already exists" }, { status: 400 })
    }

    const result = db
      .prepare("INSERT INTO vault_custom_tabs (collector_id, name) VALUES (?, ?)")
      .run(collectorId, name.trim())

    const newTab = db.prepare("SELECT * FROM vault_custom_tabs WHERE id = ?").get(result.lastInsertRowid)

    return NextResponse.json({ tab: newTab })
  } catch (error) {
    console.error("Error creating vault custom tab:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { collectorId: string } }) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const collectorId = Number.parseInt(params.collectorId)
    const { searchParams } = new URL(request.url)
    const tabId = searchParams.get("tabId")

    if (!tabId) {
      return NextResponse.json({ error: "Tab ID is required" }, { status: 400 })
    }

    // Check access permissions
    if (user.role === "collector" && user.id !== collectorId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (!["collector", "developer", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const db = getDb()

    // Verify the tab belongs to the collector
    const tab = db.prepare("SELECT * FROM vault_custom_tabs WHERE id = ? AND collector_id = ?").get(tabId, collectorId)

    if (!tab) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Delete the tab
    db.prepare("DELETE FROM vault_custom_tabs WHERE id = ?").run(tabId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting vault custom tab:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

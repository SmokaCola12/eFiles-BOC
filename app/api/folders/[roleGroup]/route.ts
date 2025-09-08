import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ roleGroup: string }> }) {
  try {
    const { roleGroup } = await params
    const db = getDb()

    const folders = db
      .prepare(`
        SELECT id, name, path, category, role_group, parent_path, created_at, created_by
        FROM folders 
        WHERE role_group = ?
        ORDER BY category, path
      `)
      .all(roleGroup)

    return NextResponse.json({ folders })
  } catch (error) {
    console.error("Error fetching folders:", error)
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 })
  }
}

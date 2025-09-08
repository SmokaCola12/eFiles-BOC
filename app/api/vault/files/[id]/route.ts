import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import { unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

const VAULT_UPLOADS_DIR =
  process.env.NODE_ENV === "production" ? "/tmp/vault-uploads" : join(process.cwd(), "vault-uploads")

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "collector") {
      return NextResponse.json({ error: "Access denied - Collectors only" }, { status: 403 })
    }

    const db = getDb()
    const file = db.prepare("SELECT * FROM vault_files WHERE id = ? AND collector_id = ?").get(id, user.id)

    if (!file) {
      return NextResponse.json({ error: "Vault file not found" }, { status: 404 })
    }

    return NextResponse.json({ file })
  } catch (error) {
    console.error("Error fetching vault file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "collector") {
      return NextResponse.json({ error: "Access denied - Collectors only" }, { status: 403 })
    }

    const db = getDb()
    const file = db.prepare("SELECT * FROM vault_files WHERE id = ? AND collector_id = ?").get(id, user.id) as any

    if (!file) {
      return NextResponse.json({ error: "Vault file not found" }, { status: 404 })
    }

    // Delete physical file
    const collectorDir = join(VAULT_UPLOADS_DIR, `collector-${user.id}`)
    const filepath = join(collectorDir, file.filename)
    if (existsSync(filepath)) {
      try {
        await unlink(filepath)
      } catch (error) {
        console.error("Error deleting vault file from disk:", error)
      }
    }

    // Delete from database
    const info = db.prepare("DELETE FROM vault_files WHERE id = ? AND collector_id = ?").run(id, user.id)

    if (info.changes === 0) {
      return NextResponse.json({ error: "Vault file not found" }, { status: 404 })
    }

    // Delete associated comments
    db.prepare("DELETE FROM vault_comments WHERE vault_file_id = ?").run(id)

    return NextResponse.json({ success: true, message: "Vault file deleted successfully" })
  } catch (error) {
    console.error("Error deleting vault file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

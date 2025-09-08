import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import { existsSync } from "fs"

const VAULT_UPLOADS_DIR =
  process.env.NODE_ENV === "production" ? "/tmp/vault-uploads" : join(process.cwd(), "vault-uploads")

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "collector") {
      return NextResponse.json({ error: "Access denied - Collectors only" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const category = formData.get("category") as string
    const folderPath = (formData.get("folder_path") as string) || ""

    if (!file || !category) {
      return NextResponse.json({ error: "File and category are required" }, { status: 400 })
    }

    const db = getDb()
    const validCategory = db
      .prepare("SELECT id FROM vault_custom_tabs WHERE collector_id = ? AND tab_key = ?")
      .get(user.id, category)

    if (!validCategory) {
      return NextResponse.json({ error: "Invalid category for vault" }, { status: 400 })
    }

    // Ensure vault uploads directory exists
    if (!existsSync(VAULT_UPLOADS_DIR)) {
      await mkdir(VAULT_UPLOADS_DIR, { recursive: true })
    }

    // Create collector-specific directory
    const collectorDir = join(VAULT_UPLOADS_DIR, `collector-${user.id}`)
    if (!existsSync(collectorDir)) {
      await mkdir(collectorDir, { recursive: true })
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop()
    const filename = `${randomUUID()}.${fileExtension}`
    const filepath = join(collectorDir, filename)

    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)
    } catch (fileError) {
      console.error("Vault file write error:", fileError)
      return NextResponse.json({ error: "Failed to save file to vault" }, { status: 500 })
    }

    // Save file info to vault database
    const result = db
      .prepare(`
        INSERT INTO vault_files (filename, original_name, file_type, file_size, category, collector_id, folder_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(filename, file.name, file.type, file.size, category, user.id, folderPath)

    return NextResponse.json({
      success: true,
      fileId: result.lastInsertRowid,
    })
  } catch (error) {
    console.error("Vault upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

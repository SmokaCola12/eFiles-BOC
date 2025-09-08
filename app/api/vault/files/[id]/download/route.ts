import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

const VAULT_UPLOADS_DIR =
  process.env.NODE_ENV === "production" ? "/tmp/vault-uploads" : join(process.cwd(), "vault-uploads")

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (user.role !== "collector") {
      return new NextResponse("Access denied - Collectors only", { status: 403 })
    }

    const db = getDb()
    const fileRecord = db.prepare("SELECT * FROM vault_files WHERE id = ? AND collector_id = ?").get(id, user.id) as any

    if (!fileRecord) {
      return new NextResponse("Vault file not found", { status: 404 })
    }

    const collectorDir = join(VAULT_UPLOADS_DIR, `collector-${user.id}`)
    const filePath = join(collectorDir, fileRecord.filename)

    if (!existsSync(filePath)) {
      return new NextResponse("Vault file not found on server", { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    const mimeType = fileRecord.file_type || "application/octet-stream"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileRecord.original_name}"`,
      },
    })
  } catch (error) {
    console.error("Error downloading vault file:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

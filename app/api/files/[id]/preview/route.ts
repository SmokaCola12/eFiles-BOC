import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const user = await getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const db = getDb()
    const file = db.prepare("SELECT * FROM files WHERE id = ?").get(id) as any

    if (!file) {
      return new NextResponse("File not found", { status: 404 })
    }

    // Get the uploader's role to check permissions
    const uploader = db.prepare("SELECT role FROM users WHERE username = ?").get(file.uploaded_by) as any
    const uploaderRole = uploader?.role

    // Check permissions based on user role and file sharing settings
    let canView = false

    if (user.role === "developer" || user.role === "collector") {
      // Developer/Collector can view all files
      canView = true
    } else if (user.role === "user1" || user.role === "user2") {
      // Users can view files from their own role group or shared files
      canView =
        file.uploaded_by === user.username || // Own files
        uploaderRole === user.role || // Same role group files
        file.shared_with === "all" || // Files shared with everyone
        file.shared_with === user.role // Files shared with their role
    }

    if (!canView) {
      return new NextResponse("Permission denied", { status: 403 })
    }

    const filepath = join(process.cwd(), "uploads", file.filename)

    try {
      const fileBuffer = await readFile(filepath)

      // Set proper headers for file preview
      const headers = new Headers()
      headers.set("Content-Type", file.file_type || "application/octet-stream")
      headers.set("Cache-Control", "public, max-age=31536000")

      // Add CORS headers for mobile compatibility
      headers.set("Access-Control-Allow-Origin", "*")
      headers.set("Access-Control-Allow-Methods", "GET")
      headers.set("Access-Control-Allow-Headers", "Content-Type")

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: headers,
      })
    } catch (fileError) {
      console.error("File read error:", fileError)
      return new NextResponse("File not found on disk", { status: 404 })
    }
  } catch (error) {
    console.error("Preview error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

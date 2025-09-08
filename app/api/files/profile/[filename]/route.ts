import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params
    const filepath = join(process.cwd(), "uploads", filename)
    const fileBuffer = await readFile(filepath)

    // Determine content type based on file extension
    const ext = filename.split(".").pop()?.toLowerCase()
    let contentType = "image/jpeg"

    if (ext === "png") contentType = "image/png"
    else if (ext === "gif") contentType = "image/gif"
    else if (ext === "webp") contentType = "image/webp"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error) {
    console.error("Profile picture error:", error)
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}

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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const folderPath = searchParams.get("folderPath") || ""

    const db = getDb()
    let query = `
      SELECT vf.*, 0 as comments_count
      FROM vault_files vf 
      WHERE vf.collector_id = ?
    `
    const params = [user.id]

    if (category && category !== "all") {
      query += " AND vf.category = ?"
      params.push(category)
    }

    query += " AND vf.folder_path = ?"
    params.push(folderPath)

    query += " ORDER BY vf.upload_date DESC"

    const files = db.prepare(query).all(...params)

    // Add comments count for each file
    const filesWithComments = files.map((file: any) => {
      const commentsCount = db
        .prepare("SELECT COUNT(*) as count FROM vault_comments WHERE vault_file_id = ?")
        .get(file.id) as { count: number }

      return {
        ...file,
        comments_count: commentsCount.count,
        uploaded_by: user.username,
        uploaded_by_role: user.role,
        shared_with: "vault",
      }
    })

    return NextResponse.json({ files: filesWithComments })
  } catch (error) {
    console.error("Error fetching vault files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

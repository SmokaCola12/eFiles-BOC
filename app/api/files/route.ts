import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { getUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = getDb()
    let files

    if (user.role === "developer" || user.role === "collector") {
      // Developer/Collector can see all files, but filter by view if specified
      const { searchParams } = new URL(request.url)
      const view = searchParams.get("view")

      if (view) {
        files = db
          .prepare(`
            SELECT f.*, 
                   u.role as uploaded_by_role,
                   (SELECT COUNT(*) FROM comments WHERE file_id = f.id) as comments_count
            FROM files f 
            JOIN users u ON f.uploaded_by = u.username
            WHERE u.role = ?
            ORDER BY f.upload_date DESC
          `)
          .all(view)
      } else {
        files = db
          .prepare(`
            SELECT f.*, 
                   u.role as uploaded_by_role,
                   (SELECT COUNT(*) FROM comments WHERE file_id = f.id) as comments_count
            FROM files f 
            JOIN users u ON f.uploaded_by = u.username
            ORDER BY f.upload_date DESC
          `)
          .all()
      }
    } else if (user.role === "user1" || user.role === "user2") {
      // Users can only see files from their own role group
      files = db
        .prepare(`
          SELECT f.*, 
                 u.role as uploaded_by_role,
                 (SELECT COUNT(*) FROM comments WHERE file_id = f.id) as comments_count
          FROM files f 
          JOIN users u ON f.uploaded_by = u.username
          WHERE u.role = ? OR f.shared_with = 'all' OR f.shared_with = ?
          ORDER BY f.upload_date DESC
        `)
        .all(user.role, user.role)
    }

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Error fetching files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

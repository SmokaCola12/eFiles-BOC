import Database from "better-sqlite3"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"

const dbPath = join(process.cwd(), "data", "database.db")
const dataDir = join(process.cwd(), "data")
const uploadsDir = join(process.cwd(), "uploads")

// Ensure directories exist
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
}

let db: Database.Database | null = null

export function getDb() {
  if (!db) {
    db = new Database(dbPath)
    initializeDatabase()
  }
  return db
}

function initializeDatabase() {
  if (!db) return

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      profile_picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Files table
  try {
    // Check if table exists and get its structure
    const tableInfo = db.prepare("PRAGMA table_info(files)").all() as any[]
    const columnNames = tableInfo.map((col: any) => col.name)

    if (tableInfo.length === 0) {
      // Create table with folder_path from the start
      db.exec(`
        CREATE TABLE files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          category TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          shared_with TEXT DEFAULT 'boss',
          uploaded_by TEXT NOT NULL,
          folder_path TEXT DEFAULT '',
          upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
    } else {
      // Add folder_path column if missing
      if (!columnNames.includes("folder_path")) {
        db.exec(`ALTER TABLE files ADD COLUMN folder_path TEXT DEFAULT ''`)
      }
    }
  } catch (error) {
    console.error("Files table setup error:", error)
  }

  // Folders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      category TEXT NOT NULL,
      role_group TEXT NOT NULL,
      created_by TEXT NOT NULL,
      parent_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(path, category, role_group)
    )
  `)

  // Comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files (id)
    )
  `)

  // Chat messages table - COMPLETE FIX with all columns
  try {
    const tableExists = db
      .prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='chat_messages'
      `)
      .get()

    if (!tableExists) {
      db.exec(`
        CREATE TABLE chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          author TEXT NOT NULL,
          author_role TEXT DEFAULT 'user1',
          visibility TEXT DEFAULT 'group',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
    } else {
      const tableInfo = db.prepare("PRAGMA table_info(chat_messages)").all() as any[]
      const columnNames = tableInfo.map((col: any) => col.name)

      if (!columnNames.includes("author_role")) {
        db.exec(`ALTER TABLE chat_messages ADD COLUMN author_role TEXT DEFAULT 'user1'`)
      }

      if (!columnNames.includes("visibility")) {
        db.exec(`ALTER TABLE chat_messages ADD COLUMN visibility TEXT DEFAULT 'group'`)
      }
    }
  } catch (error) {
    console.error("Chat messages table setup error:", error)
    try {
      db.exec(`DROP TABLE IF EXISTS chat_messages`)
      db.exec(`
        CREATE TABLE chat_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          author TEXT NOT NULL,
          author_role TEXT DEFAULT 'user1',
          visibility TEXT DEFAULT 'group',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      console.log("Recreated chat_messages table with all columns")
    } catch (recreateError) {
      console.error("Failed to recreate chat_messages table:", recreateError)
    }
  }

  // Custom tabs table with unique constraint
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_group TEXT NOT NULL,
      tab_name TEXT NOT NULL,
      tab_key TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role_group, tab_key)
    )
  `)

  // Private messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS private_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (receiver_id) REFERENCES users (id)
    )
  `)

  // User profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_name TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      related_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Message read status table
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_read_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message_id INTEGER NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      read_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (message_id) REFERENCES private_messages (id)
    )
  `)

  // Vault files table (collector-only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'approved',
      collector_id INTEGER NOT NULL,
      folder_path TEXT DEFAULT '',
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (collector_id) REFERENCES users (id)
    )
  `)

  // Vault folders table (collector-only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      category TEXT NOT NULL,
      collector_id INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      parent_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (collector_id) REFERENCES users (id),
      UNIQUE(path, category, collector_id)
    )
  `)

  // Vault custom tabs table (collector-only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_custom_tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collector_id INTEGER NOT NULL,
      tab_name TEXT NOT NULL,
      tab_key TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (collector_id) REFERENCES users (id),
      UNIQUE(collector_id, tab_key)
    )
  `)

  // Vault comments table (collector-only)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault_file_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vault_file_id) REFERENCES vault_files (id)
    )
  `)

  // Create default users if they don't exist
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }

  if (userCount.count === 0) {
    const bcrypt = require("bcryptjs")

    const developerPassword = bcrypt.hashSync("admin123", 10)
    const collectorPassword = bcrypt.hashSync("boss123", 10)
    const user1Password = bcrypt.hashSync("user123", 10)
    const user2Password = bcrypt.hashSync("user2123", 10)

    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(
      "developer",
      developerPassword,
      "developer",
    )
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(
      "collector",
      collectorPassword,
      "collector",
    )
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("user1", user1Password, "user1")
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("user2", user2Password, "user2")
  }

  // Clean up any duplicate tabs before inserting defaults
  const cleanupDuplicates = () => {
    try {
      db.exec(`
        DELETE FROM custom_tabs 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM custom_tabs 
          GROUP BY role_group, tab_key
        )
      `)
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  cleanupDuplicates()

  // Always ensure default tabs exist (in case they were deleted)
  const ensureDefaultTabs = () => {
    const user1Tabs = [
      { role_group: "user1", tab_name: "All Files", tab_key: "all", display_order: 0 },
      { role_group: "user1", tab_name: "Daily Reports", tab_key: "daily", display_order: 1 },
      { role_group: "user1", tab_name: "Weekly Reports", tab_key: "weekly", display_order: 2 },
      { role_group: "user1", tab_name: "Monthly Reports", tab_key: "monthly", display_order: 3 },
    ]

    const user2Tabs = [
      { role_group: "user2", tab_name: "All Files", tab_key: "all", display_order: 0 },
      { role_group: "user2", tab_name: "Forms", tab_key: "forms", display_order: 1 },
      { role_group: "user2", tab_name: "Announcements", tab_key: "announcements", display_order: 2 },
      { role_group: "user2", tab_name: "Leave", tab_key: "leave", display_order: 3 },
    ]

    const insertOrUpdateTab = db.prepare(`
      INSERT OR IGNORE INTO custom_tabs (role_group, tab_name, tab_key, display_order) 
      VALUES (?, ?, ?, ?)
    `)

    user1Tabs.forEach((tab) => {
      insertOrUpdateTab.run(tab.role_group, tab.tab_name, tab.tab_key, tab.display_order)
    })

    user2Tabs.forEach((tab) => {
      insertOrUpdateTab.run(tab.role_group, tab.tab_name, tab.tab_key, tab.display_order)
    })
  }

  ensureDefaultTabs()

  // Create default vault tabs for collectors
  const createDefaultVaultTabs = () => {
    const collectors = db.prepare("SELECT id FROM users WHERE role = 'collector'").all() as any[]

    const defaultVaultTabs = [
      { tab_name: "All Files", tab_key: "all", display_order: 0 },
      { tab_name: "Confidential", tab_key: "confidential", display_order: 1 },
      { tab_name: "Archives", tab_key: "archives", display_order: 2 },
      { tab_name: "Reports", tab_key: "reports", display_order: 3 },
    ]

    const insertVaultTab = db.prepare(`
      INSERT OR IGNORE INTO vault_custom_tabs (collector_id, tab_name, tab_key, display_order) 
      VALUES (?, ?, ?, ?)
    `)

    collectors.forEach((collector) => {
      defaultVaultTabs.forEach((tab) => {
        insertVaultTab.run(collector.id, tab.tab_name, tab.tab_key, tab.display_order)
      })
    })
  }

  createDefaultVaultTabs()

  // Create default profiles for users
  const users = db.prepare("SELECT id, username FROM users").all() as any[]
  users.forEach((user) => {
    const existingProfile = db.prepare("SELECT id FROM user_profiles WHERE user_id = ?").get(user.id)
    if (!existingProfile) {
      db.prepare("INSERT INTO user_profiles (user_id, full_name) VALUES (?, ?)").run(user.id, user.username)
    }
  })
}

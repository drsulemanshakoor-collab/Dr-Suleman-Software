import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

export interface IDatabaseService {
  init(): Promise<void>;
  getDb(): SqlJsDatabase;
  save(): void;
  exec(sql: string): void;
  run(sql: string, params?: any[]): void;
  get<T = any>(sql: string, params?: any[]): T | null;
  all<T = any>(sql: string, params?: any[]): T[];
  getDbPath(): string;
}

class SQLiteDatabaseService implements IDatabaseService {
  private db: SqlJsDatabase | null = null;
  private dbFilePath: string = '';
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized && this.db) return;

    const dataDir = process.env.DB_DIR || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbFilePath = process.env.DB_PATH || path.join(dataDir, 'database.sqlite');

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbFilePath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbFilePath);
        this.db = new SQL.Database(fileBuffer);
        console.log(`[Database] Loaded persistent SQLite database from: ${this.dbFilePath}`);
      } catch (err) {
        console.error('[Database] Failed to read existing SQLite file, creating fresh database:', err);
        this.db = new SQL.Database();
      }
    } else {
      console.log(`[Database] Creating new persistent SQLite database at: ${this.dbFilePath}`);
      this.db = new SQL.Database();
    }

    this.createSchema();
    this.save();
    this.initialized = true;
  }

  getDb(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  getDbPath(): string {
    return this.dbFilePath;
  }

  save(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbFilePath, Buffer.from(data));
    } catch (err) {
      console.error('[Database] Error saving SQLite database to disk:', err);
    }
  }

  private createSchema(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT DEFAULT 'excel',
        source_sheet TEXT,
        material_name TEXT NOT NULL,
        material_name_normalized TEXT NOT NULL,
        qc_number TEXT NOT NULL,
        date TEXT NOT NULL,
        category TEXT,
        tags TEXT DEFAULT '[]',
        raw_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_materials_norm ON materials(material_name_normalized);
      CREATE INDEX IF NOT EXISTS idx_materials_qc ON materials(qc_number);
      CREATE INDEX IF NOT EXISTS idx_materials_date ON materials(date);
      CREATE INDEX IF NOT EXISTS idx_materials_sheet ON materials(source_sheet);
      CREATE INDEX IF NOT EXISTS idx_materials_cat ON materials(category);
    `);

    // Safe column migrations for existing databases
    try {
      this.db.exec("ALTER TABLE materials ADD COLUMN source TEXT DEFAULT 'excel';");
    } catch (e) {
      // column already exists
    }
    try {
      this.db.exec("ALTER TABLE materials ADD COLUMN tags TEXT DEFAULT '[]';");
    } catch (e) {
      // column already exists
    }
  }

  exec(sql: string): void {
    const db = this.getDb();
    db.exec(sql);
    this.save();
  }

  run(sql: string, params: any[] = []): void {
    const db = this.getDb();
    db.run(sql, params);
    this.save();
  }

  get<T = any>(sql: string, params: any[] = []): T | null {
    const db = this.getDb();
    const stmt = db.prepare(sql);
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        return stmt.getAsObject() as unknown as T;
      }
      return null;
    } finally {
      stmt.free();
    }
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    const db = this.getDb();
    const stmt = db.prepare(sql);
    const results: T[] = [];
    try {
      if (params.length > 0) {
        stmt.bind(params);
      }
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }
}

export const dbService = new SQLiteDatabaseService();

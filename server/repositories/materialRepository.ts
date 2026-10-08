import { dbService, IDatabaseService } from '../database/db';
import { RawMaterialRecord, SearchResultItem, SearchResponse, DatabaseStatus, ImportResult } from '../types';
import {
  calculateMaterialRelevance,
  normalizeString,
  parseAndFormatDate,
  tokenize,
  PHARMA_SYNONYMS,
} from '../services/normalizer';

export interface IMaterialRepository {
  getStatus(): Promise<DatabaseStatus>;
  getById(id: number): Promise<RawMaterialRecord | null>;
  search(
    query: string,
    options?: { tags?: string[]; aiSynonyms?: string[] }
  ): Promise<SearchResponse>;
  createEntry(data: Partial<RawMaterialRecord>): Promise<RawMaterialRecord>;
  updateEntry(id: number, data: Partial<RawMaterialRecord>): Promise<RawMaterialRecord>;
  deleteEntry(id: number): Promise<boolean>;
  importRecords(
    records: RawMaterialRecord[],
    mode: 'replace' | 'merge',
    sourceFile: string
  ): Promise<ImportResult>;
  clearAll(): Promise<void>;
  getAllUniqueMaterialNames(): Promise<string[]>;
}

export class SqliteMaterialRepository implements IMaterialRepository {
  constructor(private db: IDatabaseService = dbService) {}

  async getStatus(): Promise<DatabaseStatus> {
    const countRow = this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM materials');
    const totalRecords = countRow?.count ?? 0;

    const lastImportedRow = this.db.get<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      ['last_imported']
    );
    const sourceRow = this.db.get<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      ['current_source']
    );

    const sheets = this.db.all<{ name: string; count: number }>(`
      SELECT source_sheet as name, COUNT(*) as count
      FROM materials
      GROUP BY source_sheet
      ORDER BY count DESC
    `);

    const categories = this.db.all<{ name: string; count: number }>(`
      SELECT COALESCE(category, 'Uncategorized') as name, COUNT(*) as count
      FROM materials
      GROUP BY category
      ORDER BY count DESC
    `);

    return {
      connected: true,
      totalRecords,
      lastImported: lastImportedRow?.value || null,
      currentSource: sourceRow?.value || null,
      sheets,
      categories,
    };
  }

  async getById(id: number): Promise<RawMaterialRecord | null> {
    const row = this.db.get<any>('SELECT * FROM materials WHERE id = ?', [id]);
    if (!row) return null;

    let parsedRaw = {};
    try {
      parsedRaw = JSON.parse(row.raw_data);
    } catch {
      parsedRaw = {};
    }

    let parsedTags: string[] = [];
    try {
      if (Array.isArray(row.tags)) {
        parsedTags = row.tags;
      } else if (typeof row.tags === 'string' && row.tags.startsWith('[')) {
        parsedTags = JSON.parse(row.tags);
      } else if (typeof row.tags === 'string' && row.tags.trim()) {
        parsedTags = row.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    } catch {
      parsedTags = [];
    }

    return {
      id: row.id,
      source: row.source || 'excel',
      source_sheet: row.source_sheet,
      material_name: row.material_name,
      material_name_normalized: row.material_name_normalized,
      qc_number: row.qc_number,
      date: row.date,
      category: row.category,
      tags: parsedTags,
      raw_data: parsedRaw,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async getAllUniqueMaterialNames(): Promise<string[]> {
    const rows = this.db.all<{ material_name: string }>(
      'SELECT DISTINCT material_name FROM materials LIMIT 500'
    );
    return rows.map((r) => r.material_name);
  }

  async search(
    query: string,
    options: { tags?: string[]; aiSynonyms?: string[] } = {}
  ): Promise<SearchResponse> {
    const trimmedQuery = (query || '').trim();
    const tags = (options.tags || []).map((t) => t.trim()).filter(Boolean);
    const aiSynonyms = options.aiSynonyms || [];

    if (!trimmedQuery && tags.length === 0) {
      return {
        query: '',
        tags: [],
        total: 0,
        results: [],
        groupedByMonth: [],
      };
    }

    const normQuery = normalizeString(trimmedQuery);
    const allRows = this.db.all<any>(`
      SELECT id, source, source_sheet, material_name, material_name_normalized, qc_number, date, category, tags, raw_data
      FROM materials
    `);

    const scoredItems: SearchResultItem[] = [];

    for (const row of allRows) {
      // Parse tags for this row
      let rowTags: string[] = [];
      try {
        if (typeof row.tags === 'string' && row.tags.startsWith('[')) {
          rowTags = JSON.parse(row.tags);
        } else if (typeof row.tags === 'string' && row.tags.trim()) {
          rowTags = row.tags.split(',').map((t: string) => t.trim());
        }
      } catch {
        rowTags = [];
      }

      let parsedRaw: Record<string, any> = {};
      try {
        parsedRaw = JSON.parse(row.raw_data || '{}');
      } catch {
        parsedRaw = {};
      }

      // Check TAG matching if tags filter is applied
      if (tags.length > 0) {
        const rawValuesString = Object.values(parsedRaw).join(' ').toLowerCase();
        const rawKeysString = Object.keys(parsedRaw).join(' ').toLowerCase();
        const matLower = (row.material_name || '').toLowerCase();
        const catLower = (row.category || '').toLowerCase();
        const tagsLower = rowTags.map((t) => t.toLowerCase());

        const matchesAllTags = tags.every((tag) => {
          const normTag = tag.toLowerCase();
          return (
            tagsLower.some((t) => t.includes(normTag) || normTag.includes(t)) ||
            matLower.includes(normTag) ||
            catLower.includes(normTag) ||
            rawValuesString.includes(normTag) ||
            rawKeysString.includes(normTag)
          );
        });

        if (!matchesAllTags) {
          continue; // Does not satisfy all selected tags
        }
      }

      // If user provided a query string
      let relevance = 0;
      let matchType: any = 'related';

      if (trimmedQuery) {
        const match = calculateMaterialRelevance(
          trimmedQuery,
          row.material_name,
          row.qc_number,
          row.category,
          aiSynonyms
        );

        if (match.score > 0) {
          relevance = match.score;
          matchType = match.matchType;
        } else {
          // If query didn't match material name directly, check if query matched category or label or metadata
          // STRICT RULE: Only match discrete tokens, NOT arbitrary substrings (e.g. 'aps' inside 'capsule')
          const matTokens = tokenize(row.material_name);
          const catTokens = tokenize(row.category || '');
          const rawTokens = tokenize(JSON.stringify(parsedRaw));

          if (matTokens.includes(normQuery) || catTokens.includes(normQuery)) {
            relevance = 80;
            matchType = 'token';
          } else if (rawTokens.includes(normQuery)) {
            relevance = 70;
            matchType = 'related';
          }
        }
      } else {
        // Only tags were provided (no query text) -> All tag-matching records are 90 relevance
        relevance = 90;
        matchType = 'token';
      }

      if (relevance > 0) {
        const dateInfo = parseAndFormatDate(row.date);
        scoredItems.push({
          id: row.id,
          source: row.source || 'excel',
          materialName: row.material_name,
          qcNumber: row.qc_number,
          date: dateInfo.displayDate,
          category: row.category || row.source_sheet,
          sourceSheet: row.source_sheet,
          tags: rowTags,
          relevance,
          matchType,
          monthYear: dateInfo.monthYear,
          year: dateInfo.year,
          month: dateInfo.month,
        });
      }
    }

    // Sort scored items:
    // 1. Relevance descending
    // 2. Date descending
    scoredItems.sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      if (b.year !== a.year) {
        return b.year - a.year;
      }
      return b.month - a.month;
    });

    // Group by month
    const monthGroupsMap = new Map<
      string,
      { monthYear: string; year: number; month: number; records: SearchResultItem[] }
    >();

    for (const item of scoredItems) {
      const key = `${item.year}-${item.month}`;
      if (!monthGroupsMap.has(key)) {
        monthGroupsMap.set(key, {
          monthYear: item.monthYear,
          year: item.year,
          month: item.month,
          records: [],
        });
      }
      monthGroupsMap.get(key)!.records.push(item);
    }

    // Sort month groups chronologically descending
    const groupedByMonth = Array.from(monthGroupsMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    // Did you mean suggestions if 0 results
    let didYouMean: string[] | undefined;
    if (scoredItems.length === 0 && trimmedQuery) {
      const allNames = await this.getAllUniqueMaterialNames();
      const suggestions: string[] = [];

      for (const name of allNames) {
        const normName = normalizeString(name);
        const nameTokens = tokenize(name);
        if (
          nameTokens.some((t) => t.startsWith(normQuery.substring(0, 3))) ||
          normName.startsWith(normQuery.substring(0, 3))
        ) {
          if (!suggestions.includes(name)) {
            suggestions.push(name);
            if (suggestions.length >= 4) break;
          }
        }
      }

      const syns = PHARMA_SYNONYMS[normQuery] || [];
      for (const s of syns) {
        const titleCase = s.replace(/\b\w/g, (c) => c.toUpperCase());
        if (!suggestions.includes(titleCase)) {
          suggestions.push(titleCase);
        }
      }

      if (suggestions.length > 0) {
        didYouMean = suggestions.slice(0, 5);
      }
    }

    return {
      query: trimmedQuery,
      tags,
      total: scoredItems.length,
      didYouMean,
      results: scoredItems,
      groupedByMonth,
    };
  }

  async createEntry(data: Partial<RawMaterialRecord>): Promise<RawMaterialRecord> {
    if (!data.material_name || !data.material_name.trim()) {
      throw new Error('Material Name is required');
    }
    if (!data.qc_number || !data.qc_number.trim()) {
      throw new Error('QC Number is required');
    }

    const normName = normalizeString(data.material_name);
    const now = new Date().toISOString();
    const sourceSheet = data.source_sheet || 'Manual Entries';
    const source = data.source || 'manual';
    const category = data.category || 'Manual';
    const dateStr = data.date || new Date().toISOString().split('T')[0];

    const rawData = data.raw_data || {
      'Material Name': data.material_name,
      'QC Number': data.qc_number,
      'Date': dateStr,
      'Category': category,
      'Source': 'Manual Entry',
    };

    const tagsJson = JSON.stringify(data.tags || []);
    const rawJson = JSON.stringify(rawData);

    const dbInstance = this.db.getDb();
    const stmt = dbInstance.prepare(`
      INSERT INTO materials (
        source, source_sheet, material_name, material_name_normalized,
        qc_number, date, category, tags, raw_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run([
        source,
        sourceSheet,
        data.material_name.trim(),
        normName,
        data.qc_number.trim(),
        dateStr,
        category,
        tagsJson,
        rawJson,
        now,
        now,
      ]);
      this.db.save();
    } finally {
      stmt.free();
    }

    const lastIdRow = this.db.get<{ id: number }>('SELECT MAX(id) as id FROM materials');
    const createdId = lastIdRow?.id ?? 0;

    return (await this.getById(createdId))!;
  }

  async updateEntry(id: number, data: Partial<RawMaterialRecord>): Promise<RawMaterialRecord> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Record with ID ${id} not found`);
    }

    const materialName = (data.material_name !== undefined ? data.material_name : existing.material_name).trim();
    const qcNumber = (data.qc_number !== undefined ? data.qc_number : existing.qc_number).trim();
    const date = (data.date !== undefined ? data.date : existing.date) || '';
    const category = (data.category !== undefined ? data.category : existing.category) || '';
    const sourceSheet = (data.source_sheet !== undefined ? data.source_sheet : existing.source_sheet) || 'Master';
    const tags = data.tags !== undefined ? data.tags : existing.tags;
    const normName = normalizeString(materialName);
    const now = new Date().toISOString();

    const mergedRaw = {
      ...(existing.raw_data || {}),
      ...(data.raw_data || {}),
      'Material Name': materialName,
      'QC Number': qcNumber,
      'Date': date,
      'Category': category,
    };

    const tagsJson = JSON.stringify(tags || []);
    const rawJson = JSON.stringify(mergedRaw);

    const dbInstance = this.db.getDb();
    const stmt = dbInstance.prepare(`
      UPDATE materials
      SET material_name = ?, material_name_normalized = ?, qc_number = ?,
          date = ?, category = ?, source_sheet = ?, tags = ?, raw_data = ?, updated_at = ?
      WHERE id = ?
    `);

    try {
      stmt.run([
        materialName,
        normName,
        qcNumber,
        date,
        category,
        sourceSheet,
        tagsJson,
        rawJson,
        now,
        id,
      ]);
      this.db.save();
    } finally {
      stmt.free();
    }

    return (await this.getById(id))!;
  }

  async deleteEntry(id: number): Promise<boolean> {
    const dbInstance = this.db.getDb();
    dbInstance.run('DELETE FROM materials WHERE id = ?', [id]);
    this.db.save();
    return true;
  }

  async importRecords(
    records: RawMaterialRecord[],
    mode: 'replace' | 'merge',
    sourceFile: string
  ): Promise<ImportResult> {
    const now = new Date().toISOString();
    let newRecords = 0;
    let updatedRecords = 0;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;
    const errors: string[] = [];

    const dbInstance = this.db.getDb();

    if (mode === 'replace') {
      dbInstance.exec('DELETE FROM materials;');
      dbInstance.exec("DELETE FROM sqlite_sequence WHERE name='materials';");
    }

    const insertStmt = dbInstance.prepare(`
      INSERT INTO materials (
        source, source_sheet, material_name, material_name_normalized,
        qc_number, date, category, tags, raw_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const findStmt = dbInstance.prepare(`
      SELECT id FROM materials
      WHERE qc_number = ? AND material_name_normalized = ? AND date = ?
    `);

    const updateStmt = dbInstance.prepare(`
      UPDATE materials
      SET source = ?, source_sheet = ?, category = ?, tags = ?, raw_data = ?, updated_at = ?
      WHERE id = ?
    `);

    try {
      dbInstance.exec('BEGIN TRANSACTION;');

      for (let i = 0; i < records.length; i++) {
        const r = records[i];

        if (!r.material_name || !r.material_name.trim()) {
          skippedInvalid++;
          if (errors.length < 10) errors.push(`Row ${i + 1}: Missing material name`);
          continue;
        }

        if (!r.qc_number || !r.qc_number.trim()) {
          skippedInvalid++;
          if (errors.length < 10) errors.push(`Row ${i + 1}: Missing QC Number for "${r.material_name}"`);
          continue;
        }

        const normName = normalizeString(r.material_name);
        const rawJson = typeof r.raw_data === 'string' ? r.raw_data : JSON.stringify(r.raw_data || {});
        const dateStr = r.date || '';
        const tagsJson = JSON.stringify(r.tags || []);
        const sourceVal = r.source || 'excel';

        if (mode === 'merge') {
          findStmt.bind([r.qc_number, normName, dateStr]);
          let existingId: number | null = null;
          if (findStmt.step()) {
            existingId = (findStmt.getAsObject() as any).id;
          }
          findStmt.reset();

          if (existingId) {
            updateStmt.bind([
              sourceVal,
              r.source_sheet || '',
              r.category || '',
              tagsJson,
              rawJson,
              now,
              existingId,
            ]);
            updateStmt.step();
            updateStmt.reset();
            updatedRecords++;
            continue;
          }
        }

        insertStmt.bind([
          sourceVal,
          r.source_sheet || 'Master',
          r.material_name,
          normName,
          r.qc_number,
          dateStr,
          r.category || '',
          tagsJson,
          rawJson,
          now,
          now,
        ]);
        insertStmt.step();
        insertStmt.reset();
        newRecords++;
      }

      dbInstance.exec('COMMIT;');
    } catch (err: any) {
      dbInstance.exec('ROLLBACK;');
      console.error('[Import] Error importing records:', err);
      throw err;
    } finally {
      insertStmt.free();
      findStmt.free();
      updateStmt.free();
    }

    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    dbInstance.run(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      ['last_imported', formattedDate]
    );
    dbInstance.run(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      ['current_source', sourceFile]
    );

    this.db.save();

    return {
      success: true,
      totalProcessed: records.length,
      newRecords,
      updatedRecords,
      skippedDuplicates,
      skippedInvalid,
      errors,
      message: `${newRecords + updatedRecords} records imported successfully.`,
    };
  }

  async clearAll(): Promise<void> {
    const dbInstance = this.db.getDb();
    dbInstance.exec('DELETE FROM materials;');
    dbInstance.exec("DELETE FROM sqlite_sequence WHERE name='materials';");
    dbInstance.run('DELETE FROM meta WHERE key IN (?, ?)', ['last_imported', 'current_source']);
    this.db.save();
  }
}

export const materialRepository = new SqliteMaterialRepository();

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import { dbService } from './server/database/db';
import { materialRepository } from './server/repositories/materialRepository';
import { previewWorkbook, parseWorkbookToRecords } from './server/services/excelParser';
import { aiQueryService } from './server/services/aiService';
import { getPharmaMasterDemoRecords } from './server/services/seedData';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer in-memory storage for safe Excel parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const isXlsx =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.xlsx') ||
      file.originalname.toLowerCase().endsWith('.xls');

    if (isXlsx) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) files are accepted'));
    }
  },
});

// Initialize database
let dbInitialized = false;
async function initializeAppDatabase() {
  if (dbInitialized) return;
  try {
    await dbService.init();
    const status = await materialRepository.getStatus();
    console.log(`[Server] Database initialized. Current records: ${status.totalRecords}`);

    // If initial empty database, seed standard pharma master dataset so users have immediate data
    if (status.totalRecords === 0) {
      console.log('[Server] Seeding initial pharmaceutical master dataset...');
      const demoRecords = getPharmaMasterDemoRecords();
      await materialRepository.importRecords(demoRecords, 'replace', 'master_raw_materials.xlsx');
      console.log(`[Server] Seeded ${demoRecords.length} initial pharmaceutical raw material records.`);
    }

    dbInitialized = true;
  } catch (err) {
    console.error('[Server] Fatal error initializing database:', err);
  }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Database Status
app.get('/api/status', async (req, res) => {
  try {
    await initializeAppDatabase();
    const status = await materialRepository.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve database status' });
  }
});

// 2. Search Materials (Supports keyword, tags, and AI assistance)
app.get('/api/search', async (req, res) => {
  try {
    await initializeAppDatabase();
    const q = String(req.query.q || '').trim();
    const useAi = req.query.ai === 'true' || req.query.ai === '1';

    // Parse tags parameter (e.g. ?tags=Biotin,High Science or multiple ?tags=...)
    let queryTags: string[] = [];
    if (req.query.tags) {
      if (Array.isArray(req.query.tags)) {
        queryTags = (req.query.tags as string[]).map(t => String(t).trim()).filter(Boolean);
      } else {
        queryTags = String(req.query.tags).split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    if (!q && queryTags.length === 0) {
      return res.json({
        query: '',
        tags: [],
        total: 0,
        results: [],
        groupedByMonth: [],
      });
    }

    let searchTarget = q;
    let aiSynonyms: string[] = [];
    let interpretationInfo: any = undefined;
    let extractedTags: string[] = [];

    // If user explicitly requested AI assist, or query looks like a natural language sentence
    const isNaturalLanguage = q.includes(' ') && (
      /\b(show|find|search|get|list|all|qc|number|numbers|from|in|for|labels?)\b/i.test(q)
    );

    if (useAi || isNaturalLanguage) {
      try {
        const aiInterp = await Promise.race([
          aiQueryService.interpretQuery(q),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 3000)),
        ]);
        if (aiInterp && aiInterp.isAiInterpreted) {
          searchTarget = aiInterp.materialQuery || q;
          aiSynonyms = aiInterp.synonyms || [];
          extractedTags = aiInterp.tags || [];
          interpretationInfo = aiInterp;
        }
      } catch (aiErr) {
        // Continue seamlessly with direct database search
      }
    }

    // Combine explicit tags with any tags extracted from natural language
    const combinedTags = Array.from(new Set([...queryTags, ...extractedTags]));

    let searchResponse = await materialRepository.search(searchTarget, {
      tags: combinedTags,
      aiSynonyms,
    });

    // If 0 results were found and AI wasn't run yet, try AI expansion as a fallback
    if (searchResponse.total === 0 && !interpretationInfo && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      try {
        const aiInterp = await Promise.race([
          aiQueryService.interpretQuery(q),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 2500)),
        ]);
        if (aiInterp && aiInterp.isAiInterpreted) {
          searchResponse = await materialRepository.search(
            aiInterp.materialQuery || q,
            { tags: combinedTags, aiSynonyms: aiInterp.synonyms || [] }
          );
          searchResponse.interpretedQuery = aiInterp;
        }
      } catch {
        // ignore
      }
    }

    if (interpretationInfo) {
      searchResponse.interpretedQuery = interpretationInfo;
    }

    // Generate concise 2-4 line pharmaceutical AI explanation (Requirement 14)
    try {
      const explanation = await Promise.race([
        aiQueryService.generateExplanation(q || searchTarget, searchResponse.results, combinedTags),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
      ]);
      searchResponse.aiExplanation = explanation;
    } catch {
      // ignore
    }

    res.json(searchResponse);
  } catch (err: any) {
    console.error('[Search API Error]:', err);
    res.status(500).json({ error: 'Search service is temporarily unavailable.' });
  }
});

// 3. Get Full Material Record by ID
app.get('/api/material/:id', async (req, res) => {
  try {
    await initializeAppDatabase();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }

    const record = await materialRepository.getById(id);
    if (!record) {
      return res.status(404).json({ error: 'Material record not found' });
    }

    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch record' });
  }
});

// 3.1 Create New Master Record (+ NEW ENTRY)
app.post('/api/material', async (req, res) => {
  try {
    await initializeAppDatabase();
    const { material_name, qc_number, date, category, tags, supplier, batch_number, manufacturer, status, label, remarks, raw_data } = req.body;

    if (!material_name || !String(material_name).trim()) {
      return res.status(400).json({ error: 'Material Name is required' });
    }
    if (!qc_number || !String(qc_number).trim()) {
      return res.status(400).json({ error: 'QC Number is required' });
    }

    const dateVal = date || new Date().toISOString().split('T')[0];
    const categoryVal = category || 'Manual';

    // Parse tags array
    let tagsArray: string[] = [];
    if (Array.isArray(tags)) {
      tagsArray = tags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim()) {
      tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const rawDataPayload = raw_data || {
      'Material Name': material_name.trim(),
      'QC Number': qc_number.trim(),
      'Date': dateVal,
      'Category': categoryVal,
      ...(supplier ? { 'Supplier': String(supplier).trim() } : {}),
      ...(batch_number ? { 'Batch Number': String(batch_number).trim() } : {}),
      ...(manufacturer ? { 'Manufacturer': String(manufacturer).trim() } : {}),
      ...(status ? { 'Status': String(status).trim() } : {}),
      ...(label ? { 'Label': String(label).trim() } : {}),
      ...(remarks ? { 'Remarks': String(remarks).trim() } : {}),
      'Source': 'Manual Entry',
    };

    const newRecord = await materialRepository.createEntry({
      source: 'manual',
      source_sheet: 'Manual Entries',
      material_name: material_name.trim(),
      qc_number: qc_number.trim(),
      date: dateVal,
      category: categoryVal,
      tags: tagsArray,
      raw_data: rawDataPayload,
    });

    res.status(201).json(newRecord);
  } catch (err: any) {
    console.error('[Create Material Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to create record' });
  }
});

// 3.2 Update Existing Record (EDIT ENTRY)
app.put('/api/material/:id', async (req, res) => {
  try {
    await initializeAppDatabase();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }

    const updated = await materialRepository.updateEntry(id, req.body);
    res.json(updated);
  } catch (err: any) {
    console.error('[Update Material Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to update record' });
  }
});

// 3.3 Delete Record
app.delete('/api/material/:id', async (req, res) => {
  try {
    await initializeAppDatabase();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }

    await materialRepository.deleteEntry(id);
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete record' });
  }
});

// 4. Excel Import Preview
app.post('/api/import/preview', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const preview = previewWorkbook(req.file.buffer, req.file.originalname);
    res.json(preview);
  } catch (err: any) {
    console.error('[Import Preview Error]:', err);
    res.status(400).json({
      error: 'Unable to preview workbook. Please verify the file is a valid .xlsx spreadsheet.',
      details: err.message,
    });
  }
});

// 5. Excel Import Commit
app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    await initializeAppDatabase();

    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const mode = (req.body.mode === 'merge' ? 'merge' : 'replace') as 'replace' | 'merge';
    const { records } = parseWorkbookToRecords(req.file.buffer);

    if (records.length === 0) {
      return res.status(400).json({
        error: 'No valid data rows found in uploaded Excel workbook.',
      });
    }

    const result = await materialRepository.importRecords(
      records,
      mode,
      req.file.originalname
    );

    res.json(result);
  } catch (err: any) {
    console.error('[Import Error]:', err);
    res.status(500).json({
      error: 'Unable to import workbook. Please check file format and required fields.',
      details: err.message,
    });
  }
});

// 6. Seed / Reset Master Demo Data
app.post('/api/import/seed-master', async (req, res) => {
  try {
    await initializeAppDatabase();
    const mode = (req.body.mode === 'merge' ? 'merge' : 'replace') as 'replace' | 'merge';
    const demoRecords = getPharmaMasterDemoRecords();

    const result = await materialRepository.importRecords(
      demoRecords,
      mode,
      'master_raw_materials.xlsx'
    );

    res.json({
      ...result,
      message: `Master pharmaceutical dataset loaded successfully (${result.newRecords + result.updatedRecords} records).`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed master dataset' });
  }
});

// 7. Clear Database
app.delete('/api/database', async (req, res) => {
  try {
    await initializeAppDatabase();
    if (req.body.confirm !== 'CONFIRM_DELETE') {
      return res.status(400).json({ error: 'Confirmation token required' });
    }

    await materialRepository.clearAll();
    res.json({ success: true, message: 'Database wiped successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear database' });
  }
});

// 8. Export Database to Excel Workbook
app.get('/api/export', async (req, res) => {
  try {
    await initializeAppDatabase();
    const rows = dbService.all<any>('SELECT * FROM materials ORDER BY source_sheet, material_name');

    // Group rows by sheet
    const sheetsMap = new Map<string, any[]>();
    for (const r of rows) {
      const sheet = r.source_sheet || 'Master';
      if (!sheetsMap.has(sheet)) {
        sheetsMap.set(sheet, []);
      }
      let raw: any = {};
      try {
        raw = JSON.parse(r.raw_data);
      } catch {
        raw = {};
      }
      sheetsMap.get(sheet)!.push({
        'Material Name': r.material_name,
        'QC Number': r.qc_number,
        'Date': r.date,
        'Category': r.category,
        ...raw,
      });
    }

    const wb = XLSX.utils.book_new();
    for (const [sheetName, items] of sheetsMap.entries()) {
      const ws = XLSX.utils.json_to_sheet(items);
      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="sahil_master_materials_export.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export master database' });
  }
});

// ==========================================
// VITE / STATIC INTEGRATION
// ==========================================
async function startServer() {
  await initializeAppDatabase();

  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sahil Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Sahil Server] Failed to start:', err);
  process.exit(1);
});

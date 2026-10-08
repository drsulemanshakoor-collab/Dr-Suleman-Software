import * as XLSX from 'xlsx';
import { RawMaterialRecord, SheetPreview, ImportPreviewResponse } from '../types';
import { parseAndFormatDate } from './normalizer';

/**
 * Intelligent header mapper for pharmaceutical Excel files
 */
function findHeaderMatch(headers: string[], patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = headers.find(h => pattern.test(h.trim()));
    if (match) return match;
  }
  return undefined;
}

export function detectColumnMappings(headers: string[]) {
  // Material Name patterns
  const materialPatterns = [
    /^material\s*name$/i,
    /^raw\s*material(\s*name)?$/i,
    /^item\s*name$/i,
    /^product\s*name$/i,
    /^material$/i,
    /^rm\s*name$/i,
    /^name\s*of\s*material$/i,
    /^substance$/i,
    /^chemical\s*name$/i,
    /material/i,
    /item/i,
  ];

  // QC Number patterns
  const qcPatterns = [
    /^qc\s*(no|number|#)?$/i,
    /^qc\s*_?\s*no\.?$/i,
    /^qc\s*_?\s*number$/i,
    /^a\.?r\.?\s*no\.?$/i,
    /^ar\s*number$/i,
    /^ar\s*no$/i,
    /^control\s*no\.?$/i,
    /^analytical\s*report\s*no$/i,
    /^test\s*report\s*no$/i,
    /qc\s*no/i,
    /qc\b/i,
  ];

  // Date patterns
  const datePatterns = [
    /^qc\s*date$/i,
    /^sample\s*date$/i,
    /^received\s*date$/i,
    /^date\s*of\s*analysis$/i,
    /^release\s*date$/i,
    /^approval\s*date$/i,
    /^testing\s*date$/i,
    /^date$/i,
    /date/i,
  ];

  // Category patterns
  const categoryPatterns = [
    /^category$/i,
    /^material\s*category$/i,
    /^type$/i,
    /^material\s*type$/i,
    /^section$/i,
    /^classification$/i,
    /category/i,
  ];

  return {
    materialNameHeader: findHeaderMatch(headers, materialPatterns),
    qcNumberHeader: findHeaderMatch(headers, qcPatterns),
    dateHeader: findHeaderMatch(headers, datePatterns),
    categoryHeader: findHeaderMatch(headers, categoryPatterns),
  };
}

/**
 * Generate preview of workbook without committing to database
 */
export function previewWorkbook(buffer: Buffer, fileName: string): ImportPreviewResponse {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetPreviews: SheetPreview[] = [];
  let totalRecords = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON array of objects
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rows.length === 0) continue;

    const headers = Object.keys(rows[0] || {});
    const mapped = detectColumnMappings(headers);
    const sampleRows = rows.slice(0, 5);

    sheetPreviews.push({
      sheetName,
      recordCount: rows.length,
      detectedHeaders: headers,
      sampleRows,
      mappedFields: mapped,
    });

    totalRecords += rows.length;
  }

  return {
    fileName,
    totalRecords,
    sheets: sheetPreviews,
  };
}

/**
 * Parse all worksheets into standardized RawMaterialRecord list
 */
export function parseWorkbookToRecords(buffer: Buffer): {
  records: RawMaterialRecord[];
  sheetsFound: string[];
} {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const records: RawMaterialRecord[] = [];
  const sheetsFound: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rows.length === 0) continue;
    sheetsFound.push(sheetName);

    const headers = Object.keys(rows[0] || {});
    const mappings = detectColumnMappings(headers);

    for (const row of rows) {
      // Determine material name
      let materialName = mappings.materialNameHeader ? row[mappings.materialNameHeader] : '';
      if (!materialName) {
        // Fallback: check first column
        const firstVal = row[headers[0]];
        if (typeof firstVal === 'string' && firstVal.trim()) {
          materialName = firstVal;
        }
      }

      // Determine QC number
      let qcNumber = mappings.qcNumberHeader ? row[mappings.qcNumberHeader] : '';
      if (!qcNumber) {
        // Look for any value resembling QC-XXXX or AR-XXXX or containing 'QC'
        for (const h of headers) {
          const val = String(row[h] || '').trim();
          if (/^QC[-_\s]?\d+/i.test(val) || /^AR[-_\s]?\d+/i.test(val)) {
            qcNumber = val;
            break;
          }
        }
      }

      // Determine Date
      let rawDate = mappings.dateHeader ? row[mappings.dateHeader] : '';
      if (!rawDate) {
        for (const h of headers) {
          if (/date/i.test(h)) {
            rawDate = row[h];
            break;
          }
        }
      }
      const dateInfo = parseAndFormatDate(rawDate);

      // Determine Category (prefer explicit column, fallback to worksheet name)
      const category = (mappings.categoryHeader && row[mappings.categoryHeader])
        ? String(row[mappings.categoryHeader]).trim()
        : sheetName;

      records.push({
        source_sheet: sheetName,
        material_name: String(materialName || '').trim(),
        material_name_normalized: '', // repository will compute this
        qc_number: String(qcNumber || '').trim(),
        date: dateInfo.isoDate || String(rawDate || ''),
        category,
        raw_data: row, // Preserve all columns!
      });
    }
  }

  return { records, sheetsFound };
}

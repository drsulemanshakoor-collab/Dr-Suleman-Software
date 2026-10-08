export interface SearchResultItem {
  id: number;
  source?: 'excel' | 'manual';
  materialName: string;
  qcNumber: string;
  date: string;
  category?: string;
  sourceSheet?: string;
  tags?: string[];
  relevance: number;
  matchType: 'exact' | 'normalized' | 'token' | 'alias' | 'semantic' | 'related';
  monthYear: string;
  year: number;
  month: number;
}

export interface MonthGroupedResults {
  monthYear: string;
  year: number;
  month: number;
  records: SearchResultItem[];
}

export interface SearchResponse {
  query: string;
  tags?: string[];
  total: number;
  aiExplanation?: string;
  interpretedQuery?: {
    materialQuery: string;
    synonyms?: string[];
    dateFilter?: string;
    extractedTags?: string[];
    isAiInterpreted: boolean;
  };
  didYouMean?: string[];
  results: SearchResultItem[];
  groupedByMonth: MonthGroupedResults[];
}

export interface DatabaseStatus {
  connected: boolean;
  totalRecords: number;
  lastImported: string | null;
  currentSource: string | null;
  sheets: Array<{ name: string; count: number }>;
  categories: Array<{ name: string; count: number }>;
}

export interface MaterialDetailRecord {
  id: number;
  source?: 'excel' | 'manual';
  source_sheet: string;
  material_name: string;
  material_name_normalized: string;
  qc_number: string;
  date: string;
  category?: string;
  tags?: string[];
  raw_data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface SheetPreview {
  sheetName: string;
  recordCount: number;
  detectedHeaders: string[];
  sampleRows: Record<string, any>[];
  mappedFields: {
    materialNameHeader?: string;
    qcNumberHeader?: string;
    dateHeader?: string;
    categoryHeader?: string;
  };
}

export interface ImportPreviewResponse {
  fileName: string;
  totalRecords: number;
  sheets: SheetPreview[];
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  newRecords: number;
  updatedRecords: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  errors: string[];
  message: string;
}

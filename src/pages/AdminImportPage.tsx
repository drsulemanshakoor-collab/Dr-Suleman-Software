import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Database,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Table,
  Layers,
  Trash2,
  Sparkles,
  Info,
  ChevronRight,
  Eye,
  Plus,
} from 'lucide-react';
import { DatabaseStatus, ImportPreviewResponse, ImportResult } from '../types';
import { api } from '../services/api';

interface AdminImportPageProps {
  status: DatabaseStatus | null;
  onRefreshStatus: () => void;
  onNavigate: (route: 'home' | 'search' | 'bmr' | 'admin' | 'new-entry') => void;
}

export const AdminImportPage: React.FC<AdminImportPageProps> = ({
  status,
  onRefreshStatus,
  onNavigate,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Confirmation modal states
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Active sheet preview tab
  const [activePreviewSheet, setActivePreviewSheet] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      setError('Please select a valid Excel (.xlsx, .xls) workbook');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setImportResult(null);
    setPreviewLoading(true);

    try {
      const preview = await api.previewImport(file);
      setPreviewData(preview);
      setActivePreviewSheet(0);
    } catch (err: any) {
      setError(err.message || 'Failed to inspect Excel workbook');
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;

    setImportLoading(true);
    setError(null);

    try {
      const result = await api.commitImport(selectedFile, importMode);
      setImportResult(result);
      setShowReplaceConfirm(false);
      onRefreshStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to import Excel records');
    } finally {
      setImportLoading(false);
    }
  };

  const handleSeedDemoData = async (mode: 'replace' | 'merge') => {
    setImportLoading(true);
    setError(null);
    try {
      const result = await api.seedDemoMaster(mode);
      setImportResult(result);
      onRefreshStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to seed master dataset');
    } finally {
      setImportLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    setImportLoading(true);
    setError(null);
    try {
      await api.clearDatabase();
      setShowClearConfirm(false);
      setImportResult({
        success: true,
        totalProcessed: 0,
        newRecords: 0,
        updatedRecords: 0,
        skippedDuplicates: 0,
        skippedInvalid: 0,
        errors: [],
        message: 'Master database cleared successfully.',
      });
      onRefreshStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to clear database');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-20">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Database className="w-6 h-6 text-blue-600" />
            <span>Master Database Administration</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Import, synchronize, and inspect pharmaceutical raw material master records (.xlsx)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('new-entry')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Entry</span>
          </button>

          <button
            onClick={onRefreshStatus}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Stats</span>
          </button>

          <a
            href="/api/export"
            download="saahil_master_materials_export.xlsx"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Database Status Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status?.connected ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-500'
              }`}
            />
            <h2 className="font-bold text-slate-900 text-base">
              MASTER DATABASE
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Persistent SQLite Layer Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Current Records
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-700 mt-1">
              {status ? status.totalRecords.toLocaleString() : '—'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Last Imported
            </p>
            <p className="text-base sm:text-lg font-bold text-slate-800 mt-1.5">
              {status?.lastImported || 'No import recorded'}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Current Source
            </p>
            <p className="text-base sm:text-lg font-bold text-slate-800 mt-1.5 truncate" title={status?.currentSource || ''}>
              {status?.currentSource || 'Initial dataset'}
            </p>
          </div>
        </div>

        {/* Worksheet Breakdown */}
        {status?.sheets && status.sheets.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono mb-2">
              Worksheet Breakdown:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {status.sheets.map((sheet) => (
                <div
                  key={sheet.name}
                  className="bg-white border border-slate-200 rounded-lg p-3 text-left shadow-2xs"
                >
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {sheet.name}
                  </p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">
                    {sheet.count.toLocaleString()}{' '}
                    <span className="text-[11px] font-normal text-slate-400">records</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Load / Reset Demo Master Option */}
      <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-200/70 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Pharma Master Reference Dataset</span>
          </h3>
          <p className="text-xs text-blue-800/80">
            Quickly load or reset standard pharmaceutical records across APIs (APS, Paracetamol), Excipients (MCC, PVP), Extracts, and Packing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSeedDemoData('replace')}
            disabled={importLoading}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs transition-colors whitespace-nowrap"
          >
            Load Master Demo Data
          </button>
        </div>
      </div>

      {/* Import Workbook Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Import Master Excel Workbook (.xlsx)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload an Excel workbook containing raw materials across any number of worksheets.
          </p>
        </div>

        {/* Upload Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-all space-y-3"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />

          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-blue-600 shadow-2xs border border-slate-200">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              {selectedFile ? selectedFile.name : 'Click to select or drag and drop Excel workbook'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports .xlsx spreadsheets with multiple worksheets (APIs, Excipients, Extracts, Packing, etc.)
            </p>
          </div>

          {selectedFile && (
            <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
              File ready for preview ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {/* Loading Preview */}
        {previewLoading && (
          <div className="p-8 text-center space-y-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Analyzing worksheets and column headers...</p>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Import Results Notification */}
        {importResult && (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h4 className="text-sm font-bold">IMPORT COMPLETE</h4>
            </div>

            <p className="text-emerald-800 text-sm">{importResult.message}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-mono">
              <div className="bg-white/70 p-2 rounded-md">
                <span className="text-emerald-700 block text-[10px] uppercase">New Records:</span>
                <span className="text-base font-bold text-emerald-900">{importResult.newRecords}</span>
              </div>
              <div className="bg-white/70 p-2 rounded-md">
                <span className="text-emerald-700 block text-[10px] uppercase">Updated Records:</span>
                <span className="text-base font-bold text-emerald-900">{importResult.updatedRecords}</span>
              </div>
              <div className="bg-white/70 p-2 rounded-md">
                <span className="text-emerald-700 block text-[10px] uppercase">Skipped Duplicates:</span>
                <span className="text-base font-bold text-emerald-900">{importResult.skippedDuplicates}</span>
              </div>
              <div className="bg-white/70 p-2 rounded-md">
                <span className="text-emerald-700 block text-[10px] uppercase">Invalid Rows:</span>
                <span className="text-base font-bold text-emerald-900">{importResult.skippedInvalid}</span>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="pt-2 text-[11px] text-amber-800 space-y-1">
                <p className="font-semibold uppercase tracking-wider">Skipped Row Details:</p>
                {importResult.errors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workbook Preview Section */}
        {previewData && (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Workbook Inspection: {previewData.fileName}
                </h3>
                <p className="text-xs text-slate-500">
                  Detected {previewData.sheets.length} worksheets with {previewData.totalRecords.toLocaleString()} total raw material records
                </p>
              </div>

              {/* Import Mode Selector */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    importMode === 'replace'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Replace Database
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    importMode === 'merge'
                      ? 'bg-white text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Add / Merge Records
                </button>
              </div>
            </div>

            {/* Sheets Tabs */}
            <div className="border-b border-slate-200 flex gap-2 overflow-x-auto pb-1">
              {previewData.sheets.map((s, idx) => (
                <button
                  key={s.sheetName}
                  onClick={() => setActivePreviewSheet(idx)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
                    activePreviewSheet === idx
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>{s.sheetName}</span>
                  <span className="ml-2 font-mono text-[11px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
                    {s.recordCount} records
                  </span>
                </button>
              ))}
            </div>

            {/* Active Sheet Details */}
            {previewData.sheets[activePreviewSheet] && (
              <div className="space-y-4">
                {/* Column Mappings Detection Banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-700">
                  <p className="font-bold text-slate-800 mb-1.5 uppercase font-mono tracking-wider text-[11px]">
                    Intelligently Mapped Fields:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Material Name:</span>
                      <strong className="text-blue-700">
                        {previewData.sheets[activePreviewSheet].mappedFields.materialNameHeader || 'First Column'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">QC Number:</span>
                      <strong className="text-emerald-700">
                        {previewData.sheets[activePreviewSheet].mappedFields.qcNumberHeader || 'Auto-Detected'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date:</span>
                      <strong className="text-purple-700">
                        {previewData.sheets[activePreviewSheet].mappedFields.dateHeader || 'Auto-Detected'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Category:</span>
                      <strong className="text-slate-800">
                        {previewData.sheets[activePreviewSheet].mappedFields.categoryHeader || previewData.sheets[activePreviewSheet].sheetName}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Sample Rows Table */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-600 uppercase font-mono">
                    Sample Data Preview (First 5 Rows):
                  </p>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-slate-700 font-semibold font-mono">
                        <tr>
                          {previewData.sheets[activePreviewSheet].detectedHeaders.map((h) => (
                            <th key={h} className="p-2.5 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.sheets[activePreviewSheet].sampleRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/70">
                            {previewData.sheets[activePreviewSheet].detectedHeaders.map((h) => (
                              <td key={h} className="p-2.5 text-slate-800 whitespace-nowrap">
                                {String(row[h] || '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Commit Import Action Bar */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                Mode:{' '}
                <strong className="text-slate-900">
                  {importMode === 'replace' ? 'REPLACE EXISTING DATABASE' : 'ADD / MERGE RECORDS'}
                </strong>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {importMode === 'replace'
                    ? 'All previous records will be replaced with this workbook.'
                    : 'New records will be added, duplicates matching QC# + Material + Date will be updated.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (importMode === 'replace') {
                    setShowReplaceConfirm(true);
                  } else {
                    handleExecuteImport();
                  }
                }}
                disabled={importLoading}
                className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-2xs transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {importLoading ? (
                  <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>IMPORT MASTER DATABASE</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone: Clear Database */}
      <div className="border border-red-200 bg-red-50/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>Clear Master Database</span>
          </h4>
          <p className="text-xs text-red-700 mt-0.5">
            Permanently remove all imported records from the persistent SQLite database.
          </p>
        </div>

        <button
          onClick={() => setShowClearConfirm(true)}
          className="px-4 py-2 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 shadow-2xs transition-colors whitespace-nowrap"
        >
          Clear All Records
        </button>
      </div>

      {/* Replace Confirmation Modal */}
      {showReplaceConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Confirm Database Replacement
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will replace the current master database ({status?.totalRecords.toLocaleString()} records) with the newly imported workbook ({previewData?.totalRecords.toLocaleString()} records). Continue?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowReplaceConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importLoading}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs transition-colors"
              >
                {importLoading ? 'Replacing...' : 'Yes, Replace Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Confirm Database Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all records from the persistent database? You can re-import from Excel or re-load the demo master dataset at any time.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearDatabase}
                disabled={importLoading}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-2xs transition-colors"
              >
                {importLoading ? 'Clearing...' : 'Clear Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

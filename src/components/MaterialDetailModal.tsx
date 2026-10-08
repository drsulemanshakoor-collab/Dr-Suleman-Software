import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  FileSpreadsheet,
  Edit3,
  Trash2,
  Save,
  X,
  Tag as TagIcon,
  AlertTriangle,
} from 'lucide-react';
import { MaterialDetailRecord } from '../types';
import { api } from '../services/api';
import { TagInput } from './TagInput';

interface MaterialDetailModalProps {
  materialId: number;
  onClose: () => void;
  onRecordUpdated?: (record: MaterialDetailRecord) => void;
  onRecordDeleted?: (id: number) => void;
}

export const MaterialDetailModal: React.FC<MaterialDetailModalProps> = ({
  materialId,
  onClose,
  onRecordUpdated,
  onRecordDeleted,
}) => {
  const [record, setRecord] = useState<MaterialDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editMaterialName, setEditMaterialName] = useState('');
  const [editQcNumber, setEditQcNumber] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getMaterial(materialId)
      .then((data) => {
        if (isMounted) {
          setRecord(data);
          setEditMaterialName(data.material_name);
          setEditQcNumber(data.qc_number);
          setEditDate(data.date);
          setEditCategory(data.category || 'API');
          setEditTags(data.tags || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load record details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [materialId]);

  const handleCopyQC = () => {
    if (record?.qc_number) {
      navigator.clipboard.writeText(record.qc_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEdit = async () => {
    if (!record) return;
    setIsSaving(true);
    setError(null);

    try {
      const updated = await api.updateMaterial(record.id, {
        material_name: editMaterialName.trim(),
        qc_number: editQcNumber.trim(),
        date: editDate,
        category: editCategory,
        tags: editTags,
      });

      setRecord(updated);
      setIsEditing(false);
      if (onRecordUpdated) {
        onRecordUpdated(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!record) return;
    try {
      await api.deleteMaterial(record.id);
      if (onRecordDeleted) {
        onRecordDeleted(record.id);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditing]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="border-b border-slate-100 p-4 sm:px-6 flex items-center justify-between bg-slate-50/50">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Results</span>
          </button>

          <div className="flex items-center gap-2">
            {record && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>EDIT</span>
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            {record && (
              <span className="text-xs font-mono text-slate-500 hidden sm:inline bg-slate-100 px-2 py-0.5 rounded-sm">
                Source: {record.source === 'manual' ? 'Manual Entry' : record.source_sheet}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grow space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading full master record...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <p className="font-semibold">Notice</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {record && (
            <>
              {/* EDIT MODE FORM */}
              {isEditing ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <span>Edit Master Record #{record.id}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Material Name
                      </label>
                      <input
                        type="text"
                        value={editMaterialName}
                        onChange={(e) => setEditMaterialName(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        QC Number
                      </label>
                      <input
                        type="text"
                        value={editQcNumber}
                        onChange={(e) => setEditQcNumber(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        QC Date
                      </label>
                      <input
                        type="text"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tags
                    </label>
                    <TagInput tags={editTags} onChange={setEditTags} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveEdit}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5"
                    >
                      {isSaving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>UPDATE RECORD</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW MODE HERO CARD */
                <div className="bg-gradient-to-br from-blue-50/50 via-slate-50/80 to-white border border-blue-100 rounded-xl p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <span className="text-xs uppercase font-mono tracking-widest text-blue-600 font-bold">
                        {record.category || record.source_sheet || 'RAW MATERIAL'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                        {record.material_name}
                      </h2>

                      {/* Display Tags */}
                      {record.tags && record.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {record.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs"
                            >
                              <TagIcon className="w-2.5 h-2.5" />
                              <span>{tag}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleCopyQC}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all self-start"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy QC#</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100/60 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">QC Number:</span>
                      <span className="font-mono font-bold text-slate-900 bg-blue-100/80 text-blue-900 px-2 py-0.5 rounded-sm">
                        {record.qc_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Date:</span>
                      <span className="font-semibold text-slate-800">{record.date}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Record Details (Dynamically rendered from raw_data) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                    <span>Complete Record Fields (Original Excel & Custom Columns)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {Object.keys(record.raw_data || {}).length} columns detected
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-100">
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(record.raw_data || {}).map(([key, val], idx) => {
                        const displayVal =
                          val !== null && val !== undefined && val !== ''
                            ? String(val)
                            : '—';

                        const isImportantKey =
                          /material/i.test(key) ||
                          /qc/i.test(key) ||
                          /date/i.test(key) ||
                          /batch/i.test(key) ||
                          /supplier/i.test(key) ||
                          /manufacturer/i.test(key) ||
                          /status/i.test(key) ||
                          /label/i.test(key);

                        return (
                          <tr
                            key={key}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                            }`}
                          >
                            <td className="py-2.5 px-4 font-medium text-slate-600 sm:w-1/3 whitespace-nowrap">
                              {key}
                            </td>
                            <td
                              className={`py-2.5 px-4 text-slate-900 break-words ${
                                isImportantKey ? 'font-medium' : ''
                              }`}
                            >
                              {displayVal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="font-bold text-slate-900 text-base">Delete Record</h4>
              </div>
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently delete record for &ldquo;{record?.material_name}&rdquo; ({record?.qc_number})?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>SAAHIL Pharmaceutical Quality Control</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { TagInput } from '../components/TagInput';
import { api } from '../services/api';
import { MaterialDetailRecord } from '../types';
import {
  PlusCircle,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  FileSpreadsheet,
  Tag as TagIcon,
} from 'lucide-react';

interface NewEntryPageProps {
  onNavigate: (route: 'home' | 'search' | 'bmr' | 'admin' | 'new-entry') => void;
  onRecordCreated?: (record: MaterialDetailRecord) => void;
}

export const NewEntryPage: React.FC<NewEntryPageProps> = ({
  onNavigate,
  onRecordCreated,
}) => {
  const [materialName, setMaterialName] = useState('');
  const [qcNumber, setQcNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('API');
  const [tags, setTags] = useState<string[]>([]);
  const [supplier, setSupplier] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [status, setStatus] = useState('Approved');
  const [label, setLabel] = useState('');
  const [remarks, setRemarks] = useState('');

  // Dynamic custom fields
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRecord, setCreatedRecord] = useState<MaterialDetailRecord | null>(null);

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (index: number, key: string, value: string) => {
    const updated = [...customFields];
    updated[index] = { key, value };
    setCustomFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim()) {
      setError('Material Name is required.');
      return;
    }
    if (!qcNumber.trim()) {
      setError('QC Number is required.');
      return;
    }

    setSaving(true);
    setError(null);

    // Build raw_data payload preserving all original and custom fields
    const rawData: Record<string, any> = {
      'Material Name': materialName.trim(),
      'QC Number': qcNumber.trim(),
      'Date': date,
      'Category': category,
      'Source': 'Manual Entry',
    };

    if (supplier.trim()) rawData['Supplier'] = supplier.trim();
    if (batchNumber.trim()) rawData['Batch Number'] = batchNumber.trim();
    if (manufacturer.trim()) rawData['Manufacturer'] = manufacturer.trim();
    if (status.trim()) rawData['Status'] = status.trim();
    if (label.trim()) rawData['Label'] = label.trim();
    if (remarks.trim()) rawData['Remarks'] = remarks.trim();
    if (tags.length > 0) rawData['Tags'] = tags.join(', ');

    // Add any custom fields
    for (const f of customFields) {
      if (f.key.trim() && f.value.trim()) {
        rawData[f.key.trim()] = f.value.trim();
      }
    }

    try {
      const record = await api.createMaterial({
        material_name: materialName.trim(),
        qc_number: qcNumber.trim(),
        date,
        category,
        tags,
        supplier: supplier.trim(),
        batch_number: batchNumber.trim(),
        manufacturer: manufacturer.trim(),
        status,
        label: label.trim(),
        remarks: remarks.trim(),
        raw_data: rawData,
      });

      setCreatedRecord(record);
      if (onRecordCreated) {
        onRecordCreated(record);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save new master record.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetForm = () => {
    setMaterialName('');
    setQcNumber('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('API');
    setTags([]);
    setSupplier('');
    setBatchNumber('');
    setManufacturer('');
    setStatus('Approved');
    setLabel('');
    setRemarks('');
    setCustomFields([]);
    setCreatedRecord(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-blue-600" />
              <span>Create New Master QC Entry</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Add a new raw material record directly into the persistent master database.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('admin')}
          className="text-xs font-semibold text-slate-600 hover:text-blue-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Excel Master Import
        </button>
      </div>

      {/* Success Notification */}
      {createdRecord && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 className="font-bold text-sm">
              Record Successfully Saved to Persistent Database!
            </h3>
          </div>
          <p className="text-xs text-emerald-800">
            Master record for <strong>{createdRecord.material_name}</strong> (QC: <strong>{createdRecord.qc_number}</strong>) is immediately indexed and searchable.
          </p>

          <div className="flex items-center gap-3 pt-2 border-t border-emerald-200/60">
            <button
              onClick={handleResetForm}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              + Create Another Entry
            </button>
            <button
              onClick={() => onNavigate('search')}
              className="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
            >
              Go to Search
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Core Identification Section */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono mb-4 flex items-center gap-2">
            <span>1. Core Identification (Required)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Material Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="e.g. Anhydrous Polysaccharide, Biotin Pure"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                QC Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={qcNumber}
                onChange={(e) => setQcNumber(e.target.value)}
                placeholder="e.g. QC-00987, AR-2026-051"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                QC Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Material Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden bg-white"
              >
                <option value="API">API (Active Pharmaceutical Ingredient)</option>
                <option value="Excipient">Excipient</option>
                <option value="Extract">Extract (Botanical/Herbal)</option>
                <option value="Packing Material">Packing Material</option>
                <option value="Printed Packaging">Printed Packaging / Labels</option>
                <option value="Reagent">Chemical Reagent / Solvent</option>
                <option value="Other">Other Raw Material</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <TagIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Searchable Tags & Metadata</span>
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Associate tags (e.g. Biotin, High Science, Vitamin, Primary Label) to enable fast combined search.
          </p>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {/* Manufacturing & Supply Chain Details */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono mb-4">
            2. Manufacturing & Quality Details (Optional)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. ABC Pharma Ingredients Ltd"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Number
              </label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. B-2026-904"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. BioPolymer ChemWorks"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                QC Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-hidden bg-white"
              >
                <option value="Approved">Approved</option>
                <option value="Pending Analysis">Pending Analysis</option>
                <option value="Quarantined">Quarantined</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product / Label Association
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Biotin 5000 mcg Capsules, High Science"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Specifications
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. In-house testing pass, USP 44"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Custom Fields */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono">
              3. Additional Custom Fields
            </h2>
            <button
              type="button"
              onClick={handleAddCustomField}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Column</span>
            </button>
          </div>

          {customFields.map((field, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Field Name (e.g. Storage, Assay)"
                value={field.key}
                onChange={(e) => handleCustomFieldChange(idx, e.target.value, field.value)}
                className="w-1/3 px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Value"
                value={field.value}
                onChange={(e) => handleCustomFieldChange(idx, field.key, e.target.value)}
                className="grow px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemoveCustomField(idx)}
                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                title="Remove field"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>SAVE ENTRY</span>
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { ReferenceItem, SourceType } from '../types';
import { extractTextFromPdf } from '../utils/pdfUtils';
import { Trash2, ChevronDown, ChevronUp, FileText, Upload, Loader2 } from 'lucide-react';

interface ReferenceListProps {
  references: ReferenceItem[];
  onUpdate: (updated: ReferenceItem[]) => void;
}

export const ReferenceList: React.FC<ReferenceListProps> = ({ references, onUpdate }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addReference = () => {
    const newRef: ReferenceItem = {
      id: `REF-${(references.length + 1).toString().padStart(3, '0')}`,
      sourceType: SourceType.PAPER,
      text: '',
      isExpanded: true,
    };
    onUpdate([...references, newRef]);
  };

  const updateReference = (index: number, field: keyof ReferenceItem, value: any) => {
    const newRefs = [...references];
    newRefs[index] = { ...newRefs[index], [field]: value };
    onUpdate(newRefs);
  };

  const removeReference = (index: number) => {
    onUpdate(references.filter((_, i) => i !== index));
  };

  const toggleExpand = (index: number) => {
    updateReference(index, 'isExpanded', !references[index].isExpanded);
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const refId = references[index].id;
    setProcessingId(refId);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }
      updateReference(index, 'text', text);
    } catch (err) {
      console.error('Failed to read file for reference:', err);
      alert('Failed to read file. Please check if it is a valid PDF or Text file.');
    } finally {
      setProcessingId(null);
      // Reset input
      if (fileInputRefs.current[refId]) {
         fileInputRefs.current[refId]!.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Reference Texts
        </h3>
        <button
          onClick={addReference}
          className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          + Add Reference
        </button>
      </div>

      {references.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm">
          No references added yet. Add sources to compare against.
        </div>
      )}

      {references.map((ref, index) => (
        <div key={index} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm transition-all">
          <div
            className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer select-none"
            onClick={() => toggleExpand(index)}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded">
                {ref.id}
              </span>
              <span className="text-sm font-medium text-slate-700">
                {ref.text ? (ref.text.substring(0, 40) + (ref.text.length > 40 ? '...' : '')) : 'Empty Reference'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeReference(index);
                }}
                className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded transition-colors"
                title="Remove Reference"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {ref.isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {ref.isExpanded && (
            <div className="p-4 space-y-4">
              <div className="flex gap-4">
                <div className="w-1/3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Source ID</label>
                  <input
                    type="text"
                    value={ref.id}
                    onChange={(e) => updateReference(index, 'id', e.target.value)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. REF-001"
                  />
                </div>
                <div className="w-2/3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Source Type</label>
                  <select
                    value={ref.sourceType}
                    onChange={(e) => updateReference(index, 'sourceType', e.target.value as SourceType)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    {Object.values(SourceType).map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-500">Reference Content</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".txt,.pdf"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[ref.id] = el; }}
                      onChange={(e) => handleFileUpload(index, e)}
                    />
                    <button
                      onClick={() => fileInputRefs.current[ref.id]?.click()}
                      disabled={processingId === ref.id}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      {processingId === ref.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      Upload File
                    </button>
                  </div>
                </div>
                <textarea
                  value={ref.text}
                  onChange={(e) => updateReference(index, 'text', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[150px] focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-700"
                  placeholder="Paste the reference text here or upload a file..."
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

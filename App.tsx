
import React, { useState, useRef } from 'react';
import { ReferenceItem, AnalysisResult } from './types';
import { analyzePlagiarism } from './services/geminiService';
import { extractTextFromPdf } from './utils/pdfUtils';
import { ReferenceList } from './components/ReferenceList';
import { AnalysisView } from './components/AnalysisView';
import { ShieldCheck, Search, FileText, Loader2, ArrowRight, Upload, FileType, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [documentText, setDocumentText] = useState('');
  const [documentType, setDocumentType] = useState('Research Paper');
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!documentText.trim()) {
      setError("Please enter the document text.");
      return;
    }
    
    // Validation: Require either references OR web search
    const hasReferences = references.length > 0 && references.some(r => r.text.trim());
    if (!hasReferences && !useWebSearch) {
      setError("Please add at least one reference text OR enable Web Search.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzePlagiarism(documentText, references, documentType, useWebSearch);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setError(null);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else {
        text = await file.text();
      }
      setDocumentText(text);
    } catch (err: any) {
      setError(err.message || "Failed to read file.");
    } finally {
      setIsProcessingFile(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">
              ScholarGuard
            </h1>
          </div>
          <div className="text-xs font-medium text-slate-500 px-3 py-1 bg-slate-100 rounded-full">
            AI-Powered Plagiarism Analysis
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!result ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Document Input */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                <div className="mb-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-900">
                      <FileText className="w-5 h-5" />
                      <h2 className="font-semibold text-lg">Document to Analyze</h2>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".txt,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessingFile}
                        className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium disabled:opacity-50"
                      >
                        {isProcessingFile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Upload PDF/TXT
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Document Type</label>
                    <div className="relative">
                      <FileType className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                      >
                        <option value="Research Paper">Research Paper</option>
                        <option value="Survey Paper">Survey Paper</option>
                        <option value="Thesis">Thesis</option>
                        <option value="Project Report">Project Report</option>
                        <option value="Article">Article</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <textarea
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  className="flex-1 w-full p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono text-sm leading-relaxed"
                  placeholder="Paste document text here or upload a PDF..."
                  style={{ minHeight: '400px' }}
                />
              </div>
            </div>

            {/* Right Column: Reference Texts & Action */}
            <div className="lg:col-span-7 flex flex-col h-full">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 mb-6">
                <ReferenceList references={references} onUpdate={setReferences} />
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm flex items-center gap-2 animate-pulse">
                  <ShieldCheck className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Controls */}
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="webSearchToggle"
                      checked={useWebSearch}
                      onChange={(e) => setUseWebSearch(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none"
                    />
                     <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <label htmlFor="webSearchToggle" className="flex-1 cursor-pointer select-none">
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                      <Globe className="w-4 h-4 text-blue-500" />
                      Check against Internet (Google Search)
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Uses Google Search to find matches from the open web.
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all transform flex items-center justify-center gap-3
                    ${isAnalyzing 
                      ? 'bg-slate-400 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 hover:shadow-indigo-200'
                    }`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Analyzing Document...
                    </>
                  ) : (
                    <>
                      <Search className="w-6 h-6" />
                      Run Plagiarism Check
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <button
              onClick={handleReset}
              className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium text-sm group"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Back to Input
            </button>
            <AnalysisView result={result} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

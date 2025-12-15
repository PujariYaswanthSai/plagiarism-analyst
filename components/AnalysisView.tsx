
import React from 'react';
import { AnalysisResult, MatchResult } from '../types';
import { AlertTriangle, CheckCircle, AlertOctagon, Info, FileWarning, Globe } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface AnalysisViewProps {
  result: AnalysisResult;
}

const getRiskColor = (score: number) => {
  if (score < 20) return 'text-green-600';
  if (score < 50) return 'text-yellow-600';
  if (score < 80) return 'text-orange-600';
  return 'text-red-600';
};

const getRiskBg = (score: number) => {
  if (score < 20) return 'bg-green-50 border-green-200';
  if (score < 50) return 'bg-yellow-50 border-yellow-200';
  if (score < 80) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
};

const MatchCard: React.FC<{ match: MatchResult }> = ({ match }) => {
  const isVerbatim = match.type === 'verbatim';
  const isMosaic = match.type === 'mosaic';
  
  return (
    <div className={`p-5 rounded-lg border-l-4 shadow-sm bg-white mb-4 ${
      isVerbatim ? 'border-l-red-500' : isMosaic ? 'border-l-orange-500' : 'border-l-yellow-400'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2 items-center">
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
            isVerbatim ? 'bg-red-100 text-red-700' : isMosaic ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {match.type.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            match.citation_status === 'no_citation' ? 'bg-red-100 text-red-600' :
            match.citation_status === 'has_citation_but_too_close' ? 'bg-orange-100 text-orange-600' :
            'bg-green-100 text-green-600'
          }`}>
            {match.citation_status === 'no_citation' ? 'Missing Citation' :
             match.citation_status === 'has_citation_but_too_close' ? 'Improper Paraphrase' : 'Cited'}
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500">
           {match.reference_id ? `Ref: ${match.reference_id}` : match.suspected_reference_ids?.join(', ')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-50 p-3 rounded border border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Document Segment</h4>
          <p className="text-sm text-slate-800 font-serif leading-relaxed italic">"{match.document_span}"</p>
        </div>
        <div className="bg-slate-50 p-3 rounded border border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Reference Source</h4>
          <p className="text-sm text-slate-600 font-serif leading-relaxed">"{match.reference_snippet}"</p>
        </div>
      </div>

      <div className="flex gap-2 items-start text-sm text-slate-700 bg-slate-50 p-3 rounded">
        <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <p>{match.similarity_explanation}</p>
      </div>
    </div>
  );
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ result }) => {
  const riskData = [
    { name: 'Risk', value: result.overall_plagiarism_risk },
    { name: 'Safe', value: 100 - result.overall_plagiarism_risk },
  ];
  
  const riskColorHex = result.overall_plagiarism_risk < 50 ? '#22c55e' : result.overall_plagiarism_risk < 80 ? '#f97316' : '#ef4444';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Card */}
      <div className={`p-6 rounded-xl border ${getRiskBg(result.overall_plagiarism_risk)} shadow-sm`}>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          
          {/* Gauge Chart */}
          <div className="relative w-40 h-40 shrink-0">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={75}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={riskColorHex} />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getRiskColor(result.overall_plagiarism_risk)}`}>
                  {result.overall_plagiarism_risk}%
                </span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Risk Score</span>
             </div>
          </div>

          <div className="flex-1">
             <div className="flex items-center gap-3 mb-3">
               {result.overall_plagiarism_risk < 20 ? (
                 <CheckCircle className="w-8 h-8 text-green-600" />
               ) : result.overall_plagiarism_risk < 80 ? (
                 <AlertTriangle className="w-8 h-8 text-orange-600" />
               ) : (
                 <AlertOctagon className="w-8 h-8 text-red-600" />
               )}
               <h2 className="text-2xl font-bold text-slate-800">
                 {result.category.replace('_', ' ').toUpperCase()}
               </h2>
             </div>
             
             <ul className="space-y-2">
               {result.summary.map((point, i) => (
                 <li key={i} className="flex items-start gap-2 text-slate-700">
                   <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                   <span>{point}</span>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      </div>

      {/* Web Sources Section */}
      {result.webSources && result.webSources.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Detected Web Sources
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            The analysis identified potential matches from the following online sources:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {result.webSources.map((source, idx) => (
              <li key={idx}>
                <a 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-3 py-2 rounded transition-colors truncate"
                >
                  <span className="truncate">{source.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Matches Section */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-slate-600" />
          Detailed Matches ({result.matches.length})
        </h3>
        
        {result.matches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No significant plagiarism detected.</p>
            <p className="text-slate-400 text-sm">The document appears original based on the checked sources.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {result.matches.map((match, idx) => (
              <MatchCard key={idx} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

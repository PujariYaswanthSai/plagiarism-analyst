
export enum SourceType {
  PAPER = 'paper',
  BOOK = 'book',
  WEBSITE = 'website',
  THESIS = 'thesis',
  OTHER = 'other',
}

export interface ReferenceItem {
  id: string;
  sourceType: SourceType;
  text: string;
  isExpanded?: boolean;
}

export type PlagiarismType = 'verbatim' | 'close_paraphrase' | 'mosaic';
export type CitationStatus = 'no_citation' | 'has_citation_but_too_close' | 'properly_cited';
export type RiskCategory = 'no_issue' | 'minor_overlap' | 'moderate_risk' | 'high_risk';

export interface MatchResult {
  type: PlagiarismType;
  document_span: string;
  reference_id: string | null;
  suspected_reference_ids?: string[];
  reference_snippet: string;
  citation_status: CitationStatus;
  similarity_explanation: string;
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface AnalysisResult {
  overall_plagiarism_risk: number;
  category: RiskCategory;
  summary: string[];
  matches: MatchResult[];
  webSources?: WebSource[];
}

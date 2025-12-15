import { GoogleGenAI } from "@google/genai";
import { ReferenceItem, AnalysisResult } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzePlagiarism = async (
  documentText: string,
  references: ReferenceItem[],
  documentType: string = "academic document",
  enableWebSearch: boolean = false
): Promise<AnalysisResult> => {
  const ai = getClient();
  
  // Construct the references text block
  const formattedReferences = references.map(ref => `
---REFERENCE_START---
ID: ${ref.id}
SOURCE_TYPE: ${ref.sourceType}
TEXT:
${ref.text}
---REFERENCE_END---
`).join('\n');

  // Construct the prompt content based on the updated requirements
  const prompt = `
You are an expert academic plagiarism analyst. You specialize in analyzing ALL TYPES of academic documents, including:
- Research papers
- Survey papers
- Review articles
- Theses and dissertations
- Project reports
- Conference papers
- Technical articles and whitepapers

Your job is to analyze a GIVEN_DOCUMENT and detect possible plagiarism against a set of REFERENCE_TEXTS ${enableWebSearch ? "and content found on the Internet via Google Search" : ""}.

########################
## INPUT FORMAT
########################

1. DOCUMENT_TYPE:
${documentType}

2. GIVEN_DOCUMENT:
<START_DOCUMENT>
${documentText}
<END_DOCUMENT>

3. REFERENCE_TEXTS:
${formattedReferences.trim() ? formattedReferences : "(No local references provided)"}

${enableWebSearch ? `
4. WEB CHECK INSTRUCTIONS:
You have access to the Google Search tool.
- You MUST use Google Search to check if segments of the GIVEN_DOCUMENT appear online.
- Look for verbatim copying or close paraphrasing from external websites, journals, or repositories.
- If you find a match on the web that is NOT in the provided REFERENCE_TEXTS:
    a) Create a match entry in the output JSON.
    b) Set 'reference_id' to "WEB-SOURCE".
    c) Include the URL or Source Title in the 'reference_snippet' or 'similarity_explanation'.
    d) Treat these as valid plagiarism findings.
` : ''}

########################
## YOUR TASKS
########################

You must perform a plagiarism-style analysis with these steps:

1. DETECT DIRECT COPYING (VERBATIM)
   - Find segments in GIVEN_DOCUMENT that closely match any REFERENCE_TEXTS ${enableWebSearch ? "or WEB SOURCES" : ""} with almost identical wording.
   - Mark them as: type: "verbatim"
   - For each such segment, provide:
       - document_span: a short excerpt or clear location marker from the GIVEN_DOCUMENT
       - reference_id: ID of the reference (or "WEB-SOURCE")
       - reference_snippet: a short snippet from the reference (or URL/Title if from web)
       - similarity_explanation: briefly explain why this appears as direct copying.

2. DETECT CLOSE PARAPHRASING
   - Find segments where the ideas, order, and structure are very similar to a reference, but the words are only slightly changed.
   - Mark them as: type: "close_paraphrase"
   - Provide the same fields as above.

3. DETECT MOSAIC / PATCHWORK PLAGIARISM
   - Find segments that appear to be a mix of multiple sources with minor edits.
   - Mark them as: type: "mosaic"
   - Include: suspected_reference_ids (list of IDs).

4. CHECK CITATION & ATTRIBUTION
   - For each suspicious segment, check if the source is properly cited near that segment.
   - Mark: citation_status: "no_citation", "has_citation_but_too_close", or "properly_cited"

5. OVERALL SCORES
   - Provide:
     - overall_plagiarism_risk: a number from 0 to 100.
     - summary: 3–5 bullet points describing the main issues.
     - category: one of ["no_issue", "minor_overlap", "moderate_risk", "high_risk"].

########################
## OUTPUT FORMAT
########################

Respond ONLY in valid JSON with this structure. Do NOT output markdown code blocks. Do NOT output any conversational text.

{
  "overall_plagiarism_risk": <number 0-100>,
  "category": "<no_issue | minor_overlap | moderate_risk | high_risk>",
  "summary": [
    "string bullet 1",
    "string bullet 2"
  ],
  "matches": [
    {
      "type": "<verbatim | close_paraphrase | mosaic>",
      "document_span": "short excerpt or clear location marker from the GIVEN_DOCUMENT",
      "reference_id": "ID or 'WEB-SOURCE'",
      "suspected_reference_ids": ["optional list"],
      "reference_snippet": "short quote or URL",
      "citation_status": "<no_citation | has_citation_but_too_close | properly_cited>",
      "similarity_explanation": "brief explanation"
    }
  ]
}

Rules:
- Be conservative but honest.
- If you are unsure, explain the uncertainty in the explanation field.
`;

  const config: any = {};

  if (enableWebSearch) {
    config.tools = [{ googleSearch: {} }];
    // responseMimeType is not allowed with googleSearch
  } else {
    config.responseMimeType = 'application/json';
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: config
    });

    let text = response.text;
    if (!text) {
      throw new Error("No response generated from AI");
    }

    // Clean JSON text extraction
    // 1. Remove markdown code blocks if present (e.g. ```json ... ```)
    text = text.replace(/```json/gi, '').replace(/```/g, '');

    // 2. Locate the JSON object boundaries to ignore conversational preamble/postamble
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      text = text.substring(firstOpen, lastClose + 1);
    }

    let result: AnalysisResult;
    try {
      result = JSON.parse(text) as AnalysisResult;
    } catch (parseError) {
      console.error("JSON Parsing failed. Raw text:", response.text);
      throw new Error("Failed to parse analysis results. The AI response was not valid JSON.");
    }

    // Extract web grounding sources if available
    if (enableWebSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      const chunks = response.candidates[0].groundingMetadata.groundingChunks;
      const webSources = chunks
        .filter((c: any) => c.web?.uri)
        .map((c: any) => ({ uri: c.web.uri, title: c.web.title || c.web.uri }));
      
      // Deduplicate by URI
      const uniqueSources = Array.from(new Map(webSources.map((s: any) => [s.uri, s])).values());
      result.webSources = uniqueSources as any;
    }

    return result;
  } catch (error) {
    console.error("Error analyzing paper:", error);
    throw error;
  }
};

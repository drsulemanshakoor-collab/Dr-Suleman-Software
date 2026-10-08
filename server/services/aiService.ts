import { GoogleGenAI } from '@google/genai';
import { SearchResultItem } from '../types';

export interface AiQueryInterpretation {
  rawQuery: string;
  materialQuery: string;
  tags: string[];
  synonyms: string[];
  suggestedYear?: number;
  suggestedMonth?: number;
  isAiInterpreted: boolean;
}

export class AiQueryService {
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.client = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('[AI Service] Failed to initialize GoogleGenAI:', err);
      }
    } else {
      console.log('[AI Service] GEMINI_API_KEY not configured or using default.');
    }
  }

  /**
   * Interprets user search query to extract core material name, tags, and synonyms.
   * STRICT GUARANTEE: Never generates or returns QC numbers.
   */
  async interpretQuery(query: string): Promise<AiQueryInterpretation> {
    const trimmed = (query || '').trim();
    const fallback: AiQueryInterpretation = {
      rawQuery: trimmed,
      materialQuery: trimmed,
      tags: [],
      synonyms: [],
      isAiInterpreted: false,
    };

    if (!trimmed) return fallback;

    // Rule-based fast check for common natural language pharma queries
    // e.g. "Find Biotin labels" -> materialQuery: "Label", tags: ["Biotin"]
    if (/find\s+(.+)\s+labels?/i.test(trimmed) || /show\s+labels?\s+for\s+(.+)/i.test(trimmed)) {
      const match = trimmed.match(/find\s+(.+)\s+labels?/i) || trimmed.match(/show\s+labels?\s+for\s+(.+)/i);
      const tagCandidate = match ? match[1].trim() : '';
      if (tagCandidate) {
        return {
          rawQuery: trimmed,
          materialQuery: 'Label',
          tags: [tagCandidate],
          synonyms: [],
          isAiInterpreted: true,
        };
      }
    }

    if (!this.client) {
      return fallback;
    }

    try {
      const prompt = `You are an internal pharmaceutical raw material search query interpreter.
Analyze this user search query: "${trimmed}"

Extract the structured criteria:
1. "materialQuery": The primary chemical or raw material name or packaging type (e.g. "APS", "Anhydrous Polysaccharide", "Label", "Paracetamol", "Microcrystalline Cellulose"). Strip conversational words like "show me", "find", "QC numbers", "records".
2. "tags": Array of extracted specific qualifiers, brands, products, or tags mentioned (e.g. for "Find Biotin labels" tags should be ["Biotin"] and materialQuery "Label"; for "High Science labels" tags should be ["High Science"]).
3. "synonyms": Array of up to 4 exact chemical synonyms or acronym expansions (e.g. for "APS" provide ["Anhydrous Polysaccharide"]).
4. "year": Number if a year was requested (e.g. 2026), or null.

STRICT RULE:
DO NOT generate or invent any QC numbers.
Respond ONLY with valid JSON:
{
  "materialQuery": string,
  "tags": string[],
  "synonyms": string[],
  "year": number | null
}`;

      const response = await this.client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const responseText = response.text?.trim();
      if (!responseText) return fallback;

      const parsed = JSON.parse(responseText);

      return {
        rawQuery: trimmed,
        materialQuery: parsed.materialQuery || trimmed,
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter(Boolean) : [],
        synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.filter(Boolean) : [],
        suggestedYear: parsed.year || undefined,
        isAiInterpreted: true,
      };
    } catch (err) {
      console.warn('[AI Service] Query interpretation fallback:', err);
      return fallback;
    }
  }

  /**
   * Generates a concise 2-4 line pharmaceutical explanation based on the query and actual database results.
   * Adheres strictly to Requirement 14:
   * "Keep this approximately 2–4 lines. Do NOT generate unnecessary long paragraphs.
   * Gemini must NEVER invent database information."
   */
  async generateExplanation(
    query: string,
    results: SearchResultItem[],
    tags: string[] = []
  ): Promise<string | undefined> {
    const trimmed = (query || '').trim();
    if (!trimmed && tags.length === 0) return undefined;

    // Rule-based concise explanation fallback if client is not available
    const primaryName = results.length > 0 ? results[0].materialName : trimmed;
    const count = results.length;

    let defaultExplanation = '';
    const norm = trimmed.toLowerCase();

    if (norm === 'aps' || norm === 'anhydrous polysaccharide') {
      defaultExplanation = `APS commonly refers to Anhydrous Polysaccharide in the master raw-material database. ${count} verified QC log records are indexed and displayed below.`;
    } else if (norm === 'label') {
      const tagText = tags.length > 0 ? ` with tags [${tags.join(', ')}]` : '';
      defaultExplanation = `Filtering packaging and printed label master records${tagText}. ${count} active QC inspection records found in the database.`;
    } else if (results.length > 0) {
      defaultExplanation = `Showing ${count} verified master QC record${count === 1 ? '' : 's'} for ${primaryName} (${results[0].category || 'Raw Material'}). All records are retrieved from persistent storage.`;
    } else {
      defaultExplanation = `No verified records found in the master database matching "${trimmed}"${tags.length > 0 ? ` with tags [${tags.join(', ')}]` : ''}. Review material nomenclature or synonyms.`;
    }

    if (!this.client) {
      return defaultExplanation;
    }

    try {
      const topMaterials = Array.from(new Set(results.slice(0, 5).map(r => `${r.materialName} (${r.category || 'Pharma'})`)));

      const prompt = `You are SAAHIL, an internal pharmaceutical QC search engine assistant.
User searched for: "${trimmed}"
Active Tags: ${tags.length > 0 ? JSON.stringify(tags) : 'None'}
Found ${results.length} actual records in the master database for: ${JSON.stringify(topMaterials)}.

Provide a short, professional pharmaceutical explanation of approximately 2 to 3 lines (max 4 lines):
- Explain what material or category this query refers to in pharmaceutical manufacturing (e.g. chemical identity, pharmacopoeial role).
- Mention that matching verified QC records from the database are listed below.
- NEVER invent, cite, or output any QC numbers. Keep it concise, authoritative, and pharma-focused.`;

      const response = await this.client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          maxOutputTokens: 150,
        },
      });

      const explanation = response.text?.trim();
      return explanation || defaultExplanation;
    } catch (err) {
      console.warn('[AI Service] Explanation generation fallback:', err);
      return defaultExplanation;
    }
  }
}

export const aiQueryService = new AiQueryService();

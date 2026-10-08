/**
 * Pharmaceutical Material Normalization & Search Scoring Engine
 * Adheres strictly to material identity matching rather than naive substring matching.
 */

// Common pharmaceutical abbreviations and synonyms mapping
export const PHARMA_SYNONYMS: Record<string, string[]> = {
  aps: ['anhydrous polysaccharide', 'aps grade x', 'aps pharma'],
  mcc: ['microcrystalline cellulose', 'cellulose microcrystalline', 'avicel'],
  pvp: ['polyvinylpyrrolidone', 'povidone', 'polyvidone'],
  pvpk30: ['polyvinylpyrrolidone k30', 'povidone k30'],
  hpmc: ['hydroxypropyl methylcellulose', 'hypromellose', 'hydroxypropylmethylcellulose'],
  ipa: ['isopropyl alcohol', 'isopropanol', '2-propanol'],
  sls: ['sodium lauryl sulfate', 'sodium dodecyl sulfate', 'sds'],
  dcp: ['dicalcium phosphate', 'dibasic calcium phosphate'],
  peg: ['polyethylene glycol', 'macrogol'],
  peg400: ['polyethylene glycol 400', 'macrogol 400'],
  peg4000: ['polyethylene glycol 4000', 'macrogol 4000'],
  peg6000: ['polyethylene glycol 6000', 'macrogol 6000'],
  bht: ['butylated hydroxytoluene'],
  bha: ['butylated hydroxyanisole'],
  edta: ['ethylenediaminetetraacetic acid', 'disodium edetate'],
  cmc: ['carboxymethylcellulose', 'sodium carboxymethyl cellulose', 'carmellose'],
  api: ['active pharmaceutical ingredient'],
  paracetamol: ['acetaminophen', 'apap'],
  acetaminophen: ['paracetamol', 'apap'],
  mgstearate: ['magnesium stearate'],
  'mg-stearate': ['magnesium stearate'],
  'mg stearate': ['magnesium stearate'],
};

/**
 * Normalizes a raw string by:
 * - lowercase
 * - trimming whitespace
 * - replacing hyphens, underscores, dots, slashes with single space
 * - collapsing multiple spaces
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[_\-\/\.\,\;\:\(\)\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a normalized string into discrete alphanumeric tokens.
 */
export function tokenize(str: string): string[] {
  return normalizeString(str)
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

/**
 * Extract acronym of a multi-word material name (e.g. "Anhydrous Polysaccharide" -> "ap").
 */
export function getAcronyms(name: string): string[] {
  const tokens = tokenize(name);
  if (tokens.length < 2) return [];
  const acronym = tokens.map(t => t[0]).join('');
  const results = [acronym];
  // If last word is plural or grade (e.g. polysaccharide -> ps)
  if (tokens.length === 2 && tokens[1].startsWith('poly')) {
    results.push(tokens[0][0] + 'p');
  }
  return results;
}

export interface MatchScoreResult {
  score: number;
  matchType: 'exact' | 'normalized' | 'token' | 'alias' | 'semantic' | 'related' | 'none';
  matchedField: string;
}

/**
 * Calculate relevance score between query and material record.
 * GUARANTEES: Substring match inside unrelated words (e.g. "aps" in "capsule") returns score 0.
 */
export function calculateMaterialRelevance(
  query: string,
  materialName: string,
  qcNumber?: string,
  category?: string,
  aiSynonyms: string[] = []
): MatchScoreResult {
  const normQuery = normalizeString(query);
  const rawQuery = (query || '').trim().toLowerCase();
  const normMaterial = normalizeString(materialName);
  const rawMaterial = (materialName || '').trim().toLowerCase();
  const normQc = normalizeString(qcNumber || '');
  const rawQc = (qcNumber || '').trim().toLowerCase();

  if (!normQuery) {
    return { score: 0, matchType: 'none', matchedField: '' };
  }

  // 1. Direct QC Number Match (Users sometimes directly search the QC number)
  if (rawQc === rawQuery || normQc === normQuery) {
    return { score: 100, matchType: 'exact', matchedField: 'qc_number' };
  }
  if (normQc && normQc.includes(normQuery) && normQuery.length >= 3) {
    // Check if query is a prefix or token in QC number (e.g. "QC-00125" or "00125")
    const qcTokens = tokenize(qcNumber || '');
    if (qcTokens.some(t => t === normQuery || t.endsWith(normQuery))) {
      return { score: 98, matchType: 'exact', matchedField: 'qc_number' };
    }
  }

  // 2. Exact raw material name match (Case-insensitive)
  if (rawMaterial === rawQuery) {
    return { score: 100, matchType: 'exact', matchedField: 'material_name' };
  }

  // 3. Exact normalized material name match
  if (normMaterial === normQuery) {
    return { score: 95, matchType: 'normalized', matchedField: 'material_name' };
  }

  // 4. Acronym and Known Pharmaceutical Alias Match
  // Check predefined direct synonyms
  const knownSynonyms = PHARMA_SYNONYMS[normQuery] || [];
  for (const syn of knownSynonyms) {
    if (normMaterial === syn || normMaterial.startsWith(syn + ' ') || normMaterial.endsWith(' ' + syn) || normMaterial.includes(syn)) {
      return { score: 90, matchType: 'alias', matchedField: 'alias' };
    }
  }

  // Check reverse dictionary synonyms (if query is a known alias like 'povidone' or 'apap' or 'avicel')
  for (const [canonicalKey, aliasList] of Object.entries(PHARMA_SYNONYMS)) {
    if (aliasList.includes(normQuery) || canonicalKey === normQuery) {
      if (
        normMaterial === canonicalKey ||
        normMaterial.includes(canonicalKey) ||
        aliasList.some(alias => normMaterial === alias || normMaterial.includes(alias))
      ) {
        return { score: 90, matchType: 'alias', matchedField: 'reverse_alias' };
      }
    }
  }

  // Check reverse synonyms (if material is an acronym)
  const materialSynonyms = PHARMA_SYNONYMS[normMaterial] || [];
  if (materialSynonyms.includes(normQuery)) {
    return { score: 90, matchType: 'alias', matchedField: 'alias' };
  }

  // Check generated acronyms from material tokens
  const generatedAcronyms = getAcronyms(materialName);
  if (generatedAcronyms.includes(normQuery)) {
    return { score: 85, matchType: 'alias', matchedField: 'acronym' };
  }

  // Check AI-provided synonyms
  for (const aiSyn of aiSynonyms) {
    const normAiSyn = normalizeString(aiSyn);
    if (normMaterial === normAiSyn) {
      return { score: 85, matchType: 'semantic', matchedField: 'ai_synonym' };
    }
    if (normMaterial.includes(normAiSyn) && normAiSyn.length >= 4) {
      return { score: 80, matchType: 'semantic', matchedField: 'ai_synonym' };
    }
  }

  // 5. Discrete Token Matching (Whole Words Only)
  const queryTokens = tokenize(query);
  const materialTokens = tokenize(materialName);

  if (queryTokens.length === 1) {
    const singleToken = queryTokens[0];
    
    // Check if query is an EXACT discrete token of the material name
    // e.g. query "polysaccharide" matches "anhydrous polysaccharide"
    if (materialTokens.includes(singleToken)) {
      return { score: 85, matchType: 'token', matchedField: 'material_name_token' };
    }

    // Check if token matches the START of any discrete token (prefix match)
    // e.g. "anhydr" matches "anhydrous"
    if (singleToken.length >= 4 && materialTokens.some(t => t.startsWith(singleToken))) {
      return { score: 75, matchType: 'token', matchedField: 'material_name_prefix' };
    }

    // STRICT CHECK:
    // If the query is just a substring inside a token (like "aps" in "capsule" or "caps"),
    // REJECT! This is explicitly required by specification.
    return { score: 0, matchType: 'none', matchedField: '' };
  }

  // 6. Multi-Token Phrase Matching
  // All query tokens must match discrete tokens in the material
  const allTokensMatched = queryTokens.every(qToken => 
    materialTokens.some(mToken => mToken === qToken || (qToken.length >= 4 && mToken.startsWith(qToken)))
  );

  if (allTokensMatched) {
    return { score: 80, matchType: 'token', matchedField: 'all_tokens' };
  }

  // Check partial token match (at least 60% of tokens match)
  const matchedCount = queryTokens.filter(qToken =>
    materialTokens.some(mToken => mToken === qToken)
  ).length;

  if (queryTokens.length >= 2 && matchedCount >= 2 && matchedCount / queryTokens.length >= 0.6) {
    return { score: 65, matchType: 'related', matchedField: 'partial_tokens' };
  }

  return { score: 0, matchType: 'none', matchedField: '' };
}

/**
 * Format date string into human readable display: "12 January 2026"
 * And extract Year, Month number (1-12), and Month string ("January 2026")
 */
export function parseAndFormatDate(rawDateStr: any): {
  displayDate: string;
  monthYear: string;
  year: number;
  month: number;
  isoDate: string;
} {
  const fallback = {
    displayDate: rawDateStr ? String(rawDateStr) : 'N/A',
    monthYear: 'Undated Records',
    year: 0,
    month: 0,
    isoDate: '',
  };

  if (!rawDateStr) return fallback;

  let d: Date | null = null;

  // Handle Excel serial date numbers (e.g. 45312)
  if (typeof rawDateStr === 'number' && rawDateStr > 20000 && rawDateStr < 70000) {
    // Excel epoch 1899-12-30
    d = new Date(Math.round((rawDateStr - 25569) * 86400 * 1000));
  } else if (typeof rawDateStr === 'string') {
    const trimmed = rawDateStr.trim();
    // Try standard parsing
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    } else {
      // Try dd-mm-yyyy or dd/mm/yyyy
      const parts = trimmed.split(/[\/\-\.]/);
      if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        if (day > 31 && year <= 31) {
          // inverted yyyy-mm-dd
          const tmp = day; day = year; year = tmp;
        }
        const customDate = new Date(year, month, day);
        if (!isNaN(customDate.getTime())) {
          d = customDate;
        }
      }
    }
  } else if (rawDateStr instanceof Date && !isNaN(rawDateStr.getTime())) {
    d = rawDateStr;
  }

  if (!d || isNaN(d.getTime())) {
    return fallback;
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const year = d.getFullYear();
  const monthIdx = d.getMonth();
  const monthNum = monthIdx + 1;
  const day = d.getDate();
  const monthName = months[monthIdx];

  const displayDate = `${day < 10 ? '0' + day : day} ${monthName} ${year}`;
  const monthYear = `${monthName} ${year}`;
  const isoDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return {
    displayDate,
    monthYear,
    year,
    month: monthNum,
    isoDate,
  };
}

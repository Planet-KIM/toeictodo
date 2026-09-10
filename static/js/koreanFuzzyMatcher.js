/* ==========================================================================
   Korean Fuzzy Matcher Module - Korean Stemming & Semantic Equivalence Engine
   ========================================================================== */

/**
 * Normalizes a Korean string by stripping common grammatical endings & suffixes
 * Example:
 *   "매력적인"  -> "매력"
 *   "매력적이다" -> "매력"
 *   "매력적"    -> "매력"
 *   "이용 가능한" -> "이용가능"
 */
function normalizeKoreanStem(str) {
  if (!str) return '';

  let cleaned = str
    .replace(/[0-9\.\,\;\:\?\!\"\'\(\)\[\]\{\}\~\-]/g, '') // remove numbers & symbols
    .replace(/\s+/g, '') // remove whitespace
    .trim();

  // Strip common Korean verb/adjective endings & suffixes
  const suffixes = [
    '적이다', '적인', '적', '이다', '스럽다', '스러운', '스럽게',
    '하는', '되는', '한', '된', '함', '임', '게', '의', '으로', '로',
    '하는것', '되는것', '가능한', '있는', '없는'
  ];

  for (const suf of suffixes) {
    if (cleaned.length > suf.length + 1 && cleaned.endsWith(suf)) {
      cleaned = cleaned.substring(0, cleaned.length - suf.length);
      break;
    }
  }

  return cleaned.toLowerCase();
}

/**
 * Calculates string similarity using Token Jaccard Overlap
 */
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeKoreanStem(str1);
  const norm2 = normalizeKoreanStem(str2);

  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  const set1 = new Set(norm1.split(''));
  const set2 = new Set(norm2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0.0;
}

/**
 * Evaluates whether spoken Korean text matches DB meaning text
 * returns { isMatch: boolean, matchedMeaning: string, confidence: number }
 */
function checkKoreanSemanticMatch(spokenText, dbMeaningText) {
  if (!spokenText || !dbMeaningText) {
    return { isMatch: false, matchedMeaning: '', confidence: 0 };
  }

  const cleanSpoken = spokenText.trim();
  const spokenStem = normalizeKoreanStem(cleanSpoken);

  // Split DB meaning into individual meaning chips
  const chips = dbMeaningText
    .split(/[,;\/\.\r\n]+/)
    .map(c => c.replace(/^[0-9]+\s*[\.\)]\s*/, '').trim()) // remove leading numbers like "1."
    .filter(Boolean);

  let bestMatchChip = '';
  let highestScore = 0.0;

  for (const chip of chips) {
    const chipStem = normalizeKoreanStem(chip);
    const score = calculateSimilarity(cleanSpoken, chip);

    if (spokenStem === chipStem || cleanSpoken.includes(chipStem) || chip.includes(spokenStem)) {
      return {
        isMatch: true,
        matchedMeaning: chip,
        confidence: 1.0,
        spoken: cleanSpoken
      };
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatchChip = chip;
    }
  }

  const isMatch = highestScore >= 0.55;

  return {
    isMatch: isMatch,
    matchedMeaning: bestMatchChip || chips[0] || dbMeaningText,
    confidence: highestScore,
    spoken: cleanSpoken
  };
}

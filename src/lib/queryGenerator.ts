/**
 * Deterministic search query generation from a user claim.
 * No LLM calls — pure string manipulation.
 */

/**
 * Extract key phrases from a claim by removing filler words
 * and keeping meaningful tokens.
 */
function extractKeyPhrases(claim: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can",
    "that", "which", "who", "whom", "this", "these", "those",
    "it", "its", "i", "me", "my", "we", "our", "you", "your",
    "he", "him", "his", "she", "her", "they", "them", "their",
    "of", "in", "on", "at", "to", "for", "with", "by", "from",
    "as", "into", "through", "during", "before", "after",
    "and", "but", "or", "nor", "not", "so", "yet",
    "if", "then", "than", "too", "very", "just",
    "about", "above", "below", "between", "up", "down",
    "out", "off", "over", "under", "again", "further",
    "once", "here", "there", "when", "where", "why", "how",
    "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "no", "only", "own", "same",
  ]);

  return claim
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.has(word));
}

/**
 * Generate multiple search queries from a claim.
 * Returns an array of queries targeting different angles and platforms.
 */
export function generateSearchQueries(claim: string): string[] {
  const phrases = extractKeyPhrases(claim);
  const core = phrases.join(" ");

  // If the claim is very short, just return the core query
  if (phrases.length <= 3) {
    return [
      core,
      `"${claim.trim()}"`,
      `${core} fact check`,
    ];
  }

  // Split into halves for recombination
  const mid = Math.ceil(phrases.length / 2);
  const firstHalf = phrases.slice(0, mid).join(" ");
  const secondHalf = phrases.slice(mid).join(" ");

  const queries: string[] = [
    // Core search
    core,
    // Exact match
    `"${claim.trim()}"`,
    // Rearranged halves
    `${secondHalf} ${firstHalf}`,
    // Fact-check angle
    `${core} fact check`,
  ];

  // Site-specific searches for social platforms
  const socialPrefixes = [
    "site:x.com",
    "site:reddit.com",
    "site:youtube.com",
  ];

  for (const prefix of socialPrefixes) {
    queries.push(`${prefix} ${firstHalf} ${secondHalf}`);
  }

  return queries;
}
